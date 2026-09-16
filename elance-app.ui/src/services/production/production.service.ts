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
};
