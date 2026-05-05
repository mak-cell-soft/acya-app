using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditController : BaseApiController
    {
        private readonly IAuditService _auditService;

        public AuditController(IAuditService auditService)
        {
            _auditService = auditService;
        }

        [HttpGet("recent")]
        public async Task<ActionResult<IEnumerable<AuditLog>>> GetRecentAuditLogs(
            [FromQuery] int count = 50, 
            [FromQuery] string? userName = null, 
            [FromQuery] DateTime? date = null)
        {
            try
            {
                var logs = await _auditService.GetRecentLogsAsync(count, userName, date);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
