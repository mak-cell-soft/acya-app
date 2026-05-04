using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs.Analytics
{
    /// <summary>
    /// Data Transfer Object for aggregated dashboard KPIs.
    /// Follows Gap §5.2 from Gaps Roadmap.md.
    /// </summary>
    public class DashboardKpiDto
    {
        public decimal DailySales { get; set; }
        public decimal WeeklySales { get; set; }
        public decimal MonthlySales { get; set; }
        public List<TopCounterPartDto> TopClients { get; set; } = new();
        public Dictionary<string, int> DocumentCounts { get; set; } = new();
        public int StockAlertCount { get; set; }
        public decimal DailyPaymentsTotal { get; set; }
    }

    public class TopCounterPartDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }
}
