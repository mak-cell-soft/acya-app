import api from '@/lib/axios';

export const holdingTaxService = {
  applyToDocument: async (documentId: number, dto: any) => {
    const response = await api.post(`/HoldingTax/apply-to-document/${documentId}`, dto);
    return response.data;
  },

  generateReference: async (documentId: number) => {
    const response = await api.get(`/HoldingTax/generate-reference/${documentId}`);
    return response.data;
  },

  removeFromDocument: async (documentId: number) => {
    const response = await api.delete(`/HoldingTax/remove-from-document/${documentId}`);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/HoldingTax/all');
    return response.data;
  }
};
