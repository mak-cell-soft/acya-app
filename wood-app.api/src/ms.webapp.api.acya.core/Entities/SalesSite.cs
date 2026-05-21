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
      // WHY: Frontend sends only { id } as a stub for the site reference — enterpriseid is not included.
      // EF Core resolves the real FK from the DB when state is set to Unchanged; default 0 is safe here.
      EnterpriseId = dto.enterpriseid.HasValue ? (int)dto.enterpriseid.Value : 0;
    }
  }


}
