import { useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';

export interface PaymentDeepSearchParams {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
  search?: string;
  nature?: string; // "PAIEMENT_DOC" | "RECOUVREMENT" | ""
}

export function usePaymentDeepSearch(params: PaymentDeepSearchParams) {
  return useQuery({
    queryKey: ['payments-deep-search', params],
    queryFn: () => paymentService.deepSearch(params),
    // @ts-ignore
    keepPreviousData: true,
  });
}
