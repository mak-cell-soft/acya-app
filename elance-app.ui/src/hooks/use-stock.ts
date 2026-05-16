import { useQuery } from '@tanstack/react-query';
import { stockService } from '@/services/components/stock.service';

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
