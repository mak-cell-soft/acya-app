import api from '@/lib/axios';

// --- Types ---

export interface HoldingTaxSummary {
  id: number;
  description: string;
  reference: string;
  taxPercentage: number;
  taxValue: number;
  isSigned: boolean;
  creationDate: string;
  updateDate: string;
  docNumber: string | null;
  documentId: number | null;
  counterPartName: string | null;
}

// --- Service ---

export const holdingTaxService = {
  /** Apply (create or update) a holding tax on a document */
  applyToDocument: async (documentId: number, dto: any) => {
    const response = await api.post(`/HoldingTax/apply-to-document/${documentId}`, dto);
    return response.data;
  },

  /** Generate a unique reference for a new holding tax */
  generateReference: async (documentId: number) => {
    const response = await api.get(`/HoldingTax/generate-reference/${documentId}`);
    return response.data;
  },

  /** Remove the holding tax from a document */
  removeFromDocument: async (documentId: number) => {
    const response = await api.delete(`/HoldingTax/remove-from-document/${documentId}`);
    return response.data;
  },

  /**
   * Fetch all supplier holding taxes, optionally filtered by period.
   * @param month 1–12
   * @param year  e.g. 2026
   */
  getAll: async (month?: number, year?: number): Promise<HoldingTaxSummary[]> => {
    const params: Record<string, number> = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined)  params.year  = year;
    const response = await api.get('/HoldingTax/all', { params });
    return response.data;
  }
};
