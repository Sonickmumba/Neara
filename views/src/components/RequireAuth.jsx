import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth({ children }) {
  const isLoggedIn = useSelector((state) => !!state.auth.user);
  const bootstrapStatus = useSelector((state) => state.auth.bootstrapStatus);
  const location = useLocation();

  if (bootstrapStatus === 'idle' || bootstrapStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Checking session...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    // Redirect to login/signup with the current location as state
    // so we can redirect back after successful login
    return <Navigate to="/loginSignup" state={{ from: location }} replace />;
  }

  return children;
}
