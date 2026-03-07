using Microsoft.EntityFrameworkCore;
using System.Collections;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class AppVariableRepository : CoreRepository<AppVariable, WoodAppContext>
  {
    public AppVariableRepository(WoodAppContext context) : base(context)
    {
    }

    /**
     * Get By Name : 
     */
    public async Task<AppVariable?> GetByNameAsync(string _name, double _value)
    {
      return await context.AppVariables.FirstOrDefaultAsync(u => u.Name! == _name && u.Value.Equals(_value));
    }

    public async Task<IEnumerable<AppVariable?>> GetAllAsync(string _nature)
    {
      var res = await context.AppVariables
                          .Where(av => av.Nature == _nature)
                          .Where(av => av.isDeleted== false)
                          .ToListAsync();
      return res;
    }

    public async Task<AppVariable?> GetByNatureAndExternalIdAsync(string nature, int externalId)
    {
      string prefix = $"{externalId}|";
      return await context.AppVariables
          .FirstOrDefaultAsync(av => av.Nature == nature && av.Name!.StartsWith(prefix) && av.isDeleted == false);
    }
  }
}
