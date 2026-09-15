import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/components/inventory.service';
import { Document } from '@/types/document';
import { toast } from 'sonner';

/**
 * Hook to retrieve all inventory documents.
 */
export function useInventories() {
  return useQuery<Document[]>({
    queryKey: ['inventories'],
    queryFn: () => inventoryService.getAll(),
  });
}

/**
 * Hook to retrieve a single inventory document by id.
 */
export function useInventory(id: number | null | undefined) {
  return useQuery<Document>({
    queryKey: ['inventory', id],
    queryFn: () => inventoryService.getById(id!),
    enabled: !!id && !isNaN(id),
  });
}

/**
 * Hook to create a new physical inventory document.
 */
export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newDoc: Partial<Document>) => inventoryService.add(newDoc),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      // Invalidate stock to reflect any potential updates, though stock is updated on validation
      queryClient.invalidateQueries({ queryKey: ['stocks'] }); 
      toast.success(`Inventaire enregistré avec succès (Réf: ${response?.docRef || response?.docnumber || ''})`);
    },
    onError: (error: any) => {
      console.error('Error creating inventory:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'inventaire';
      toast.error(errorMsg);
    },
  });
}

/**
 * Hook to validate a physical inventory document.
 */
export function useValidateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => inventoryService.validate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success(response?.message || 'Inventaire validé avec succès. Les stocks ont été mis à jour.');
    },
    onError: (error: any) => {
      console.error('Error validating inventory:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de la validation de l\'inventaire';
      toast.error(errorMsg);
    },
  });
}

/**
 * Hook to update an existing physical inventory document.
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, doc }: { id: number; doc: Partial<Document> }) => 
      inventoryService.update(id, doc),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast.success(`Inventaire mis à jour avec succès (Réf: ${response?.docRef || ''})`);
    },
    onError: (error: any) => {
      console.error('Error updating inventory:', error);
      const errorMsg = error.response?.data?.message || error.response?.data || 'Erreur lors de la mise à jour de l\'inventaire';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Erreur lors de la mise à jour de l\'inventaire');
    },
  });
}

