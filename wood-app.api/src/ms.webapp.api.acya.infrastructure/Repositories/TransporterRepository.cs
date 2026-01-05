using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class TransporterRepository : CoreRepository<Transporter, WoodAppContext>
  {
    public TransporterRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<Transporter?> GetByFullName(string fullname)
    {
      return await context.Transporters
        .Where(a => a.FullName! == fullname)
        .FirstOrDefaultAsync();
    }

    public async Task<bool> ExistsByFullName(string fullName)
    {
      return await context.Transporters
        .AnyAsync(a => a.FullName! == fullName);
    }

    public new async Task<IEnumerable<TransporterDto>> GetAllAsync()
    {
      var allTransporters = await context.Transporters
          .Include(cat => cat.Vehicle)
          .ToListAsync();

      var allDtos = allTransporters.Select(tr => new TransporterDto(tr)).ToList();
      return allDtos!;
    }
  }
}
