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

export type UnsoldMerchandiseInactivityPeriod = 3 | 6 | 12;

export type UnsoldMerchandiseInactivityType = 'NeverSold' | 'NoRecentSales';

export type UnsoldMerchandiseSortBy =
  | 'stockValue'
  | 'potentialSellValue'
  | 'currentStock'
  | 'lastSaleDate'
  | 'daysSinceLastSale'
  | 'reference'
  | 'designation'
  | 'creationDate';

export type UnsoldMerchandiseValuationSource =
  | 'LastPurchaseDoc'
  | 'ArticleLastPurchasePrice'
  | 'MissingCost';

export type UnsoldMerchandiseStockAvailability =
  | 'InStock'
  | 'OutOfStock'
  | 'NegativeStock';

export interface UnsoldMerchandiseParams {
  months?: UnsoldMerchandiseInactivityPeriod;
  siteId?: number;
  categoryId?: number;
  subCategoryId?: number;
  onlyWithStock?: boolean;
  excludeNewArticles?: boolean;
  gracePeriodDays?: number;
  inactivityType?: UnsoldMerchandiseInactivityType;
  search?: string;
  sortBy?: UnsoldMerchandiseSortBy;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  exportAll?: boolean;
}

export interface UnsoldMerchandiseSummaryDto {
  totalActiveMerchandise: number;
  unsoldCount: number;
  unsoldPercentage: number;
  neverSoldCount: number;
  noRecentSalesCount: number;
  withStockCount: number;
  withoutStockCount: number;
  newlyCreatedExcludedCount: number;
  estimatedDormantStockValueHT: number;
  potentialSellingValueHT: number;
  missingCostCount: number;
  woodStockVolumeM3: number;
  nonWoodStockQuantitiesByUnit: Record<string, number>;
}

export interface UnsoldMerchandiseSubCategoryDto {
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  unsoldArticlesCount: number;
  neverSoldCount: number;
  estimatedStockValueHT: number;
  potentialSellingValueHT: number;
}

export interface UnsoldMerchandiseItemDto {
  articleId: number;
  reference: string;
  description: string;
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  isWood: boolean;
  unit: string;
  currentStock: number;
  estimatedUnitCostHT: number;
  estimatedStockValueHT: number;
  potentialSellingValueHT: number;
  valuationSource: UnsoldMerchandiseValuationSource;
  isMissingCost: boolean;
  creationDate: string;
  articleAgeDays: number;
  isNewlyCreated: boolean;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  inactivityClassification: UnsoldMerchandiseInactivityType;
  stockAvailability: UnsoldMerchandiseStockAvailability;
}

export interface UnsoldMerchandiseResponseDto {
  periodMonths: number;
  cutoffDate: string;
  gracePeriodDays: number;
  siteId: number | null;
  valuationDisclaimer: string;
  summary: UnsoldMerchandiseSummaryDto;
  bySubCategory: UnsoldMerchandiseSubCategoryDto[];
  items: UnsoldMerchandiseItemDto[];
  totalItemsCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

