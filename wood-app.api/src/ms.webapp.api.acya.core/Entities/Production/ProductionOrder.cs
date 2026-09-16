using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Root aggregate entity representing a Production Order (Ordre de Fabrication / Transformation).
  /// Coordinates the multi-step transformation of raw stock merchandise into finished/semi-finished goods.
  /// </summary>
  public class ProductionOrder : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Human-readable reference code, e.g. "OF-20260916-001".
    /// Unique per tenant.
    /// </summary>
    public string Reference { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Site / dépôt where this production order takes place and where stock will be deducted and credited.
    /// NOTE: User confirmed requirement Q1: Production is scoped to a specific SalesSite.
    /// </summary>
    public int SalesSiteId { get; set; }
    public SalesSite? SalesSite { get; set; }

    /// <summary>
    /// Overall status of the production workflow:
    /// Planned (0) -> InProgress (1) -> Completed (2) -> Validated (3) / Cancelled (4).
    /// </summary>
    public ProductionStatus Status { get; set; } = ProductionStatus.Planned;

    public DateTime PlannedStartDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    // ── Cost Accounting ──────────────────────────────────────────────────────────
    // NOTE: Costs are aggregated from all steps (raw materials, labor, overhead).
    // Stored with precision 18,3 (TND currency standard).
    public decimal? TotalMaterialCost { get; set; }
    public decimal? TotalLaborCost { get; set; }
    public decimal? TotalOtherCost { get; set; }
    public decimal? TotalProductionCost { get; set; }

    /// <summary>
    /// Unit cost calculated on validation: TotalProductionCost / ActualOutputQuantity.
    /// NOTE: V1 design decision: stored on order for audit trail; article catalog price remains manual.
    /// </summary>
    public decimal? UnitProductionCost { get; set; }

    // ── Production Quantities ───────────────────────────────────────────────────
    public double PlannedOutputQuantity { get; set; } = 1.0;
    public double? ActualOutputQuantity { get; set; }

    // ── Audit & Soft Delete ─────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; } = false;

    // ── Navigation Collections ──────────────────────────────────────────────────
    /// <summary>
    /// Chronological sequence of production steps (e.g. 1: Cutting, 2: Assembly, 3: Finishing).
    /// Cascaded on delete.
    /// </summary>
    public ICollection<ProductionStep> Steps { get; set; } = new List<ProductionStep>();

    public ProductionOrder()
    {
    }
  }
}
