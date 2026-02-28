import { createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/api';

/**
 * Fetch home feed listings
 * - Uses selected user interests
 * - Supports pagination via cursor
 */
export const fetchHomeFeed = createAsyncThunk(
  'homeFeed/fetchHomeFeed',
  async (
    { interests = [], cursor = null } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.get('/api/listings', {
        params: {
          interests: interests.join(','), // ['skills','tech'] → skills,tech
          cursor,
        },
      });

      /**
       * Backend response shape REQUIRED:
       * {
       *   listings: [...],
       *   nextCursor: "abc123" | null
       * }
       */
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load feed'
      );
    }
  }
);
