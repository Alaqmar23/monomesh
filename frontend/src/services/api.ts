import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    // If backend wrapped in ApiResponse { success, data, error }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        const errorMsg = response.data.error?.message || 'Operation failed on server.';
        return Promise.reject(new Error(errorMsg));
      }
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Network error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;
