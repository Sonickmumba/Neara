/**
 * ChangePasswordPanel — unit + integration tests
 *
 * Covers:
 *   - Renders current, new, confirm password fields
 *   - Back button calls onBack prop
 *   - Rejects empty fields (field-level errors, no API call)
 *   - Rejects short password
 *   - Rejects mismatched passwords
 *   - Calls PATCH /api/auth/change-password with correct payload
 *   - Shows loading state while request is in-flight
 *   - Shows success view after fulfilled response
 *   - Shows API error toast on rejection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChangePasswordPanel } from './ChangePasswordPanel';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import apiClient from '../../services/api';
import { toast } from 'sonner';
import authReducer from '../loginSignup/authSlice';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

const onBack = vi.fn();

function renderPanel(store = makeStore()) {
  return render(
    <Provider store={store}>
      <ChangePasswordPanel onBack={onBack} />
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('ChangePasswordPanel — render', () => {
  it('renders the current password field', () => {
    renderPanel();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });

  it('renders the new password field', () => {
    renderPanel();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
  });

  it('renders the confirm new password field', () => {
    renderPanel();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /update password/i })
    ).toBeInTheDocument();
  });
});

// ── Back button ───────────────────────────────────────────────────────────────

describe('ChangePasswordPanel — back button', () => {
  it('calls onBack when the back button is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ── Client-side validation ────────────────────────────────────────────────────

describe('ChangePasswordPanel — validation', () => {
  it('shows errors and does not call API when all fields are empty', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/current password is required/i)
      ).toBeInTheDocument();
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('shows error when new password is too short', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'Short1' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'Short1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'Different1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});

// ── API interaction ───────────────────────────────────────────────────────────

describe('ChangePasswordPanel — API interaction', () => {
  it('calls PATCH /api/auth/change-password with correct payload', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        { currentPassword: 'OldPass1', newPassword: 'NewPass1!' }
      );
    });
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ChangePasswordPanel — loading state', () => {
  it('shows "Updating…" and disables the button while request is in-flight', async () => {
    apiClient.patch.mockReturnValue(new Promise(() => {}));
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
    });
  });
});

// ── Success state ─────────────────────────────────────────────────────────────

describe('ChangePasswordPanel — success state', () => {
  it('shows success view after request resolves', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
  });

  it('shows a success toast after request resolves', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/password changed/i)
      );
    });
  });
});

// ── API error ─────────────────────────────────────────────────────────────────

describe('ChangePasswordPanel — API error', () => {
  it('shows a toast error when the API call fails', async () => {
    apiClient.patch.mockRejectedValue(
      Object.assign(new Error('Wrong password'), {
        response: { data: { message: 'Current password is incorrect' } },
      })
    );
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'WrongPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/current password is incorrect/i)
      );
    });
  });

  it('keeps the form visible after an API error', async () => {
    apiClient.patch.mockRejectedValue(
      Object.assign(new Error('fail'), {
        response: { data: { message: 'Current password is incorrect' } },
      })
    );
    renderPanel();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'WrongPass1' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });
});
