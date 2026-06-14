using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.infrastructure;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class DashboardController : ControllerBase
    {
        private readonly MasterDbContext _context;

        public DashboardController(MasterDbContext context)
        {
            _context = context;
        }

        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            var totalTenants = await _context.Enterprises.CountAsync();
            var activeTenants = await _context.Enterprises.CountAsync(x => x.IsActive);
            
            return Ok(new
            {
                TotalTenants = totalTenants,
                ActiveTenants = activeTenants,
                MonthlyRecurringRevenue = 0 // Placeholder
            });
        }
    }
}
