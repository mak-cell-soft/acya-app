using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class CounterPartRepository : CoreRepository<CounterPart, WoodAppContext>
  {
    public CounterPartRepository(WoodAppContext context) : base(context)
    {
    }

    /**
     * Get By Reference : Chercher selon le CounterPartsTypes
     */
    public async Task<CounterPart?> GetByName(CounterPartDto dto)
    {
      if (dto == null)
      {
        return null;
      }
      else if (!string.IsNullOrEmpty(dto.name))
      {
        return await context.CounterParts.FirstOrDefaultAsync(a => a.Name!.Equals(dto.name) && a.IsDeleted == false);
      } else if (!string.IsNullOrEmpty(dto.firstname) && !string.IsNullOrEmpty(dto.lastname))
      {
        return await context.CounterParts.FirstOrDefaultAsync(a => a.FirstName!.Equals(dto.firstname) && a.LastName!.Equals(dto.lastname) && a.IsDeleted == false);
      }
      return null;
    }

    public async Task<IEnumerable<CounterPartDto>> GetAllAsync(string _t)
    {
      CounterPartType enumValue;
      
      // Handle common aliases and pluralization
      if (string.Equals(_t, "customers", StringComparison.OrdinalIgnoreCase))
      {
          enumValue = CounterPartType.Customer;
      }
      else if (string.Equals(_t, "suppliers", StringComparison.OrdinalIgnoreCase) || string.Equals(_t, "providers", StringComparison.OrdinalIgnoreCase))
      {
          enumValue = CounterPartType.Supplier;
      }
      else if (!Enum.TryParse(_t, true, out enumValue))
      {
          // If parsing fails, return empty list instead of crashing
          return new List<CounterPartDto>();
      }

      int enumIntValue = (int)enumValue;

      var allCP = await context.CounterParts
          .Include(cp => cp.Transporter)
          .ThenInclude(tr => tr!.Vehicle)
          .Where(cp => cp.IsDeleted != true)
          .Where(cp => (int)cp.Type == enumIntValue)
          .ToListAsync();

      var allDtos = allCP.Select(cp => new CounterPartDto(cp)).ToList();
      return allDtos!;
    }


    public new async Task<IEnumerable<CounterPartDto>> GetAllAsync()
    {
      var allCP = await context.CounterParts
          .Where(cp => cp.IsDeleted == false)
          .ToListAsync();

      var allDtos = allCP.Select(cp => new CounterPartDto(cp)).ToList();
      return allDtos!;
    }

    public async Task<CounterPartExistenceResult> ExistsAsync(CounterPartDto dto)
    {
      if (dto == null) return new CounterPartExistenceResult { Exists = false, Dto = null };

      if (!string.IsNullOrEmpty(dto.taxregistrationnumber))
      {
        var existing = await context.CounterParts.FirstOrDefaultAsync(c => c.TaxRegistrationNumber == dto.taxregistrationnumber && c.IsDeleted == false);
        if (existing != null)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existing) };
        }
      }
      else if (!string.IsNullOrEmpty(dto.identitycardnumber))
      {
        var existing = await context.CounterParts.FirstOrDefaultAsync(c => c.IdentityCardNumber == dto.identitycardnumber && c.IsDeleted == false);
        if (existing != null)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existing) };
        }
      }
      else if (!string.IsNullOrEmpty(dto.patentecode))
      {
        var existing = await context.CounterParts.FirstOrDefaultAsync(c => c.PatenteCode! == dto.patentecode && c.IsDeleted == false);
        if (existing != null)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existing) };
        }
      }

      return new CounterPartExistenceResult { Exists = false, Dto = null };
    }


    public class CounterPartExistenceResult
    {
      public bool Exists { get; set; }
      public CounterPartDto? Dto { get; set; }
    }



  }
}
