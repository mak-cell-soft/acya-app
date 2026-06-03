import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { CreateRecouvrementDto, CustomerRecouvrementDto } from '@/types/payment';

export function useCustomerRecouvrement(customerId: number, enabled: boolean = true) {
  return useQuery<CustomerRecouvrementDto>({
    queryKey: ['recouvrement', customerId],
    queryFn: () => paymentService.getCustomerRecouvrement(customerId),
    enabled: enabled && !!customerId,
  });
}

export function useCreateRecouvrement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRecouvrementDto) => paymentService.createRecouvrement(payload),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['recouvrement', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.customerId] });
    },
  });
}
