import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppPermissionsMap } from '@/types/permissions';

interface User {
  id: string;
  email: string;
  fullname: string;
  role?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  defaultSite?: string;
  defaultSiteId?: string;
  permissions?: AppPermissionsMap | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        const decoded = parseJwt(token);
        if (decoded && decoded.Permissions) {
          try {
            user.permissions = JSON.parse(decoded.Permissions);
          } catch (e) {
            user.permissions = null;
          }
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
