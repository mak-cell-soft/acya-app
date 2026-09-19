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
      // Load active parents and include only active sub-categories
      var allParents = await context.Parents
          .Include(parent => parent.FirstChildren!.Where(fc => !fc.IsDeleted))
          .Where(p => !p.IsDeleted)
          .ToListAsync();

      var allDtos = allParents.Select(parent => new CategoryDto(parent)).ToList();
      return allDtos;
    }

    /**
     * Get By ID with children : Find Category by its ID.
     */
    public async Task<Parent?> GetByIdAsync(int id)
    {
      return await context.Parents
          .Include(parent => parent.FirstChildren)
          .FirstOrDefaultAsync(p => p.Id == id);
    }

    /**
     * Get By Reference : Find Category by its Reference.
     */
    public async Task<Parent?> GetByReferenceAsync(string _ref)
    {
      return await context.Parents.FirstOrDefaultAsync(u => u.Reference! == _ref);
    }

    /**
     * Soft delete category and cascade soft delete to its child subcategories
     */
    public async Task<bool> SoftDeleteAsync(int id)
    {
      var category = await context.Parents
          .Include(p => p.FirstChildren)
          .FirstOrDefaultAsync(p => p.Id == id);

      if (category == null || category.IsDeleted)
      {
        return false;
      }

      category.IsDeleted = true;
      category.UpdateDate = DateTime.UtcNow;

      if (category.FirstChildren != null)
      {
        foreach (var child in category.FirstChildren)
        {
          child.IsDeleted = true;
          child.UpdateDate = DateTime.UtcNow;
        }
      }

      await context.SaveChangesAsync();
      return true;
    }
  }
}
