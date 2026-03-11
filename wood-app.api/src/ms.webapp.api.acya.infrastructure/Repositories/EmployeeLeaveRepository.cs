using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class EmployeeLeaveRepository : CoreRepository<EmployeeLeave, WoodAppContext>
  {
    public EmployeeLeaveRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<IEnumerable<EmployeeLeave>> GetByEmployeeId(int employeeId)
    {
      return await context.EmployeeLeaves
        .Where(l => l.EmployeeId == employeeId)
        .OrderByDescending(l => l.StartDate)
        .ToListAsync();
    }
  }
}
