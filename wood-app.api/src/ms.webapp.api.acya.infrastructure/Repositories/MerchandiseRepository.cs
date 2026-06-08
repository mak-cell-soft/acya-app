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
          .Include(m => m.Articles)
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
          .Include(m => m.Articles)
          .Where(m => ids.Contains(m.Id) && !m.IsDeleted)
          .ToListAsync();

      return merchandises;
    }

    public async Task<string> GetLastReferenceByArticle(string _ref)
    {
      if (!string.IsNullOrEmpty(_ref))
      {
        // Trim any double quotes from the input prefix to search consistently
        var cleanRef = _ref.Replace("\"", "").Trim();

        // Query database matching either the plain or quoted prefix
        var matching = await context.Merchandises
            .Where(m => m.PackageReference != null && 
                        !m.IsDeleted && 
                        (m.PackageReference.StartsWith(cleanRef) || m.PackageReference.StartsWith("\"" + cleanRef)))
            .ToListAsync();

        if (!matching.Any())
          return string.Empty;

        // Order in-memory by parsing the sequential integer increment to avoid alphabetical sorting issues (e.g. 9 vs 10)
        var ordered = matching
            .Select(m => {
                var cleanPackageRef = m.PackageReference!.Replace("\"", "").Trim();
                var parts = cleanPackageRef.Split('-');
                int increment = 0;
                if (parts.Length > 0 && int.TryParse(parts.Last(), out int parsedInc))
                {
                    increment = parsedInc;
                }
                return new { m.PackageReference, Increment = increment };
            })
            .OrderByDescending(x => x.Increment)
            .FirstOrDefault();

        return ordered != null 
            ? ordered.PackageReference.Replace("\"", "").Trim() 
            : string.Empty;
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

      var articleIds = dtoMerchandiseReferences
          .Where(x => x.ArticleId.HasValue)
          .Select(x => x.ArticleId!.Value)
          .ToList();

      var matchedMerchandises = await context.Merchandises
          .Include(m => m.Articles)
          .Where(m => articleIds.Contains(m.Articles!.Id))
          .ToListAsync();

      var existingMerchandiseIds = matchedMerchandises
          .Where(dbMerch =>
              dtoMerchandiseReferences.Any(dtoItem =>
                  (dbMerch.PackageReference?.Replace("\"", "").Trim() == dtoItem.PackageReference?.Replace("\"", "").Trim()) &&
                  dbMerch.Articles!.Id == dtoItem.ArticleId))
          .Select(dbMerch => (int?)dbMerch.Id) // nullable int? for consistency with return type
          .ToList();

      return existingMerchandiseIds;
    }



  }
}
