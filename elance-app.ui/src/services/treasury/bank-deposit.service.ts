import api from '@/lib/axios';

export const bankDepositService = {
  createDeposit: async (deposit: any) => {
    const response = await api.post('/BankDeposit', deposit);
    return response.data;
  },

  getBankDeposits: async (bankId: number) => {
    const response = await api.get(`/BankDeposit/bank/${bankId}`);
    return response.data;
  },

  getBankBalance: async (bankId: number) => {
    const response = await api.get(`/BankDeposit/balance/${bankId}`);
    return response.data;
  },

  getAllBankBalances: async () => {
    const response = await api.get('/BankDeposit/balances');
    return response.data;
  }
};
