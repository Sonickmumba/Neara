import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import './App.css';

import { Welcome } from './features/splash/Welcome';
import { LocationPermission } from './features/splash/location/LocationPermission';
import { InterestsSelectionScreen } from './features/interest/InterestsSelection';
import { LoginSignup } from './features/loginSignup/LoginSignup';
import { PhoneVerificationScreen } from './features/loginSignup/PhoneVerification';
import { HomeFeed } from './features/homeScreen/HomeFeed';
import { HomeFeedLayout } from './features/homeScreen/components/HomeFeedLayout';
import { Favorites } from './features/homeScreen/Favorites';
import { ListingDetails } from './features/homeScreen/ListingDetails';
import { MapViewScreen } from './features/mapView/MapViewScreen';
import { CreateListing } from './components/CreateListing';
import { HomeSearchResult } from './features/homeScreen/components/HomeSearchResult';
import { ChatConversationScreen } from './features/chat/ChatConversationScreen';
import { MessageListScreen } from './features/chat/MessageListScreen';
import { TradeNegotiation } from './features/trade/TradeNegotiation';
import { TradeManagementScreen } from './features/trade/TradeManagement';
import { ReviewRating } from './features/trade/ReviewRating';
import { UserProfileScreen } from './features/user/UserProfile';
import { UserSettingsScreen } from './features/user/UserSettings';

import { RequireAuth } from './components/RequireAuth';
import { RequirePhoneVerified } from './components/RequirePhoneVerified';
import { setupAuthInterceptor } from './services/api';
import { fetchCurrentUser } from './features/loginSignup/authSlice';
import { Toaster } from 'sonner';

function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Setup global auth interceptor for API calls
  useEffect(() => {
    setupAuthInterceptor(navigate);
  }, [navigate]);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/location" element={<LocationPermission />} />
          <Route
            path="/interests-selection"
            element={<InterestsSelectionScreen />}
          />
          <Route path="/loginSignup" element={<LoginSignup />} />
          <Route path="/verifyPhone" element={<PhoneVerificationScreen />} />

          <Route path="/homeFeed" element={<HomeFeedLayout />}>
            <Route index element={<HomeFeed />} />
            <Route path="favorites" element={<Favorites />} />
            <Route
              path="listing-details/:selectedListingId"
              element={<ListingDetails />}
            />
            <Route path="map" element={<MapViewScreen />} />
            <Route
              path="chat-list"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <MessageListScreen />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            <Route
              path="chat-conversation/:conversationId"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <ChatConversationScreen />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            <Route
              path="trade-negotiation"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <TradeNegotiation />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            <Route
              path="trade-management/:tradeId"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <TradeManagementScreen />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            <Route
              path="review-rating/:tradeId"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <ReviewRating />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            <Route
              path="user-profile"
              element={
                <RequireAuth>
                  <UserProfileScreen />
                </RequireAuth>
              }
            />
            <Route
              path="settings"
              element={
                <RequireAuth>
                  <UserSettingsScreen />
                </RequireAuth>
              }
            />
            <Route
              path="notifications"
              element={<div className="p-6">Notifications coming soon!</div>}
            />
            <Route path="search" element={<HomeSearchResult />} />

            <Route
              path="create-listing"
              element={
                <RequireAuth>
                  <RequirePhoneVerified>
                    <CreateListing
                      navigate={(path, state) => navigate(path, { state })}
                    />
                  </RequirePhoneVerified>
                </RequireAuth>
              }
            />
            {/* additional nested paths (notifications, user-profile, etc.) can go here */}
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
