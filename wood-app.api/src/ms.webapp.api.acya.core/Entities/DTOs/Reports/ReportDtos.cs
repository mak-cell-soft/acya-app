using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Reports
{
    public class SalesReportRow
    {
        public string DocumentReference { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string ArticleReference { get; set; } = string.Empty;
        public string ArticleDescription { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double UnitPriceHT { get; set; }
        public double Discount { get; set; }
        public double TotalHT { get; set; }
        public string SalesSite { get; set; } = string.Empty;
    }

    public class ProfitabilityReportRow
    {
        public string ArticleReference { get; set; } = string.Empty;
        public string ArticleDescription { get; set; } = string.Empty;
        public double QuantitySold { get; set; }
        public double TotalSalesHT { get; set; }
        public double AveragePurchasePriceTTC { get; set; }
        public double LastPurchasePriceTTC { get; set; }
        public double EstimatedCostHT { get; set; }
        public double MarginHT { get; set; }
        public double MarginPercentage { get; set; }
    }

    public class StockReportRow
    {
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public double CurrentStock { get; set; }
        public double MinStock { get; set; }
        public string Unit { get; set; } = string.Empty;
        public bool IsAlert { get; set; }
    }
}
