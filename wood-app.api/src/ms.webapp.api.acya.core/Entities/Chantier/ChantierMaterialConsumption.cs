using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Consumption ledger entry recording actual material usage on a chantier.
  /// Option C architecture: entirely dedicated ledger that does NOT alter existing stock calculations.
  /// SourceStockMovementId provides optional read-only traceability back to stock movements.
  /// </summary>
  public class ChantierMaterialConsumption : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    public int MerchandiseId { get; set; }
    public Merchandise? Merchandise { get; set; }

    // NOTE: Optional audit link to core StockMovement. Logical FK, no direct DB constraint.
    public int? SourceStockMovementId { get; set; }

    public int? ChantierTaskId { get; set; }
    public ChantierTask? ChantierTask { get; set; }

    public double ConsumedQty { get; set; }
    public string Unit { get; set; } = "Unité";
    public string? Notes { get; set; }

    public DateTime ConsumedAt { get; set; } = DateTime.UtcNow;
    public int RecordedById { get; set; }
  }
}
