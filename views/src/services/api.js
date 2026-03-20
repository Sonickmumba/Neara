import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Routes where a 401 should never trigger a redirect to /loginSignup.
// These pages are intentionally public and unauthenticated 401s are expected
// (e.g. fetchCurrentUser session bootstrap on /reset-password).
const PUBLIC_PATHS = [
  '/',
  '/loginSignup',
  '/verifyPhone',
  '/location',
  '/interests-selection',
  '/reset-password',
];

// Global 401 interceptor setup function
export const setupAuthInterceptor = (navigate) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const is401 = error.response?.status === 401;
      // Per-request opt-out: pass { skipAuthRedirect: true } in axios config
      const skipFlag = error.config?.skipAuthRedirect === true;
      const onPublicPage = PUBLIC_PATHS.some(
        (p) =>
          window.location.pathname === p ||
          window.location.pathname.startsWith(p + '?')
      );

      if (is401 && !skipFlag && !onPublicPage) {
        navigate('/loginSignup');
      }
      return Promise.reject(error);
    }
  );
};

export default apiClient;
