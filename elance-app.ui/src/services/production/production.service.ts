import api from '@/lib/axios';
import {
  ProductionOrder,
  ProductionStep,
  ProductionInput,
  ProductionStatus,
  ProductionStepStatus,
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

export const PRODUCTION_STATUS_MAP: Record<number, ProductionStatus> = {
  0: 'Planned',
  1: 'InProgress',
  2: 'Completed',
  3: 'Validated',
  4: 'Cancelled',
};

export const PRODUCTION_STATUS_TO_INT: Record<string, number> = {
  Planned: 0,
  InProgress: 1,
  Completed: 2,
  Validated: 3,
  Cancelled: 4,
};

export const productionService = {
  getAllOrders: async (params?: { status?: string; salesSiteId?: number; search?: string }): Promise<ProductionOrder[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.status && PRODUCTION_STATUS_TO_INT[params.status] !== undefined) {
      queryParams.status = PRODUCTION_STATUS_TO_INT[params.status];
    }
    if (params?.salesSiteId) {
      queryParams.salesSiteId = params.salesSiteId;
    }
    if (params?.search) {
      queryParams.search = params.search;
    }

    const response = await api.get<ProductionOrder[]>('/Production', { params: queryParams });
    return response.data;
  },

  getOrderById: async (id: number): Promise<ProductionOrder> => {
    const response = await api.get<ProductionOrder>(`/Production/${id}`);
    return response.data;
  },

  createOrder: async (data: CreateProductionOrderInput): Promise<ProductionOrder> => {
    const response = await api.post<ProductionOrder>('/Production', data);
    return response.data;
  },

  updateOrder: async (id: number, data: UpdateProductionOrderInput): Promise<ProductionOrder> => {
    const response = await api.put<ProductionOrder>(`/Production/${id}`, data);
    return response.data;
  },

  deleteOrder: async (id: number): Promise<void> => {
    await api.delete(`/Production/${id}`);
  },

  startOrder: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post<ProductionOrder>(`/Production/${id}/start`);
    return response.data;
  },

  validateOrder: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post<ProductionOrder>(`/Production/${id}/validate`);
    return response.data;
  },

  cancelOrder: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post<ProductionOrder>(`/Production/${id}/cancel`);
    return response.data;
  },

  addStep: async (orderId: number, data: CreateProductionStepInput): Promise<ProductionStep> => {
    const response = await api.post<ProductionStep>(`/Production/${orderId}/steps`, data);
    return response.data;
  },

  updateStep: async (stepId: number, data: UpdateProductionStepInput): Promise<void> => {
    await api.put(`/Production/steps/${stepId}`, data);
  },

  deleteStep: async (stepId: number): Promise<void> => {
    await api.delete(`/Production/steps/${stepId}`);
  },

  completeStep: async (stepId: number, data: CompleteStepInput): Promise<ProductionStep> => {
    const response = await api.post<ProductionStep>(`/Production/steps/${stepId}/complete`, data);
    return response.data;
  },

  addInput: async (stepId: number, data: CreateProductionInputInput): Promise<ProductionInput> => {
    const response = await api.post<ProductionInput>(`/Production/steps/${stepId}/inputs`, data);
    return response.data;
  },

  deleteInput: async (inputId: number): Promise<void> => {
    await api.delete(`/Production/inputs/${inputId}`);
  },

  quickCreateMerchandise: async (data: QuickCreateMerchandiseInput): Promise<{ id: number; packageReference: string; description: string; articleId: number }> => {
    const response = await api.post('/Production/quick-merchandise', data);
    return response.data;
  },

  // ── Step Workers Endpoints ──────────────────────────────────────────────────
  getStepWorkers: async (stepId: number): Promise<ProductionStepWorker[]> => {
    const response = await api.get<ProductionStepWorker[]>(`/Production/steps/${stepId}/workers`);
    return response.data;
  },

  addStepWorker: async (stepId: number, data: CreateProductionStepWorkerInput): Promise<ProductionStepWorker> => {
    const response = await api.post<ProductionStepWorker>(`/Production/steps/${stepId}/workers`, data);
    return response.data;
  },

  updateStepWorker: async (workerId: number, data: UpdateProductionStepWorkerInput): Promise<void> => {
    await api.put(`/Production/workers/${workerId}`, data);
  },

  deleteStepWorker: async (workerId: number): Promise<void> => {
    await api.delete(`/Production/workers/${workerId}`);
  },

  // ── Step Work Logs Endpoints ────────────────────────────────────────────────
  getStepWorkLogs: async (stepId: number): Promise<ProductionStepWorkLog[]> => {
    const response = await api.get<ProductionStepWorkLog[]>(`/Production/steps/${stepId}/work-logs`);
    return response.data;
  },

  addStepWorkLog: async (stepId: number, data: CreateProductionStepWorkLogInput): Promise<ProductionStepWorkLog> => {
    const response = await api.post<ProductionStepWorkLog>(`/Production/steps/${stepId}/work-logs`, data);
    return response.data;
  },

  updateStepWorkLog: async (workLogId: number, data: UpdateProductionStepWorkLogInput): Promise<void> => {
    await api.put(`/Production/work-logs/${workLogId}`, data);
  },

  deleteStepWorkLog: async (workLogId: number): Promise<void> => {
    await api.delete(`/Production/work-logs/${workLogId}`);
  },

  // ── Standalone Other Work Entries Endpoints ─────────────────────────────────
  getOtherWorkEntries: async (params?: { startDate?: string; endDate?: string; personId?: number }): Promise<ProductionOtherWorkEntry[]> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.personId) queryParams.personId = params.personId;

    const response = await api.get<ProductionOtherWorkEntry[]>('/Production/other-work', { params: queryParams });
    return response.data;
  },

  getOtherWorkEntryById: async (id: number): Promise<ProductionOtherWorkEntry> => {
    const response = await api.get<ProductionOtherWorkEntry>(`/Production/other-work/${id}`);
    return response.data;
  },

  createOtherWorkEntry: async (data: CreateProductionOtherWorkEntryInput): Promise<ProductionOtherWorkEntry> => {
    const response = await api.post<ProductionOtherWorkEntry>('/Production/other-work', data);
    return response.data;
  },

  updateOtherWorkEntry: async (id: number, data: UpdateProductionOtherWorkEntryInput): Promise<ProductionOtherWorkEntry> => {
    const response = await api.put<ProductionOtherWorkEntry>(`/Production/other-work/${id}`, data);
    return response.data;
  },

  deleteOtherWorkEntry: async (id: number): Promise<void> => {
    await api.delete(`/Production/other-work/${id}`);
  },

  // ── Monthly Employee Payable Summary Endpoints ──────────────────────────────
  getMonthlyPayableSummary: async (year: number, month: number): Promise<MonthlyEmployeePayableSummary> => {
    const response = await api.get<MonthlyEmployeePayableSummary>('/Production/payables/monthly', {
      params: { year, month },
    });
    return response.data;
  },
};
