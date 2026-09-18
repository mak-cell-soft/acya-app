import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appVariableService } from '@/services/configuration/app-variable.service';
import { 
  EmployeeRole, 
  EmployeeRolesConfig, 
  DEFAULT_EMPLOYEE_ROLES, 
  ROLE_LABELS 
} from '@/types/team';
import { toast } from 'sonner';
import { useMemo, useCallback } from 'react';

/**
 * Hook to retrieve and cache the current tenant's configurable employee functions/roles.
 * Safely falls back to DEFAULT_EMPLOYEE_ROLES if the API is loading, empty, or fails.
 */
export function useEmployeeRoles() {
  const query = useQuery<EmployeeRolesConfig>({
    queryKey: ['employee-roles'],
    queryFn: async () => {
      const data = await appVariableService.getEmployeeRoles();
      if (!data || !Array.isArray(data.roles)) {
        return { roles: DEFAULT_EMPLOYEE_ROLES };
      }
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const roles: EmployeeRole[] = useMemo(() => {
    if (query.data?.roles && query.data.roles.length > 0) {
      return query.data.roles;
    }
    return DEFAULT_EMPLOYEE_ROLES;
  }, [query.data]);

  const activeRoles: EmployeeRole[] = useMemo(() => {
    return roles.filter((r) => r.isActive);
  }, [roles]);

  /**
   * Helper to resolve the human-readable label for any role identifier / code.
   * Checks dynamic roles first, then fallback to built-in ROLE_LABELS (Admin, Utilisateur, etc.).
   */
  const getRoleLabel = useCallback((roleValue: number | string | undefined | null): string => {
    if (roleValue === undefined || roleValue === null || roleValue === '') return '';

    const num = typeof roleValue === 'string' ? parseInt(roleValue, 10) : roleValue;

    // 1. Check dynamic configured roles by code
    if (!isNaN(num)) {
      const matchByCode = roles.find((r) => r.code === num);
      if (matchByCode) return matchByCode.name;
    }

    // 2. Check dynamic configured roles by string id/slug
    const strVal = roleValue.toString();
    const matchById = roles.find((r) => r.id === strVal);
    if (matchById) return matchById.name;

    // 3. Fallback to built-in ROLE_LABELS (e.g., 10: Super Admin, 20: Admin, 30: Utilisateur)
    if (!isNaN(num) && ROLE_LABELS[num]) {
      return ROLE_LABELS[num];
    }

    return isNaN(num) ? strVal : `Rôle ${num}`;
  }, [roles]);

  return {
    roles,
    activeRoles,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    getRoleLabel,
  };
}

/**
 * Mutation hook to persist changes to the tenant's ROLES AppVariable.
 */
export function useUpdateEmployeeRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newConfig: EmployeeRolesConfig) =>
      appVariableService.saveEmployeeRoles(newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Configuration des fonctions enregistrée avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating employee roles:', error);
      const msg = error?.response?.data?.message || 'Erreur lors de l\'enregistrement des fonctions.';
      toast.error(msg);
    },
  });
}
