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
