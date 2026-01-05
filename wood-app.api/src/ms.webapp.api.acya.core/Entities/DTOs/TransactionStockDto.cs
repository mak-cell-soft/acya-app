using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class TransactionStockDto
  {
    public int id { get; set; }
    public int stockId { get; set; }
    public TransactionType type { get; set; }
    /**
     * Add Or Retrieve Quantity
     */
    public double quantity { get; set; }
    public DateTime date { get; set; }
  }
}
