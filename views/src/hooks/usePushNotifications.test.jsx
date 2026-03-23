/**
 * usePushNotifications — integration tests
 *
 * Covers:
 *  - Service worker registration on mount
 *  - Skips registration when API is unsupported
 *  - Auto-subscribes when user is logged in and permission already granted
 *  - Does NOT auto-subscribe when permission is 'default'
 *  - Does NOT auto-subscribe when user is not logged in
 *  - subscribe() fetches VAPID key, calls PushManager.subscribe, POSTs to API
 *  - subscribe() is a no-op when serviceWorker unsupported
 *  - subscribe() is a no-op when PushManager unsupported
 *  - subscribe() does not double-subscribe (idempotent)
 *  - unsubscribe() calls DELETE on API and calls subscription.unsubscribe()
 *  - unsubscribe() is a no-op when no existing subscription
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '../services/api';
import authReducer from '../features/loginSignup/authSlice';
import { usePushNotifications } from './usePushNotifications';

// ── Constants ─────────────────────────────────────────────────────────────────

// Real VAPID public key (valid base64url) so urlBase64ToUint8Array doesn't throw
const VAPID_KEY =
  'BFrMSDCVEpKUdyuLNJQcr9ir_V1xJiUFhKaT0i3ehtIiyhj-fDiGQH6ZO0fPbXLiwZxMFjp1C4K9kBs3Zlv_x_g';

const MOCK_USER = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  phone: '',
  bio: '',
  neighborhood: '',
  profile_image_url: '',
  phone_verified: true,
};

const MOCK_ENDPOINT = 'https://push.example.com/push/abc123';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(user = MOCK_USER) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        status: 'succeeded',
        bootstrapStatus: 'succeeded',
        isAuthenticated: !!user,
        error: null,
        emailVerificationStatus: 'idle',
        emailVerificationError: null,
        pendingEmail: null,
        passwordResetStatus: 'idle',
        passwordResetError: null,
        changePasswordStatus: 'idle',
        changePasswordError: null,
      },
    },
  });
}

function makeWrapper(store) {
  return ({ children }) => <Provider store={store}>{children}</Provider>;
}

function makeMockSubscription() {
  return {
    endpoint: MOCK_ENDPOINT,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({
      endpoint: MOCK_ENDPOINT,
      keys: { p256dh: 'p256dh_key', auth: 'auth_secret' },
    }),
  };
}

function makeMockRegistration(existingSubscription = null) {
  return {
    pushManager: {
      subscribe: vi.fn().mockResolvedValue(makeMockSubscription()),
      getSubscription: vi.fn().mockResolvedValue(existingSubscription),
    },
  };
}

function stubServiceWorker(registration) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue(undefined),
      ready: Promise.resolve(registration),
    },
    writable: true,
    configurable: true,
  });
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let mockRegistration;

beforeEach(() => {
  vi.clearAllMocks();

  mockRegistration = makeMockRegistration();
  stubServiceWorker(mockRegistration);

  // Notification API — permission 'default' (not yet asked) to prevent auto-subscribe
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });

  // PushManager just needs to exist on window
  vi.stubGlobal('PushManager', class {});

  apiClient.get.mockResolvedValue({ data: { publicKey: VAPID_KEY } });
  apiClient.post.mockResolvedValue({ data: { success: true } });
  apiClient.delete.mockResolvedValue({ data: { success: true } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Service Worker Registration ───────────────────────────────────────────────

describe('usePushNotifications — service worker', () => {
  it('registers /sw.js on mount', async () => {
    const store = makeStore();
    renderHook(() => usePushNotifications(), { wrapper: makeWrapper(store) });

    await waitFor(() => {
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  it('does not throw when serviceWorker is unsupported', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const store = makeStore();
    expect(() =>
      renderHook(() => usePushNotifications(), { wrapper: makeWrapper(store) })
    ).not.toThrow();
  });
});

// ── Auto-subscribe ────────────────────────────────────────────────────────────

describe('usePushNotifications — auto-subscribe', () => {
  it('subscribes automatically when user is logged in and permission is granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' });

    const store = makeStore(MOCK_USER);
    renderHook(() => usePushNotifications(), { wrapper: makeWrapper(store) });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({ endpoint: MOCK_ENDPOINT })
      );
    });
  });

  it('does NOT auto-subscribe when permission is "default"', async () => {
    const store = makeStore(MOCK_USER);
    renderHook(() => usePushNotifications(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('does NOT auto-subscribe when user is not logged in', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' });

    const store = makeStore(null); // no user
    renderHook(() => usePushNotifications(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── subscribe() ───────────────────────────────────────────────────────────────

describe('usePushNotifications — subscribe()', () => {
  it('fetches VAPID key, calls PushManager.subscribe, and POSTs subscription to API', async () => {
    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/push/vapid-public-key');
    expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ endpoint: MOCK_ENDPOINT })
    );
  });

  it('is a no-op when serviceWorker is unsupported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('is a no-op when PushManager is unsupported', async () => {
    vi.stubGlobal('PushManager', undefined);

    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.subscribe();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('does not call the API twice when called twice (idempotent)', async () => {
    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.subscribe();
      await result.current.subscribe();
    });

    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});

// ── unsubscribe() ─────────────────────────────────────────────────────────────

describe('usePushNotifications — unsubscribe()', () => {
  it('calls DELETE on API and unsubscribes from PushManager', async () => {
    const mockSub = makeMockSubscription();
    const reg = makeMockRegistration(mockSub);
    stubServiceWorker(reg);

    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/push/unsubscribe', {
      data: { endpoint: MOCK_ENDPOINT },
    });
    expect(mockSub.unsubscribe).toHaveBeenCalled();
  });

  it('is a no-op when there is no existing subscription', async () => {
    // getSubscription returns null — nothing stored in browser
    const reg = makeMockRegistration(null);
    stubServiceWorker(reg);

    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('is a no-op when serviceWorker is unsupported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const store = makeStore();
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: makeWrapper(store),
    });

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
  });
});
