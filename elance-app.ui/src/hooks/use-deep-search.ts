import { useQuery } from '@tanstack/react-query';
import { deepSearchService, PurchasedMerchandise, MerchandiseBuyer, UnpaidDocument } from '@/services/components/deep-search.service';

export function useCustomerPurchases(customerId: number, month?: number, year?: number, enabled: boolean = true) {
  return useQuery<PurchasedMerchandise[]>({
    queryKey: ['customer-purchases', customerId, month, year],
    queryFn: () => deepSearchService.getCustomerPurchases(customerId, month, year),
    enabled: !!customerId && enabled,
  });
}

export function useMerchandiseBuyers(articleId: number, packageReference?: string, month?: number, year?: number, enabled: boolean = true) {
  return useQuery<MerchandiseBuyer[]>({
    queryKey: ['merchandise-buyers', articleId, packageReference, month, year],
    queryFn: () => deepSearchService.getMerchandiseBuyers(articleId, packageReference, month, year),
    enabled: !!articleId && enabled,
  });
}

export function useUnpaidDocuments(customerId?: number, month?: number, year?: number, search?: string) {
  return useQuery<UnpaidDocument[]>({
    queryKey: ['unpaid-documents', customerId, month, year, search],
    queryFn: () => deepSearchService.getUnpaidDocuments(customerId, month, year, search),
  });
}
