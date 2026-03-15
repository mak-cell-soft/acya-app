using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class StockMovementTimelineDto
    {
        public int DocumentId { get; set; }
        public DateTime Date { get; set; }
        public double QuantityDelta { get; set; }
        public double QuantityAfter { get; set; }
        public string? DocumentType { get; set; }
        public string? DocumentNumber { get; set; }
        public string? Description { get; set; }
        public string? PackageNumber { get; set; }
        public string? CounterpartSiteName { get; set; }
        public bool IsTransfer { get; set; }
    }

    public class StockMovementSummaryDto
    {
        public double CurrentStock { get; set; }
        public double TotalIn { get; set; }
        public double TotalOut { get; set; }
        public string? Unit { get; set; }
    }

    public class StockMovementReconciliationDto
    {
        public double ComputedQuantity { get; set; }
        public double StockQuantity { get; set; }
        public bool IsReconciled { get; set; }
    }
}
