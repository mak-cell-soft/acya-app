import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/components/document.service';
import { Document } from '@/types/document';
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
 * Hook to create a new sales/purchase document.
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newDoc: Partial<Document>) => documentService.add(newDoc),
    onSuccess: (response) => {
      // Invalidate both general documents list and type-specific lists
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] }); // Stock levels will change due to document retrieval/storage
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
