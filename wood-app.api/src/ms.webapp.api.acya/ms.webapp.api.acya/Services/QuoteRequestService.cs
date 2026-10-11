using System;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Inbound;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
    public class QuoteRequestService : IQuoteRequestService
    {
        private readonly WoodAppContext _context;
        private readonly IN8nEmailService _n8nEmailService;
        private readonly IAppNotificationService _notificationService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<QuoteRequestService> _logger;

        private static readonly TimeSpan DefaultLeaseDuration = TimeSpan.FromMinutes(2);
        private static readonly TimeSpan AmbiguousTimeoutQuarantine = TimeSpan.FromMinutes(15);
        private const int MaxEmailRetries = 3;

        public QuoteRequestService(
            WoodAppContext context,
            IN8nEmailService n8nEmailService,
            IAppNotificationService notificationService,
            IConfiguration configuration,
            ILogger<QuoteRequestService> logger)
        {
            _context = context;
            _n8nEmailService = n8nEmailService;
            _notificationService = notificationService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<InboundQuoteResponseDto> ProcessQuoteRequestAsync(
            InboundQuoteRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));

            var cleanIdempotencyKey = dto.IdempotencyKey.Trim();

            // 1. Idempotency Check: Existing processed submission with this UUID
            var existing = await _context.InboundQuoteRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.IdempotencyKey == cleanIdempotencyKey, cancellationToken);

            if (existing != null)
            {
                _logger.LogInformation("Idempotent duplicate quote submission resolved. Key: {Key}, Tracking: {Tracking}",
                    cleanIdempotencyKey, existing.TrackingNumber);
                return InboundQuoteResponseDto.Accepted(existing.TrackingNumber, isDuplicate: true, existing.CreatedAt);
            }

            // 2. Generate Tracking Reference
            var trackingNumber = GenerateTrackingNumber();

            // 3. Create and Persist Inbound Quote Request
            var quote = new InboundQuoteRequest
            {
                TrackingNumber = trackingNumber,
                Product = WebUtility.HtmlEncode(dto.Product.Trim()),
                Quantity = WebUtility.HtmlEncode(dto.Quantity.Trim()),
                CustomerName = WebUtility.HtmlEncode(dto.CustomerName.Trim()),
                CustomerEmail = dto.CustomerEmail.Trim().ToLowerInvariant(),
                CustomerPhone = !string.IsNullOrWhiteSpace(dto.CustomerPhone) ? WebUtility.HtmlEncode(dto.CustomerPhone.Trim()) : null,
                Message = !string.IsNullOrWhiteSpace(dto.Message) ? WebUtility.HtmlEncode(dto.Message.Trim()) : null,
                Source = !string.IsNullOrWhiteSpace(dto.Source) ? dto.Source.Trim() : "socofeb-decor.com",
                IdempotencyKey = cleanIdempotencyKey,
                EnterpriseStatus = EmailLeaseStatus.Pending,
                CustomerStatus = EmailLeaseStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                _context.InboundQuoteRequests.Add(quote);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex)
            {
                // Concurrency race: Another thread inserted this IdempotencyKey at the exact same time
                _logger.LogWarning(ex, "Concurrency collision detected for quote IdempotencyKey {Key}. Reloading existing row.", cleanIdempotencyKey);
                var concurrentExisting = await _context.InboundQuoteRequests
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.IdempotencyKey == cleanIdempotencyKey, cancellationToken);

                if (concurrentExisting != null)
                {
                    return InboundQuoteResponseDto.Accepted(concurrentExisting.TrackingNumber, isDuplicate: true, concurrentExisting.CreatedAt);
                }
                throw;
            }

            // 4. Alert internal sales team in real time via ERP notifications / SignalR
            await NotifySalesStaffAsync(quote);

            // 5. Attempt Immediate Inline Email Dispatches
            await DispatchInlineEmailsAsync(quote.Id, cancellationToken);

            return InboundQuoteResponseDto.Accepted(quote.TrackingNumber, isDuplicate: false, quote.CreatedAt);
        }

        private async Task NotifySalesStaffAsync(InboundQuoteRequest quote)
        {
            try
            {
                var title = $"[Devis Web] Nouvelle demande : {quote.Product} - {quote.CustomerName}";
                var message = $"Référence : {quote.TrackingNumber}\nClient : {quote.CustomerName}\nEmail : {quote.CustomerEmail}\nTél : {quote.CustomerPhone ?? "N/A"}\nProduit : {quote.Product}\nQuantité : {quote.Quantity}\nMessage : {quote.Message ?? "Aucun"}";

                await _notificationService.NotifyAsync(
                    title: title,
                    message: message,
                    type: NotificationType.Info,
                    priority: NotificationPriority.High,
                    targetRole: "Seller",
                    relatedEntityId: quote.Id.ToString(),
                    relatedEntityType: "InboundQuoteRequest"
                );
            }
            catch (Exception ex)
            {
                // Non-blocking for quote acceptance
                _logger.LogError(ex, "Failed to push real-time in-app notification for quote {QuoteId}", quote.Id);
            }
        }

        private async Task DispatchInlineEmailsAsync(int quoteId, CancellationToken cancellationToken)
        {
            // Slot 1: Enterprise Email
            await TryDispatchEnterpriseEmailAsync(quoteId, cancellationToken);

            // Slot 2: Customer Email (Processed independently)
            await TryDispatchCustomerEmailAsync(quoteId, cancellationToken);
        }

        public async Task RetryPendingQuoteEmailsAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            // Query candidates with expired leases, retryable failures, or expired timeout quarantines
            var candidates = await _context.InboundQuoteRequests
                .Where(q =>
                    ((q.EnterpriseStatus == EmailLeaseStatus.Pending ||
                      (q.EnterpriseStatus == EmailLeaseStatus.Claimed && q.EnterpriseLeaseExpiresAt < now) ||
                      (q.EnterpriseStatus == EmailLeaseStatus.Failed && q.EnterpriseRetryCount < MaxEmailRetries && (q.NextRetryAt == null || q.NextRetryAt <= now)) ||
                      (q.EnterpriseStatus == EmailLeaseStatus.UnknownTimeout && q.EnterpriseRetryCount < MaxEmailRetries && (q.NextRetryAt == null || q.NextRetryAt <= now)))
                    ||
                    ((q.CustomerStatus == EmailLeaseStatus.Pending ||
                      (q.CustomerStatus == EmailLeaseStatus.Claimed && q.CustomerLeaseExpiresAt < now) ||
                      (q.CustomerStatus == EmailLeaseStatus.Failed && q.CustomerRetryCount < MaxEmailRetries && (q.NextRetryAt == null || q.NextRetryAt <= now)) ||
                      (q.CustomerStatus == EmailLeaseStatus.UnknownTimeout && q.CustomerRetryCount < MaxEmailRetries && (q.NextRetryAt == null || q.NextRetryAt <= now))))))
                .OrderBy(q => q.CreatedAt)
                .Take(20)
                .Select(q => q.Id)
                .ToListAsync(cancellationToken);

            foreach (var quoteId in candidates)
            {
                if (cancellationToken.IsCancellationRequested) break;
                await TryDispatchEnterpriseEmailAsync(quoteId, cancellationToken);
                await TryDispatchCustomerEmailAsync(quoteId, cancellationToken);
            }
        }

        private async Task TryDispatchEnterpriseEmailAsync(int quoteId, CancellationToken cancellationToken)
        {
            var quote = await _context.InboundQuoteRequests.FindAsync(new object[] { quoteId }, cancellationToken);
            if (quote == null) return;

            var now = DateTime.UtcNow;

            // Check lease eligibility
            bool eligible = quote.EnterpriseStatus == EmailLeaseStatus.Pending ||
                           (quote.EnterpriseStatus == EmailLeaseStatus.Claimed && quote.EnterpriseLeaseExpiresAt < now) ||
                           (quote.EnterpriseStatus == EmailLeaseStatus.Failed && quote.EnterpriseRetryCount < MaxEmailRetries && (quote.NextRetryAt == null || quote.NextRetryAt <= now)) ||
                           (quote.EnterpriseStatus == EmailLeaseStatus.UnknownTimeout && quote.EnterpriseRetryCount < MaxEmailRetries && (quote.NextRetryAt == null || quote.NextRetryAt <= now));

            if (!eligible) return;

            // Claim lease
            quote.EnterpriseStatus = EmailLeaseStatus.Claimed;
            quote.EnterpriseLeaseExpiresAt = now.Add(DefaultLeaseDuration);
            quote.UpdatedAt = now;
            await _context.SaveChangesAsync(cancellationToken);

            var enterpriseRecipient = _configuration["QuoteEmail:EnterpriseRecipient"] ?? "socofeb.deco@gmail.com";
            var senderAlias = _configuration["QuoteEmail:SenderAlias"] ?? "contact-socofeb";
            var subject = $"[Devis Web] Demande de devis {quote.TrackingNumber} - {quote.Product}";
            var html = BuildEnterpriseEmailHtml(quote);

            try
            {
                var result = await _n8nEmailService.SendEmailAsync(
                    toEmail: enterpriseRecipient,
                    subject: subject,
                    htmlBody: html,
                    sender: senderAlias,
                    replyTo: quote.CustomerEmail,
                    cancellationToken: cancellationToken
                );

                if (result.Status == EmailDispatchStatus.Accepted)
                {
                    quote.EnterpriseStatus = EmailLeaseStatus.Accepted;
                    quote.EnterpriseMessageId = result.MessageId;
                    quote.EnterpriseLeaseExpiresAt = null;
                }
                else if (result.Status == EmailDispatchStatus.Unknown)
                {
                    // Ambiguous timeout: quarantine for 15 minutes before re-evaluating
                    quote.EnterpriseStatus = EmailLeaseStatus.UnknownTimeout;
                    quote.EnterpriseRetryCount++;
                    quote.EnterpriseLeaseExpiresAt = null;
                    quote.NextRetryAt = DateTime.UtcNow.Add(AmbiguousTimeoutQuarantine);
                    quote.LastError = result.ErrorMessage ?? "Timeout contacting email provider.";
                    _logger.LogWarning("Enterprise quote email dispatch outcome is unknown (timeout). Quarantine set for 15m. Quote: {QuoteId}", quoteId);
                }
                else
                {
                    quote.EnterpriseStatus = EmailLeaseStatus.Failed;
                    quote.EnterpriseRetryCount++;
                    quote.EnterpriseLeaseExpiresAt = null;
                    quote.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, quote.EnterpriseRetryCount));
                    quote.LastError = result.ErrorMessage;
                }
            }
            catch (Exception ex)
            {
                quote.EnterpriseStatus = EmailLeaseStatus.Failed;
                quote.EnterpriseRetryCount++;
                quote.EnterpriseLeaseExpiresAt = null;
                quote.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, quote.EnterpriseRetryCount));
                quote.LastError = ex.Message;
                _logger.LogError(ex, "Exception dispatching enterprise quote email for QuoteId: {QuoteId}", quoteId);
            }

            quote.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task TryDispatchCustomerEmailAsync(int quoteId, CancellationToken cancellationToken)
        {
            var quote = await _context.InboundQuoteRequests.FindAsync(new object[] { quoteId }, cancellationToken);
            if (quote == null) return;

            var now = DateTime.UtcNow;

            bool eligible = quote.CustomerStatus == EmailLeaseStatus.Pending ||
                           (quote.CustomerStatus == EmailLeaseStatus.Claimed && quote.CustomerLeaseExpiresAt < now) ||
                           (quote.CustomerStatus == EmailLeaseStatus.Failed && quote.CustomerRetryCount < MaxEmailRetries && (quote.NextRetryAt == null || quote.NextRetryAt <= now)) ||
                           (quote.CustomerStatus == EmailLeaseStatus.UnknownTimeout && quote.CustomerRetryCount < MaxEmailRetries && (quote.NextRetryAt == null || quote.NextRetryAt <= now));

            if (!eligible) return;

            // Claim lease
            quote.CustomerStatus = EmailLeaseStatus.Claimed;
            quote.CustomerLeaseExpiresAt = now.Add(DefaultLeaseDuration);
            quote.UpdatedAt = now;
            await _context.SaveChangesAsync(cancellationToken);

            var enterpriseRecipient = _configuration["QuoteEmail:EnterpriseRecipient"] ?? "socofeb.deco@gmail.com";
            var senderAlias = _configuration["QuoteEmail:SenderAlias"] ?? "contact-socofeb";
            var subject = $"Confirmation de votre demande de devis ({quote.TrackingNumber}) - SOCOFEB";
            var html = BuildCustomerEmailHtml(quote);

            try
            {
                var result = await _n8nEmailService.SendEmailAsync(
                    toEmail: quote.CustomerEmail,
                    subject: subject,
                    htmlBody: html,
                    sender: senderAlias,
                    replyTo: enterpriseRecipient,
                    cancellationToken: cancellationToken
                );

                if (result.Status == EmailDispatchStatus.Accepted)
                {
                    quote.CustomerStatus = EmailLeaseStatus.Accepted;
                    quote.CustomerMessageId = result.MessageId;
                    quote.CustomerLeaseExpiresAt = null;
                }
                else if (result.Status == EmailDispatchStatus.Unknown)
                {
                    quote.CustomerStatus = EmailLeaseStatus.UnknownTimeout;
                    quote.CustomerRetryCount++;
                    quote.CustomerLeaseExpiresAt = null;
                    quote.NextRetryAt = DateTime.UtcNow.Add(AmbiguousTimeoutQuarantine);
                    quote.LastError = result.ErrorMessage ?? "Timeout contacting email provider.";
                    _logger.LogWarning("Customer quote confirmation outcome is unknown (timeout). Quarantine set for 15m. Quote: {QuoteId}", quoteId);
                }
                else
                {
                    quote.CustomerStatus = EmailLeaseStatus.Failed;
                    quote.CustomerRetryCount++;
                    quote.CustomerLeaseExpiresAt = null;
                    quote.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, quote.CustomerRetryCount));
                    quote.LastError = result.ErrorMessage;
                }
            }
            catch (Exception ex)
            {
                quote.CustomerStatus = EmailLeaseStatus.Failed;
                quote.CustomerRetryCount++;
                quote.CustomerLeaseExpiresAt = null;
                quote.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, quote.CustomerRetryCount));
                quote.LastError = ex.Message;
                _logger.LogError(ex, "Exception dispatching customer quote confirmation for QuoteId: {QuoteId}", quoteId);
            }

            quote.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        private static string GenerateTrackingNumber()
        {
            var yearMonth = DateTime.UtcNow.ToString("yyyyMM");
            var randomCode = Random.Shared.Next(1000, 9999);
            return $"QR-{yearMonth}-{randomCode}";
        }

        private static string BuildEnterpriseEmailHtml(InboundQuoteRequest quote)
        {
            return $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"">
  <h2 style=""color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;"">Nouvelle Demande de Devis Web</h2>
  <p>Une demande de devis a été soumise sur <strong>socofeb-decor.com</strong>.</p>
  <table style=""width: 100%; border-collapse: collapse; margin: 20px 0;"">
    <tr><td style=""padding: 8px; font-weight: bold; width: 140px; color: #475569;"">Référence :</td><td style=""padding: 8px; font-family: monospace;"">{quote.TrackingNumber}</td></tr>
    <tr style=""background-color: #f8fafc;""><td style=""padding: 8px; font-weight: bold; color: #475569;"">Produit :</td><td style=""padding: 8px;""><strong>{quote.Product}</strong></td></tr>
    <tr><td style=""padding: 8px; font-weight: bold; color: #475569;"">Quantité :</td><td style=""padding: 8px;"">{quote.Quantity}</td></tr>
    <tr style=""background-color: #f8fafc;""><td style=""padding: 8px; font-weight: bold; color: #475569;"">Client :</td><td style=""padding: 8px;"">{quote.CustomerName}</td></tr>
    <tr><td style=""padding: 8px; font-weight: bold; color: #475569;"">Email :</td><td style=""padding: 8px;""><a href=""mailto:{quote.CustomerEmail}"">{quote.CustomerEmail}</a></td></tr>
    <tr style=""background-color: #f8fafc;""><td style=""padding: 8px; font-weight: bold; color: #475569;"">Téléphone :</td><td style=""padding: 8px;"">{quote.CustomerPhone ?? "Non renseigné"}</td></tr>
    <tr><td style=""padding: 8px; font-weight: bold; color: #475569;"">Message :</td><td style=""padding: 8px;"">{quote.Message ?? "Aucun message particulier"}</td></tr>
  </table>
  <p style=""font-size: 13px; color: #64748b;"">Vous pouvez répondre directement à cet email pour converser avec le client.</p>
</div>";
        }

        private static string BuildCustomerEmailHtml(InboundQuoteRequest quote)
        {
            return $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"">
  <h2 style=""color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 8px;"">Accusé de réception de votre demande de devis</h2>
  <p>Bonjour <strong>{quote.CustomerName}</strong>,</p>
  <p>Nous vous remercions pour votre intérêt. Nous avons bien enregistré votre demande de devis pour :</p>
  <div style=""background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 15px 0;"">
    <p style=""margin: 4px 0;""><strong>Produit :</strong> {quote.Product}</p>
    <p style=""margin: 4px 0;""><strong>Quantité :</strong> {quote.Quantity}</p>
    <p style=""margin: 4px 0;""><strong>Numéro de suivi :</strong> <span style=""font-family: monospace; color: #2563eb;"">{quote.TrackingNumber}</span></p>
  </div>
  <p>Un responsable commercial de l'équipe <strong>SOCOFEB</strong> étudie votre besoin et reviendra vers vous dans les meilleurs délais avec une proposition chiffrée.</p>
  <p style=""font-size: 13px; color: #64748b; margin-top: 25px;"">Pour toute précision supplémentaire, vous pouvez répondre directement à ce message.</p>
  <hr style=""border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"" />
  <p style=""font-size: 12px; color: #94a3b8; text-align: center;"">SOCOFEB — Société de Commerce du Fer et du Bois</p>
</div>";
        }
    }
}
