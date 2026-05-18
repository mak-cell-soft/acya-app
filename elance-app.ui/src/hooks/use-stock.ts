import { useQuery } from '@tanstack/react-query';
import { stockService } from '@/services/components/stock.service';
import { Stock, StockTransferInfo, StockTransferDetails } from '@/types/stock';

export interface StockQuantity {
  id: number;
  articleId: number;
  articleReference: string;
  stockQuantity: number;
  allowNegativeStock: boolean;
  packageReference: string;
  isInvoicible: boolean;
  isMergedWith: boolean;
  merchandiseId: number;
}

export interface StockWithLengthDetails {
  id: number;
  lengthId: number;
  lengthName: string;
  remainingPieces: number;
}

export interface StockDashboardStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  healthyStockItems: number;
  topLowStockItems: StockQuantity[] | null;
}

/**
 * Hook to retrieve stock quantities by sales site.
 */
export function useStockBySite(site: any) {
  return useQuery<StockQuantity[]>({
    queryKey: ['stocks', 'site', site?.id],
    queryFn: () => stockService.getBySite(site),
    enabled: !!site?.id,
  });
}

/**
 * Hook to retrieve detailed wood stock pieces per length.
 */
export function useWoodStockDetails(params: {
  merchandiseRef: string;
  salesSiteId: number;
  merchandiseId: number;
}) {
  return useQuery<StockWithLengthDetails[]>({
    queryKey: ['stocks', 'wood-details', params.merchandiseId, params.salesSiteId],
    queryFn: () => stockService.getWoodStockWithLengthDetails(params),
    enabled: !!params.merchandiseId && !!params.salesSiteId,
  });
}

/**
 * Hook to fetch all stocks for category grouping view.
 */
export function useStockAll() {
  return useQuery<Stock[]>({
    queryKey: ['stocks', 'all'],
    queryFn: () => stockService.getAll(),
  });
}

/**
 * Hook to fetch stock transfers list.
 */
export function useStockTransfers(siteId?: string) {
  return useQuery<StockTransferInfo[]>({
    queryKey: ['stocks', 'transfers', siteId],
    queryFn: () => stockService.getStockTransfers(siteId),
  });
}

/**
 * Hook to fetch stock alerts.
 */
export function useStockAlerts(siteId?: number) {
  return useQuery<StockQuantity[]>({
    queryKey: ['stocks', 'alerts', siteId],
    queryFn: () => stockService.getStockAlerts(siteId),
  });
}

/**
 * Hook to fetch stock dashboard stats.
 */
export function useStockDashboardStats(siteId?: number) {
  return useQuery<StockDashboardStats>({
    queryKey: ['stocks', 'dashboard-stats', siteId],
    queryFn: () => stockService.getStockDashboardStats(siteId),
  });
}

