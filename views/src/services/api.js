import axios from 'axios';

// In production the frontend is served by Express on the same origin,
// so an empty base URL makes all /api/* calls relative to the current host.
// In development, set VITE_BASE_URL=http://localhost:3000 in views/.env
// or rely on the Vite dev-server proxy in vite.config.js.
const BASE_URL = import.meta.env.VITE_BASE_URL || '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let csrfToken = null;
let csrfTokenPromise = null;

const isUnsafeMethod = (method) =>
  UNSAFE_METHODS.has(String(method || 'get').toLowerCase());

const fetchCsrfToken = async () => {
  if (csrfToken) return csrfToken;

  if (!csrfTokenPromise) {
    csrfTokenPromise = apiClient
      .get('/api/csrf-token', {
        skipAuthRedirect: true,
        skipCsrf: true,
      })
      .then((response) => {
        csrfToken = response.data?.csrfToken || null;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
};

apiClient.interceptors.request.use(async (config) => {
  if (!config.skipCsrf && isUnsafeMethod(config.method)) {
    const token = await fetchCsrfToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = token;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config || {};
    const isCsrfFailure =
      error.response?.status === 403 &&
      error.response?.data?.message === 'Invalid CSRF token';

    if (
      isCsrfFailure &&
      !originalConfig.__csrfRetry &&
      !originalConfig.skipCsrf &&
      isUnsafeMethod(originalConfig.method)
    ) {
      csrfToken = error.response?.data?.csrfToken || null;
      csrfTokenPromise = null;

      const token = csrfToken || (await fetchCsrfToken());

      if (token) {
        originalConfig.__csrfRetry = true;
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers['X-CSRF-Token'] = token;
        return apiClient(originalConfig);
      }
    }

    return Promise.reject(error);
  }
);

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
  const interceptorId = apiClient.interceptors.response.use(
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

  return () => apiClient.interceptors.response.eject(interceptorId);
};

export default apiClient;
