import api from '@/lib/axios';
import {
  DeliveryTracking,
  DeliveryTrackingListItem,
  CreateDeliveryTrackingDto,
  UpdateDeliveryTrackingDto,
  VehicleDeliveryStats,
  FleetCustomerSummary,
  PagedDeliveryResult,
  DeliveryTrackingFilter
} from '@/types/delivery-tracking';

export const deliveryTrackingService = {
  getByVehicle: async (
    vehicleId: number, 
    filter?: DeliveryTrackingFilter
  ): Promise<PagedDeliveryResult<DeliveryTrackingListItem>> => {
    const response = await api.get(`/DeliveryTracking/Vehicle/${vehicleId}`, {
      params: filter
    });
    return response.data;
  },

  getByDocument: async (documentId: number): Promise<DeliveryTracking | null> => {
    try {
      const response = await api.get(`/DeliveryTracking/Document/${documentId}`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  getById: async (id: number): Promise<DeliveryTracking> => {
    const response = await api.get(`/DeliveryTracking/${id}`);
    return response.data;
  },

  create: async (payload: CreateDeliveryTrackingDto): Promise<DeliveryTracking> => {
    const response = await api.post('/DeliveryTracking', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateDeliveryTrackingDto): Promise<DeliveryTracking> => {
    const response = await api.put(`/DeliveryTracking/${id}`, payload);
    return response.data;
  },

  complete: async (id: number): Promise<DeliveryTracking> => {
    const response = await api.post(`/DeliveryTracking/${id}/Complete`);
    return response.data;
  },

  getByCustomer: async (
    customerId: number, 
    filter?: DeliveryTrackingFilter
  ): Promise<PagedDeliveryResult<DeliveryTrackingListItem>> => {
    const response = await api.get(`/DeliveryTracking/Customer/${customerId}`, {
      params: filter
    });
    return response.data;
  },

  getFleetCustomers: async (): Promise<FleetCustomerSummary[]> => {
    const response = await api.get('/DeliveryTracking/FleetCustomers');
    return response.data;
  },

  getVehicleStats: async (
    vehicleId: number, 
    startDate?: string, 
    endDate?: string
  ): Promise<VehicleDeliveryStats> => {
    const response = await api.get(`/DeliveryTracking/Vehicle/${vehicleId}/Statistics`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/DeliveryTracking/${id}`);
  }
};

