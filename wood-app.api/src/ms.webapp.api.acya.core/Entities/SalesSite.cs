using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class SalesSite : IEntity
  {
    public int Id { get; set; }
    public bool IsForSale { get; set; }
    public string? Gouvernorate { get; set; }
    public string? Address { get; set; }
    public string? CodePost { get; set; }
    public bool IsDeleted { get; set; }

    public int EnterpriseId { get; set; }
    public Enterprise? Enterprise { get; set; } = null;

    public SalesSite()
    {
    }

    public SalesSite(SiteDto dto)
    {
      UpdatFromDto(dto);
    }

    public void UpdatFromDto(SiteDto dto)
    {
      Id = dto.id;
      IsForSale = dto.isForsale;
      Address = dto.address;
      Gouvernorate = dto.gov;
      CodePost = dto.codepost;
      EnterpriseId = (int)dto.enterpriseid!;
    }
  }


}
