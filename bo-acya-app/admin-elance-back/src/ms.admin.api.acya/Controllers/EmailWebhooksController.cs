using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/webhooks/email")]
    public class EmailWebhooksController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailWebhooksController>? _logger;

        public EmailWebhooksController(
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<EmailWebhooksController>? logger = null)
        {
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Dedicated endpoint for Mailgun webhooks. Authoritatively verifies HMAC signature and timestamp
        /// before normalizing and processing the delivery event.
        /// </summary>
        [HttpPost("mailgun")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveMailgunWebhook([FromBody] MailgunWebhookPayloadDto payload)
        {
            var signingKey = _configuration["MailgunSettings:WebhookSigningKey"];
            if (string.IsNullOrWhiteSpace(signingKey))
            {
                _logger?.LogError("Mailgun webhook rejected: MailgunSettings:WebhookSigningKey is not configured.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Webhook signing key configuration error." });
            }

            if (payload?.Signature == null ||
                string.IsNullOrWhiteSpace(payload.Signature.Timestamp) ||
                string.IsNullOrWhiteSpace(payload.Signature.Token) ||
                string.IsNullOrWhiteSpace(payload.Signature.Signature))
            {
                _logger?.LogWarning("Mailgun webhook rejected: Missing signature parameters.");
                return Unauthorized(new { success = false, message = "Missing Mailgun signature parameters." });
            }

            if (!MailgunSignatureValidator.IsTimestampWithinWindow(payload.Signature.Timestamp, maxWindowSeconds: 900))
            {
                _logger?.LogWarning("Mailgun webhook rejected: Timestamp expired or outside allowed 15-minute window.");
                return Unauthorized(new { success = false, message = "Webhook timestamp expired or invalid." });
            }

            var isValid = MailgunSignatureValidator.VerifySignature(
                signingKey,
                payload.Signature.Timestamp,
                payload.Signature.Token,
                payload.Signature.Signature);

            if (!isValid)
            {
                _logger?.LogWarning("Mailgun webhook rejected: Invalid HMAC signature.");
                return Unauthorized(new { success = false, message = "Invalid Mailgun webhook signature." });
            }

            var eventData = payload.EffectiveEventData;
            if (eventData.ValueKind != JsonValueKind.Object)
            {
                _logger?.LogWarning("Mailgun webhook rejected: Missing or invalid 'event-data' object.");
                return BadRequest(new { success = false, message = "Missing 'event-data' in webhook payload." });
            }

            NormalizedEmailEventDto eventDto;
            try
            {
                eventDto = MailgunEventNormalizer.Normalize(eventData);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Mailgun webhook rejected: Failed to normalize event-data.");
                return BadRequest(new { success = false, message = "Invalid event-data format." });
            }

            if (string.IsNullOrWhiteSpace(eventDto.EventId))
            {
                _logger?.LogWarning("Mailgun webhook rejected: Missing EventId.");
                return BadRequest(new { success = false, message = "Invalid event payload: EventId is missing." });
            }

            var processed = await _emailService.ProcessDeliveryEventAsync(eventDto);
            return Ok(new { success = true, processed = processed, eventId = eventDto.EventId });
        }

        /// <summary>
        /// Legacy normalized event webhook endpoint. Fails closed if shared secret is unconfigured
        /// and enforces constant-time Bearer/token validation on all requests.
        /// </summary>
        [HttpPost("events")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveEvent([FromBody] NormalizedEmailEventDto eventDto)
        {
            var expectedKey = _configuration["MailgunSettings:WebhookSigningKey"] 
                ?? _configuration["WebhookSettings:Secret"];

            if (string.IsNullOrWhiteSpace(expectedKey))
            {
                _logger?.LogError("Webhook secret is not configured; failing closed.");
                return Unauthorized(new { success = false, message = "Webhook credentials not configured." });
            }

            var authHeader = Request.Headers["Authorization"].ToString();
            var secretHeader = Request.Headers["X-Webhook-Secret"].ToString();
            var providedToken = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authHeader.Substring(7).Trim()
                : secretHeader;

            if (string.IsNullOrEmpty(providedToken) || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(providedToken),
                Encoding.UTF8.GetBytes(expectedKey)))
            {
                _logger?.LogWarning("Webhook rejected: Invalid credentials.");
                return Unauthorized(new { success = false, message = "Invalid webhook credentials." });
            }

            if (eventDto == null || string.IsNullOrWhiteSpace(eventDto.EventId))
            {
                return BadRequest(new { success = false, message = "Invalid event payload." });
            }

            var processed = await _emailService.ProcessDeliveryEventAsync(eventDto);
            return Ok(new { success = true, processed = processed, eventId = eventDto.EventId });
        }
    }
}
