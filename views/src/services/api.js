import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Global 401 interceptor setup function
export const setupAuthInterceptor = (navigate) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Redirect to login/signup on authentication errors
        navigate('/loginSignup');
      }
      return Promise.reject(error);
    }
  );
};

export default apiClient;
