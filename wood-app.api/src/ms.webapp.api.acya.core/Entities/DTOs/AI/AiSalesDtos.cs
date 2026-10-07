using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs.AI
{
    /// <summary>
    /// Customer-safe product summary for AI search results.
    /// Strictly excludes confidential costs, supplier details, and margins.
    /// </summary>
    public class AiProductDto
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Subcategory { get; set; }
        public string Unit { get; set; } = "Pcs";
        public bool IsWood { get; set; }
        public string? ImageUrl { get; set; }
    }

    /// <summary>
    /// Customer-safe dimensional breakdown for products.
    /// </summary>
    public class AiProductDimensionsDto
    {
        public string? Thickness { get; set; }
        public string? Width { get; set; }
        public string? AvailableLengths { get; set; }
    }

    /// <summary>
    /// Customer-safe detailed product view for AI agent.
    /// Strictly excludes confidential costs, supplier details, and margins.
    /// </summary>
    public class AiProductDetailDto
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Subcategory { get; set; }
        public string Unit { get; set; } = "Pcs";
        public bool IsWood { get; set; }
        public AiProductDimensionsDto? Dimensions { get; set; }
        public string? ImageUrl { get; set; }
    }

    /// <summary>
    /// Customer-safe price quote response.
    /// Includes catalog and customer-negotiated prices if securely identified.
    /// Strictly excludes purchase prices and margins.
    /// </summary>
    public class AiPriceDto
    {
        public int ArticleId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public double CatalogPriceHT { get; set; }
        public double CatalogPriceTTC { get; set; }
        public double TvaRate { get; set; }
        public string Currency { get; set; } = "TND";
        public bool IsCustomerIdentified { get; set; }
        public string? CustomerName { get; set; }
        public double? DiscountRate { get; set; }
        public double FinalPriceHT { get; set; }
        public double FinalPriceTTC { get; set; }
    }

    /// <summary>
    /// Customer-safe stock breakdown for wood lengths.
    /// </summary>
    public class AiWoodLengthStockDto
    {
        public string Length { get; set; } = string.Empty;
        public int Pieces { get; set; }
    }

    /// <summary>
    /// Customer-safe stock availability response.
    /// Excludes internal warehouse transactions and confidential accounting numbers.
    /// </summary>
    public class AiAvailabilityDto
    {
        public int ArticleId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public string StockStatus { get; set; } = "OutOfStock"; // "InStock", "LowStock", "OutOfStock"
        public string Unit { get; set; } = "Pcs";
        public string? Depot { get; set; }
        public double? QuantityAvailable { get; set; }
        public List<AiWoodLengthStockDto>? LengthDetails { get; set; }
    }

    /// <summary>
    /// Basic business information for AI sales inquiries.
    /// </summary>
    public class AiTenantInfoDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string Currency { get; set; } = "TND";
        public bool IsSalingWood { get; set; }
    }

    /// <summary>
    /// Payload submitted when AI escalates a request to human sales staff.
    /// </summary>
    public class AiHandoffRequestDto
    {
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response returned upon handoff notification creation.
    /// </summary>
    public class AiHandoffResponseDto
    {
        public bool Success { get; set; }
        public int NotificationId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
