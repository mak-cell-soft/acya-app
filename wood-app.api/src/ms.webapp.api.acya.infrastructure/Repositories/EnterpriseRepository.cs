using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using System.IO;


namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class EnterpriseRepository : CoreRepository<Enterprise, WoodAppContext>
  {
    public EnterpriseRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<Enterprise?> GetByMF(string _mf)
    {
      return await context.Enterprises.FirstOrDefaultAsync(e => e.MatriculeFiscal!.ToLower() == _mf.ToLower());
    }

    public async Task<EnterpriseDto> GetByIdAsync(int? _id)
    {
      var enterprise = await context.Enterprises
          .Include(e => e.Sites)
          .Where(e => e.Id! == _id)
          .SingleOrDefaultAsync();

      var entDto = new EnterpriseDto(enterprise!);
      return entDto;
    }
  
    public async Task ExecuteSeedWoodScript(int appUserId)
    {
      // Only execute for the very first enterprise
      var enterpriseCount = await context.Enterprises.CountAsync();
      if (enterpriseCount != 1)
      {
          return;
      }

      var fileName = "seed_natural_wood.sql.template";
      var scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "db", "wood", "v0.10", fileName);
      
      // If not found in BaseDirectory (common during development), walk up looking for the 'db' folder
      if (!File.Exists(scriptPath))
      {
          var currentDir = AppDomain.CurrentDomain.BaseDirectory;
          while (currentDir != null && !Directory.Exists(Path.Combine(currentDir, "db")))
          {
              currentDir = Directory.GetParent(currentDir)?.FullName;
          }
          if (currentDir != null)
          {
              scriptPath = Path.Combine(currentDir, "db", "wood", "v0.10", fileName);
          }
      }

      if (File.Exists(scriptPath))
      {
        var sql = await File.ReadAllTextAsync(scriptPath);

        // NOTE: Replace the {{APP_USER_ID}} placeholder with the real AppUser ID.
        // We cannot trust the PostgreSQL sequence to always start at 1 — any prior
        // rolled-back or deleted inserts will have already incremented it.
        sql = sql.Replace("{{APP_USER_ID}}", appUserId.ToString());

        await context.Database.ExecuteSqlRawAsync(sql);
      }
      else
      {
        // Fallback or log error if file not found
        throw new FileNotFoundException("Seed script template not found", scriptPath);
      }
    }
  }
}
