using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ms.webapp.api.acya.api.Models;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services
{
    public class SupportTicketService : ISupportTicketService
    {
        private readonly WoodAppContext _context;
        private readonly IEmailService _emailService;
        private readonly IN8nEmailService? _n8nEmailService;
        private readonly IConfiguration _configuration;
        private readonly SmtpSettings _smtpSettings;
        private readonly ILogger<SupportTicketService> _logger;

        private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "Application mobile",
            "Gestion du stock",
            "Gestion des articles",
            "Ressources humaines",
            "Chantiers & Production",
            "Autre demande"
        };

        private static readonly HashSet<string> AllowedPriorities = new(StringComparer.OrdinalIgnoreCase)
        {
            "Normale",
            "Élevée",
            "Critique"
        };

        private static readonly Dictionary<string, byte[]> FileSignatures = new()
        {
            { ".pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } }, // %PDF
            { ".png", new byte[] { 0x89, 0x50, 0x4E, 0x47 } }, // \x89PNG
            { ".jpg", new byte[] { 0xFF, 0xD8, 0xFF } },       // JPEG
            { ".jpeg", new byte[] { 0xFF, 0xD8, 0xFF } }
        };

        private const long MaxAttachmentSize = 5 * 1024 * 1024; // 5 MB

        public SupportTicketService(
            WoodAppContext context,
            IEmailService emailService,
            IConfiguration configuration,
            IOptions<SmtpSettings> smtpSettings,
            ILogger<SupportTicketService> logger,
            IN8nEmailService? n8nEmailService = null)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
            _smtpSettings = smtpSettings?.Value ?? new SmtpSettings();
            _logger = logger;
            _n8nEmailService = n8nEmailService;
        }

        public async Task<SupportTicketResponseDto> CreateTicketAsync(
            CreateSupportTicketDto dto,
            int userId,
            string userFullName,
            string userEmail,
            string enterpriseName,
            string tenantSlug,
            CancellationToken cancellationToken = default)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            // 1. Idempotency Check
            if (!string.IsNullOrWhiteSpace(dto.IdempotencyKey))
            {
                var existing = await _context.SupportTickets
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.IdempotencyKey == dto.IdempotencyKey, cancellationToken);

                if (existing != null)
                {
                    _logger.LogInformation("Returning existing support ticket {Reference} for idempotency key {Key}",
                        existing.TicketReference, dto.IdempotencyKey);

                    return MapToResponseDto(existing);
                }
            }

            // 2. Validate Category & Priority
            var normalizedCategory = ValidateAndNormalizeCategory(dto.Category);
            var normalizedPriority = ValidateAndNormalizePriority(dto.Priority);

            if (string.IsNullOrWhiteSpace(dto.Subject))
                throw new ArgumentException("Le sujet de la demande est requis.", nameof(dto.Subject));

            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new ArgumentException("La description de la demande est requise.", nameof(dto.Description));

            // 3. Handle Attachment
            byte[]? attachmentBytes = null;
            string? safeFileName = null;
            string? storedPath = null;
            long? attachmentSize = null;
            string? contentType = null;

            if (dto.AttachmentBytes != null && dto.AttachmentBytes.Length > 0 && !string.IsNullOrWhiteSpace(dto.AttachmentFileName))
            {
                (safeFileName, storedPath, attachmentSize, contentType, attachmentBytes) =
                    await ProcessAttachmentBytesAsync(dto.AttachmentBytes, dto.AttachmentFileName, dto.AttachmentContentType, tenantSlug, cancellationToken);
            }

            // 4. Generate Unique Ticket Reference (EL-YYYY-XXXXX)
            var currentYear = DateTime.UtcNow.Year;
            var ticketReference = await GenerateUniqueReferenceAsync(currentYear, cancellationToken);

            // 5. Build Entity & Persist to Database
            var ticket = new SupportTicket
            {
                TicketReference = ticketReference,
                UserId = userId,
                UserFullName = userFullName?.Trim() ?? string.Empty,
                UserEmail = userEmail?.Trim() ?? string.Empty,
                EnterpriseName = enterpriseName?.Trim() ?? string.Empty,
                TenantSlug = tenantSlug?.Trim().ToLowerInvariant() ?? "socobois",
                Category = normalizedCategory,
                Subcategory = dto.Subcategory?.Trim() ?? string.Empty,
                Priority = normalizedPriority,
                Subject = dto.Subject.Trim(),
                Description = dto.Description.Trim(),
                CurrentRoute = dto.CurrentRoute?.Trim(),
                AppVersion = dto.AppVersion?.Trim() ?? "v2.0",
                ContextData = dto.ContextData?.Trim(),
                AttachmentFileName = safeFileName != null ? Path.GetFileName(dto.AttachmentFileName) : null,
                AttachmentContentType = contentType,
                AttachmentStoragePath = storedPath,
                AttachmentSizeBytes = attachmentSize,
                IdempotencyKey = dto.IdempotencyKey?.Trim(),
                EmailStatus = TicketEmailStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SupportTickets.Add(ticket);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Support ticket {Reference} persisted successfully for user {User} in tenant {Tenant}",
                ticket.TicketReference, userId, tenantSlug);

            // 6. Dispatch Email Notification
            await TryDispatchEmailNotificationAsync(ticket, attachmentBytes, safeFileName, contentType, cancellationToken);

            return MapToResponseDto(ticket);
        }


        #region Helpers

        private string ValidateAndNormalizeCategory(string? category)
        {
            if (string.IsNullOrWhiteSpace(category))
                throw new ArgumentException("La catégorie est requise.", nameof(category));

            var match = AllowedCategories.FirstOrDefault(c => c.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match == null)
            {
                throw new ArgumentException($"Catégorie non reconnue: '{category}'. Catégories autorisées: {string.Join(", ", AllowedCategories)}", nameof(category));
            }

            return match;
        }

        private string ValidateAndNormalizePriority(string? priority)
        {
            if (string.IsNullOrWhiteSpace(priority))
                return "Normale";

            var match = AllowedPriorities.FirstOrDefault(p => p.Equals(priority.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match == null)
            {
                throw new ArgumentException($"Priorité non reconnue: '{priority}'. Priorités autorisées: Normale, Élevée, Critique", nameof(priority));
            }

            return match;
        }

        private async Task<(string SafeFileName, string StoredPath, long SizeBytes, string ContentType, byte[] Bytes)>
            ProcessAttachmentBytesAsync(byte[] bytes, string fileName, string? declaredContentType, string tenantSlug, CancellationToken cancellationToken)
        {
            if (bytes == null || bytes.Length == 0)
            {
                throw new ArgumentException("Le fichier est vide.");
            }

            if (bytes.Length > MaxAttachmentSize)
            {
                throw new ArgumentException($"La taille du fichier dépasse la limite autorisée de {MaxAttachmentSize / (1024 * 1024)} Mo.");
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (!FileSignatures.ContainsKey(extension))
            {
                throw new ArgumentException($"Format de fichier non autorisé ({extension}). Formats acceptés : .png, .jpg, .jpeg, .pdf");
            }

            // Validate Magic Bytes
            var expectedSignature = FileSignatures[extension];
            if (bytes.Length < expectedSignature.Length)
            {
                throw new ArgumentException("Le contenu du fichier est invalide.");
            }

            for (int i = 0; i < expectedSignature.Length; i++)
            {
                if (bytes[i] != expectedSignature[i])
                {
                    _logger.LogWarning("File magic bytes mismatch for upload {FileName}. Expected {Ext}", fileName, extension);
                    throw new ArgumentException("La signature du fichier ne correspond pas à son extension.");
                }
            }

            // Store safely in private directory outside web root
            var baseStorageDir = _configuration["SupportStorage:BasePath"] ?? "storage/private/support";
            var tenantDir = Path.Combine(baseStorageDir, tenantSlug);
            Directory.CreateDirectory(tenantDir);

            var safeUniqueName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(tenantDir, safeUniqueName);

            await File.WriteAllBytesAsync(fullPath, bytes, cancellationToken);

            var determinedContentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };

            return (safeUniqueName, fullPath, bytes.Length, determinedContentType, bytes);
        }

        private async Task<string> GenerateUniqueReferenceAsync(int year, CancellationToken cancellationToken)
        {
            // Prefix format: EL-YYYY-
            var prefix = $"EL-{year}-";

            // Count existing tickets in the year to estimate next sequence
            var countInYear = await _context.SupportTickets
                .CountAsync(t => t.TicketReference.StartsWith(prefix), cancellationToken);

            var sequence = countInYear + 1;

            while (true)
            {
                var candidate = $"{prefix}{sequence:D5}";
                var exists = await _context.SupportTickets
                    .AnyAsync(t => t.TicketReference == candidate, cancellationToken);

                if (!exists)
                {
                    return candidate;
                }

                sequence++;
            }
        }

        private async Task TryDispatchEmailNotificationAsync(
            SupportTicket ticket,
            byte[]? attachmentBytes,
            string? safeFileName,
            string? contentType,
            CancellationToken cancellationToken)
        {
            var supportRecipient = _configuration["EmailSettings:SupportEmail"] ?? "support@acya.site";
            var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "ticket@acya.site";

            var subject = $"[ÉLANCÉ][{ticket.TenantSlug.ToUpper()}][{ticket.Category.ToUpper()}][{ticket.Priority.ToUpper()}] Ticket {ticket.TicketReference} — {ticket.Subject}";
            var htmlBody = BuildSupportEmailHtml(ticket);

            try
            {
                if (_n8nEmailService != null)
                {
                    var dispatchResult = await _n8nEmailService.SendEmailAsync(
                        toEmail: supportRecipient,
                        subject: subject,
                        htmlBody: htmlBody,
                        template: "raw",
                        sender: senderEmail,
                        replyTo: string.IsNullOrWhiteSpace(ticket.UserEmail) ? "support@acya.site" : ticket.UserEmail,
                        cancellationToken: cancellationToken);

                    if (dispatchResult.Status == EmailDispatchStatus.Accepted)
                    {
                        ticket.EmailStatus = TicketEmailStatus.Sent;
                        ticket.EmailError = null;
                        ticket.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync(cancellationToken);

                        _logger.LogInformation("Email notification for ticket {Reference} delivered to {Recipient} via n8n (MessageId: {MessageId})",
                            ticket.TicketReference, supportRecipient, dispatchResult.MessageId ?? "n/a");
                        return;
                    }
                    else
                    {
                        _logger.LogWarning("n8n Email Service rejected ticket notification for {Reference}: {Error}. Attempting fallback...",
                            ticket.TicketReference, dispatchResult.ErrorMessage);
                    }
                }

                // Fallback to direct SMTP if n8n is not registered or rejected
                if (attachmentBytes != null && attachmentBytes.Length > 0 && !string.IsNullOrWhiteSpace(safeFileName))
                {
                    var originalName = ticket.AttachmentFileName ?? safeFileName;
                    await _emailService.SendEmailWithAttachmentAsync(
                        supportRecipient,
                        subject,
                        htmlBody,
                        attachmentBytes,
                        originalName,
                        contentType ?? "application/pdf",
                        isHtml: true);
                }
                else
                {
                    await _emailService.SendEmailAsync(supportRecipient, subject, htmlBody, isHtml: true);
                }

                ticket.EmailStatus = TicketEmailStatus.Sent;
                ticket.EmailError = null;
                ticket.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Email notification for ticket {Reference} delivered to {Recipient} via SMTP",
                    ticket.TicketReference, supportRecipient);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deliver email notification for ticket {Reference}. Persisted ticket is safe.",
                    ticket.TicketReference);

                ticket.EmailStatus = TicketEmailStatus.Failed;
                ticket.EmailError = ex.Message.Length > 950 ? ex.Message.Substring(0, 950) : ex.Message;
                ticket.UpdatedAt = DateTime.UtcNow;

                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (Exception dbEx)
                {
                    _logger.LogError(dbEx, "Failed to update email status on ticket {Reference}", ticket.TicketReference);
                }
            }
        }

        private static string BuildSupportEmailHtml(SupportTicket ticket)
        {
            var sb = new StringBuilder();

            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang=\"fr\">");
            sb.AppendLine("<head>");
            sb.AppendLine("<meta charset=\"utf-8\" />");
            sb.AppendLine("<style>");
            sb.AppendLine("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8fafc; }");
            sb.AppendLine(".container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }");
            sb.AppendLine(".header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 24px 32px; }");
            sb.AppendLine(".header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }");
            sb.AppendLine(".header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }");
            sb.AppendLine(".badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }");
            sb.AppendLine(".badge-normale { background: #e0f2fe; color: #0369a1; }");
            sb.AppendLine(".badge-elevee { background: #fef3c7; color: #b45309; }");
            sb.AppendLine(".badge-critique { background: #fee2e2; color: #b91c1c; }");
            sb.AppendLine(".content { padding: 28px 32px; }");
            sb.AppendLine(".section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }");
            sb.AppendLine(".meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 14px; }");
            sb.AppendLine(".meta-item { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9; }");
            sb.AppendLine(".meta-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }");
            sb.AppendLine(".meta-value { font-weight: 600; color: #0f172a; margin-top: 2px; }");
            sb.AppendLine(".description-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 14px; white-space: pre-wrap; margin-top: 8px; }");
            sb.AppendLine(".context-box { background: #f1f5f9; border-radius: 8px; padding: 14px 18px; font-size: 13px; font-family: monospace; white-space: pre-wrap; margin-top: 8px; word-break: break-all; }");
            sb.AppendLine(".footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 12px; color: #64748b; text-align: center; }");
            sb.AppendLine("</style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("<div class=\"container\">");

            // Header
            sb.AppendLine("<div class=\"header\">");
            sb.AppendFormat("<h1>Nouveau Ticket : {0}</h1>\n", WebUtility.HtmlEncode(ticket.TicketReference));
            sb.AppendFormat("<p>Soumis le {0:dd/MM/yyyy HH:mm:ss} UTC par {1}</p>\n",
                ticket.CreatedAt, WebUtility.HtmlEncode(ticket.UserFullName));
            sb.AppendLine("</div>");

            // Content
            sb.AppendLine("<div class=\"content\">");

            // Priority badge
            var badgeClass = ticket.Priority.ToLowerInvariant() switch
            {
                "critique" => "badge-critique",
                "élevée" or "elevee" => "badge-elevee",
                _ => "badge-normale"
            };

            sb.AppendLine("<div style=\"display: flex; gap: 8px; align-items: center; margin-bottom: 20px;\">");
            sb.AppendFormat("<span class=\"badge {0}\">Priorité : {1}</span>\n", badgeClass, WebUtility.HtmlEncode(ticket.Priority));
            sb.AppendFormat("<span class=\"badge\" style=\"background: #f1f5f9; color: #334155;\">Catégorie : {0} &rsaquo; {1}</span>\n",
                WebUtility.HtmlEncode(ticket.Category), WebUtility.HtmlEncode(ticket.Subcategory));
            sb.AppendLine("</div>");

            // Metadata Grid
            sb.AppendLine("<div class=\"section-title\">Informations Demandeur</div>");
            sb.AppendLine("<div class=\"meta-grid\">");
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Utilisateur</div><div class=\"meta-value\">{0} (ID: {1})</div></div>\n",
                WebUtility.HtmlEncode(ticket.UserFullName), ticket.UserId);
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Email</div><div class=\"meta-value\"><a href=\"mailto:{0}\">{0}</a></div></div>\n",
                WebUtility.HtmlEncode(ticket.UserEmail));
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Entreprise</div><div class=\"meta-value\">{0}</div></div>\n",
                WebUtility.HtmlEncode(ticket.EnterpriseName));
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Tenant</div><div class=\"meta-value\">{0}</div></div>\n",
                WebUtility.HtmlEncode(ticket.TenantSlug));
            sb.AppendLine("</div>");

            // Demande
            sb.AppendLine("<div class=\"section-title\">Objet & Description</div>");
            sb.AppendFormat("<h3 style=\"margin: 8px 0 4px 0; color: #0f172a;\">{0}</h3>\n", WebUtility.HtmlEncode(ticket.Subject));
            sb.AppendFormat("<div class=\"description-box\">{0}</div>\n", WebUtility.HtmlEncode(ticket.Description));

            // Context details
            if (!string.IsNullOrWhiteSpace(ticket.ContextData))
            {
                sb.AppendLine("<div class=\"section-title\">Données Contextuelles</div>");
                try
                {
                    // Pretty-print JSON if possible
                    using var doc = JsonDocument.Parse(ticket.ContextData);
                    var formatted = JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true });
                    sb.AppendFormat("<div class=\"context-box\">{0}</div>\n", WebUtility.HtmlEncode(formatted));
                }
                catch
                {
                    sb.AppendFormat("<div class=\"context-box\">{0}</div>\n", WebUtility.HtmlEncode(ticket.ContextData));
                }
            }

            // System environment
            sb.AppendLine("<div class=\"section-title\">Environnement Système</div>");
            sb.AppendLine("<div class=\"meta-grid\">");
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Module / Route</div><div class=\"meta-value\">{0}</div></div>\n",
                WebUtility.HtmlEncode(ticket.CurrentRoute ?? "N/A"));
            sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Version Application</div><div class=\"meta-value\">{0}</div></div>\n",
                WebUtility.HtmlEncode(ticket.AppVersion ?? "N/A"));
            if (!string.IsNullOrWhiteSpace(ticket.AttachmentFileName))
            {
                sb.AppendFormat("<div class=\"meta-item\"><div class=\"meta-label\">Pièce Jointe</div><div class=\"meta-value\">{0} ({1:N0} octets)</div></div>\n",
                    WebUtility.HtmlEncode(ticket.AttachmentFileName), ticket.AttachmentSizeBytes ?? 0);
            }
            sb.AppendLine("</div>");

            sb.AppendLine("</div>"); // End content

            // Footer
            sb.AppendLine("<div class=\"footer\">");
            sb.AppendFormat("ACYA ERP Élancé &bull; Référence Ticket: <strong>{0}</strong> &bull; Notification automatique pour l'équipe Support\n",
                WebUtility.HtmlEncode(ticket.TicketReference));
            sb.AppendLine("</div>");

            sb.AppendLine("</div>");
            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }

        private static SupportTicketResponseDto MapToResponseDto(SupportTicket ticket)
        {
            return new SupportTicketResponseDto
            {
                TicketReference = ticket.TicketReference,
                Category = ticket.Category,
                Subcategory = ticket.Subcategory,
                Priority = ticket.Priority,
                Subject = ticket.Subject,
                CreatedAt = ticket.CreatedAt,
                EmailStatus = ticket.EmailStatus.ToString(),
                EmailDispatched = ticket.EmailStatus == TicketEmailStatus.Sent,
                AttachmentFileName = ticket.AttachmentFileName
            };
        }

        #endregion
    }
}
