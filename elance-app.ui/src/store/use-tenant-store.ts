import { create } from 'zustand';

interface TenantBranding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  language: string | null;
  currency: string | null;
  status: string | null;
}

interface TenantState extends TenantBranding {
  setBranding: (branding: Partial<TenantBranding>) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  name: 'Élancé',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: null,
  language: null,
  currency: null,
  status: null,
  setBranding: (branding: Partial<TenantBranding>) => set((state: TenantState) => ({ ...state, ...branding })),
}));
