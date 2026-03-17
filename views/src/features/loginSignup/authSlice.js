import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/api';

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

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle',
    error: null,
    isAuthenticated: false,
    emailVerificationStatus: 'idle', // 'idle' | 'pending' | 'verified' | 'failed'
    emailVerificationError: null,
    pendingEmail: null, // Store email awaiting verification
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
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.emailVerificationStatus = 'verified';
        state.pendingEmail = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.emailVerificationStatus = 'failed';
        state.emailVerificationError = action.payload;
      });
  },
});

export const { logout, resetEmailVerification } = authSlice.actions;
export default authSlice.reducer;
