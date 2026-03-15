// import {
//   createSlice,
//   createEntityAdapter,
// } from '@reduxjs/toolkit';
import { fetchHomeFeed } from './homeFeedThunks';
import {
  createSlice,
  //   createAsyncThunk,
  createEntityAdapter,
} from '@reduxjs/toolkit';

export const homeFeedAdapter = createEntityAdapter({
  selectId: (listing) => listing.id ?? listing._id,
  sortComparer: (a, b) => {
    // Ensure newest listings appear first
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  },
});

const initialState = homeFeedAdapter.getInitialState({
  status: 'idle',
  error: null,
  nextCursor: null,
  activeTab: 'all',
});

const homeFeedSlice = createSlice({
  name: 'homeFeed',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    addListing(state, action) {
      homeFeedAdapter.upsertOne(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeFeed.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchHomeFeed.fulfilled, (state, action) => {
        state.status = 'succeeded';

        const listings = action.payload.data;

        // SAFETY CHECK (optional but recommended)
        if (!Array.isArray(listings)) {
          console.error('Expected listings array, got:', action.payload);
          return;
        }

        homeFeedAdapter.setAll(state, listings);
        state.nextCursor = null;
      })
      .addCase(fetchHomeFeed.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setActiveTab, addListing } = homeFeedSlice.actions;
export default homeFeedSlice.reducer;
