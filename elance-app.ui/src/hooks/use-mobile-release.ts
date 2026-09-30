import { useQuery } from '@tanstack/react-query';
import { mobileReleaseService } from '@/services/components/mobile-release.service';
import { useAuthStore } from '@/store/use-auth-store';
import { MobileRelease } from '@/types/mobile';
import { AxiosError } from 'axios';

export function useCurrentMobileRelease() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantScopedKey = user?.enterpriseId || 'current-tenant';

  return useQuery<MobileRelease | null, Error>({
    queryKey: ['mobile-release', 'current', tenantScopedKey],
    queryFn: () => mobileReleaseService.getCurrentRelease(),
    enabled: !!isAuthenticated && !!user,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: Error) => {
      // Never retry on 404 (no release available) or 403 (unauthorized)
      if (error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
