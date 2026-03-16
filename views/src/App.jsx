import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { useEffect } from 'react';

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
import { CreateListing } from './components/CreateListing';
import { HomeSearchResult } from './features/homeScreen/components/HomeSearchResult';

import { RequireAuth } from './components/RequireAuth';
import { setupAuthInterceptor } from './services/api';
import { Toaster } from 'sonner';

function App() {
  const navigate = useNavigate();

  // Setup global auth interceptor for API calls
  useEffect(() => {
    setupAuthInterceptor(navigate);
  }, [navigate]);

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
            <Route
              path="map"
              element={<div className="p-6">Map view coming soon!</div>}
            />
            <Route
              path="chat-list"
              element={<div className="p-6">Chat list coming soon!</div>}
            />
            <Route
              path="user-profile"
              element={<div className="p-6">User profile coming soon!</div>}
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
                  <CreateListing
                    navigate={(path, state) => navigate(path, { state })}
                  />
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
