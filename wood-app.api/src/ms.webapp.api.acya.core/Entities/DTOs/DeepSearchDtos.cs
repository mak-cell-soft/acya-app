using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class PurchasedMerchandiseDto
    {
        public int MerchandiseId { get; set; }
        public string ArticleReference { get; set; } = string.Empty;
        public string ArticleDescription { get; set; } = string.Empty;
        public string PackageReference { get; set; } = string.Empty;
        public double TotalQuantity { get; set; }
        public double AveragePriceHT { get; set; }
        public string Unit { get; set; } = string.Empty;
        public List<string> RelatedDocuments { get; set; } = new();
    }

    public class MerchandiseBuyerDto
    {
        public int CustomerId { get; set; }
        public string CustomerCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerCompany { get; set; } = string.Empty;
        public double TotalQuantity { get; set; }
        public double TotalCostHT { get; set; }
        public List<string> RelatedDocuments { get; set; } = new();
    }

    public class UnpaidDocumentDto
    {
        public int DocumentId { get; set; }
        public string DocNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public DateTime CreationDate { get; set; }
        public int CounterPartId { get; set; }
        public string CounterPartName { get; set; } = string.Empty;
        public string CounterPartCompany { get; set; } = string.Empty;
        public double TotalNetTTC { get; set; }
        public double TotalPaid { get; set; }
        public double RemainingBalance { get; set; }
        public string BillingStatus { get; set; } = string.Empty;
    }
}
