import api from '@/lib/axios';

export const documentService = {
  add: async (model: any) => {
    const response = await api.post('/Document/', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Document');
    return response.data;
  },

  getByType: async (type: any) => {
    const response = await api.get('/Document/_type', {
      params: { _type: type }
    });
    return response.data;
  },

  getByCounterpartId: async (id: number) => {
    const response = await api.get(`/Document/counterpart/${id}`);
    return response.data;
  },

  getByTypeDocsFiltered: async (model: any) => {
    const response = await api.post('/Document/_typefiltered', model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Document/DeleteSoft/${id}`);
    return response.data;
  },

  createInvoice: async (model: any) => {
    const response = await api.post('/Document/createinvoice', model);
    return response.data;
  },

  getParentsWithChildren: async () => {
    const response = await api.get('/Document/ParentsWithChildren');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/Document/${id}`);
    return response.data;
  },

  update: async (id: number, model: any) => {
    const response = await api.put(`/Document/${id}`, model);
    return response.data;
  },

  updateStatus: async (id: number, status: number, supplierReference?: string) => {
    const response = await api.patch(`/Document/UpdateStatus/${id}`, { 
      docStatus: status, 
      supplierReference 
    });
    return response.data;
  },

  registerRelationship: async (relationship: any) => {
    const response = await api.post('/Document/RegisterRelationship', relationship);
    return response.data;
  },

  convert: async (parentId: number, model: any) => {
    const response = await api.post(`/Document/${parentId}/convert`, model);
    return response.data;
  },

  createCreditNote: async (parentId: number, model: any) => {
    const response = await api.post(`/Document/${parentId}/credit-note`, model);
    return response.data;
  },

  downloadPdf: async (id: number) => {
    const response = await api.get(`/Document/${id}/pdf`, { 
      responseType: 'blob' 
    });
    return response.data;
  }
};
