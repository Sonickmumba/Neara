/**
 * UserSettings — avatar upload tests
 *
 * Covers:
 *   - Shows initials when no profile_image_url is set
 *   - Shows <img> when profile_image_url is present in Redux state
 *   - Hidden file input is present in edit mode
 *   - Rejects oversized files with a toast error (no API call)
 *   - Rejects disallowed file types with a toast error
 *   - Shows "Uploading…" label while the request is in-flight
 *   - Calls POST /api/users/avatar with FormData on valid file selection
 *   - Updates profile image on success
 *   - Shows toast error and reverts preview on API failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { UserSettingsScreen } from './UserSettings';

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

import apiClient from '../../services/api';
import { toast } from 'sonner';
import authReducer from '../loginSignup/authSlice';

const AVATAR_URL = 'https://res.cloudinary.com/demo/image/upload/neara-avatars/test.webp';

function makeStore(userOverrides = {}) {
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
          ...userOverrides,
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

function renderScreen(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <UserSettingsScreen />
      </MemoryRouter>
    </Provider>
  );
}

// Stub all GET calls to return empty-ish data so the component can mount cleanly
function stubGetCalls() {
  apiClient.get.mockImplementation((url) => {
    if (url.includes('/settings'))
      return Promise.resolve({ data: { data: { notifications: {}, privacy: {} } } });
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

beforeEach(() => {
  vi.clearAllMocks();
  stubGetCalls();
});

// Helper — create a fake File object
function makeFile({ name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 1024 } = {}) {
  const file = new File(['x'.repeat(sizeBytes)], name, { type });
  return file;
}

// ── Render ────────────────────────────────────────────────────────────────────

describe('UserSettings — avatar render', () => {
  it('shows initials when no profile_image_url is set', async () => {
    renderScreen();
    // Wait for profile to hydrate
    await waitFor(() => {
      expect(screen.getByText('AT')).toBeInTheDocument();
    });
  });

  it('shows <img> when user has a profile_image_url', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/settings'))
        return Promise.resolve({ data: { data: {} } });
      return Promise.resolve({
        data: {
          data: {
            name: 'Alice Test',
            email: 'alice@example.com',
            profile_image_url: AVATAR_URL,
          },
        },
      });
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByAltText('Profile')).toHaveAttribute('src', AVATAR_URL);
    });
  });
});

// ── Edit mode ────────────────────────────────────────────────────────────────

describe('UserSettings — avatar edit mode', () => {
  async function enterEditMode() {
    renderScreen();
    await waitFor(() => screen.getByText('AT'));
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  }

  it('file input is hidden in the DOM while editing', async () => {
    await enterEditMode();
    expect(screen.getByLabelText(/upload profile photo/i)).toBeInTheDocument();
  });

  it('camera button is visible in edit mode', async () => {
    await enterEditMode();
    expect(
      screen.getByRole('button', { name: /change profile photo/i })
    ).toBeInTheDocument();
  });

  it('Change Photo button is visible in edit mode', async () => {
    await enterEditMode();
    expect(
      screen.getByRole('button', { name: /change photo/i })
    ).toBeInTheDocument();
  });
});

// ── Client-side validation ────────────────────────────────────────────────────

describe('UserSettings — avatar validation', () => {
  async function enterEditMode() {
    renderScreen();
    await waitFor(() => screen.getByText('AT'));
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  }

  it('rejects files larger than 5 MB with a toast error', async () => {
    await enterEditMode();
    const bigFile = makeFile({ sizeBytes: 6 * 1024 * 1024 });
    const input = screen.getByLabelText(/upload profile photo/i);

    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/5 mb/i)
      );
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rejects disallowed file types with a toast error', async () => {
    await enterEditMode();
    const gifFile = makeFile({ name: 'anim.gif', type: 'image/gif' });
    const input = screen.getByLabelText(/upload profile photo/i);

    fireEvent.change(input, { target: { files: [gifFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/jpg|png|webp/i)
      );
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── Upload flow ───────────────────────────────────────────────────────────────

describe('UserSettings — avatar upload', () => {
  async function enterEditMode() {
    renderScreen();
    await waitFor(() => screen.getByText('AT'));
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  }

  it('calls POST /api/users/avatar with FormData on valid file', async () => {
    apiClient.post.mockResolvedValue({
      data: { data: { profile_image_url: AVATAR_URL } },
    });

    await enterEditMode();
    const file = makeFile();
    fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/users/avatar',
        expect.any(FormData)
      );
    });
  });

  it('shows "Uploading…" label while upload is in-flight', async () => {
    apiClient.post.mockReturnValue(new Promise(() => {})); // never resolves

    await enterEditMode();
    const file = makeFile();
    fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uploading/i })).toBeInTheDocument();
    });
  });

  it('displays the new avatar after a successful upload', async () => {
    apiClient.post.mockResolvedValue({
      data: { data: { profile_image_url: AVATAR_URL } },
    });

    await enterEditMode();
    const file = makeFile();
    fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByAltText('Profile')).toHaveAttribute('src', AVATAR_URL);
    });
  });

  it('shows a toast error and does not update avatar on API failure', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('fail'), {
        response: { data: { message: 'Upload failed' } },
      })
    );

    await enterEditMode();
    const file = makeFile();
    fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/upload failed/i)
      );
    });
    // Should still show initials (no image rendered)
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });
});
