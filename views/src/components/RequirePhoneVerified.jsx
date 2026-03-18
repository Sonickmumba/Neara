import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export function RequirePhoneVerified({ children }) {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/loginSignup" replace state={{ from: location }} />;
  }

  if (!user.phone_verified) {
    return (
      <Navigate
        to="/verifyPhone"
        replace
        state={{
          phone: user.phone || '',
          returnTo: `${location.pathname}${location.search || ''}`,
          allowSkip: false,
        }}
      />
    );
  }

  return children;
}
