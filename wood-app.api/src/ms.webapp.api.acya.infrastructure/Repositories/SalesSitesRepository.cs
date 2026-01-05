using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class SalesSitesRepository : CoreRepository<SalesSite, WoodAppContext>
  {
    public SalesSitesRepository(WoodAppContext context) : base(context)
    {
    }

    public new async Task<IEnumerable<SiteDto>> GetAllAsync()
    {
      var allSalesSites = await context.SalesSites
          .Where(_s => _s.IsDeleted == false)
          .ToListAsync();

      var allDtos = allSalesSites.Select(site => new SiteDto(site)).ToList();
      return allDtos!;
    }
  }
}
