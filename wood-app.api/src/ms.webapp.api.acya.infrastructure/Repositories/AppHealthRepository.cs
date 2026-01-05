using ms.webapp.api.acya.core.Entities.Dtos;
using Microsoft.EntityFrameworkCore;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class AppHealthRepository : CoreRepository<AppHealth, WoodAppContext>
  {
    public AppHealthRepository(WoodAppContext context) : base(context)
    {
    }
  }
}
