import { configureStore } from '@reduxjs/toolkit';
import locationPermissionReducer from '../features/splash/location/locationPermissionSlice';
import interestsReducer from './../features/interest/interestsSelectionSlice';

const store = configureStore({
  reducer: {
    locationPermission: locationPermissionReducer,
    interests: interestsReducer,
    
    // auth: authReducer,
    // homeFeed: homeFeedReducer,
    // listings: listingsReducer,
    // notifications: notificationsReducer,
    // user: userReducer,
  },
});

export default store;
