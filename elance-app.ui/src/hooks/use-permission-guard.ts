import { useAuthStore } from '@/store/use-auth-store';
import { PermissionModuleKey, PermissionActionKey } from '@/types/permissions';

export function usePermissionGuard() {
  const user = useAuthStore((state) => state.user);

  // Helper to find module permissions case-insensitively
  const getModulePerms = (module: string) => {
    if (!user?.permissions) return null;
    const permsRecord = user.permissions as Record<string, any>;
    if (permsRecord[module]) return permsRecord[module];
    const key = Object.keys(permsRecord).find(k => k.toLowerCase() === module.toLowerCase());
    return key ? permsRecord[key] : null;
  };

  // Helper to find action value case-insensitively
  const getActionValue = (perms: any, action: string) => {
    if (!perms) return undefined;
    if (perms[action] !== undefined) return perms[action];
    const key = Object.keys(perms).find(k => k.toLowerCase() === action.toLowerCase());
    return key ? perms[key] : undefined;
  };

  // Helper to evaluate truthiness strictly but safely
  const isTruthy = (val: any) => val === true || val === 'true' || val === 'True' || val === 1;

  const hasPermission = (module: PermissionModuleKey, action: PermissionActionKey): boolean => {
    if (user?.role === 'SuperAdmin' || user?.role === '10') return true;

    const perms = getModulePerms(module);
    if (perms) {
      const val = getActionValue(perms, action);
      if (val !== undefined) return isTruthy(val);
    }

    if (user?.role === 'Admin' || user?.role === '20') return true;
    if (action === 'canRead') return true;

    return false;
  };

  const hasAnyPermission = (module: PermissionModuleKey): boolean => {
    if (user?.role === 'SuperAdmin' || user?.role === '10') return true;
    if (user?.role === 'Admin' || user?.role === '20') return true;

    const perms = getModulePerms(module);
    if (perms) {
      // If object is empty due to weird serialization, fallback to false
      if (Object.keys(perms).length === 0) return false;
      return Object.values(perms).some(isTruthy);
    }

    return true; // Fallback if no explicit permissions exist
  };

  return { hasPermission, hasAnyPermission };
}
