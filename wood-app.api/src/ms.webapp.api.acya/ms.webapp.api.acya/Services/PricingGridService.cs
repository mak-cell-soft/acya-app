using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Services
{
    public class PricingGridService : IPricingGridService
    {
        private readonly WoodAppContext _context;

        public PricingGridService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PricingGridDto>> GetForCounterPartAsync(int counterPartId)
        {
            var rules = await _context.PricingGrids
                .Include(p => p.Merchandise)
                    .ThenInclude(m => m!.Articles)
                .Where(p => p.CounterPartId == counterPartId && p.IsActive)
                .ToListAsync();

            return rules.Select(r => new PricingGridDto(r));
        }

        public async Task<IEnumerable<PricingGridLookupDto>> GetLookupAsync(int counterPartId)
        {
            var now = DateTime.UtcNow;
            var rules = await _context.PricingGrids
                .Where(p => p.CounterPartId == counterPartId 
                            && p.IsActive 
                            && p.MerchandiseId != null
                            && (p.ValidFrom == null || p.ValidFrom <= now)
                            && (p.ValidUntil == null || p.ValidUntil >= now))
                .ToListAsync();

            return rules.Select(r => new PricingGridLookupDto 
            { 
                merchandiseid = r.MerchandiseId!.Value, 
                discountrate = r.DiscountRate 
            });
        }

        public async Task<PricingGridDto> CreateAsync(PricingGridDto dto)
        {
            var entity = new PricingGrid
            {
                CounterPartId = dto.counterpartid,
                MerchandiseId = await ResolveMerchandiseIdAsync(dto.merchandiseid),
                DiscountRate = dto.discountrate,
                ValidFrom = dto.validfrom,
                ValidUntil = dto.validuntil,
                IsActive = true,
                Notes = dto.notes,
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow,
                UpdatedById = dto.updatedbyid ?? 0
            };

            _context.PricingGrids.Add(entity);
            await _context.SaveChangesAsync();

            // Reload to get includes for the DTO
            var result = await _context.PricingGrids
                .Include(p => p.Merchandise)
                    .ThenInclude(m => m!.Articles)
                .FirstAsync(p => p.Id == entity.Id);

            return new PricingGridDto(result);
        }

        public async Task<PricingGridDto?> UpdateAsync(int id, PricingGridDto dto)
        {
            var entity = await _context.PricingGrids.FindAsync(id);
            if (entity == null) return null;

            entity.MerchandiseId = await ResolveMerchandiseIdAsync(dto.merchandiseid);
            entity.DiscountRate = dto.discountrate;
            entity.ValidFrom = dto.validfrom;
            entity.ValidUntil = dto.validuntil;
            entity.Notes = dto.notes;
            entity.IsActive = dto.isactive;
            entity.UpdateDate = DateTime.UtcNow;
            entity.UpdatedById = dto.updatedbyid ?? 0;

            await _context.SaveChangesAsync();

            // Reload to get includes
            var result = await _context.PricingGrids
                .Include(p => p.Merchandise)
                    .ThenInclude(m => m!.Articles)
                .FirstAsync(p => p.Id == entity.Id);

            return new PricingGridDto(result);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.PricingGrids.FindAsync(id);
            if (entity == null) return false;

            entity.IsActive = false; // Soft delete
            entity.UpdateDate = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<int?> ResolveMerchandiseIdAsync(int? providedId)
        {
            if (!providedId.HasValue) return null;

            // Check if it's a valid Merchandise ID
            var exists = await _context.Merchandises.AnyAsync(m => m.Id == providedId.Value);
            if (exists) return providedId;

            // If not found, check if it's an Article ID and find its first/standard merchandise
            var merchId = await _context.Merchandises
                .Where(m => m.ArticleId == providedId.Value && !m.IsDeleted)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync();

            return merchId;
        }
    }
}
