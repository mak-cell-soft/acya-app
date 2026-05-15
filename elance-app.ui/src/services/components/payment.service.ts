import api from '@/lib/axios';

export const paymentService = {
  add: async (model: any) => {
    const response = await api.post('/Payments', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Payments');
    return response.data;
  },

  getByDocumentId: async (documentId: number) => {
    const response = await api.get(`/Payments/document/${documentId}`);
    return response.data;
  },

  update: async (id: number, model: any) => {
    const response = await api.put(`/Payments/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Payments/${id}`);
    return response.data;
  },

  getDashboardPayments: async (date: Date, appUserId?: number, documentSide?: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const response = await api.get('/Payments/dashboard', {
      params: { date: dateStr, appuserid: appUserId, documentSide }
    });
    return response.data;
  },

  linkToInvoice: async (paymentId: number, invoiceId: number) => {
    const response = await api.patch(`/Payments/${paymentId}/link-invoice/${invoiceId}`, {});
    return response.data;
  },

  getBySupplierId: async (supplierId: number) => {
    const response = await api.get(`/Payments/supplier/${supplierId}`);
    return response.data;
  },

  getTraitesBySupplierId: async (supplierId: number) => {
    const response = await api.get(`/Payments/supplier/${supplierId}/traites`);
    return response.data;
  },

  getEcheances: async (fromDate: Date, toDate: Date) => {
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const response = await api.get('/Payments/echeances', {
      params: { fromDate: format(fromDate), toDate: format(toDate) }
    });
    return response.data;
  },

  markTraiteAsPaid: async (instrumentId: number, model: { paidAtBankDate: Date, notes?: string }) => {
    const response = await api.patch(`/Payments/instruments/${instrumentId}/mark-paid`, model);
    return response.data;
  }
};
