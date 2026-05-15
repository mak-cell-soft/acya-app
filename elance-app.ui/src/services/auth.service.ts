import api from '@/lib/axios';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    // Optional: call backend logout if needed
    // await api.post('/auth/logout');
  }
};
