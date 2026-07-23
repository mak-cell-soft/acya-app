using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ProfitMarginDto
    {
        public int ArticleId { get; set; }
        public string ArticleReference { get; set; } = string.Empty;
        public string ArticleDescription { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public double QuantitySold { get; set; }
        public double TotalSalesHTNet { get; set; }
        public double AverageSellingPriceHTNet { get; set; }
        public double AveragePurchasePriceHTNet { get; set; }
        public double TotalPurchaseCostHTNet { get; set; }
        public double MarginHT { get; set; }
        public double MarginPercentage { get; set; }
    }

    public class ProfitMarginSummaryDto
    {
        public double TotalSalesHTNet { get; set; }
        public double TotalPurchaseCostHTNet { get; set; }
        public double TotalMarginHT { get; set; }
        public double GlobalMarginPercentage { get; set; }
        public List<ProfitMarginDto> Items { get; set; } = new List<ProfitMarginDto>();
    }
}
