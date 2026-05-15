import api from '@/lib/axios';
import { useAuthStore } from '@/store/use-auth-store';
import { jwtDecode } from 'jwt-decode';

interface CustomJwtPayload {
  email?: string;
  name?: string;
  nameid?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'?: string;
  role?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
  EnterpriseId?: string;
  DefaultSite?: string;
  DefaultSiteId?: string;
  exp?: number;
}

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/Account/login', credentials);
    const { isSuccess, token } = response.data;
    
    if (isSuccess && token) {
      const userDetails = authService.getUserDetail(token);
      if (userDetails) {
        useAuthStore.getState().login(userDetails, token);
      }
    }
    return response.data;
  },
  
  getUserDetail: (token: string) => {
    try {
      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      return {
        id: decodedToken.nameid || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '',
        fullname: decodedToken.name || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '',
        email: decodedToken.email || decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '',
        role: decodedToken.role || decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
        enterpriseId: decodedToken.EnterpriseId,
        defaultSite: decodedToken.DefaultSite,
        defaultSiteId: decodedToken.DefaultSiteId
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  isTokenExpired: (token: string) => {
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  },
  
  register: async (userData: any) => {
    const response = await api.post('/Account/register', userData);
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post('/Account/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (dto: any) => {
    const response = await api.post('/Account/reset-password', dto);
    return response.data;
  },

  logout: () => {
    useAuthStore.getState().logout();
  },

  getRole: () => {
    return useAuthStore.getState().user?.role || null;
  },

  getEnterpriseId: () => {
    return useAuthStore.getState().user?.enterpriseId || null;
  },

  getDefaultSiteId: () => {
    return useAuthStore.getState().user?.defaultSiteId || null;
  },

  isLoggedIn: () => {
    const { isAuthenticated, token } = useAuthStore.getState();
    if (!isAuthenticated || !token) return false;
    return !authService.isTokenExpired(token);
  }
};
