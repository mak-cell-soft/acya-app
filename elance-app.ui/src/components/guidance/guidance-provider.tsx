'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import {
  useGuidanceStore,
  getGuidanceScopeKey,
  resolveCurrentTenantSlug,
} from '@/store/use-guidance-store';

interface GuidanceContextValue {
  scopeKey: string;
  tenantSlug: string;
  userId: string | null;
  isHelpDrawerOpen: boolean;
  setHelpDrawerOpen: (open: boolean) => void;
  hasHydrated: boolean;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export interface GuidanceProviderProps {
  children: React.ReactNode;
}

/**
 * GuidanceProvider establishes the active guidance scope (tenant + authenticated user)
 * and manages global guidance interactions like the persistent help drawer.
 */
export function GuidanceProvider({ children }: GuidanceProviderProps) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useGuidanceStore((state) => state._hasHydrated);
  const setHasHydrated = useGuidanceStore((state) => state.setHasHydrated);

  const [isHelpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Ensure hydration flag is initialized on mount if rehydrate completed
    if (!hasHydrated && typeof window !== 'undefined') {
      setHasHydrated(true);
    }
  }, [hasHydrated, setHasHydrated]);

  const tenantSlug = useMemo(() => resolveCurrentTenantSlug(), []);
  const userId = user?.id ? String(user.id) : null;

  const scopeKey = useMemo(() => {
    return getGuidanceScopeKey(tenantSlug, userId);
  }, [tenantSlug, userId]);

  const value = useMemo<GuidanceContextValue>(() => ({
    scopeKey,
    tenantSlug,
    userId,
    isHelpDrawerOpen,
    setHelpDrawerOpen,
    hasHydrated: mounted && hasHydrated,
  }), [scopeKey, tenantSlug, userId, isHelpDrawerOpen, mounted, hasHydrated]);

  return (
    <GuidanceContext.Provider value={value}>
      {children}
    </GuidanceContext.Provider>
  );
}

/**
 * Accesses the Guidance context directly.
 */
export function useGuidanceContext(): GuidanceContextValue {
  const context = useContext(GuidanceContext);
  if (!context) {
    throw new Error('useGuidanceContext must be used within a GuidanceProvider');
  }
  return context;
}
