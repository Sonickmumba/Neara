/**
 * UserSettings — Push Notifications toggle tests
 *
 * Covers:
 *  - Toggle renders in the Notifications section
 *  - Enabling push when permission is 'default' → requests permission → calls subscribe()
 *  - Enabling push when permission is already 'granted' → skips prompt → calls subscribe()
 *  - Enabling push when permission is 'denied' → shows error toast, no subscribe()
 *  - Enabling push when Notification API is unsupported → shows error toast
 *  - Disabling push → calls unsubscribe()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks (hoisted before imports) ────────────────────────────────────

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { UserSettingsScreen } from './UserSettings';
import apiClient from '../../services/api';
import { toast } from 'sonner';
import authReducer from '../loginSignup/authSlice';

// ── Store & render helpers ────────────────────────────────────────────────────

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '',
          bio: '',
          neighborhood: '',
          profile_image_url: '',
          phone_verified: false,
        },
        status: 'succeeded',
        bootstrapStatus: 'succeeded',
        isAuthenticated: true,
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

function stubGetCalls({ pushEnabled = true } = {}) {
  apiClient.get.mockImplementation((url) => {
    if (url.includes('/settings'))
      return Promise.resolve({
        data: {
          data: {
            notifications: { push: pushEnabled },
            privacy: {},
          },
        },
      });
    return Promise.resolve({
      data: {
        data: {
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '',
          bio: '',
          neighborhood: '',
          profile_image_url: '',
        },
      },
    });
  });
}

function renderScreen() {
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <UserSettingsScreen />
      </MemoryRouter>
    </Provider>
  );
}

// Find the push notifications checkbox (sr-only checkbox inside the toggle).
// It is the checkbox closest to the "Push Notifications" heading.
async function findPushToggle() {
  await screen.findByText('Push Notifications');
  // The push toggle is the first checkbox in the Notifications section.
  // getAllByRole('checkbox') returns them in DOM order.
  const checkboxes = screen.getAllByRole('checkbox');
  return checkboxes[0];
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscribe.mockResolvedValue(undefined);
  mockUnsubscribe.mockResolvedValue(undefined);
  apiClient.patch.mockResolvedValue({ data: { success: true } });
  stubGetCalls({ pushEnabled: true });

  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UserSettings — Push Notifications toggle', () => {
  it('renders "Push Notifications" in the notifications section', async () => {
    renderScreen();
    expect(await screen.findByText('Push Notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Receive alerts on this device')
    ).toBeInTheDocument();
  });

  it('the toggle is checked when push is enabled (server returns push: true)', async () => {
    stubGetCalls({ pushEnabled: true });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(true));
  });

  it('the toggle is unchecked when push is disabled (server returns push: false)', async () => {
    stubGetCalls({ pushEnabled: false });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(false));
  });

  it('requests permission then calls subscribe() when toggle is turned ON', async () => {
    // Start with push disabled so the toggle is currently OFF
    stubGetCalls({ pushEnabled: false });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(false));

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => {
      expect(Notification.requestPermission).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it('skips permission prompt and calls subscribe() when permission is already granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'granted', // already granted — no prompt needed
      requestPermission: vi.fn(),
    });

    stubGetCalls({ pushEnabled: false });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(false));

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled());
    // requestPermission should NOT have been called (already granted)
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('shows error toast and does NOT subscribe when permission is denied', async () => {
    vi.stubGlobal('Notification', {
      permission: 'denied',
      requestPermission: vi.fn(),
    });

    stubGetCalls({ pushEnabled: false });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(false));

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/blocked/i)
      );
    });
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('shows error toast when Notification API is not supported', async () => {
    vi.stubGlobal('Notification', undefined);

    stubGetCalls({ pushEnabled: false });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(false));

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/not supported/i)
      );
    });
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('calls unsubscribe() when toggle is turned OFF', async () => {
    // Start with push enabled
    stubGetCalls({ pushEnabled: true });
    renderScreen();

    const toggle = await findPushToggle();
    await waitFor(() => expect(toggle.checked).toBe(true));

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalled());
  });
});
