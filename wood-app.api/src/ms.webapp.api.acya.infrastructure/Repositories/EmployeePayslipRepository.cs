using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class EmployeePayslipRepository : CoreRepository<EmployeePayslip, WoodAppContext>
  {
    public EmployeePayslipRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<IEnumerable<EmployeePayslip>> GetByEmployeeId(int employeeId)
    {
      return await context.EmployeePayslips
        .Where(p => p.EmployeeId == employeeId)
        .OrderByDescending(p => p.PeriodYear)
        .ThenByDescending(p => p.PeriodMonth)
        .ToListAsync();
    }
  }
}
