using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/email-logs")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class EmailLogsController : ControllerBase
    {
        private readonly MasterDbContext _context;
        private readonly IEmailService _emailService;

        public EmailLogsController(MasterDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] long? tenantId = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _context.EmailLogs
                .Include(x => x.Tenant)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(x => x.TenantId == tenantId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.CurrentStatus.ToLower() == status.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(x =>
                    x.Recipient.ToLower().Contains(s) ||
                    x.Template.ToLower().Contains(s) ||
                    (x.MessageId != null && x.MessageId.ToLower().Contains(s)) ||
                    (x.Tenant != null && x.Tenant.Name.ToLower().Contains(s)) ||
                    (x.CorrelationId != null && x.CorrelationId.ToLower().Contains(s))
                );
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.Id,
                    x.TenantId,
                    TenantName = x.Tenant != null ? x.Tenant.Name : null,
                    TenantSlug = x.Tenant != null ? x.Tenant.Slug : null,
                    x.RegistrationId,
                    x.CorrelationId,
                    x.MessageId,
                    x.Recipient,
                    x.Template,
                    x.CurrentStatus,
                    x.CreatedAt,
                    x.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                items
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetLogById(long id)
        {
            var log = await _context.EmailLogs
                .Include(x => x.Tenant)
                .Include(x => x.Events)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (log == null) return NotFound(new { message = "Email log entry not found" });

            var result = new
            {
                log.Id,
                log.TenantId,
                TenantName = log.Tenant?.Name,
                TenantSlug = log.Tenant?.Slug,
                log.RegistrationId,
                log.CorrelationId,
                log.MessageId,
                log.Recipient,
                log.Template,
                log.CurrentStatus,
                log.CreatedAt,
                log.UpdatedAt,
                Events = log.Events
                    .OrderBy(e => e.Timestamp)
                    .Select(e => new
                    {
                        e.Id,
                        e.EventId,
                        e.EventType,
                        e.Status,
                        e.Timestamp,
                        e.Reason,
                        e.Severity,
                        e.Code,
                        e.Description,
                        e.CreatedAt
                    })
                    .ToList()
            };

            return Ok(result);
        }

        [HttpPost("{id}/resend")]
        public async Task<IActionResult> ResendEmail(long id)
        {
            var log = await _context.EmailLogs
                .Include(x => x.Tenant)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (log == null) return NotFound(new { message = "Email log entry not found" });
            if (log.Tenant == null) return BadRequest(new { message = "Associated tenant record not found" });

            var newLog = await _emailService.SendWelcomeEmailAsync(
                log.Tenant,
                log.Recipient,
                log.RegistrationId,
                log.CorrelationId
            );

            return Ok(new
            {
                success = true,
                message = "Welcome email resend triggered successfully",
                emailLogId = newLog.Id,
                status = newLog.CurrentStatus,
                messageId = newLog.MessageId
            });
        }
    }
}
