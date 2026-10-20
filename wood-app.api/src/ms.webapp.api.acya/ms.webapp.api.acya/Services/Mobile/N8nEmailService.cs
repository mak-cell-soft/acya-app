using System;
using System.Net;
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

            var displayName = !string.IsNullOrWhiteSpace(tenantName) ? tenantName.Trim() : tenantSlug.Trim();
            var subject = $"Votre application mobile {displayName} est prête";
            var htmlBody = BuildMobileAppInvitationHtml(portalUrl, displayName, userName, version, buildNumber);

            var payload = new
            {
                to = toEmail.Trim(),
                template = "raw",
                subject = subject,
                html = htmlBody,
                variables = new
                {
                    tenantName = displayName,
                    tenantSlug = tenantSlug,
                    userName = userName,
                    userEmail = toEmail.Trim(),
                    version = version,
                    buildNumber = buildNumber.ToString(),
                    portalUrl = portalUrl
                },
                sender = "noreply",
                replyTo = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site",
                metadata = new
                {
                    tenantSlug = tenantSlug,
                    template = "raw",
                    type = "mobile_invitation"
                }
            };

            var result = await DispatchEmailPayloadAsync(payload, toEmail, tenantSlug, cancellationToken);
            return result.Status == EmailDispatchStatus.Accepted;
        }

        public async Task<EmailDispatchResult> SendPasswordResetEmailAsync(
            string toEmail,
            string resetUrl,
            string tenantSlug,
            string? tenantName = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("Cannot send password reset: Recipient email is empty.");
                return EmailDispatchResult.Rejected("Recipient email is empty.");
            }

            var displayName = !string.IsNullOrWhiteSpace(tenantName) ? tenantName : tenantSlug;
            var subject = $"Réinitialisation de votre mot de passe - ACYA ({displayName})";
            var htmlBody = BuildPasswordResetHtml(resetUrl, displayName);

            var payload = new
            {
                to = toEmail.Trim(),
                template = "raw",
                subject = subject,
                html = htmlBody,
                variables = new
                {
                    resetUrl = resetUrl,
                    tenantSlug = tenantSlug,
                    tenantName = displayName,
                    supportEmail = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site"
                },
                sender = "noreply",
                replyTo = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site",
                metadata = new
                {
                    tenantSlug = tenantSlug,
                    template = "raw"
                }
            };

            return await DispatchEmailPayloadAsync(payload, toEmail, tenantSlug, cancellationToken);
        }

        public async Task<EmailDispatchResult> SendEmailAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string? template = null,
            object? variables = null,
            string sender = "noreply",
            string replyTo = "support@acya.site",
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("Cannot send email: Recipient email is empty.");
                return EmailDispatchResult.Rejected("Recipient email is empty.");
            }

            var payload = new
            {
                to = toEmail.Trim(),
                template = template ?? "raw",
                subject = subject,
                html = htmlBody,
                variables = variables,
                sender = sender,
                replyTo = replyTo
            };

            return await DispatchEmailPayloadAsync(payload, toEmail, "system", cancellationToken);
        }

        private async Task<EmailDispatchResult> DispatchEmailPayloadAsync(
            object payload,
            string recipient,
            string tenantSlug,
            CancellationToken cancellationToken)
        {
            var baseUrl = _configuration["N8nEmailService:BaseUrl"] ?? "http://n8n:5678";
            var apiKey = _configuration["N8nEmailService:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogError("Email service is not configured: N8nEmailService:ApiKey is missing or empty for tenant '{Tenant}' (recipient: {Recipient}).",
                    tenantSlug, recipient);
                return EmailDispatchResult.Rejected("Email service is not configured: N8nEmailService:ApiKey is missing or empty.");
            }

            try
            {
                var webhookUrl = $"{baseUrl.TrimEnd('/')}/webhook/acya/email/send";
                using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl)
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

                _logger.LogInformation("Dispatching transactional email via n8n webhook for tenant '{Tenant}' to '{Recipient}'...",
                    tenantSlug, recipient);

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(5));

                var response = await _httpClient.SendAsync(request, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    string? messageId = null;
                    try
                    {
                        var content = await response.Content.ReadAsStringAsync(cancellationToken);
                        if (!string.IsNullOrWhiteSpace(content))
                        {
                            using var doc = JsonDocument.Parse(content);
                            if (doc.RootElement.TryGetProperty("messageId", out var msgIdElem))
                            {
                                messageId = msgIdElem.GetString();
                            }
                        }
                    }
                    catch
                    {
                        // Response body parsing is non-critical if HTTP status was 2xx success
                    }

                    _logger.LogInformation("Email successfully accepted by n8n for tenant '{Tenant}' to '{Recipient}' (MessageId: {MessageId}).",
                        tenantSlug, recipient, messageId ?? "n/a");

                    return EmailDispatchResult.Success(messageId);
                }
                else
                {
                    var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("n8n Email Service rejected email for tenant '{Tenant}' (recipient: {Recipient}): HTTP {StatusCode} - {ResponseBody}",
                        tenantSlug, recipient, (int)response.StatusCode, responseBody);

                    return EmailDispatchResult.Rejected($"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}");
                }
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Timeout connecting to n8n Email Service for tenant '{Tenant}' (recipient: {Recipient}). Submission outcome is unknown.",
                    tenantSlug, recipient);
                return EmailDispatchResult.Unknown("Timeout contacting email service provider.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error connecting to n8n Email Service for tenant '{Tenant}' (recipient: {Recipient}).",
                    tenantSlug, recipient);
                return EmailDispatchResult.Rejected($"Network error: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error connecting to n8n Email Service for tenant '{Tenant}' (recipient: {Recipient}).",
                    tenantSlug, recipient);
                return EmailDispatchResult.Rejected($"Unexpected error: {ex.Message}");
            }
        }

        private static string BuildPasswordResetHtml(string resetUrl, string tenantDisplayName)
        {
            return $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;"">
  <h2 style=""color: #3b82f6; text-align: center;"">Réinitialisation de votre mot de passe</h2>
  <p>Bonjour,</p>
  <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur <strong>{tenantDisplayName}</strong>.</p>
  <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous (ce lien est valable pendant 15 minutes) :</p>
  <div style=""text-align: center; margin: 30px 0;"">
    <a href=""{resetUrl}"" style=""background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Réinitialiser mon mot de passe</a>
  </div>
  <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
  <p style=""word-break: break-all; color: #3b82f6;""><a href=""{resetUrl}"">{resetUrl}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
  <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
  <p style=""font-size: 12px; color: #6b7280; text-align: center;"">Ceci est un message automatique, veuillez ne pas y répondre.</p>
</div>";
        }

        private static string BuildMobileAppInvitationHtml(
            string portalUrl,
            string tenantDisplayName,
            string userName,
            string version,
            int buildNumber)
        {
            var safeTenant = WebUtility.HtmlEncode(tenantDisplayName ?? string.Empty);
            var safeUser = WebUtility.HtmlEncode(userName ?? string.Empty);
            var safeVersion = WebUtility.HtmlEncode(version ?? string.Empty);
            var safePortalUrl = WebUtility.HtmlEncode(portalUrl ?? string.Empty);

            var versionInfo = !string.IsNullOrWhiteSpace(safeVersion)
                ? $"Version {safeVersion} (Build {buildNumber})"
                : $"Build {buildNumber}";

            return $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;"">
  <div style=""text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;"">
    <h1 style=""color: #2563eb; font-size: 24px; font-weight: 700; margin: 0;"">Élancé Mobile</h1>
    <p style=""color: #64748b; font-size: 14px; margin: 4px 0 0 0;"">Plateforme ACYA ERP</p>
  </div>
  <div style=""padding: 24px 0;"">
    <p style=""font-size: 16px; margin: 0 0 16px 0;"">Bonjour <strong>{safeUser}</strong>,</p>
    <p style=""font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;"">
      L'application mobile officielle pour votre entreprise <strong>{safeTenant}</strong> est prête et disponible au téléchargement.
    </p>
    <div style=""background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;"">
      <p style=""font-size: 14px; font-weight: 600; color: #334155; margin: 0;"">Disponibilité de la version :</p>
      <p style=""font-size: 14px; color: #64748b; margin: 4px 0 0 0;"">{versionInfo}</p>
    </div>
    <div style=""text-align: center; margin: 28px 0;"">
      <a href=""{safePortalUrl}"" style=""background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;"">Accéder à mon espace mobile</a>
    </div>
    <p style=""font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 8px 0;"">
      Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :
    </p>
    <p style=""font-size: 13px; word-break: break-all; margin: 0 0 20px 0;"">
      <a href=""{safePortalUrl}"" style=""color: #2563eb; text-decoration: underline;"">{safePortalUrl}</a>
    </p>
  </div>
  <div style=""padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;"">
    <p style=""margin: 0;"">Ce message a été envoyé automatiquement pour votre compte {safeTenant}.</p>
    <p style=""margin: 4px 0 0 0;"">&copy; {DateTime.UtcNow.Year} ACYA. Tous droits réservés.</p>
  </div>
</div>";
        }
    }
}
