import api from '@/lib/axios';

export const accountingService = {
  getBalance: async (counterpartId: number) => {
    const response = await api.get<number>(`/Accounting/balance/${counterpartId}`);
    return response.data;
  },

  getStatement: async (counterpartId: number, startDate: Date, endDate: Date) => {
    const formatDate = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const response = await api.get(`/Accounting/statement/${counterpartId}`, {
      params: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      }
    });
    return response.data;
  }
};
