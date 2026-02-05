import { createSlice } from '@reduxjs/toolkit';
import { CATEGORIES } from './categories';

const MIN_INTERESTS = 3;

const interestsSlice = createSlice({
  name: 'interests',
  initialState: {
    categories: CATEGORIES,
    selectedCategoryIds: [],
  },
  reducers: {
    toggleCategory(state, action) {
      const id = action.payload;

      if (state.selectedCategoryIds.includes(id)) {
        state.selectedCategoryIds = state.selectedCategoryIds.filter(
          (cid) => cid !== id
        );
      } else {
        state.selectedCategoryIds.push(id);
      }
    },
    setSelectedCategories(state, action) {
      state.selectedCategoryIds = action.payload;
    },
    clearSelectedCategories(state) {
      state.selectedCategoryIds = [];
    },
  },
});

export const {
  toggleCategory,
  setSelectedCategories,
  clearSelectedCategories,
} = interestsSlice.actions;

export const selectSelectedInterests = (state) =>
  state.interests.selectedCategoryIds;

export const selectIsInterestValid = (state) =>
  state.interests.selectedCategoryIds.length >= MIN_INTERESTS;

export default interestsSlice.reducer;
