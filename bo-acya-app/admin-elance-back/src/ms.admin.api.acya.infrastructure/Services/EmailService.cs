using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ms.admin.api.acya.infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly MasterDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            MasterDbContext context,
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<EmailService> logger)
        {
            _context = context;
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<EmailLog> SendWelcomeEmailAsync(MasterEnterprise enterprise, string adminEmail, long? registrationId, string? correlationId)
        {
            var activeCorrelationId = string.IsNullOrWhiteSpace(correlationId) ? Guid.NewGuid().ToString("N") : correlationId;
            var recipientEmail = string.IsNullOrWhiteSpace(adminEmail) ? (enterprise.Email ?? $"admin@{enterprise.Slug}.acya.site") : adminEmail;

            var emailLog = new EmailLog
            {
                TenantId = enterprise.Id,
                RegistrationId = registrationId ?? enterprise.Id,
                CorrelationId = activeCorrelationId,
                Recipient = recipientEmail,
                Template = "welcome",
                CurrentStatus = "PENDING",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.EmailLogs.AddAsync(emailLog);
            await _context.SaveChangesAsync();

            var baseUrl = _configuration["N8nEmailService:BaseUrl"] ?? "http://n8n:5678";
            var apiKey = _configuration["N8nEmailService:ApiKey"] ?? string.Empty;

            var payload = new
            {
                to = recipientEmail,
                template = "welcome",
                variables = new
                {
                    companyName = enterprise.Name,
                    contactName = enterprise.Name,
                    tenantUrl = $"https://{enterprise.Slug}.acya.site"
                },
                replyTo = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site",
                metadata = new
                {
                    tenantId = enterprise.Id.ToString(),
                    registrationId = (registrationId ?? enterprise.Id).ToString(),
                    correlationId = activeCorrelationId,
                    template = "welcome"
                }
            };

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/webhook/acya/email/send")
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };

                if (!string.IsNullOrWhiteSpace(apiKey))
                {
                    var cleanToken = apiKey.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                        ? apiKey.Substring(7).Trim()
                        : apiKey.Trim();
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cleanToken);
                }

                _httpClient.Timeout = TimeSpan.FromSeconds(5);
                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseContent);
                    var root = doc.RootElement;

                    string? messageId = null;
                    if (root.TryGetProperty("messageId", out var msgIdElem))
                    {
                        messageId = msgIdElem.GetString();
                    }

                    emailLog.MessageId = messageId;
                    emailLog.CurrentStatus = "ACCEPTED";
                    emailLog.UpdatedAt = DateTime.UtcNow;

                    _logger.LogInformation("Welcome email successfully accepted by n8n. TenantId: {TenantId}, MessageId: {MessageId}", enterprise.Id, messageId);
                }
                else
                {
                    emailLog.CurrentStatus = "FAILED_SEND";
                    emailLog.UpdatedAt = DateTime.UtcNow;
                    _logger.LogWarning("n8n Email Service returned HTTP error: {StatusCode} for TenantId: {TenantId}", response.StatusCode, enterprise.Id);
                }
            }
            catch (Exception ex)
            {
                emailLog.CurrentStatus = "FAILED_SEND";
                emailLog.UpdatedAt = DateTime.UtcNow;
                _logger.LogError(ex, "Failed to reach n8n Email Service for TenantId: {TenantId}. Operational failure logged safely.", enterprise.Id);
            }

            await _context.SaveChangesAsync();
            return emailLog;
        }

        public async Task<bool> ProcessDeliveryEventAsync(NormalizedEmailEventDto eventDto)
        {
            if (eventDto == null || string.IsNullOrWhiteSpace(eventDto.EventId))
            {
                _logger.LogWarning("Received malformed or empty delivery event.");
                return false;
            }

            // 1. Idempotency Check: Ignore duplicate event IDs
            var exists = await _context.EmailLogEvents.AnyAsync(e => e.EventId == eventDto.EventId);
            if (exists)
            {
                _logger.LogInformation("Duplicate Mailgun event ignored. EventId: {EventId}", eventDto.EventId);
                return true;
            }

            // 2. Correlate with EmailLog by MessageId, TenantId, or CorrelationId
            EmailLog? emailLog = null;
            if (!string.IsNullOrWhiteSpace(eventDto.MessageId))
            {
                emailLog = await _context.EmailLogs.FirstOrDefaultAsync(l => l.MessageId == eventDto.MessageId);
            }

            if (emailLog == null && eventDto.Metadata != null)
            {
                if (long.TryParse(eventDto.Metadata.TenantId, out var tenantId))
                {
                    emailLog = await _context.EmailLogs
                        .OrderByDescending(l => l.CreatedAt)
                        .FirstOrDefaultAsync(l => l.TenantId == tenantId);
                }
                else if (!string.IsNullOrWhiteSpace(eventDto.Metadata.CorrelationId))
                {
                    emailLog = await _context.EmailLogs.FirstOrDefaultAsync(l => l.CorrelationId == eventDto.Metadata.CorrelationId);
                }
            }

            if (emailLog == null)
            {
                _logger.LogWarning("Orphaned delivery event received. EventId: {EventId}, MessageId: {MessageId}", eventDto.EventId, eventDto.MessageId);
                return false;
            }

            // 3. Persist Event Entry
            var logEvent = new EmailLogEvent
            {
                EmailLogId = emailLog.Id,
                EventId = eventDto.EventId,
                EventType = eventDto.EventType,
                Status = eventDto.Status,
                Timestamp = eventDto.Timestamp != default ? eventDto.Timestamp : DateTime.UtcNow,
                Reason = eventDto.Details?.Reason,
                Severity = eventDto.Details?.Severity,
                Code = eventDto.Details?.Code,
                Description = eventDto.Details?.Description,
                CreatedAt = DateTime.UtcNow
            };

            await _context.EmailLogEvents.AddAsync(logEvent);

            // 4. Update Parent Current Status safely
            emailLog.CurrentStatus = eventDto.Status;
            emailLog.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Delivery event processed successfully. EventId: {EventId}, Status: {Status}, LogId: {LogId}", eventDto.EventId, eventDto.Status, emailLog.Id);
            return true;
        }
    }
}
