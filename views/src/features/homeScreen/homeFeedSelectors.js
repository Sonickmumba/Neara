// import { createSelector } from '@reduxjs/toolkit';
// import { homeFeedAdapter } from './homeFeedSlice';
// /**
//  * Base selector
//  */
// export const selectHomeFeedState = (state) =>
//   state.homeFeed ?? homeFeedAdapter.getInitialState({
//     status: 'idle',
//     error: null,
//     activeTab: 'all',
//     nextCursor: null,
//   });


  

// /**
//  * Entity selectors
//  */
// export const {
//   selectAll: selectAllListings,
//   selectById: selectListingById,
//   selectIds: selectListingIds,
// } = {
//   selectAll: (state) =>
//     selectHomeFeedState(state).ids.map(
//       (id) => selectHomeFeedState(state).entities[id]
//     ),

//   selectById: (state, id) =>
//     selectHomeFeedState(state).entities[id],

//   selectIds: (state) =>
//     selectHomeFeedState(state).ids,
// };

// /**
//  * UI selectors
//  */
// export const selectFeedStatus = (state) =>
//   selectHomeFeedState(state).status;

// export const selectNextCursor = (state) =>
//   selectHomeFeedState(state).nextCursor;

// export const selectActiveTab = (state) =>
//   selectHomeFeedState(state).activeTab;

// /**
//  * Derived selector: tab filtering
//  */
// export const selectFilteredListings = createSelector(
//   [selectAllListings, selectActiveTab],
//   (listings, activeTab) => {
//     switch (activeTab) {
//       case 'offers':
//         return listings.filter((l) => l.type === 'offer');
//       case 'needs':
//         return listings.filter((l) => l.type === 'need');
//       default:
//         return listings;
//     }
//   }
// );



// features/homeFeed/homeFeedSelectors.js
import { createSelector } from '@reduxjs/toolkit';
import { homeFeedAdapter } from './homeFeedSlice';

/**
 * Base selector
 */
// const selectHomeFeedState = (state) => state.homeFeed;
const selectHomeFeedState = (state) => {
  console.log('homeFeed slice:', state.homeFeed);
  return state.homeFeed;
};


/**
 * Entity selectors (CORRECT WAY)
 */
export const {
  selectAll: selectAllListings,
  selectById: selectListingById,
  selectIds: selectListingIds,
} = homeFeedAdapter.getSelectors(selectHomeFeedState);

/**
 * UI selectors
 */
export const selectFeedStatus = (state) =>
  selectHomeFeedState(state).status;

export const selectNextCursor = (state) =>
  selectHomeFeedState(state).nextCursor;

export const selectActiveTab = (state) =>
  selectHomeFeedState(state).activeTab;

/**
 * Derived selector
 */
export const selectFilteredListings = createSelector(
  [selectAllListings, selectActiveTab],
  (listings, activeTab) => {
    if (!listings) return [];

    switch (activeTab) {
      case 'offers':
        return listings.filter((l) => l.type === 'offer');
      case 'needs':
        return listings.filter((l) => l.type === 'need');
      default:
        return listings;
    }
  }
);

