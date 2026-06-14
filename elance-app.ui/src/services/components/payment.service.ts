import api from '@/lib/axios';
import { PendingTraiteToClearDto } from '@/types/payment';

export const paymentService = {
  add: async (model: any) => {
    const response = await api.post('/Payments', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.post('/Payments/search', {
      pageNumber: 1,
      pageSize: 100000
    });
    return response.data.items || response.data;
  },

  deepSearch: async (params: { pageNumber?: number; pageSize?: number; fromDate?: string; toDate?: string; paymentMethod?: string; search?: string; nature?: string }): Promise<any> => {
    const response = await api.post('/Payments/search', params);
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

  markTraiteAsPaid: async (instrumentId: number, model: { paidAtBankDate: string; notes?: string }) => {
    const response = await api.patch(`/Payments/instruments/${instrumentId}/mark-paid`, model);
    return response.data;
  },

  getCustomerRecouvrement: async (customerId: number) => {
    const response = await api.get(`/Payments/recouvrement/${customerId}`);
    return response.data;
  },

  createRecouvrement: async (model: any) => {
    const response = await api.post('/Payments/recouvrement', model);
    return response.data;
  },

  generateReference: async () => {
    const response = await api.get('/Payments/generate-reference');
    return response.data;
  },

  getInstruments: async (isPaidOrVersed?: boolean) => {
    const response = await api.get('/Payments/instruments', {
      params: { isPaidOrVersed }
    });
    return response.data;
  },

  createBordereau: async (model: any) => {
    const response = await api.post('/Payments/bordereau', model);
    return response.data;
  },

  async getNextBordereauReference(): Promise<{ reference: string }> {
    const response = await api.get<{ reference: string }>('/payments/bordereau/next-reference');
    return response.data;
  },

  getPendingBordereaux: async () => {
    const response = await api.get('/Payments/bordereaux/pending');
    return response.data;
  },

  async removeInstrumentFromBordereau(reference: string, instrumentId: number): Promise<void> {
    const response = await api.delete(`/Payments/bordereaux/${reference}/instruments/${instrumentId}`);
    return response.data;
  },

  async validateBordereau(reference: string): Promise<void> {
    const response = await api.post(`/Payments/bordereaux/${reference}/validate`);
    return response.data;
  },

  async getPendingTraitesToClear(): Promise<PendingTraiteToClearDto[]> {
    const response = await api.get<PendingTraiteToClearDto[]>('/Payments/traites/pending-clearance');
    return response.data;
  },

  async clearTraite(instrumentId: number): Promise<void> {
    const response = await api.post(`/Payments/traites/${instrumentId}/clear`);
    return response.data;
  },

  disburseSupplierInstruments: async (data: { instrumentIds: number[]; bankId: number; disburseDate: string; notes?: string; salesSiteId?: number }) => {
    const response = await api.post('/Payments/instruments/disburse', data);
    return response.data;
  },

  deliverSupplierInstruments: async (data: { instrumentIds: number[]; deliveryDate: string }) => {
    const response = await api.post('/Payments/instruments/deliver', data);
    return response.data;
  }
};
