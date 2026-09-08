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
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public EmailWebhooksController(
            IEmailService emailService,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _emailService = emailService;
            _configuration = configuration;
        }

        [HttpPost("events")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveEvent([FromBody] NormalizedEmailEventDto eventDto)
        {
            // Security verification: validate shared secret / signature if configured
            var expectedKey = _configuration["MailgunSettings:WebhookSigningKey"] 
                ?? _configuration["WebhookSettings:Secret"];

            if (!string.IsNullOrEmpty(expectedKey))
            {
                // Check Authorization header or X-Webhook-Secret header
                var authHeader = Request.Headers["Authorization"].ToString();
                var secretHeader = Request.Headers["X-Webhook-Secret"].ToString();
                var providedToken = authHeader.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase)
                    ? authHeader.Substring(7).Trim()
                    : secretHeader;

                if (string.IsNullOrEmpty(providedToken) || !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(providedToken),
                    System.Text.Encoding.UTF8.GetBytes(expectedKey)))
                {
                    return Unauthorized(new { success = false, message = "Invalid webhook credentials." });
                }
            }

            if (eventDto == null || string.IsNullOrWhiteSpace(eventDto.EventId))
            {
                return BadRequest(new { success = false, message = "Invalid event payload" });
            }

            var processed = await _emailService.ProcessDeliveryEventAsync(eventDto);
            return Ok(new { success = true, processed = processed, eventId = eventDto.EventId });
        }
    }
}
