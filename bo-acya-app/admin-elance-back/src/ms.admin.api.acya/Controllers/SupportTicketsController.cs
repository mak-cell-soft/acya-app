using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/support-tickets")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class SupportTicketsController : ControllerBase
    {
        private readonly ISupportTicketAdminService _ticketService;
        private readonly ILogger<SupportTicketsController> _logger;

        public SupportTicketsController(
            ISupportTicketAdminService ticketService,
            ILogger<SupportTicketsController> logger)
        {
            _ticketService = ticketService ?? throw new ArgumentNullException(nameof(ticketService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        public async Task<IActionResult> GetTickets(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? tenantSlug = null,
            [FromQuery] long? tenantId = null,
            [FromQuery] string? priority = null,
            [FromQuery] string? category = null,
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null,
            [FromQuery] string? search = null,
            CancellationToken cancellationToken = default)
        {
            var filter = new SupportTicketFilterDto
            {
                Page = page,
                PageSize = pageSize,
                TenantSlug = tenantSlug,
                TenantId = tenantId,
                Priority = priority,
                Category = category,
                CreatedFrom = createdFrom,
                CreatedTo = createdTo,
                Search = search
            };

            try
            {
                var result = await _ticketService.GetTicketsAsync(filter, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving support tickets list.");
                return StatusCode(500, new { message = "An error occurred while retrieving support tickets." });
            }
        }

        [HttpGet("{tenantSlug}/{ticketId:int}")]
        public async Task<IActionResult> GetTicketDetail(
            string tenantSlug,
            int ticketId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(tenantSlug) || ticketId <= 0)
            {
                return BadRequest(new { message = "Invalid tenant slug or ticket ID." });
            }

            try
            {
                var detail = await _ticketService.GetTicketDetailAsync(tenantSlug, ticketId, cancellationToken);
                if (detail == null)
                {
                    return NotFound(new { message = $"Support ticket {ticketId} not found in tenant '{tenantSlug}'." });
                }

                return Ok(detail);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid tenant configuration for ticket detail request {Slug}/{TicketId}",
                    tenantSlug, ticketId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving support ticket detail for {Slug}/{TicketId}",
                    tenantSlug, ticketId);
                return StatusCode(500, new { message = "An error occurred while retrieving ticket details." });
            }
        }
    }
}
