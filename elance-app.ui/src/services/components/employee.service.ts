import api from '@/lib/axios';

export const employeeService = {
  addEmployee: async (model: any) => {
    const response = await api.post('/Person/Add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Person');
    return response.data;
  },

  getEmployeeById: async (id: number) => {
    const response = await api.get(`/Person/${id}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Person/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Person/DeleteSoft/${id}`);
    return response.data;
  }
};
