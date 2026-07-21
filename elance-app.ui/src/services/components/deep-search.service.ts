import api from '@/lib/axios';

export interface PurchasedMerchandise {
  merchandiseId: number;
  articleReference: string;
  articleDescription: string;
  packageReference: string;
  totalQuantity: number;
  averagePriceHT: number;
  unit: string;
  relatedDocuments: string[];
}

export interface MerchandiseBuyer {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerCompany: string;
  totalQuantity: number;
  totalCostHT: number;
  relatedDocuments: string[];
}

export interface UnpaidDocument {
  documentId: number;
  docNumber: string;
  type: string;
  creationDate: string;
  counterPartId: number;
  counterPartName: string;
  counterPartCompany: string;
  totalNetTTC: number;
  totalPaid: number;
  remainingBalance: number;
  billingStatus: string;
}

export interface DiscountReportLine {
  invoiceDate: string;
  invoiceNumber: string;
  articleReference: string;
  articleDescription: string;
  quantity: number;
  unit: string;
  catalogPriceHT: number;
  invoicePriceHT: number;
  discountPercentage: number;
  customerId: number;
  customerName: string;
}

export const deepSearchService = {
  getCustomerPurchases: async (customerId: number, month?: number, year?: number) => {
    const params: Record<string, any> = {};
    if (month && month > 0) params.month = month;
    if (year && year > 0) params.year = year;

    const response = await api.get<PurchasedMerchandise[]>(`/DeepSearch/customer-purchases/${customerId}`, { params });
    return response.data;
  },

  getMerchandiseBuyers: async (articleId: number, packageReference?: string, month?: number, year?: number) => {
    const params: Record<string, any> = {};
    if (packageReference) params.packageReference = packageReference;
    if (month && month > 0) params.month = month;
    if (year && year > 0) params.year = year;

    const response = await api.get<MerchandiseBuyer[]>(`/DeepSearch/merchandise-buyers/${articleId}`, { params });
    return response.data;
  },

  getUnpaidDocuments: async (customerId?: number, month?: number, year?: number, search?: string) => {
    const params: Record<string, any> = {};
    if (customerId && customerId > 0) params.customerId = customerId;
    if (month && month > 0) params.month = month;
    if (year && year > 0) params.year = year;
    if (search) params.search = search;

    const response = await api.get<UnpaidDocument[]>('/DeepSearch/unpaid-documents', { params });
    return response.data;
  },

  getDiscountReport: async (dateFrom?: string, dateTo?: string, customerId?: number) => {
    const params: Record<string, any> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (customerId && customerId > 0) params.customerId = customerId;

    const response = await api.get<DiscountReportLine[]>('/DeepSearch/discount-report', { params });
    return response.data;
  }
};
