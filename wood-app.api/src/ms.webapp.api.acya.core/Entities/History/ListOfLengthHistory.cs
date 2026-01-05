namespace ms.webapp.api.acya.core.Entities.History
{
  public class ListOfLengthHistory
  {
    public int Id { get; set; }
    public int HistoryRecordId { get; set; } // FK to QuantityMovementHistory
    public int AppVarLengthId { get; set; }
    public int NumberOfPieces { get; set; }
    public decimal Quantity { get; set; }
  }
}
