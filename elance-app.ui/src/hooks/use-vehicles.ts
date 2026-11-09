import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/components/vehicle.service';
import { Vehicle } from '@/types/vehicle';
import { usePermissionGuard } from '@/hooks/use-permission-guard';

export function useVehicles(isowned?: boolean) {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', { isowned }],
    queryFn: async () => {
      const data = await vehicleService.getAll(isowned);
      return data || [];
    },
    enabled: canRead,
    staleTime: 1000 * 60 * 2,
  });
}

