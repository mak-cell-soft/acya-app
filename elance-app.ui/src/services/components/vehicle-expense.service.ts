import api from '@/lib/axios';
import { VehicleExpense, VehicleExpenseStats } from '@/types/vehicle-expense';

export const vehicleExpenseService = {
  getByVehicle: async (vehicleId: number): Promise<VehicleExpense[]> => {
    const response = await api.get('/VehicleExpense', {
      params: { vehicleId }
    });
    return response.data;
  },

  getStats: async (vehicleId: number): Promise<VehicleExpenseStats> => {
    const response = await api.get('/VehicleExpense/stats', {
      params: { vehicleId }
    });
    return response.data;
  },

  get: async (id: number): Promise<VehicleExpense> => {
    const response = await api.get(`/VehicleExpense/${id}`);
    return response.data;
  },

  add: async (expense: Partial<VehicleExpense>): Promise<VehicleExpense> => {
    const response = await api.post('/VehicleExpense/Add', expense);
    return response.data;
  },

  update: async (expense: Partial<VehicleExpense>): Promise<VehicleExpense> => {
    const response = await api.put('/VehicleExpense/Update', expense);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/VehicleExpense/${id}`);
  }
};
