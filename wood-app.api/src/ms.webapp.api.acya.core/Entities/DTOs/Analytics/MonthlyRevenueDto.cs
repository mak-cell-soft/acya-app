using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Analytics
{
    public class MonthlyRevenueDto
    {
        public string Month { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public decimal Margin { get; set; }
    }
}
