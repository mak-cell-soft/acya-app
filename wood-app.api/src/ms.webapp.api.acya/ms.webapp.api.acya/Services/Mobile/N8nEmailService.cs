using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class N8nEmailService : IN8nEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<N8nEmailService> _logger;

        public N8nEmailService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<N8nEmailService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendMobileAppInvitationAsync(
            string toEmail,
            string tenantName,
            string tenantSlug,
            string userName,
            string version,
            int buildNumber,
            string portalUrl,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("Cannot send mobile app invitation: Recipient email is empty.");
                return false;
            }

            var baseUrl = _configuration["N8nEmailService:BaseUrl"] ?? "http://n8n:5678";
            var apiKey = _configuration["N8nEmailService:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                apiKey = "Bearer 8a9632170ad282a748818806c2e6d918288f7266d8a798750340d250f398176f";
            }

            var payload = new
            {
                to = toEmail.Trim(),
                template = "mobile_app",
                variables = new
                {
                    tenantName = tenantName,
                    tenantSlug = tenantSlug,
                    userName = userName,
                    userEmail = toEmail.Trim(),
                    version = version,
                    buildNumber = buildNumber.ToString(),
                    portalUrl = portalUrl
                },
                replyTo = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site"
            };

            try
            {
                var webhookUrl = $"{baseUrl.TrimEnd('/')}/webhook/acya/email/send";
                var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl)
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

                _logger.LogInformation("Dispatching mobile app invitation for tenant '{Tenant}' to '{Recipient}' via n8n webhook...",
                    tenantSlug, toEmail);

                var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Mobile app invitation email successfully accepted by n8n for tenant '{Tenant}' to '{Recipient}'.",
                        tenantSlug, toEmail);
                    return true;
                }
                else
                {
                    var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("n8n Email Service returned HTTP {StatusCode} for tenant '{Tenant}' (recipient: {Recipient}): {ResponseBody}",
                        response.StatusCode, tenantSlug, toEmail, responseBody);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to n8n Email Service for tenant '{Tenant}' (recipient: {Recipient}).",
                    tenantSlug, toEmail);
                return false;
            }
        }
    }
}
