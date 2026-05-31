import { useQuery } from '@tanstack/react-query';
import { documentService } from '@/services/components/document.service';
import { paymentService } from '@/services/components/payment.service';
import { counterpartService } from '@/services/components/counterpart.service';
import { DocumentTypes } from '@/types/document';
import { Supplier } from '@/types/customer';

export interface SupplierChartPoint {
  supplierId: number;
  name: string;
  purchases: number;
  payments: number;
}

export function useSupplierPurchasePaymentChart(year: number, month?: number | 'ALL') {
  return useQuery({
    queryKey: ['supplier-purchase-payment-chart', year, month],
    queryFn: async () => {
      // 1. Fetch suppliers
      const suppliers: Supplier[] = await counterpartService.getAll('Supplier');
      
      // 2. Fetch invoices (type 3 - Factures Fournisseurs)
      const invoices = await documentService.getByType(DocumentTypes.supplierInvoice);
      
      // 3. Fetch all payments
      const payments = await paymentService.getAll();

      // 4. Filter and aggregate
      const data: SupplierChartPoint[] = suppliers.map(s => {
        // Filter invoices for this supplier and time period
        const sInvoices = (invoices || []).filter((inv: any) => {
          const cId = inv.counterpart?.id || inv.counterPart?.id || inv.counterpartId || inv.counterpartid || inv.counterPartId;
          if (cId !== s.id) return false;
          
          const dateStr = inv.creationdate || inv.creationDate || inv.CreationDate;
          if (!dateStr) return false;
          
          const date = new Date(dateStr);
          if (date.getFullYear() !== year) return false;
          if (month !== 'ALL' && month !== undefined && date.getMonth() + 1 !== month) return false;
          return true;
        });

        const purchases = sInvoices.reduce((sum: number, inv: any) => {
          const val = inv.total_net_ttc || inv.totalNetTtc || inv.totalCostPriceTtc || inv.totalcostpricettc || 0;
          return sum + val;
        }, 0);

        // Filter payments for this supplier and time period
        const sPayments = (payments || []).filter((pay: any) => {
          const cId = pay.customerId || pay.customerid || pay.CustomerId || pay.counterpartId || pay.counterpartid;
          if (cId !== s.id) return false;
          
          const dateStr = pay.paymentDate || pay.paymentdate || pay.PaymentDate;
          if (!dateStr) return false;
          
          const date = new Date(dateStr);
          if (date.getFullYear() !== year) return false;
          if (month !== 'ALL' && month !== undefined && date.getMonth() + 1 !== month) return false;
          return true;
        });

        const paymentsTotal = sPayments.reduce((sum: number, pay: any) => {
          const val = pay.amount || pay.Amount || pay.total || pay.Total || 0;
          return sum + val;
        }, 0);

        // Truncate name if too long for better chart display
        const sAny = s as any;
        let name = s.name || sAny.Name || `${s.firstname || sAny.firstName || ''} ${s.lastname || sAny.lastName || ''}`.trim() || 'Inconnu';
        if (name.length > 18) {
          name = name.substring(0, 15) + '...';
        }

        return {
          supplierId: s.id,
          name,
          purchases,
          payments: paymentsTotal
        };
      });

      // 5. Filter out suppliers with 0 purchases and 0 payments, sort by purchases desc
      const result = data
        .filter(d => d.purchases > 0 || d.payments > 0)
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 15); // Top 15 to avoid cluttered chart
        
      console.log('CHART DEBUG:', { year, month, invoicesCount: invoices?.length, paymentsCount: payments?.length, result });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
