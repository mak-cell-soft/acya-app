import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionService } from '@/services/production/production.service';
import {
  ProductionOrder,
  ProductionStep,
  ProductionInput,
  ProductionStatus,
  CreateProductionOrderInput,
  UpdateProductionOrderInput,
  CreateProductionStepInput,
  UpdateProductionStepInput,
  CreateProductionInputInput,
  CompleteStepInput,
  QuickCreateMerchandiseInput,
} from '@/types/production';
import { toast } from 'sonner';

export const PRODUCTION_QUERY_KEYS = {
  all: ['production'] as const,
  orders: () => [...PRODUCTION_QUERY_KEYS.all, 'orders'] as const,
  orderList: (params?: { status?: string; salesSiteId?: number; search?: string }) =>
    [...PRODUCTION_QUERY_KEYS.orders(), params] as const,
  orderDetails: () => [...PRODUCTION_QUERY_KEYS.all, 'detail'] as const,
  orderDetail: (id: number) => [...PRODUCTION_QUERY_KEYS.orderDetails(), id] as const,
};

export function useProductionOrdersList(params?: { status?: string; salesSiteId?: number; search?: string }) {
  return useQuery<ProductionOrder[]>({
    queryKey: PRODUCTION_QUERY_KEYS.orderList(params),
    queryFn: () => productionService.getAllOrders(params),
  });
}

export function useProductionOrderDetail(id?: number) {
  return useQuery<ProductionOrder>({
    queryKey: PRODUCTION_QUERY_KEYS.orderDetail(id ?? 0),
    queryFn: () => productionService.getOrderById(id!),
    enabled: !!id && id > 0,
  });
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductionOrderInput) => productionService.createOrder(data),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success(`Ordre de fabrication ${newOrder.reference} créé avec succès.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la création de l'ordre.");
    },
  });
}

export function useUpdateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductionOrderInput }) =>
      productionService.updateOrder(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(updated.id) });
      toast.success('Ordre de fabrication mis à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    },
  });
}

export function useDeleteProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Ordre de fabrication supprimé.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression.');
    },
  });
}

export function useStartProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionService.startOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(updated.id) });
      toast.success('Ordre de fabrication démarré.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors du démarrage.');
    },
  });
}

export function useValidateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionService.validateOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Ordre de fabrication validé ! Les stocks ont été mis à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la validation du stock.');
    },
  });
}

export function useCancelProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionService.cancelOrder(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Ordre annulé. Les stocks ont été réajustés.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de l'annulation.");
    },
  });
}

export function useAddProductionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: CreateProductionStepInput }) =>
      productionService.addStep(orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Étape ajoutée avec succès.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de l'ajout de l'étape.");
    },
  });
}

export function useUpdateProductionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId, data }: { stepId: number; orderId: number; data: UpdateProductionStepInput }) =>
      productionService.updateStep(stepId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Étape mise à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la mise à jour de l'étape.");
    },
  });
}

export function useDeleteProductionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId }: { stepId: number; orderId: number }) =>
      productionService.deleteStep(stepId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Étape supprimée.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la suppression de l'étape.");
    },
  });
}

export function useCompleteProductionStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId, data }: { stepId: number; orderId: number; data: CompleteStepInput }) =>
      productionService.completeStep(stepId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Étape terminée avec succès.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la finalisation de l'étape.");
    },
  });
}

export function useAddProductionInput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId, data }: { stepId: number; orderId: number; data: CreateProductionInputInput }) =>
      productionService.addInput(stepId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Matière ajoutée à l’étape.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de l'ajout de la matière.");
    },
  });
}

export function useDeleteProductionInput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inputId, orderId }: { inputId: number; orderId: number }) =>
      productionService.deleteInput(inputId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Matière supprimée.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la suppression de la matière.");
    },
  });
}

export function useQuickCreateMerchandise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuickCreateMerchandiseInput) => productionService.quickCreateMerchandise(data),
    onSuccess: (newMerch) => {
      queryClient.invalidateQueries({ queryKey: ['merchandises'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success(`Produit/Lot ${newMerch.packageReference} créé dans le catalogue.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du lot produit.');
    },
  });
}
