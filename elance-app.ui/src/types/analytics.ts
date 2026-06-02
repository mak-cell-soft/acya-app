export interface TopClientDto {
  id: number;
  name: string;
  totalAmount: number;
}

export interface CustomerReceivableDto {
  id: number;
  name: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  oldestInvoiceDays: number;
}

export interface DashboardKpiDto {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  topClients: TopClientDto[];
  customerReceivables: CustomerReceivableDto[];
  documentCounts: Record<string, number>;
  stockAlertCount: number;
  dailyPaymentsTotal: number;
}

export interface MonthlyRevenueDto {
  month: string;
  revenue: number;
  margin: number;
}

export interface TopArticleDto {
  articleId: number;
  reference: string;
  articleName: string;
  quantitySold: number;
  revenueTTC: number;
}

export interface TopSubCategoryDto {
  subCategoryId: number;
  subCategoryName: string;
  categoryName: string;
  totalQuantitySold: number;
  totalRevenueTTC: number;
  articleCount: number;
  topArticles: TopArticleDto[];
}

export interface ArticleStockDto {
  articleId: number;
  articleName: string;
  currentStock: number;
  minimumStock: number;
}

export interface SubCategoryStockHealthDto {
  subCategoryId: number;
  subCategoryName: string;
  categoryName: string;
  totalCurrentStock: number;
  totalMinimumStock: number;
  articleCount: number;
  articlesBelowMin: number;
  articleStocks: ArticleStockDto[];
}

