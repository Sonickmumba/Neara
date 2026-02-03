import { configureStore } from '@reduxjs/toolkit';
import locationPermissionReducer from '../features/splash/location/locationPermissionSlice';

const store = configureStore({
  reducer: {
    locationPermission: locationPermissionReducer,
    // auth: authReducer,
    // homeFeed: homeFeedReducer,
    // listings: listingsReducer,
    // notifications: notificationsReducer,
    // user: userReducer,
  },
});

export default store;
