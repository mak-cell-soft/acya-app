using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs.Analytics
{
    /// <summary>
    /// Query parameters for the Unsold Merchandise / Articles sans ventes analytics endpoint.
    /// </summary>
    public class UnsoldMerchandiseQueryParams
    {
        public int Months { get; set; } = 6;
        public int? SiteId { get; set; }
        public int? CategoryId { get; set; }
        public int? SubCategoryId { get; set; }
        public bool OnlyWithStock { get; set; } = true;
        public bool ExcludeNewArticles { get; set; } = true;
        public int GracePeriodDays { get; set; } = 30;
        public string? InactivityType { get; set; }
        public string? Search { get; set; }
        public string SortBy { get; set; } = "stockValue";
        public string SortDirection { get; set; } = "desc";
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public bool ExportAll { get; set; } = false;
    }

    public class UnsoldMerchandiseResponseDto
    {
        public int PeriodMonths { get; set; }
        public DateTime CutoffDate { get; set; }
        public int GracePeriodDays { get; set; }
        public int? SiteId { get; set; }
        public string ValuationDisclaimer { get; set; } =
            "Valeurs financières estimées à titre indicatif (dernier coût d'achat HT ou dernier prix d'achat TTC converti en HT) — ne constituent pas une valorisation comptable certifiée.";
        public UnsoldMerchandiseSummaryDto Summary { get; set; } = new();
        public List<UnsoldMerchandiseSubCategoryDto> BySubCategory { get; set; } = new();
        public List<UnsoldMerchandiseItemDto> Items { get; set; } = new();
        public int TotalItemsCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class UnsoldMerchandiseSummaryDto
    {
        public int TotalActiveMerchandise { get; set; }
        public int UnsoldCount { get; set; }
        public double UnsoldPercentage { get; set; }
        public int NeverSoldCount { get; set; }
        public int NoRecentSalesCount { get; set; }
        public int WithStockCount { get; set; }
        public int WithoutStockCount { get; set; }
        public int NewlyCreatedExcludedCount { get; set; }
        public decimal EstimatedDormantStockValueHT { get; set; }
        public decimal PotentialSellingValueHT { get; set; }
        public int MissingCostCount { get; set; }
        public double WoodStockVolumeM3 { get; set; }
        public Dictionary<string, double> NonWoodStockQuantitiesByUnit { get; set; } = new();
    }

    public class UnsoldMerchandiseSubCategoryDto
    {
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int SubCategoryId { get; set; }
        public string SubCategoryName { get; set; } = string.Empty;
        public int UnsoldArticlesCount { get; set; }
        public int NeverSoldCount { get; set; }
        public decimal EstimatedStockValueHT { get; set; }
        public decimal PotentialSellingValueHT { get; set; }
    }

    public class UnsoldMerchandiseItemDto
    {
        public int ArticleId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int SubCategoryId { get; set; }
        public string SubCategoryName { get; set; } = string.Empty;
        public bool IsWood { get; set; }
        public string Unit { get; set; } = string.Empty;
        public double CurrentStock { get; set; }
        public decimal EstimatedUnitCostHT { get; set; }
        public decimal EstimatedStockValueHT { get; set; }
        public decimal PotentialSellingValueHT { get; set; }
        public string ValuationSource { get; set; } = "MissingCost"; // "LastPurchaseDoc" | "ArticleLastPurchasePrice" | "MissingCost"
        public bool IsMissingCost { get; set; }
        public DateTime CreationDate { get; set; }
        public int ArticleAgeDays { get; set; }
        public bool IsNewlyCreated { get; set; }
        public DateTime? LastSaleDate { get; set; }
        public int? DaysSinceLastSale { get; set; }
        public string InactivityClassification { get; set; } = "NeverSold"; // "NeverSold" | "NoRecentSales"
        public string StockAvailability { get; set; } = "OutOfStock"; // "InStock" | "OutOfStock" | "NegativeStock"
    }
}
