import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/api';

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/api/auth/me', {
        skipAuthRedirect: true,
      });
      return res.data?.data || null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Not authenticated'
      );
    }
  }
);

/**
 * SEND VERIFICATION EMAIL
 * POST /api/auth/send-verification
 */
export const sendVerificationEmail = createAsyncThunk(
  'auth/sendVerificationEmail',
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/send-verification', {
        email,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to send verification email'
      );
    }
  }
);

/**
 * VERIFY EMAIL
 * POST /api/auth/verify-email
 */
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/verify-email', {
        email,
        code,
      });
      return res.data;
    } catch (err) {
      console.error('Verify email error:', err);
      return rejectWithValue(
        err.response?.data?.message || 'Invalid verification code'
      );
    }
  }
);

/**
 * SIGN UP
 * POST /api/auth/register
 */
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (formData, { getState, rejectWithValue }) => {
    try {
      // 🔑 pull interests from interests slice
      const state = getState();
      const interests = state.interests?.selectedCategoryIds || [];
      const coords = state.locationPermission?.coords || null;

      // 🧩 combine form data with interests (and location if needed)
      const payload = {
        ...formData,
        interests: interests.map((id) => parseInt(id, 10) || id), // Ensure IDs are properly formatted
      };

      // Add location if available
      if (coords && coords.latitude && coords.longitude) {
        payload.location_lat = coords.latitude;
        payload.location_lng = coords.longitude;
      }

      // Add neighborhood if available
      if (coords?.neighborhood) {
        payload.neighborhood = coords.neighborhood;
      }

      const res = await apiClient.post('/api/auth/register', payload);

      // return just the user object so reducers don't need to know response shape
      return res.data.data?.user || res.data.data || res.data;
    } catch (err) {
      console.error('Registration error:', err);
      // server occasionally sends plain-text message (e.g. duplicate email)
      const serverMsg =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null);
      return rejectWithValue(serverMsg || err.message || 'Registration failed');
    }
  }
);

/**
 * LOGIN
 * POST /api/auth/login
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/login', { email, password });

      return res.data.data?.user || res.data.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const sendPhoneVerificationCode = createAsyncThunk(
  'auth/sendPhoneVerificationCode',
  async ({ phone }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/phone/send-code', { phone });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to send phone verification code'
      );
    }
  }
);

export const verifyPhoneCode = createAsyncThunk(
  'auth/verifyPhoneCode',
  async ({ phone, code }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/phone/verify-code', {
        phone,
        code,
      });
      return res.data?.data?.user || null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to verify phone code'
      );
    }
  }
);

/**
 * REQUEST PASSWORD RESET
 * POST /api/auth/request-password-reset
 * Always resolves successfully (anti-enumeration)
 */
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/request-password-reset', {
        email,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to send reset email'
      );
    }
  }
);

/**
 * RESET PASSWORD
 * POST /api/auth/reset-password
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/auth/reset-password', {
        token,
        newPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to reset password'
      );
    }
  }
);

/**
 * CHANGE PASSWORD (authenticated)
 * PATCH /api/auth/change-password
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const res = await apiClient.patch('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to change password'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle',
    bootstrapStatus: 'idle', // idle | loading | succeeded | failed
    error: null,
    isAuthenticated: false,
    emailVerificationStatus: 'idle', // 'idle' | 'pending' | 'verified' | 'failed'
    emailVerificationError: null,
    pendingEmail: null, // Store email awaiting verification
    passwordResetStatus: 'idle', // 'idle' | 'pending' | 'succeeded' | 'failed'
    passwordResetError: null,
    changePasswordStatus: 'idle', // 'idle' | 'pending' | 'succeeded' | 'failed'
    changePasswordError: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
    resetEmailVerification(state) {
      state.emailVerificationStatus = 'idle';
      state.emailVerificationError = null;
      state.pendingEmail = null;
    },
    mergeUser(state, action) {
      state.user = { ...(state.user || {}), ...(action.payload || {}) };
      state.isAuthenticated = !!state.user;
    },
    resetPasswordFlow(state) {
      state.passwordResetStatus = 'idle';
      state.passwordResetError = null;
    },
    resetChangePassword(state) {
      state.changePasswordStatus = 'idle';
      state.changePasswordError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload || null;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // login
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload || null;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // send verification email
      .addCase(sendVerificationEmail.pending, (state) => {
        state.emailVerificationStatus = 'pending';
        state.emailVerificationError = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state, action) => {
        state.emailVerificationStatus = 'pending'; // Still waiting for code
        state.pendingEmail = action.payload.email;
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        state.emailVerificationStatus = 'failed';
        state.emailVerificationError = action.payload;
      })

      // verify email
      .addCase(verifyEmail.pending, (state) => {
        state.emailVerificationStatus = 'pending';
        state.emailVerificationError = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.emailVerificationStatus = 'verified';
        state.pendingEmail = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.emailVerificationStatus = 'failed';
        state.emailVerificationError = action.payload;
      })

      // send phone code
      .addCase(sendPhoneVerificationCode.pending, (state) => {
        state.error = null;
      })
      .addCase(sendPhoneVerificationCode.rejected, (state, action) => {
        state.error = action.payload;
      })

      // verify phone code
      .addCase(verifyPhoneCode.pending, (state) => {
        state.error = null;
      })
      .addCase(verifyPhoneCode.fulfilled, (state, action) => {
        state.user = { ...(state.user || {}), ...(action.payload || {}) };
        state.isAuthenticated = !!state.user;
      })
      .addCase(verifyPhoneCode.rejected, (state, action) => {
        state.error = action.payload;
      })

      // bootstrap current user from session cookie
      .addCase(fetchCurrentUser.pending, (state) => {
        state.bootstrapStatus = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.bootstrapStatus = 'succeeded';
        state.user = action.payload || null;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.bootstrapStatus = 'failed';
        state.user = null;
        state.isAuthenticated = false;
      })

      // request password reset
      .addCase(requestPasswordReset.pending, (state) => {
        state.passwordResetStatus = 'pending';
        state.passwordResetError = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.passwordResetStatus = 'succeeded';
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.passwordResetStatus = 'failed';
        state.passwordResetError = action.payload;
      })

      // reset password (confirm new password with token)
      .addCase(resetPassword.pending, (state) => {
        state.passwordResetStatus = 'pending';
        state.passwordResetError = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.passwordResetStatus = 'succeeded';
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.passwordResetStatus = 'failed';
        state.passwordResetError = action.payload;
      })

      // change password (authenticated user)
      .addCase(changePassword.pending, (state) => {
        state.changePasswordStatus = 'pending';
        state.changePasswordError = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.changePasswordStatus = 'succeeded';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.changePasswordStatus = 'failed';
        state.changePasswordError = action.payload;
      });
  },
});

export const { logout, resetEmailVerification, mergeUser, resetPasswordFlow, resetChangePassword } =
  authSlice.actions;
export default authSlice.reducer;
