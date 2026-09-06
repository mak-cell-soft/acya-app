'use client';

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useEnterprise } from '@/hooks/use-enterprise';
import { PERMISSION_MODULES, PermissionModuleKey } from '@/types/permissions';

/**
 * Hook to centralize tenant-level feature flags and determine module availability.
 * 
 * WHY:
 * Enterprise tenants have different subscribed packages/modules (e.g. Construction / Chantier).
 * Rather than ad-hoc checks scattered across sidebar, dialogs, and permission guards,
 * this hook provides a unified authority that merges:
 * 1. Fresh enterprise settings returned by GET /Enterprise/getbyid/{id}
 * 2. Immediate JWT claims from the authenticated session store (useAuthStore)
 */
export function useTenantFeatures() {
  const user = useAuthStore((state) => state.user);
  const { data: enterprise } = useEnterprise();

  // NOTE: Fallback priority:
  // 1. Fresh enterprise query response if loaded
  // 2. JWT claim 'IsManagingConstructions' decoded in auth store
  // 3. Fallback to false for safety
  const isManagingConstructions = useMemo(() => {
    if (enterprise?.ismanagingconstructions !== undefined) {
      return Boolean(enterprise.ismanagingconstructions);
    }
    if (enterprise?.isManagingConstructions !== undefined) {
      return Boolean(enterprise.isManagingConstructions);
    }
    return Boolean(user?.isManagingConstructions);
  }, [enterprise, user?.isManagingConstructions]);

  /**
   * Checks whether a specific feature flag is active for the current tenant.
   */
  const isFeatureActive = useCallback(
    (featureKey?: string): boolean => {
      if (!featureKey) return true;

      switch (featureKey) {
        case 'isManagingConstructions':
          return isManagingConstructions;
        case 'isSalingWood':
          return Boolean(enterprise?.issalingwood ?? true);
        default:
          return true;
      }
    },
    [isManagingConstructions, enterprise?.issalingwood]
  );

  /**
   * Checks whether a permission module is available to the current tenant.
   */
  const isModuleAvailable = useCallback(
    (moduleKey: PermissionModuleKey): boolean => {
      const moduleDef = PERMISSION_MODULES.find((m) => m.key === moduleKey);
      if (!moduleDef) return true;
      return isFeatureActive(moduleDef.requiredFeature);
    },
    [isFeatureActive]
  );

  /**
   * Returns only the permission modules that are available for the current tenant.
   */
  const availableModules = useMemo(() => {
    return PERMISSION_MODULES.filter((m) => isFeatureActive(m.requiredFeature));
  }, [isFeatureActive]);

  return {
    isManagingConstructions,
    isFeatureActive,
    isModuleAvailable,
    availableModules,
  };
}
