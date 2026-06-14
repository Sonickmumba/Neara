import {
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import './App.css';

import { RequireAuth } from './components/RequireAuth';
import { RequirePhoneVerified } from './components/RequirePhoneVerified';
import { setupAuthInterceptor } from './services/api';
import { fetchCurrentUser } from './features/loginSignup/authSlice';
import { usePushNotifications } from './hooks/usePushNotifications';
import { Toaster } from 'sonner';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const Welcome = lazyNamed(() => import('./features/splash/Welcome'), 'Welcome');
const LocationPermission = lazyNamed(
  () => import('./features/splash/location/LocationPermission'),
  'LocationPermission'
);
const InterestsSelectionScreen = lazyNamed(
  () => import('./features/interest/InterestsSelection'),
  'InterestsSelectionScreen'
);
const LoginSignup = lazyNamed(
  () => import('./features/loginSignup/LoginSignup'),
  'LoginSignup'
);
const PhoneVerificationScreen = lazyNamed(
  () => import('./features/loginSignup/PhoneVerification'),
  'PhoneVerificationScreen'
);
const ResetPasswordPage = lazyNamed(
  () => import('./features/loginSignup/ResetPasswordPage'),
  'ResetPasswordPage'
);
const HomeFeed = lazyNamed(
  () => import('./features/homeScreen/HomeFeed'),
  'HomeFeed'
);
const HomeFeedLayout = lazyNamed(
  () => import('./features/homeScreen/components/HomeFeedLayout'),
  'HomeFeedLayout'
);
const Favorites = lazyNamed(
  () => import('./features/homeScreen/Favorites'),
  'Favorites'
);
const ListingDetails = lazyNamed(
  () => import('./features/homeScreen/ListingDetails'),
  'ListingDetails'
);
const MapViewScreen = lazyNamed(
  () => import('./features/mapView/MapViewScreen'),
  'MapViewScreen'
);
const CreateListing = lazyNamed(
  () => import('./components/CreateListing'),
  'CreateListing'
);
const HomeSearchResult = lazyNamed(
  () => import('./features/homeScreen/components/HomeSearchResult'),
  'HomeSearchResult'
);
const ChatConversationScreen = lazyNamed(
  () => import('./features/chat/ChatConversationScreen'),
  'ChatConversationScreen'
);
const MessageListScreen = lazyNamed(
  () => import('./features/chat/MessageListScreen'),
  'MessageListScreen'
);
const TradeNegotiation = lazyNamed(
  () => import('./features/trade/TradeNegotiation'),
  'TradeNegotiation'
);
const TradeManagementScreen = lazyNamed(
  () => import('./features/trade/TradeManagement'),
  'TradeManagementScreen'
);
const ReviewRating = lazyNamed(
  () => import('./features/trade/ReviewRating'),
  'ReviewRating'
);
const UserProfileScreen = lazyNamed(
  () => import('./features/user/UserProfile'),
  'UserProfileScreen'
);
const UserSettingsScreen = lazyNamed(
  () => import('./features/user/UserSettings'),
  'UserSettingsScreen'
);

function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Registers the service worker and auto-subscribes if permission already granted
  usePushNotifications();

  // Setup global auth interceptor for API calls
  useEffect(() => {
    return setupAuthInterceptor(navigate);
  }, [navigate]);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-white">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
              Loading...
            </div>
          }
        >
          <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/location" element={<LocationPermission />} />
          <Route
            path="/interests-selection"
            element={<InterestsSelectionScreen />}
          />
          <Route path="/loginSignup" element={<LoginSignup />} />
          <Route path="/verifyPhone" element={<PhoneVerificationScreen />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

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
                  {/* <RequirePhoneVerified> */}
                    <MessageListScreen />
                  {/* </RequirePhoneVerified> */}
                </RequireAuth>
              }
            />
            <Route
              path="chat-conversation/:conversationId"
              element={
                <RequireAuth>
                  {/* <RequirePhoneVerified> */}
                    <ChatConversationScreen />
                  {/* </RequirePhoneVerified> */}
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
                  {/* <RequirePhoneVerified> */}
                    <TradeManagementScreen />
                  {/* </RequirePhoneVerified>/ */}
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
                  {/* <RequirePhoneVerified> */}
                    <CreateListing
                      navigate={(path, state) => navigate(path, { state })}
                    />
                  {/* </RequirePhoneVerified> */}
                </RequireAuth>
              }
            />
            {/* additional nested paths (notifications, user-profile, etc.) can go here */}
          </Route>
          </Routes>
        </Suspense>
      </div>
    </>
  );
}

export default App;
