using System;
using System.Collections.Generic;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Represents a single stage/step in a multi-step production workflow.
  /// Examples: Étape 1 = Découpe du bois, Étape 2 = Rabotage, Étape 3 = Vernissage & Finition.
  /// Each step consumes input merchandise and optionally yields an intermediate or final output merchandise.
  /// </summary>
  public class ProductionStep : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; } = Guid.NewGuid();

    public int ProductionOrderId { get; set; }
    public ProductionOrder? ProductionOrder { get; set; }

    /// <summary>
    /// Sequential position of this step within the production order (1, 2, 3...).
    /// </summary>
    public int StepNumber { get; set; } = 1;

    /// <summary>
    /// Descriptive step name, e.g. "Découpe", "Assemblage", "Finitions".
    /// </summary>
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>
    /// Lifecycle status of this particular step:
    /// Planned (0) -> InProgress (1) -> Completed (2) -> Cancelled (3).
    /// </summary>
    public ProductionStepStatus Status { get; set; } = ProductionStepStatus.Planned;

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    // ── Direct Costs for this Step ──────────────────────────────────────────────
    // Material cost is summed automatically from Inputs.
    // Labor and Other (machining, electricity, subcontracting) are specified here.
    public decimal? LaborCost { get; set; }
    public decimal? OtherCost { get; set; }

    // ── Step Output (Intermediate or Final Merchandise) ──────────────────────────
    // NOTE: Q3 Resolution: Output can reference an existing Merchandise or one created on-the-fly.
    // Intermediate steps might produce a semi-finished good, while the last step produces the final good.
    public int? OutputMerchandiseId { get; set; }
    public Merchandise? OutputMerchandise { get; set; }

    public double PlannedOutputQuantity { get; set; } = 1.0;
    
    /// <summary>
    /// Entered when the step transitions to Completed status (resolved per user decision Q2).
    /// </summary>
    public double? ActualOutputQuantity { get; set; }

    // ── Audit ───────────────────────────────────────────────────────────────────
    public int CreatedById { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateDate { get; set; }

    // ── Inputs Consumed in this Step ────────────────────────────────────────────
    public ICollection<ProductionInput> Inputs { get; set; } = new List<ProductionInput>();

    public ProductionStep()
    {
    }
  }
}
