using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Represents a raw material or component consumed during a specific production step.
  /// Deducted from the warehouse stock at production validation time.
  /// </summary>
  public class ProductionInput : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    public int ProductionStepId { get; set; }
    public ProductionStep? ProductionStep { get; set; }

    /// <summary>
    /// The specific catalog Merchandise being consumed.
    /// </summary>
    public int MerchandiseId { get; set; }
    public Merchandise? Merchandise { get; set; }

    // ── Denormalized Catalog Data (Chantier Pattern) ────────────────────────────
    // NOTE: Denormalized to preserve historical fidelity even if the Merchandise is edited later.
    public string? MerchandiseRef { get; set; }
    public string? MerchandiseDesignation { get; set; }
    public string? Unit { get; set; }

    // ── Quantities ─────────────────────────────────────────────────────────────
    public double PlannedQuantity { get; set; } = 1.0;

    /// <summary>
    /// Actual quantity consumed, entered when the step is marked Completed (user decision Q2).
    /// Defaults to PlannedQuantity if not overridden.
    /// </summary>
    public double? ActualQuantity { get; set; }

    // ── Valuation ──────────────────────────────────────────────────────────────
    // Unit purchase price or estimated cost per unit.
    public decimal? UnitCost { get; set; }
    public decimal? TotalCost { get; set; }

    // ── Audit ───────────────────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;

    public ProductionInput()
    {
    }
  }
}
