using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class EmployeeAdvanceRepository : CoreRepository<EmployeeAdvance, WoodAppContext>
  {
    public EmployeeAdvanceRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<IEnumerable<EmployeeAdvance>> GetByEmployeeId(int employeeId)
    {
      return await context.EmployeeAdvances
        .Where(a => a.EmployeeId == employeeId)
        .OrderByDescending(a => a.RequestDate)
        .ToListAsync();
    }
  }
}
