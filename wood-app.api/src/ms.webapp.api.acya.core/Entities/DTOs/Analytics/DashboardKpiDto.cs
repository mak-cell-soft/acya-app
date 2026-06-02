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
        public List<CustomerReceivableDto> CustomerReceivables { get; set; } = new();
        public List<TopSubCategoryDto> TopSubCategories { get; set; } = new();
        public List<SubCategoryStockHealthDto> StockHealthBySubCategory { get; set; } = new();
    }

    public class TopCounterPartDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }

    public class CustomerReceivableDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TotalInvoiced { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal Outstanding { get; set; }
        public int OldestInvoiceDays { get; set; }
    }

    public class TopSubCategoryDto
    {
        public int SubCategoryId { get; set; }
        public string SubCategoryName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public double TotalQuantitySold { get; set; }
        public decimal TotalRevenueTTC { get; set; }
        public int ArticleCount { get; set; }
        public List<TopArticleDto> TopArticles { get; set; } = new();
    }

    public class TopArticleDto
    {
        public int ArticleId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string ArticleName { get; set; } = string.Empty;
        public double QuantitySold { get; set; }
        public decimal RevenueTTC { get; set; }
    }

    public class SubCategoryStockHealthDto
    {
        public int SubCategoryId { get; set; }
        public string SubCategoryName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public double TotalCurrentStock { get; set; }
        public double TotalMinimumStock { get; set; }
        public int ArticleCount { get; set; }
        public int ArticlesBelowMin { get; set; }
        public List<ArticleStockDto> ArticleStocks { get; set; } = new();
    }

    public class ArticleStockDto
    {
        public int ArticleId { get; set; }
        public string ArticleName { get; set; } = string.Empty;
        public double CurrentStock { get; set; }
        public double MinimumStock { get; set; }
    }
}
