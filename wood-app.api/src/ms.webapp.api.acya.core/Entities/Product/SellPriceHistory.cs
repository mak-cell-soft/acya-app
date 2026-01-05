using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class SellPriceHistory : IEntity
  {
    public int Id { get; set; }
    public double PriceValue { get; set; }
    public string? Description { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }

    public int ArticleId { get; set; }
    //public Article? Articles { get; set; }

    public int UpdatedBy { get; set; }
    //public AppUser? AppUsers { get; set; }

    public SellPriceHistory()
    {

    }

    public SellPriceHistory(SellPriceHistoryDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto (SellPriceHistoryDto dto)
    {
      Id = dto.id;
      PriceValue = dto.pricevalue;
      Description= dto.description;
      CreationDate = dto.creationdate;
      UpdateDate= dto.updatedate;
      IsDeleted= dto.isdeleted;
      ArticleId= dto.articleid;
      UpdatedBy= dto.updatedby;
    }

  }
}
