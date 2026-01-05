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
      // Parse the string into an enum value
      var enumValue = (CounterPartType)Enum.Parse(typeof(CounterPartType), _t, true);

      // Convert enum to its integer value
      int enumIntValue = (int)enumValue;

      var allCP = await context.CounterParts
          .Include(cp => cp.Transporter)
          .ThenInclude(tr => tr!.Vehicle)
          .Where(cp => (bool)!cp.IsDeleted!)
          .Where(cp => (int)cp.Type == enumIntValue) // Compare as integer
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
        var res = await context.CounterParts.AnyAsync(c => c.TaxRegistrationNumber == dto.taxregistrationnumber && c.IsDeleted == false);
        if (res)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = dto };
        }
      }
      else if (!string.IsNullOrEmpty(dto.identitycardnumber))
      {
        var res = await context.CounterParts.AnyAsync(c => c.IdentityCardNumber == dto.identitycardnumber && c.IsDeleted == false);
        if (res)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = dto };
        }
      }
      else if (!string.IsNullOrEmpty(dto.patentecode))
      {
        var res = await context.CounterParts.AnyAsync(c => c.PatenteCode! == dto.patentecode && c.IsDeleted == false);
        if (res)
        {
          return new CounterPartExistenceResult { Exists = true, Dto = dto };
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
