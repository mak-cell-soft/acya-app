import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/components/document.service';
import { Document, TypeDocsFilter } from '@/types/document';
import { toast } from 'sonner';

/**
 * Hook to retrieve all documents.
 */
export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => documentService.getAll(),
  });
}

/**
 * Hook to retrieve documents of a specific type (e.g. 5 for Bon de Livraison).
 */
export function useDocumentsByType(type: number) {
  return useQuery<Document[]>({
    queryKey: ['documents', 'type', type],
    queryFn: () => documentService.getByType(type),
    enabled: typeof type === 'number',
  });
}

/**
 * Hook to retrieve documents of a specific type filtered by date.
 */
export function useDocumentsByTypeFiltered(filter: TypeDocsFilter) {
  return useQuery<Document[]>({
    queryKey: ['documents', 'filtered', filter.typeDoc, filter.year, filter.month, filter.day],
    queryFn: () => documentService.getByTypeDocsFiltered(filter),
    enabled: typeof filter.typeDoc === 'number' && typeof filter.year === 'number' && typeof filter.month === 'number',
    // Always re-fetch when the sales page is mounted (e.g. after navigating back from /bl/new)
    // This ensures a freshly created document always appears without a manual reload.
    refetchOnMount: 'always',
  });
}


/**
 * Hook to create a new sales/purchase document.
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newDoc: Partial<Document>) => documentService.add(newDoc),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success(`Document créé avec succès (Réf: ${response.docRef || ''})`);
    },
    onError: (error: any) => {
      console.error('Error creating document:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de la création du document';
      toast.error(errorMsg);
    },
  });
}

/**
 * Hook to convert a document (e.g., Bon de Livraison -> Facture).
 */
export function useConvertDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentId, model }: { parentId: number; model: any }) =>
      documentService.convert(parentId, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document converti avec succès');
    },
    onError: (error: any) => {
      console.error('Error converting document:', error);
      toast.error('Erreur lors de la conversion du document');
    },
  });
}

/**
 * Hook to create invoice from one or more Delivery Notes.
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (model: any) => documentService.createInvoice(model),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Facture créée avec succès (Réf: ${response.docRef || ''})`);
    },
    onError: (error: any) => {
      console.error('Error creating invoice:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de la création de la facture';
      toast.error(errorMsg);
    },
  });
}

/**
 * Hook to delete a document (soft delete).
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => documentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success('Document supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    },
  });
}

