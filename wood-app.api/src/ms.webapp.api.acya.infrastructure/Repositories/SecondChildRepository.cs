using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class SecondChildRepository : CoreRepository<SecondChild, WoodAppContext>
  {
    public SecondChildRepository(WoodAppContext context) : base(context)
    {
    }
  }


}
