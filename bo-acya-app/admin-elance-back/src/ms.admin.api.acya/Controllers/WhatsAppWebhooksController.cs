using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/webhooks/whatsapp")]
    public class WhatsAppWebhooksController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<WhatsAppWebhooksController>? _logger;

        public WhatsAppWebhooksController(
            IConfiguration configuration,
            ILogger<WhatsAppWebhooksController>? logger = null)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Dedicated authoritative verification endpoint for Meta WhatsApp webhook challenge verification.
        /// Validates hub.mode == 'subscribe' and hub.verify_token against configured WhatsAppSettings:VerifyToken.
        /// Returns raw challenge string with Content-Type: text/plain as required by Meta.
        /// </summary>
        [HttpGet("verify")]
        [AllowAnonymous]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? verifyToken,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            var configuredToken = _configuration["WhatsAppSettings:VerifyToken"];
            if (string.IsNullOrWhiteSpace(configuredToken))
            {
                _logger?.LogError("WhatsApp webhook verification rejected: WhatsAppSettings:VerifyToken is not configured.");
                return StatusCode(StatusCodes.Status500InternalServerError, "WhatsApp verification token configuration error.");
            }

            if (string.IsNullOrWhiteSpace(mode) || mode != "subscribe")
            {
                _logger?.LogWarning("WhatsApp webhook verification rejected: Unsupported mode '{Mode}'.", mode);
                return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
            }

            if (string.IsNullOrWhiteSpace(verifyToken))
            {
                _logger?.LogWarning("WhatsApp webhook verification rejected: Missing hub.verify_token.");
                return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
            }

            if (string.IsNullOrWhiteSpace(challenge))
            {
                _logger?.LogWarning("WhatsApp webhook verification rejected: Missing hub.challenge.");
                return BadRequest("Missing challenge parameter.");
            }

            if (verifyToken != configuredToken)
            {
                _logger?.LogWarning("WhatsApp webhook verification rejected: Invalid verify token.");
                return StatusCode(StatusCodes.Status403Forbidden, "Forbidden");
            }

            _logger?.LogInformation("WhatsApp webhook challenge verified successfully.");
            return Content(challenge, "text/plain");
        }
    }
}
