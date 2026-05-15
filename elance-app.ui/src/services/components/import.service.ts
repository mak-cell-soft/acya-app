import api from '@/lib/axios';

export interface ImportError {
  rowIndex: number;
  message: string;
}

export interface ImportReport {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

export const importService = {
  importArticles: async (file: File, userId: string, enterpriseId: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImportReport>('/Imports/articles', formData, {
      params: { userId, enterpriseId }
    });
    return response.data;
  },

  importCounterParts: async (file: File, type: string, userId: string, enterpriseId: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImportReport>('/Imports/counterparts', formData, {
      params: { type, userId, enterpriseId }
    });
    return response.data;
  }
};
