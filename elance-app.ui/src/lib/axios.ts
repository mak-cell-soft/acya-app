import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

/**
 * Custom axios instance for API calls
 */
export const getBaseApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}/api/`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://acya.site/api/';
};

const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // Slightly longer timeout
});

// Helper to extract the tenant slug from the current hostname or query parameters
const getTenantSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // 1. Resolve from subdomain
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 || (parts.length === 2 && host.endsWith('.localhost'))) {
    const potentialSlug = parts[0].toLowerCase();
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'dev', 'staging', 'mail'];
    if (!reservedSubdomains.includes(potentialSlug)) {
      return potentialSlug;
    }
  }

  // 2. Fallback to query string parameter for local development / testing
  const urlParams = new URLSearchParams(window.location.search);
  const queryTenant = urlParams.get('tenant');
  if (queryTenant) {
    return queryTenant.toLowerCase();
  }

  return null;
};

// Request interceptor for API calls
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Automatically inject the resolved tenant slug header
    const tenantSlug = getTenantSlug();
    if (tenantSlug && config.headers) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
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
      const data = error.response.data as any;
      if (data && (data.error === "your company is disabled contact administrator" || data.status === "Suspended")) {
        toast.error("your company is disabled contact administrator");
      } else {
        toast.error("Vous n'avez pas la permission d'effectuer cette action.");
      }
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
