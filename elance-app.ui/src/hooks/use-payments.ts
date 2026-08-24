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
    queryKey: ['echeances', 'purchase', projectionDays],
    queryFn: () => {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + projectionDays);
      return paymentService.getEcheances(fromDate, toDate, 'purchase');
    },
  });
}

/**
 * Hook to retrieve sales/payments echeances (due-date payment projections) within N days.
 */
export function useSalesEcheances(projectionDays: number) {
  return useQuery<SupplierEcheanceDto[]>({
    queryKey: ['echeances', 'sale', projectionDays],
    queryFn: () => {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + projectionDays);
      return paymentService.getEcheances(fromDate, toDate, 'sale');
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
      paymentService.markTraiteAsPaid(instrumentId, { paidAtBankDate: paidAtBankDate.toISOString(), notes }),
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

/**
 * Hook to delete an existing payment.
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['traites'] });
      queryClient.invalidateQueries({ queryKey: ['echeances'] });
      toast.success('Paiement supprimé avec succès.');
    },
    onError: (error: any) => {
      console.error('Error deleting payment:', error);
      toast.error('Erreur lors de la suppression du paiement.');
    },
  });
}

/**
 * Hook to retrieve all supplier payments (both Traites and Cheques) across all suppliers.
 */
export function useAllSupplierTraites() {
  return useQuery<Payment[]>({
    queryKey: ['all-supplier-traites'],
    queryFn: async () => {
      const data = await paymentService.deepSearch({
        counterpartType: 'Supplier',
        pageSize: 100000,
        pageNumber: 1
      });
      // deepSearch returns { items: Payment[], totalCount: number }
      const items = (data as any)?.items || [];
      // Filter client-side to only keep CHEQUE and TRAITE methods which have instrument details
      return items.filter((p: Payment) => p.paymentMethod === 'TRAITE' || p.paymentMethod === 'CHEQUE');
    }
  });
}

