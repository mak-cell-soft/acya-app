using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers.Public
{
    [AllowAnonymous]
    [ApiController]
    [Route("api/public/workspace-recovery")]
    public class WorkspaceRecoveryController : ControllerBase
    {
        private const string GenericPublicMessage = "Si un compte correspond à cette adresse, vous recevrez les instructions nécessaires pour retrouver votre espace ACYA.";
        private static readonly Regex SafeIdentifierRegex = new("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

        private readonly MasterDbContext _masterDb;
        private readonly IN8nEmailService _n8nEmailService;
        private readonly IWorkspaceRecoveryRateLimiter _rateLimiter;
        private readonly ILogger<WorkspaceRecoveryController> _logger;
        private readonly IConfiguration _configuration;

        public WorkspaceRecoveryController(
            MasterDbContext masterDb,
            IN8nEmailService n8nEmailService,
            IWorkspaceRecoveryRateLimiter rateLimiter,
            ILogger<WorkspaceRecoveryController> logger,
            IConfiguration configuration)
        {
            _masterDb = masterDb;
            _n8nEmailService = n8nEmailService;
            _rateLimiter = rateLimiter;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> RecoverWorkspace([FromBody] WorkspaceRecoveryRequestDto? dto, CancellationToken cancellationToken)
        {
            var clientIp = ResolveClientIp();
            var rawEmail = dto?.Email?.Trim() ?? string.Empty;

            // 1. Rate Limiting Protection (per IP and per Target Email)
            if (!_rateLimiter.IsAllowed(clientIp, rawEmail, out var retryAfterSeconds))
            {
                _logger.LogWarning("Rate limit exceeded for workspace-recovery from IP {ClientIp}", clientIp);
                Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = "Trop de tentatives de récupération. Veuillez réessayer dans quelques minutes."
                });
            }

            // 2. Validate email syntax without leaking validity to unauthenticated clients
            if (string.IsNullOrWhiteSpace(rawEmail) || !IsValidEmailFormat(rawEmail))
            {
                return Ok(new { message = GenericPublicMessage });
            }

            var normalizedEmail = rawEmail.ToLowerInvariant();

            try
            {
                // 3. Resolve active tenants from the master registry
                var activeTenants = await _masterDb.TenantRegistries
                    .Where(t => t.IsActive && t.Status != "Disabled" && t.Status != "Deleted")
                    .ToListAsync(cancellationToken);

                var matchedTenants = new Dictionary<string, TenantRegistry>(StringComparer.OrdinalIgnoreCase);

                // 3a. Check matching enterprise contact email
                foreach (var tenant in activeTenants)
                {
                    if (!string.IsNullOrWhiteSpace(tenant.Email) &&
                        string.Equals(tenant.Email.Trim(), normalizedEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        if (!string.IsNullOrEmpty(tenant.Slug))
                        {
                            matchedTenants[tenant.Slug] = tenant;
                        }
                    }
                }

                // 3b. Check active users in tenant schemas (only if running against a relational provider)
                if (_masterDb.Database.IsRelational())
                {
                    var connection = _masterDb.Database.GetDbConnection();
                    if (connection.State != ConnectionState.Open)
                    {
                        await connection.OpenAsync(cancellationToken);
                    }

                    foreach (var tenant in activeTenants)
                    {
                        if (matchedTenants.ContainsKey(tenant.Slug))
                            continue;

                        var schema = tenant.SchemaName;
                        if (string.IsNullOrWhiteSpace(schema) || !SafeIdentifierRegex.IsMatch(schema))
                            continue;

                        try
                        {
                            using var cmd = connection.CreateCommand();
                            cmd.CommandText = $"SELECT 1 FROM \"{schema}\".tbl_app_user WHERE (LOWER(email) = @email OR LOWER(login) = @email) AND isactive = true LIMIT 1";
                            var p = cmd.CreateParameter();
                            p.ParameterName = "@email";
                            p.Value = normalizedEmail;
                            cmd.Parameters.Add(p);

                            var result = await cmd.ExecuteScalarAsync(cancellationToken);
                            if (result != null && result != DBNull.Value)
                            {
                                matchedTenants[tenant.Slug] = tenant;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Schema {Schema} skipped during workspace recovery check", schema);
                        }
                    }
                }

                // 4. If matching workspaces found, dispatch branded recovery email
                if (matchedTenants.Count > 0)
                {
                    var htmlBody = BuildWorkspaceRecoveryEmailHtml(matchedTenants.Values.ToList());
                    var subject = matchedTenants.Count == 1
                        ? $"Votre espace de travail ACYA Élancé ({matchedTenants.Values.First().Name})"
                        : "Vos espaces de travail ACYA Élancé";

                    var dispatchResult = await _n8nEmailService.SendEmailAsync(
                        toEmail: normalizedEmail,
                        subject: subject,
                        htmlBody: htmlBody,
                        template: "raw",
                        sender: "noreply",
                        replyTo: _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site",
                        cancellationToken: cancellationToken);

                    _logger.LogInformation("Workspace recovery email dispatched ({Status}) for {Count} workspaces",
                        dispatchResult?.Status.ToString() ?? "Unknown", matchedTenants.Count);
                }
            }
            catch (Exception ex)
            {
                // Always log securely without leaking internal errors or email address to the caller
                _logger.LogError(ex, "Error processing workspace recovery request");
            }

            // 5. Always return generic message to prevent email/tenant enumeration
            return Ok(new { message = GenericPublicMessage });
        }

        private static bool IsValidEmailFormat(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            try
            {
                var addr = new MailAddress(email);
                return addr.Address.Equals(email, StringComparison.OrdinalIgnoreCase) && email.Contains('.');
            }
            catch
            {
                return false;
            }
        }

        private string ResolveClientIp()
        {
            var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwardedFor))
            {
                var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (ips.Length > 0)
                {
                    return ips[0].Trim();
                }
            }

            var realIp = Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(realIp))
            {
                return realIp.Trim();
            }

            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        }

        private static string BuildWorkspaceRecoveryEmailHtml(IReadOnlyList<TenantRegistry> workspaces)
        {
            var isSingle = workspaces.Count == 1;
            var workspacesHtml = new StringBuilder();

            foreach (var ws in workspaces)
            {
                var loginUrl = $"https://{ws.Slug}.acya.site/login";
                var displayName = string.IsNullOrWhiteSpace(ws.Name) ? ws.Slug : ws.Name;

                workspacesHtml.Append($@"
                <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;"">
                  <div>
                    <div style=""font-size: 16px; font-weight: 700; color: #0f172a;"">{displayName}</div>
                    <div style=""font-size: 13px; color: #64748b; font-family: monospace; margin-top: 2px;"">{ws.Slug}.acya.site</div>
                  </div>
                  <div style=""margin-left: 16px;"">
                    <a href=""{loginUrl}"" style=""background: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px; display: inline-block; white-space: nowrap;"">Accéder &rarr;</a>
                  </div>
                </div>");
            }

            return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"" />
  <title>Vos espaces ACYA Élancé</title>
</head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 32px 16px; color: #1e293b;"">
  <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);"">
    <div style=""background: #0f172a; padding: 24px; text-align: center;"">
      <h1 style=""color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;"">ACYA Élancé</h1>
      <p style=""color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;"">Plateforme ERP &amp; Négoce</p>
    </div>
    <div style=""padding: 32px 24px;"">
      <h2 style=""font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;"">Retrouvez votre espace de travail</h2>
      <p style=""font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;"">
        Bonjour,<br /><br />
        Vous avez demandé à retrouver vos espaces professionnels ACYA associés à votre adresse e-mail.
        {(isSingle ? "Voici l'espace correspondant à votre compte :" : "Voici la liste des espaces correspondant à votre compte :")}
      </p>

      <div style=""margin-bottom: 24px;"">
        {workspacesHtml}
      </div>

      <div style=""background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;"">
        <p style=""font-size: 12px; line-height: 1.5; color: #1e40af; margin: 0;"">
          <strong>Astuce :</strong> Ajoutez l'adresse de votre espace à vos favoris pour y accéder directement sans passer par la page de recherche.
        </p>
      </div>

      <p style=""font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;"">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Vos accès et vos données restent strictement protégés.
      </p>
    </div>
    <div style=""background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center;"">
      <p style=""font-size: 11px; color: #94a3b8; margin: 0;"">
        Ceci est un message automatique, veuillez ne pas y répondre directement.<br />
        Pour toute assistance, contactez <a href=""mailto:support@acya.site"" style=""color: #2563eb; text-decoration: none;"">support@acya.site</a>.
      </p>
    </div>
  </div>
</body>
</html>";
        }
    }
}
