using System;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    /// <summary>
    /// Criteria for deep / advanced search in purchases.
    /// Supports combinable filters: invoice reference, supplier reference,
    /// supplier ID, merchandise / article ID, date period, and pagination.
    /// </summary>
    public class PurchaseSearchFilterDto
    {
        public string? Reference { get; set; }
        public string? SupplierReference { get; set; }
        public int? SupplierId { get; set; }
        public int? ArticleId { get; set; }
        public int? MerchandiseId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DocumentTypes? DocumentType { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 15;
    }
}
