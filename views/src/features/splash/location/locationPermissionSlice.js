import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Async thunk to request browser geolocation permission
 */
export const requestLocationPermission = createAsyncThunk(
  'locationPermission/request',
  async (_, { rejectWithValue }) => {
    if (!navigator.geolocation) {
      return rejectWithValue('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error.message || 'Location permission denied');
        }
      );
    });
  }
);

const locationPermissionSlice = createSlice({
  name: 'locationPermission',
  initialState: {
    isGranting: false,
    permissionGranted: false,
    permissionDenied: false,
    skipped: false,
    coords: null,
    error: null,
  },
  reducers: {
    skipLocationPermission(state) {
      state.skipped = true;
    },
    resetLocationPermission() {
      return {
        isGranting: false,
        permissionGranted: false,
        permissionDenied: false,
        skipped: false,
        coords: null,
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestLocationPermission.pending, (state) => {
        state.isGranting = true;
        state.error = null;
      })
      .addCase(requestLocationPermission.fulfilled, (state, action) => {
        state.isGranting = false;
        state.permissionGranted = true;
        state.coords = action.payload;
      })
      .addCase(requestLocationPermission.rejected, (state, action) => {
        state.isGranting = false;
        state.permissionDenied = true;
        state.error = action.payload;
      });
  },
});

export const {
  skipLocationPermission,
  resetLocationPermission,
} = locationPermissionSlice.actions;

export default locationPermissionSlice.reducer;
