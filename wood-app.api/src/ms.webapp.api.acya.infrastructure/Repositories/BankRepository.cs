using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class BankRepository : CoreRepository<Bank, WoodAppContext>
  {
    public BankRepository(WoodAppContext context) : base(context) 
    {
    }

    /**
     * Get By RIB : 
     */
    public async Task<Bank?> GetByRibAsync(string _rib)
    {
      return await context.Banks.FirstOrDefaultAsync(u => u.Rib! == _rib);
    }
  }
}
