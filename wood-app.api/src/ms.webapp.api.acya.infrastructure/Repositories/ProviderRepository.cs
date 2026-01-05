using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class ProviderRepository : CoreRepository<Provider, WoodAppContext>
  {
    public ProviderRepository(WoodAppContext context) : base(context)
    {
    }

    /**
     * Get By Reference
     */
    public async Task<Provider?> GetByName(string _name)
    {
      return await context.Providers.FirstOrDefaultAsync(a => a.Name!.Equals(_name) && a.IsDeleted == false);
    }

    public new async Task<IEnumerable<ProviderDto>> GetAllAsync()
    {
      var allProviders = await context.Providers
          .Where(art => art.IsDeleted == false)
          .ToListAsync();

      var allDtos = allProviders.Select(provider => new ProviderDto(provider)).ToList();
      return allDtos!;
    }
  }
}
