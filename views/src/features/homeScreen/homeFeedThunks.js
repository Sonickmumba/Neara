import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

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
      const response = await axios.get('http://localhost:3000/api/listings', {
        params: {
          interests: interests.join(','), // ['skills','tech'] → skills,tech
          cursor,
        },
        withCredentials: true,
      });

      /**
       * Backend response shape REQUIRED:
       * {
       *   listings: [...],
       *   nextCursor: "abc123" | null
       * }
       */
      console.log('Fetched home feed:', response.data);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load feed'
      );
    }
  }
);
