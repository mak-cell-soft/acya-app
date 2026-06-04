import { useAuthStore } from '@/store/use-auth-store';
import { PermissionModuleKey, PermissionActionKey } from '@/types/permissions';

export function usePermissionGuard() {
  const user = useAuthStore((state) => state.user);

  const hasPermission = (module: PermissionModuleKey, action: PermissionActionKey): boolean => {
    // 1. SuperAdmin (Role 10) bypasses all checks
    if (user?.role === 'SuperAdmin' || user?.role === '10') {
      return true;
    }

    // 2. Check explicit permissions
    if (user?.permissions && user.permissions[module]) {
      return user.permissions[module][action] === true;
    }

    // 3. Fallbacks if no explicit permissions exist
    // Admin (Role 20) gets all access by default
    if (user?.role === 'Admin' || user?.role === '20') {
      return true;
    }

    // Normal users default to Read-Only
    if (action === 'canRead') {
      return true;
    }

    return false;
  };

  return { hasPermission };
}
