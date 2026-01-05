namespace ms.webapp.api.acya.core.Entities.History
{
  public class QuantityMovementHistory
  {
    public int Id { get; set; } // PK of the history record
    public int OriginalMovementId { get; set; } // The Id of the QuantityMovement being replaced
    public int MerchandiseId { get; set; } // The consistent merchandise reference
    public string? LengthIds { get; set; }
    public double Quantity { get; set; }
    public DateTime ArchivedDate { get; set; }

    // Optional: Copy all ListOfLengths details if needed
    public ICollection<ListOfLengthHistory>? LengthDetails { get; set; }
  }
}
