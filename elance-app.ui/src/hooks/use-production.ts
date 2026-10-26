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
  ProductionStepWorker,
  CreateProductionStepWorkerInput,
  UpdateProductionStepWorkerInput,
  ProductionStepWorkLog,
  CreateProductionStepWorkLogInput,
  UpdateProductionStepWorkLogInput,
  ProductionOtherWorkEntry,
  CreateProductionOtherWorkEntryInput,
  UpdateProductionOtherWorkEntryInput,
  MonthlyEmployeePayableSummary,
} from '@/types/production';
import { toast } from 'sonner';

export const PRODUCTION_QUERY_KEYS = {
  all: ['production'] as const,
  orders: () => [...PRODUCTION_QUERY_KEYS.all, 'orders'] as const,
  orderList: (params?: { status?: string; salesSiteId?: number; search?: string }) =>
    [...PRODUCTION_QUERY_KEYS.orders(), params] as const,
  orderDetails: () => [...PRODUCTION_QUERY_KEYS.all, 'detail'] as const,
  orderDetail: (id: number) => [...PRODUCTION_QUERY_KEYS.orderDetails(), id] as const,
  stepWorkers: (stepId: number) => [...PRODUCTION_QUERY_KEYS.all, 'step-workers', stepId] as const,
  stepWorkLogs: (stepId: number) => [...PRODUCTION_QUERY_KEYS.all, 'step-work-logs', stepId] as const,
  otherWork: (params?: { startDate?: string; endDate?: string; personId?: number }) =>
    [...PRODUCTION_QUERY_KEYS.all, 'other-work', params] as const,
  monthlyPayables: (year: number, month: number) =>
    [...PRODUCTION_QUERY_KEYS.all, 'monthly-payables', year, month] as const,
  allMonthlyPayables: () => [...PRODUCTION_QUERY_KEYS.all, 'monthly-payables'] as const,
};

export function useProductionOrdersList(
  params?: { status?: string; salesSiteId?: number; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery<ProductionOrder[]>({
    queryKey: PRODUCTION_QUERY_KEYS.orderList(params),
    queryFn: () => productionService.getAllOrders(params),
    enabled: options?.enabled ?? true,
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

// ── Step Workers Hooks ────────────────────────────────────────────────────────

export function useStepWorkers(stepId?: number) {
  return useQuery<ProductionStepWorker[]>({
    queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId ?? 0),
    queryFn: () => productionService.getStepWorkers(stepId!),
    enabled: !!stepId && stepId > 0,
  });
}

export function useAddStepWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId, data }: { stepId: number; orderId: number; data: CreateProductionStepWorkerInput }) =>
      productionService.addStepWorker(stepId, data),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Ouvrier affecté à l’étape.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de l’affectation de l’ouvrier.');
    },
  });
}

export function useUpdateStepWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, stepId, orderId, data }: { workerId: number; stepId: number; orderId: number; data: UpdateProductionStepWorkerInput }) =>
      productionService.updateStepWorker(workerId, data),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      toast.success('Affectation mise à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la mise à jour de l’affectation.');
    },
  });
}

export function useDeleteStepWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, stepId, orderId }: { workerId: number; stepId: number; orderId: number }) =>
      productionService.deleteStepWorker(workerId),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      toast.success('Affectation retirée avec succès.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Impossible de supprimer cette affectation.');
    },
  });
}

// ── Step Work Logs Hooks ──────────────────────────────────────────────────────

export function useStepWorkLogs(stepId?: number) {
  return useQuery<ProductionStepWorkLog[]>({
    queryKey: PRODUCTION_QUERY_KEYS.stepWorkLogs(stepId ?? 0),
    queryFn: () => productionService.getStepWorkLogs(stepId!),
    enabled: !!stepId && stepId > 0,
  });
}

export function useAddStepWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, orderId, data }: { stepId: number; orderId: number; data: CreateProductionStepWorkLogInput }) =>
      productionService.addStepWorkLog(stepId, data),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkLogs(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Session de travail enregistrée.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de l’enregistrement de la session de travail.');
    },
  });
}

export function useUpdateStepWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workLogId, stepId, orderId, data }: { workLogId: number; stepId: number; orderId: number; data: UpdateProductionStepWorkLogInput }) =>
      productionService.updateStepWorkLog(workLogId, data),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkLogs(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Session de travail mise à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification de la session de travail.');
    },
  });
}

export function useDeleteStepWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workLogId, stepId, orderId }: { workLogId: number; stepId: number; orderId: number }) =>
      productionService.deleteStepWorkLog(workLogId),
    onSuccess: (_, { stepId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkLogs(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.stepWorkers(stepId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Session de travail supprimée.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression de la session.');
    },
  });
}

// ── Standalone Other Work Entries Hooks ───────────────────────────────────────

export function useOtherWorkEntries(params?: { startDate?: string; endDate?: string; personId?: number }) {
  return useQuery<ProductionOtherWorkEntry[]>({
    queryKey: PRODUCTION_QUERY_KEYS.otherWork(params),
    queryFn: () => productionService.getOtherWorkEntries(params),
  });
}

export function useCreateOtherWorkEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductionOtherWorkEntryInput) =>
      productionService.createOtherWorkEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PRODUCTION_QUERY_KEYS.all, 'other-work'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Prestation de travail enregistrée.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de l’enregistrement de la prestation.');
    },
  });
}

export function useUpdateOtherWorkEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductionOtherWorkEntryInput }) =>
      productionService.updateOtherWorkEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PRODUCTION_QUERY_KEYS.all, 'other-work'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Prestation mise à jour.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la mise à jour de la prestation.');
    },
  });
}

export function useDeleteOtherWorkEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionService.deleteOtherWorkEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PRODUCTION_QUERY_KEYS.all, 'other-work'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_QUERY_KEYS.allMonthlyPayables() });
      toast.success('Prestation supprimée avec succès.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression de la prestation.');
    },
  });
}

// ── Monthly Employee Payable Summary Hook ───────────────────────────────────

export function useMonthlyPayableSummary(year: number, month: number) {
  return useQuery<MonthlyEmployeePayableSummary>({
    queryKey: PRODUCTION_QUERY_KEYS.monthlyPayables(year, month),
    queryFn: () => productionService.getMonthlyPayableSummary(year, month),
    enabled: year >= 2000 && month >= 1 && month <= 12,
  });
}

