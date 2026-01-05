using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Stock : IEntity
  {
    public int Id { get; set; }

    /**
     * Remaining Quantity
     */
    public double Quantity { get; set; }

    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public TransactionType Type { get; set; }

    public int MerchandiseId { get; set; }
    public Merchandise? Merchandises { get; set; }

    public int SalesSiteId { get; set; }
    public SalesSite? SalesSites { get; set; }

    public int UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    public uint RowVersion { get; set; }

    public Stock()
    {
    }

    public Stock(StockDto dto)
    {
      updateFromDto(dto);
    }

    public void updateFromDto(StockDto dto)
    {
      Id = dto.id;
      CreationDate = dto.creationdate;
      UpdateDate = dto.updatedate;
      Quantity = dto.quantity;

      if (dto.merchandise != null)
      {
        Merchandises = new Merchandise(dto.merchandise);
      }
      else
      {
        Merchandises = null;
      }

      if (dto.site != null)
      {
        SalesSites = new SalesSite(dto.site);
      }
      else
      {
        SalesSites = null;
      }

      if (dto.appuser != null)
      {
        AppUsers = new AppUser(dto.appuser);
      }
      else
      {
        AppUsers = null;
      }
    }


  }

  #region For Stock Enhancement
  public class UpdateStockResult
  {
    public int TotalMerchandises { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<MerchandiseUpdateResult>? SuccessUpdates { get; set; }
    public List<MerchandiseUpdateResult>? FailedUpdates { get; set; }
  }

  public class MerchandiseUpdateResult
  {
    public int MerchandiseId { get; set; }
    public bool IsSuccess { get; set; }
    public string? Message { get; set; }
  }
  #endregion
}
