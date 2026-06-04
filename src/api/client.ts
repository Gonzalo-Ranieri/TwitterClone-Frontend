import axios from 'axios';
import { toast } from 'sonner';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add the Bearer token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 logout + global error toasts for 4xx/5xx
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Dispatch a custom event to notify the application to log out the user
      window.dispatchEvent(new Event('auth-logout'));
    } else if (status >= 400) {
      // Extract the most useful error message available
      const apiMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : null);

      const message = apiMessage || 'Error de red. Inténtalo de nuevo.';
      toast.error(message, { id: `http-error-${status}` });
    } else if (!error.response) {
      // Network-level error (no response at all)
      toast.error('Sin conexión al servidor.', { id: 'network-error' });
    }

    return Promise.reject(error);
  }
);

export default client;

