import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth({ children }) {
  const isLoggedIn = useSelector((state) => !!state.auth.user);
  const location = useLocation();

  if (!isLoggedIn) {
    // Redirect to login/signup with the current location as state
    // so we can redirect back after successful login
    return <Navigate to="/loginSignup" state={{ from: location }} replace />;
  }

  return children;
}
