import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { PaymentInstrumentExtendedDto, CreateBordereauDto, PendingBordereauDto } from '@/types/payment';
import { toast } from 'sonner';

export function usePaymentInstruments(isPaidOrVersed?: boolean) {
  return useQuery<PaymentInstrumentExtendedDto[]>({
    queryKey: ['payment-instruments', isPaidOrVersed],
    queryFn: () => paymentService.getInstruments(isPaidOrVersed),
  });
}

export function useCreateBordereau() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBordereauDto) => paymentService.createBordereau(data),
    onSuccess: () => {
      toast.success('Bordereau créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du bordereau');
    }
  });
}

export function usePendingBordereaux() {
  return useQuery<PendingBordereauDto[]>({
    queryKey: ['pending-bordereaux'],
    queryFn: () => paymentService.getPendingBordereaux(),
  });
}

export function useRemoveInstrumentFromBordereau() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reference, instrumentId }: { reference: string; instrumentId: number }) => 
      paymentService.removeInstrumentFromBordereau(reference, instrumentId),
    onSuccess: () => {
      toast.success('Instrument retiré du bordereau');
      queryClient.invalidateQueries({ queryKey: ['pending-bordereaux'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instruments'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du retrait de l\'instrument');
    }
  });
}

export function useValidateBordereau() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reference: string) => paymentService.validateBordereau(reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-bordereaux'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-payments'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success("Bordereau validé avec succès");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erreur lors de la validation du bordereau");
    }
  });
}

// ==========================================
// Encaissement ultérieur de la Traite
// ==========================================

export function usePendingTraitesToClear() {
  return useQuery({
    queryKey: ['pending-traites-to-clear'],
    queryFn: () => paymentService.getPendingTraitesToClear(),
  });
}

export function useClearTraite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instrumentId: number) => paymentService.clearTraite(instrumentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-traites-to-clear'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success("Traite encaissée avec succès");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erreur lors de l'encaissement de la traite");
    }
  });
}
