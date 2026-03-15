using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.History
{
  /// <summary>
  /// Audit trail for mutations to a StockMovement record.
  /// Written whenever a movement is updated or soft-deleted so that no traceability is lost.
  /// Mirrors all editable fields of StockMovement plus metadata about the change.
  /// </summary>
  public class StockMovementHistory
  {
    public int Id { get; set; }

    /// <summary>PK of the StockMovement row that was mutated.</summary>
    public int OriginalMovementId { get; set; }

    // ── Snapshot of the movement at the time it was changed ───────────
    public int MerchandiseId { get; set; }
    public string? PackageNumber { get; set; }
    public DocumentTypes DocumentType { get; set; }
    public int DocumentId { get; set; }
    public double QuantityDelta { get; set; }
    public double QuantityAfter { get; set; }
    public int SalesSiteId { get; set; }
    public int? CounterpartSiteId { get; set; }
    public DateTime OriginalCreatedAt { get; set; }

    // ── Audit of the change itself ────────────────────────────────────
    /// <summary>
    /// Why this history record was written: "Updated" or "Deleted".
    /// </summary>
    public string ChangeReason { get; set; } = "Updated";

    /// <summary>UTC timestamp when the original movement was modified.</summary>
    public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;

    /// <summary>User who performed the change (optional FK).</summary>
    public int? ArchivedById { get; set; }
  }
}
