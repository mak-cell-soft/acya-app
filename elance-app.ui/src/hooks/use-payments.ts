import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes } from '@/types/document';
import { Payment, SupplierEcheanceDto } from '@/types/payment';
import { toast } from 'sonner';

/**
 * Hook to retrieve invoices for a supplier.
 * Fetches all supplier invoices (type 3) and filters them on the client
 * to match the given supplierId.
 */
export function useSupplierInvoices(supplierId: number | null) {
  return useQuery({
    queryKey: ['invoices', 'supplier', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const data = await documentService.getByType(DocumentTypes.supplierInvoice);
      return (data || []).filter((doc: any) => doc.counterpart?.id === supplierId);
    },
    enabled: !!supplierId,
  });
}

/**
 * Hook to retrieve payment traites/cheques history for a supplier.
 */
export function useSupplierTraites(supplierId: number | null) {
  return useQuery<Payment[]>({
    queryKey: ['traites', 'supplier', supplierId],
    queryFn: () => paymentService.getTraitesBySupplierId(supplierId!),
    enabled: !!supplierId,
  });
}

/**
 * Hook to retrieve echeances (due-date payment projections) within N days.
 */
export function useEcheances(projectionDays: number) {
  return useQuery<SupplierEcheanceDto[]>({
    queryKey: ['echeances', projectionDays],
    queryFn: () => {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + projectionDays);
      return paymentService.getEcheances(fromDate, toDate);
    },
  });
}

/**
 * Hook to mark a payment instrument (traite/cheque) as paid at bank.
 */
export function useMarkTraiteAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ instrumentId, paidAtBankDate, notes }: { instrumentId: number; paidAtBankDate: Date; notes?: string }) =>
      paymentService.markTraiteAsPaid(instrumentId, { paidAtBankDate, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traites'] });
      queryClient.invalidateQueries({ queryKey: ['echeances'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Traite confirmée payée en banque.');
    },
    onError: (error: any) => {
      console.error('Error settling traite:', error);
      toast.error('Erreur lors de la validation du paiement.');
    },
  });
}

/**
 * Hook to record a new payment.
 */
export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => paymentService.add(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['traites'] });
      queryClient.invalidateQueries({ queryKey: ['echeances'] });
      toast.success('Paiement enregistré avec succès.');
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement.');
    },
  });
}

/**
 * Hook to update an existing payment.
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => paymentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['traites'] });
      queryClient.invalidateQueries({ queryKey: ['echeances'] });
      toast.success('Paiement mis à jour avec succès.');
    },
    onError: (error: any) => {
      console.error('Error updating payment:', error);
      toast.error('Erreur lors de la modification du paiement.');
    },
  });
}
