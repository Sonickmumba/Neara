import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Reverse geocoding using OpenStreetMap Nominatim API
 * Gets neighborhood/address from coordinates
 */
async function getNeighborhoodFromCoords(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    
    // Try to extract neighborhood info from address
    const address = data.address || {};
    const neighborhood = 
      address.neighbourhood ||
      address.suburb ||
      address.village ||
      address.town ||
      address.city ||
      'Unknown';
    
    return neighborhood;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown';
  }
}

/**
 * Async thunk to request browser geolocation permission
 */
export const requestLocationPermission = createAsyncThunk(
  'locationPermission/request',
  async (_, { rejectWithValue }) => {
    if (!navigator.geolocation) {
      return rejectWithValue('Geolocation not supported');
    }

    return new Promise( (resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const neighborhood = await getNeighborhoodFromCoords(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            neighborhood,
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
