using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class MerchandiseRepository : CoreRepository<Merchandise, WoodAppContext>
  {
    public MerchandiseRepository(WoodAppContext context) : base(context)
    {

    }
    public new async Task<IEnumerable<MerchandiseDto>> GetAllAsync()
    {
      var all = await context.Merchandises
          .Where(_s => _s.IsDeleted == false)
          .ToListAsync();

      var allDtos = all.Select(m => new MerchandiseDto(m)).ToList();
      return allDtos!;
    }

    public async Task<IEnumerable<Merchandise>> GetByIdsAsync(IEnumerable<int?> ids)
    {
      if (ids == null || !ids.Any())
      {
        return Enumerable.Empty<Merchandise>();
      }

      var merchandises = await context.Merchandises
          .Where(m => ids.Contains(m.Id) && !m.IsDeleted)
          .ToListAsync();

      return merchandises;
    }

    public async Task<string> GetLastReferenceByArticle(string _ref)
    {
      if (!string.IsNullOrEmpty(_ref))
      {
        var m = await context.Merchandises
            .Where(m => m.PackageReference!.StartsWith(_ref))
            .OrderByDescending(m => m.PackageReference)
            .FirstOrDefaultAsync();

        return m?.PackageReference ?? string.Empty;
      }
      return string.Empty;
    }

    public async Task<Merchandise?> GetById(int? id)
    {
      var merchandise = await context.Merchandises
          .Include(m => m.Articles)
          .Include(m => m.Articles!.Thicknesses)
          .Include(m => m.Articles!.Widths)
          .Include(m => m.Articles!.FirstChildren)
          .Where(m => m.Id! == id)
          .SingleOrDefaultAsync();

      return merchandise;
    }

    public async Task<IEnumerable<int?>> GetIdsByPackageReference(DocumentDto dto)
    {
      var dtoMerchandiseReferences = dto.merchandises!
          .Where(m => m.article != null)
          .Select(m => new
          {
            ArticleId = m.article!.id,
            PackageReference = m.packagereference
          })
          .ToList();

      var articleIds = dtoMerchandiseReferences.Select(x => x.ArticleId).ToList();

      var matchedMerchandises = await context.Merchandises
          .Include(m => m.Articles)
          .Where(m => articleIds.Contains(m.Articles!.Id))
          .ToListAsync();

      var existingMerchandiseIds = matchedMerchandises
          .Where(dbMerch =>
              dtoMerchandiseReferences.Any(dtoItem =>
                  dbMerch.PackageReference == dtoItem.PackageReference &&
                  dbMerch.Articles!.Id == dtoItem.ArticleId))
          .Select(dbMerch => (int?)dbMerch.Id) // nullable int? for consistency with return type
          .ToList();

      return existingMerchandiseIds;
    }



  }
}
