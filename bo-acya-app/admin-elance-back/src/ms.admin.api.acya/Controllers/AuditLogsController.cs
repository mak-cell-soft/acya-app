using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.infrastructure;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class AuditLogsController : ControllerBase
    {
        private readonly MasterDbContext _context;

        public AuditLogsController(MasterDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 100)
        {
            var logs = await _context.MasterAuditLogs
                .Include(l => l.Tenant)
                .OrderByDescending(l => l.Timestamp)
                .Take(limit)
                .Select(l => new {
                    l.Id,
                    l.TenantId,
                    TenantName = l.Tenant != null ? l.Tenant.Name : "System",
                    l.Action,
                    l.Details,
                    l.PerformedBy,
                    l.Timestamp
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}
