import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

/**
 * Custom axios instance for API calls
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://acya.site/api/',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // Slightly longer timeout
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors (token expired, etc.)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // If we're on the client side, clear auth and redirect
      if (typeof window !== 'undefined') {
        const { logout } = useAuthStore.getState();
        logout();
        
        // Don't toast if we're already on the login page
        if (!window.location.pathname.includes('/login')) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          window.location.href = '/login';
        }
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error("Vous n'avez pas la permission d'effectuer cette action.");
    }

    // Handle 500+ Server Errors
    if (error.response?.status && error.response.status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer plus tard.');
    }

    // Pass the error through
    return Promise.reject(error);
  }
);

export default api;
