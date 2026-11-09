import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryTrackingService } from '@/services/components/delivery-tracking.service';
import { 
  DeliveryTrackingFilter, 
  CreateDeliveryTrackingDto, 
  UpdateDeliveryTrackingDto 
} from '@/types/delivery-tracking';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { toast } from 'sonner';

export function useVehicleDeliveryHistory(vehicleId: number, filter?: DeliveryTrackingFilter) {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery({
    queryKey: ['vehicle-delivery-history', vehicleId, filter],
    queryFn: () => deliveryTrackingService.getByVehicle(vehicleId, filter),
    enabled: canRead && vehicleId > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useVehicleDeliveryStats(vehicleId: number, startDate?: string, endDate?: string) {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery({
    queryKey: ['vehicle-delivery-stats', vehicleId, startDate, endDate],
    queryFn: () => deliveryTrackingService.getVehicleStats(vehicleId, startDate, endDate),
    enabled: canRead && vehicleId > 0,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useDocumentDeliveryTracking(documentId: number) {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery({
    queryKey: ['delivery-tracking-document', documentId],
    queryFn: () => deliveryTrackingService.getByDocument(documentId),
    enabled: canRead && documentId > 0,
    staleTime: 1000 * 60,
  });
}

export function useFleetCustomers() {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery({
    queryKey: ['fleet-customers'],
    queryFn: () => deliveryTrackingService.getFleetCustomers(),
    enabled: canRead,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomerDeliveryHistory(customerId: number, filter?: DeliveryTrackingFilter) {
  const { hasPermission } = usePermissionGuard();
  const canRead = hasPermission('vehicles', 'canRead');

  return useQuery({
    queryKey: ['customer-delivery-history', customerId, filter],
    queryFn: () => deliveryTrackingService.getByCustomer(customerId, filter),
    enabled: canRead && customerId > 0,
  });
}

export function useCreateDeliveryTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDeliveryTrackingDto) => deliveryTrackingService.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-delivery-history', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-delivery-stats', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking-document', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['fleet-customers'] });
    },
    onError: (error: any) => {
      console.error('Error creating delivery tracking:', error);
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deliveryTrackingService.complete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-delivery-history'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-delivery-stats'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking-document'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Retour du véhicule enregistré avec succès !');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Erreur lors de l\'enregistrement du retour.';
      console.error('Error completing delivery:', error);
      toast.error(msg);
    },
  });
}

