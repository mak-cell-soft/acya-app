using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class FirstChildRepository : CoreRepository<FirstChild, WoodAppContext>
  {
    public FirstChildRepository(WoodAppContext context) : base(context)
    {
    }

    public new async Task<FirstChild?> Get(int id)
    {
      var firstChild = await context.FirstChildren
        .Include(fc => fc.Parents)
        .FirstOrDefaultAsync(fc => fc.Id == id);

      return firstChild;
    }

    public async Task<FirstChild?> GetByReferenceAsync(string _ref)
    {
      return await context.FirstChildren.FirstOrDefaultAsync(q => q.Reference == _ref);
    }
  }
}
