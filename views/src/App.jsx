import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import './App.css';

import { Welcome } from './features/splash/Welcome';
import { LocationPermission } from './features/splash/location/LocationPermission';
import { InterestsSelectionScreen } from './features/interest/InterestsSelection';
import { LoginSignup } from './features/loginSignup/LoginSignup';
import { PhoneVerificationScreen } from './features/loginSignup/PhoneVerification';
import { HomeFeed } from './features/homeScreen/HomeFeed';
import { HomeFeedLayout } from './features/homeScreen/components/HomeFeedLayout';
import { Favorites } from './features/homeScreen/Favorites';
import { CreateListing } from './components/CreateListing';
import { Toaster } from 'sonner';

function App() {
  const navigate = useNavigate();
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
            <Route path="create-listing" element={<CreateListing navigate={(path, state) => navigate(path, { state })} />} />
            {/* additional nested paths (notifications, user-profile, etc.) can go here */}
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
