import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface BankTransaction {
  id?: number;
  bankId: number;
  transactionDate: string;
  description?: string;
  debit: number;
  credit: number;
  reference?: string;
  isReconciled: boolean;
  creationDate?: string;
}

export interface BankStatementResponse {
  initialBalance: number;
  transactions: BankTransaction[];
}

export const useBankStatement = (bankId: number, year: number, month: number) => {
  return useQuery<BankStatementResponse>({
    queryKey: ['bank-statement', bankId, year, month],
    queryFn: async () => {
      const response = await api.get(`/BankTransactions/statement?bankId=${bankId}&year=${year}&month=${month}`);
      return response.data;
    },
    enabled: !!bankId,
  });
};

export const useCreateBankTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BankTransaction) => {
      const response = await api.post('/BankTransactions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
    },
  });
};

export const useUpdateBankTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BankTransaction) => {
      const response = await api.put(`/BankTransactions/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
    },
  });
};

export const useDeleteBankTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/BankTransactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
    },
  });
};
