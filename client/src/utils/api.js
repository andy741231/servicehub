import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest.url?.includes('/auth/login');
    // Only attempt a Hub token refresh when a Hub session is believed active —
    // a directory-only saint's 401s must not churn the Hub refresh endpoint.
    const { isAuthenticated } = useAuthStore.getState();
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest && isAuthenticated) {
      originalRequest._retry = true;

      // Share a single in-flight refresh so simultaneous 401s don't race and
      // invalidate each other's rotated refresh tokens.
      if (!refreshPromise) {
        refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true, timeout: 5000 })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        if (isAuthenticated) {
          useAuthStore.getState().setState({
            wasLoggedIn: true,
            showLoggedOutMessage: true,
            isAuthenticated: false,
            user: null,
          });
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
