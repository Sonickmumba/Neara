/**
 * ForgotPasswordModal — unit + integration tests
 *
 * Covers:
 *   - Renders email input and submit button
 *   - Back button calls onBack prop
 *   - Rejects empty email (toast error, no API call)
 *   - Dispatches requestPasswordReset with trimmed email
 *   - Shows pending/loading state while request is in-flight
 *   - Shows success view after fulfilled response
 *   - Shows API error message on rejection
 *   - Success view "Back to sign in" button calls onBack
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ForgotPasswordModal } from './ForgotPasswordModal';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import apiClient from '../../services/api';
import { toast } from 'sonner';
import authReducer from './authSlice';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

const onBack = vi.fn();

function renderModal(store = makeStore()) {
  return render(
    <Provider store={store}>
      <ForgotPasswordModal onBack={onBack} />
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — render', () => {
  it('renders the email input', () => {
    renderModal();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('renders the send reset link button', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: /send reset link/i })
    ).toBeInTheDocument();
  });

  it('renders the back button', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: /back to sign in/i })
    ).toBeInTheDocument();
  });
});

// ── Back button ───────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — back button', () => {
  it('calls onBack when the back button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — validation', () => {
  it('shows a toast error and does not call the API when email is empty', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/email/i));
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('trims whitespace-only email and shows toast error', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/email/i));
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── API interaction ───────────────────────────────────────────────────────────

describe('ForgotPasswordModal — API interaction', () => {
  it('calls POST /api/auth/request-password-reset with the email', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/auth/request-password-reset',
        { email: 'alice@example.com' }
      );
    });
  });

  it('trims the email before sending', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: '  alice@example.com  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/auth/request-password-reset',
        { email: 'alice@example.com' }
      );
    });
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — loading state', () => {
  it('shows "Sending…" and disables the button while request is in-flight', async () => {
    // Never resolves
    apiClient.post.mockReturnValue(new Promise(() => {}));
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });
  });
});

// ── Success state ─────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — success state', () => {
  it('shows the success view after the request resolves', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
  });

  it('success view "Back to sign in" button calls onBack', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => screen.getByText(/check your inbox/i));

    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('ForgotPasswordModal — API error', () => {
  it('shows an error message when the API call fails', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('Rate limited'), {
        response: { data: { message: 'Too many requests' } },
      })
    );
    renderModal();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/too many requests/i)
      );
    });
  });
});
