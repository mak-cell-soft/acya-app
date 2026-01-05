using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.Dtos.Config;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class ParentRepository : CoreRepository<Parent, WoodAppContext>
  {
    public ParentRepository(WoodAppContext context) : base(context)
    {
    }

    public new async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
      var allParents = await context.Parents
          .Include(parent => parent.FirstChildren)
          .Where(p => p.IsDeleted == false)
          .ToListAsync();

      var allDtos = allParents.Select(parent => new CategoryDto(parent)).ToList();
      return allDtos;
    }

    /**
     * Get By Reference : Find Category by its Reference.
     */
    public async Task<Parent?> GetByReferenceAsync(string _ref)
    {
      return await context.Parents.FirstOrDefaultAsync(u => u.Reference! == _ref);
    }
  }
}
