using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class ArticleRepository : CoreRepository<Article, WoodAppContext>
  {
    public ArticleRepository(WoodAppContext context) : base(context)
    {
    }

    /**
     * Get By Reference
     */
    public async Task<Article?> GetByReference(string _reference)
    {
      return await context.Articles.FirstOrDefaultAsync(a => a.Reference!.Equals(_reference) && a.IsDeleted == false);
    }

    /**
     * Get By Reference and Id
     */
    public async Task<Article?> GetByReferenceAndId(string _reference, int _id)
    {
      return await context.Articles.FirstOrDefaultAsync(a => a.Reference!.Equals(_reference) && a.Id == _id);
    }

    public new async Task<IEnumerable<ArticleDto>> GetAllAsync()
    {
      var allArticles = await context.Articles
          .Include(cat => cat.Parents)
          .Include(cat => cat.Thicknesses)
          .Include(cat => cat.Widths)
          .Include(cat => cat.TVAs)
          .Include(cat => cat.FirstChildren)
          .Include(cat => cat.AppUsers)
          .Where(c => c.IsDeleted == false)
          .ToListAsync();

      var allDtos = allArticles.Select(cat => new ArticleDto(cat)).ToList();
      return allDtos!;
    }

    public async Task<Article?> GetById(int? id)
    {
      var article = await context.Articles
          .Include(a => a.Thicknesses)
          .Include(a => a.Widths)
          .Include(a => a.FirstChildren)
          .Where(a => a.Id! == id)
          .SingleOrDefaultAsync();

      return article;
    }
  }
}
