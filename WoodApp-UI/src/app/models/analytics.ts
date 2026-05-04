export interface DashboardKpi {
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    topClients: TopCounterPart[];
    documentCounts: { [key: string]: number };
    stockAlertCount: number;
    dailyPaymentsTotal: number;
}

export interface TopCounterPart {
    id: number;
    name: string;
    totalAmount: number;
}
