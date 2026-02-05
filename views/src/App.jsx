import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  // useNavigate,
} from 'react-router-dom';

import './App.css';

import { Welcome } from './features/splash/Welcome';
import { LocationPermission } from './features/splash/location/LocationPermission';
import { InterestsSelectionScreen } from './features/interest/InterestsSelection';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/location" element={<LocationPermission />} />
          <Route path="/interests-selection" element={<InterestsSelectionScreen />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
