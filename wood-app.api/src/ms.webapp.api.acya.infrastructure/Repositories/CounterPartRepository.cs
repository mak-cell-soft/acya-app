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

      var allCP = await context.CounterParts
          .Include(cp => cp.Transporter)
          .ThenInclude(tr => tr!.Vehicle)
          .Where(cp => cp.IsDeleted != true)
          .Where(cp => cp.Type == enumValue)
          .ToListAsync();

      if (!allCP.Any())
      {
          return new List<CounterPartDto>();
      }

      // WHY: Bulk-calculate current balances from the AccountLedger table to avoid N+1 query overhead.
      var counterpartIds = allCP.Select(cp => cp.Id).ToList();
      var ledgerSummary = await context.AccountLedgers
          .Where(l => counterpartIds.Contains(l.CounterPartId))
          .GroupBy(l => l.CounterPartId)
          .Select(g => new {
              CounterPartId = g.Key,
              TotalDebit = g.Sum(l => l.Debit),
              TotalCredit = g.Sum(l => l.Credit)
          })
          .ToDictionaryAsync(x => x.CounterPartId);

      var allDtos = allCP.Select(cp => {
          var dto = new CounterPartDto(cp);
          
          decimal totalDebit = 0;
          decimal totalCredit = 0;
          if (ledgerSummary.TryGetValue(cp.Id, out var summary))
          {
              totalDebit = summary.TotalDebit;
              totalCredit = summary.TotalCredit;
          }
          
          decimal opening = cp.OpeningBalance ?? 0;
          if (cp.Type == CounterPartType.Customer)
          {
              dto.currentbalance = Math.Round(opening + totalDebit - totalCredit, 3, MidpointRounding.AwayFromZero);
          }
          else
          {
              dto.currentbalance = Math.Round(opening + totalCredit - totalDebit, 3, MidpointRounding.AwayFromZero);
          }
          return dto;
      }).ToList();

      return allDtos!;
    }


    public new async Task<IEnumerable<CounterPartDto>> GetAllAsync()
    {
      var allCP = await context.CounterParts
          .Where(cp => cp.IsDeleted == false)
          .ToListAsync();

      if (!allCP.Any())
      {
          return new List<CounterPartDto>();
      }

      // WHY: Bulk-calculate current balances from the AccountLedger table to avoid N+1 query overhead.
      var counterpartIds = allCP.Select(cp => cp.Id).ToList();
      var ledgerSummary = await context.AccountLedgers
          .Where(l => counterpartIds.Contains(l.CounterPartId))
          .GroupBy(l => l.CounterPartId)
          .Select(g => new {
              CounterPartId = g.Key,
              TotalDebit = g.Sum(l => l.Debit),
              TotalCredit = g.Sum(l => l.Credit)
          })
          .ToDictionaryAsync(x => x.CounterPartId);

      var allDtos = allCP.Select(cp => {
          var dto = new CounterPartDto(cp);
          
          decimal totalDebit = 0;
          decimal totalCredit = 0;
          if (ledgerSummary.TryGetValue(cp.Id, out var summary))
          {
              totalDebit = summary.TotalDebit;
              totalCredit = summary.TotalCredit;
          }
          
          decimal opening = cp.OpeningBalance ?? 0;
          if (cp.Type == CounterPartType.Customer)
          {
              dto.currentbalance = Math.Round(opening + totalDebit - totalCredit, 3, MidpointRounding.AwayFromZero);
          }
          else
          {
              dto.currentbalance = Math.Round(opening + totalCredit - totalDebit, 3, MidpointRounding.AwayFromZero);
          }
          return dto;
      }).ToList();

      return allDtos!;
    }

    public async Task<CounterPartExistenceResult> ExistsAsync(CounterPartDto dto)
    {
      if (dto == null) return new CounterPartExistenceResult { Exists = false, Dto = null };

      int currentId = dto.id;
      string? taxReg = string.IsNullOrWhiteSpace(dto.taxregistrationnumber) ? null : dto.taxregistrationnumber.Trim();
      string? cin = string.IsNullOrWhiteSpace(dto.identitycardnumber) ? null : dto.identitycardnumber.Trim();
      string? patente = string.IsNullOrWhiteSpace(dto.patentecode) ? null : dto.patentecode.Trim();

      // Determine if Personne Morale (Company) or Personne Physique (Individual)
      bool isCompany = dto.prefix == "STE" || dto.prefix == "ENT" || dto.prefix == "ASS";

      if (isCompany)
      {
        // Personne Morale: test existence by MATRICULE FISCAL (or Patente)
        if (!string.IsNullOrEmpty(taxReg))
        {
          var existingByTax = await context.CounterParts
            .FirstOrDefaultAsync(c => c.Id != currentId && c.TaxRegistrationNumber == taxReg && c.IsDeleted == false);
          if (existingByTax != null)
          {
            return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existingByTax) };
          }
        }

        if (!string.IsNullOrEmpty(patente))
        {
          var existingByPatente = await context.CounterParts
            .FirstOrDefaultAsync(c => c.Id != currentId && c.PatenteCode == patente && c.IsDeleted == false);
          if (existingByPatente != null)
          {
            return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existingByPatente) };
          }
        }
      }
      else
      {
        // Personne Physique: test existence by CIN OR MATRICULE FISCAL
        if (!string.IsNullOrEmpty(cin))
        {
          var existingByCin = await context.CounterParts
            .FirstOrDefaultAsync(c => c.Id != currentId && c.IdentityCardNumber == cin && c.IsDeleted == false);
          if (existingByCin != null)
          {
            return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existingByCin) };
          }
        }

        if (!string.IsNullOrEmpty(taxReg))
        {
          var existingByTax = await context.CounterParts
            .FirstOrDefaultAsync(c => c.Id != currentId && c.TaxRegistrationNumber == taxReg && c.IsDeleted == false);
          if (existingByTax != null)
          {
            return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existingByTax) };
          }
        }

        if (!string.IsNullOrEmpty(patente))
        {
          var existingByPatente = await context.CounterParts
            .FirstOrDefaultAsync(c => c.Id != currentId && c.PatenteCode == patente && c.IsDeleted == false);
          if (existingByPatente != null)
          {
            return new CounterPartExistenceResult { Exists = true, Dto = new CounterPartDto(existingByPatente) };
          }
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
