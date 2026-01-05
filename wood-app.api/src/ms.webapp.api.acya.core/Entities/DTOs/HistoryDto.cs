using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class SellPriceHistoryDto
  {
    public int id { get; set; }
    public double pricevalue { get; set; }
    public string? description { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public bool isdeleted { get; set; }
    public int articleid { get; set; }
    public int updatedby { get; set; }

    public SellPriceHistoryDto()
    {
    }

    public SellPriceHistoryDto(SellPriceHistory entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(SellPriceHistory entity)
    {
      id = entity.Id;
      pricevalue = entity.PriceValue;
      description= entity.Description;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      isdeleted = entity.IsDeleted;
      articleid = entity.ArticleId;
      updatedby = entity.UpdatedBy;
    }
  }

}
