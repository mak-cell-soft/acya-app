using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/webhooks/email")]
    public class EmailWebhooksController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailWebhooksController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("events")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveEvent([FromBody] NormalizedEmailEventDto eventDto)
        {
            if (eventDto == null || string.IsNullOrWhiteSpace(eventDto.EventId))
            {
                return BadRequest(new { success = false, message = "Invalid event payload" });
            }

            var processed = await _emailService.ProcessDeliveryEventAsync(eventDto);
            return Ok(new { success = true, processed = processed, eventId = eventDto.EventId });
        }
    }
}
