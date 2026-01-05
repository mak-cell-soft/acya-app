using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class StockWithLengthDetailsDto
  {
    public int StockId { get; set; }
    public int MerchandiseId { get; set; }
    public int ArticleId { get; set; }
    public string? ArticleReference { get; set; }
    public string? ArticleDescription { get; set; }
    public int SalesSiteId { get; set; }
    public double TotalQuantity { get; set; }
    public int QuantityMovementId { get; set; }
    public List<LengthDetailDto>? LengthDetails { get; set; }
  }

  public class LengthDetailDto
  {
    public int LengthId { get; set; }
    public int AppVarLengthId { get; set; }
    public string? LengthName { get; set; }
    public int NumberOfPieces { get; set; }
    public double Quantity { get; set; }
    public int RemainingPieces { get; set; }
  }

  public class WoodArticleStockDetail
  {
      public int LengthId { get; set; }
      public string? LengthName { get; set; }
      public int RemainingPieces { get; set; }
  }
}
