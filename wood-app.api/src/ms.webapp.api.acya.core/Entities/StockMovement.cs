using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities
{
  /// <summary>
  /// Represents a single, immutable audit record of a stock quantity change.
  /// Every time stock is affected (receipt, delivery, transfer), one record per site is created here.
  /// This is the core ledger for the stock movement timeline feature.
  /// </summary>
  public class StockMovement : IEntity
  {
    public int Id { get; set; }

    // ── What moved ────────────────────────────────────────────────────
    /// <summary>The merchandise whose stock changed.</summary>
    public int MerchandiseId { get; set; }
    public Merchandise? Merchandise { get; set; }

    /// <summary>
    /// PackageReference copied from the merchandise at the time of the movement,
    /// used as a badge in the UI timeline to distinguish different packages.
    /// </summary>
    public string? PackageNumber { get; set; }

    // ── Why it moved ──────────────────────────────────────────────────
    /// <summary>
    /// The type of source document that triggered this movement
    /// (e.g. supplierReceipt, customerDeliveryNote, stockTransfer).
    /// </summary>
    public DocumentTypes DocumentType { get; set; }

    /// <summary>FK to the originating Document row.</summary>
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    // ── Quantity ledger ───────────────────────────────────────────────
    /// <summary>
    /// Signed delta: positive (+) for stock additions, negative (−) for subtractions.
    /// This value is the definitive source for timeline reconstruction.
    /// </summary>
    public double QuantityDelta { get; set; }

    /// <summary>
    /// Running quantity at this site AFTER this movement was applied.
    /// Mirrors Stock.Quantity at the moment of write; used for fast reconciliation.
    /// </summary>
    public double QuantityAfter { get; set; }

    // ── Where it moved ────────────────────────────────────────────────
    /// <summary>
    /// The sales site whose stock was affected (propagated from the source document).
    /// For transfers: the source site gets a negative movement, the destination a positive one.
    /// </summary>
    public int SalesSiteId { get; set; }
    public SalesSite? SalesSite { get; set; }

    // ── Transfer-specific context ─────────────────────────────────────
    /// <summary>
    /// For inter-site transfer movements only: the ID of the counterpart site.
    /// Allows the UI to display "OUT → Site B" / "IN ← Site A" labels.
    /// </summary>
    public int? CounterpartSiteId { get; set; }

    // ── Audit ─────────────────────────────────────────────────────────
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  }
}
