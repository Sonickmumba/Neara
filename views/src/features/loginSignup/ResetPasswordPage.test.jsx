/**
 * ResetPasswordPage — unit + integration tests
 *
 * This tests the following scenarios:
 *   - Shows "Invalid link" when no token is present in the URL
 *   - Renders the reset password form when token is present
 *   - Shows error when both password fields are empty
 *   - Shows error when passwords do not match
 *   - Shows error when password is shorter than 8 characters
 *   - Calls resetPassword thunk with the correct token and newPassword
 *   - Shows pending/loading state while request is in-flight
 *   - Shows success view after fulfilled response
 *   - Success view navigates to /loginSignup on button click
 *   - Shows API error message when reset is rejected
 *   - "Invalid link" back button navigates to /loginSignup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import apiClient from '../../services/api';
import { toast } from 'sonner';
import authReducer from './authSlice';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function renderPage(token = 'valid-jwt-token', store = makeStore()) {
  const initialEntry = token
    ? `/reset-password?token=${token}`
    : '/reset-password';

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── No token ──────────────────────────────────────────────────────────────────

describe('ResetPasswordPage — no token', () => {
  it('shows "Invalid link" when no token is in the URL', () => {
    renderPage(null);
    expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
  });

  it('shows a description when the link is missing', () => {
    renderPage(null);
    expect(
      screen.getByText(/missing or has already been used/i)
    ).toBeInTheDocument();
  });

  it('"Back to sign in" on invalid link navigates to /loginSignup', () => {
    renderPage(null);
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/loginSignup');
  });
});

// ── Form render ───────────────────────────────────────────────────────────────

describe('ResetPasswordPage — form render', () => {
  it('renders the new password and confirm password fields', () => {
    renderPage();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('renders the "Reset password" submit button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /reset password/i })
    ).toBeInTheDocument();
  });
});

// ── Client-side validation ────────────────────────────────────────────────────

describe('ResetPasswordPage — client-side validation', () => {
  it('shows an error when both fields are empty', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows an error when passwords do not match', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'Password1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'DifferentPass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows an error when password is fewer than 8 characters', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8/i)
      ).toBeInTheDocument();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── API interaction ───────────────────────────────────────────────────────────

describe('ResetPasswordPage — API interaction', () => {
  it('calls POST /api/auth/reset-password with token and newPassword', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderPage('my-jwt-token');

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'my-jwt-token',
        newPassword: 'NewPassword1',
      });
    });
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ResetPasswordPage — loading state', () => {
  it('shows "Updating…" and disables the button while request is in-flight', async () => {
    apiClient.post.mockReturnValue(new Promise(() => {}));
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
    });
  });
});

// ── Success state ─────────────────────────────────────────────────────────────

describe('ResetPasswordPage — success state', () => {
  it('shows the success view after the request resolves', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
  });

  it('"Go to sign in" on success navigates to /loginSignup', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => screen.getByText(/password updated/i));

    fireEvent.click(screen.getByRole('button', { name: /go to sign in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/loginSignup');
  });
});

// ── API error ─────────────────────────────────────────────────────────────────

describe('ResetPasswordPage — API error', () => {
  it('shows a toast error when the API call fails', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('Token expired'), {
        response: { data: { message: 'Token has expired or is invalid' } },
      })
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/token has expired/i)
      );
    });
  });

  it('keeps the form visible after an API error', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('fail'), {
        response: { data: { message: 'Invalid token' } },
      })
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    // Form should still be rendered (not success view)
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
  });
});

// ── Toggle password visibility ────────────────────────────────────────────────

describe('ResetPasswordPage — password visibility toggle', () => {
  it('toggles new password field between text and password type', () => {
    renderPage();

    const input = screen.getByLabelText('New Password');
    expect(input.type).toBe('password');

    // The toggle button has aria-label "Show password"
    const toggleBtn = screen.getAllByLabelText(/show password/i)[0];
    fireEvent.click(toggleBtn);

    expect(input.type).toBe('text');
  });
});
