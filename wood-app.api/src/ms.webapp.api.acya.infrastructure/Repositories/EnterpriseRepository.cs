using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

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

  }
}
