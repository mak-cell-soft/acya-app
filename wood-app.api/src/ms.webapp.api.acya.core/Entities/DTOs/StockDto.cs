using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  /**
   * Stock DTO doit contenir une description plus détaillé de : 
   * 1 - la marchandise : Référence, libellé ...
   * 2 - la quantité : détailler le nombre de pièces du bois si nécessaire.
   * 3 - Le site ou le stock se trouve.
   */
  public class StockDto
  {
    public int id { get; set; }
    /**
     * Remaining Quantity
     */
    public double quantity { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public TransactionType type { get; set; }

    public MerchandiseDto? merchandise { get; set; }
    public SiteDto? site { get; set; }
    public AppUserDto? appuser { get; set; }

    public StockDto()
    {
    }

    public StockDto(Stock entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Stock entity)
    {
      id = entity.Id;
      quantity = entity.Quantity;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      if (entity.Merchandises!= null)
      {
        merchandise = new MerchandiseDto(entity.Merchandises);
      }
      else
      {
        merchandise = null;
      }

      if (entity.SalesSites!= null)
      {
        site= new SiteDto(entity.SalesSites);
      } else
      {
        site = null;
      }

      if (entity.AppUsers != null)
      {
        appuser = new AppUserDto(entity.AppUsers);
      } else
      {
        appuser = null;
      }
    }
  }

  

}
