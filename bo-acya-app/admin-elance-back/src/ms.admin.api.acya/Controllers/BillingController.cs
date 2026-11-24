using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class BillingController : ControllerBase
    {
        public const string OfficialCurrency = "TND";
        public const string ReminderSettingsKey = "BillingReminderIntervals";

        private readonly MasterDbContext _context;
        private readonly ITenantBillingNotificationDispatcher? _notificationDispatcher;

        public BillingController(
            MasterDbContext context,
            ITenantBillingNotificationDispatcher? notificationDispatcher = null)
        {
            _context = context;
            _notificationDispatcher = notificationDispatcher;
        }

        private string GetAdminActor()
        {
            return User?.Identity?.Name
                ?? User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? "Super Admin";
        }

        [HttpGet("summary/{tenantId}")]
        public async Task<IActionResult> GetTenantBillingSummary(long tenantId)
        {
            var tenant = await _context.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var nowUtc = DateTime.UtcNow;

            var latestSub = await _context.TenantSubscriptions
                .AsNoTracking()
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.StartDate)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            var invoices = await _context.TenantInvoices
                .AsNoTracking()
                .Where(i => i.TenantId == tenantId)
                .ToListAsync();

            var payments = await _context.TenantPayments
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId && p.Status == "Completed")
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            decimal outstandingBalanceTnd = 0m;
            var historicalBalancesByCurrency = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

            foreach (var inv in invoices)
            {
                if (string.Equals(inv.Status, InvoiceStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
                    continue;

                var invCurrency = string.IsNullOrWhiteSpace(inv.Currency)
                    ? OfficialCurrency
                    : inv.Currency.Trim().ToUpperInvariant();

                var paidForInv = payments.Where(p => p.InvoiceId == inv.Id).Sum(p => p.Amount);
                var remaining = Math.Max(0m, Math.Round(inv.Amount - paidForInv, 3));

                if (string.Equals(invCurrency, OfficialCurrency, StringComparison.OrdinalIgnoreCase))
                {
                    outstandingBalanceTnd += remaining;
                }
                else if (remaining > 0m)
                {
                    // Never combine non-TND historical invoice balances into the TND outstanding balance
                    historicalBalancesByCurrency[invCurrency] =
                        Math.Round((historicalBalancesByCurrency.TryGetValue(invCurrency, out var cur) ? cur : 0m) + remaining, 3);
                }
            }

            var connectedUsers = await _context.TenantActiveSessions
                .AsNoTracking()
                .CountAsync(s => s.TenantId == tenantId && !s.IsRevoked && s.ExpiresAt > nowUtc);

            var maxUsers = tenant.MaxConnectedUsers > 0 ? tenant.MaxConnectedUsers : 5;
            var subStatus = ResolveEffectiveSubscriptionStatus(tenant, latestSub, invoices, payments, nowUtc);

            var summary = new TenantBillingSummaryDto
            {
                TenantId = tenant.Id,
                TenantName = tenant.Name,
                TenantSlug = tenant.Slug,
                CurrentPlan = (latestSub?.Plan ?? tenant.Plan).ToString().ToUpperInvariant(),
                SubscriptionStatus = subStatus,
                TenantConnectionStatus = (!tenant.IsActive || tenant.Status == TenantStatus.Suspended) ? "SUSPENDED" : "ACTIVE",
                IsConnectionActive = tenant.IsActive && tenant.Status != TenantStatus.Suspended,
                SubscriptionStartDate = latestSub?.StartDate ?? tenant.ActivatedAt ?? tenant.CreatedAt,
                SubscriptionEndDate = latestSub?.EndDate,
                OutstandingBalance = Math.Round(outstandingBalanceTnd, 3),
                Currency = OfficialCurrency,
                HistoricalBalancesByCurrency = historicalBalancesByCurrency,
                LastPaymentDate = payments.FirstOrDefault()?.PaymentDate,
                ConnectedUsers = connectedUsers,
                MaxConnectedUsers = maxUsers,
                AvailableSlots = Math.Max(0, maxUsers - connectedUsers)
            };

            return Ok(summary);
        }

        private static string ResolveEffectiveSubscriptionStatus(
            MasterEnterprise tenant,
            TenantSubscription? latestSub,
            List<TenantInvoice> invoices,
            List<TenantPayment> payments,
            DateTime nowUtc)
        {
            if (!tenant.IsActive && tenant.Status == TenantStatus.Suspended)
            {
                return SubscriptionStatuses.Suspended;
            }

            if (latestSub != null)
            {
                var explicitNormalized = SubscriptionStatuses.Normalize(latestSub.Status, latestSub.Plan);
                if (explicitNormalized == SubscriptionStatuses.Cancelled || explicitNormalized == SubscriptionStatuses.Suspended)
                {
                    return explicitNormalized;
                }
                if (latestSub.EndDate < nowUtc || explicitNormalized == SubscriptionStatuses.Expired)
                {
                    return SubscriptionStatuses.Expired;
                }
            }

            // Check if any invoice has remaining balance and is overdue or due
            bool hasOverdueInvoice = false;
            bool hasDueInvoice = false;
            foreach (var inv in invoices)
            {
                if (string.Equals(inv.Status, InvoiceStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
                    continue;

                var paid = payments.Where(p => p.InvoiceId == inv.Id).Sum(p => p.Amount);
                var remaining = inv.Amount - paid;
                if (remaining > 0m)
                {
                    if (inv.DueDate < nowUtc || string.Equals(inv.Status, "Overdue", StringComparison.OrdinalIgnoreCase))
                        hasOverdueInvoice = true;
                    else
                        hasDueInvoice = true;
                }
            }

            if (hasOverdueInvoice) return SubscriptionStatuses.Overdue;
            if (hasDueInvoice) return SubscriptionStatuses.PaymentDue;

            if (latestSub != null)
            {
                return SubscriptionStatuses.Normalize(latestSub.Status, latestSub.Plan);
            }

            return tenant.Plan == TenantPlan.Trial ? SubscriptionStatuses.Trial : SubscriptionStatuses.Active;
        }

        [HttpGet("subscriptions/{tenantId}")]
        public async Task<IActionResult> GetSubscriptions(long tenantId)
        {
            var subs = await _context.TenantSubscriptions
                .AsNoTracking()
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.StartDate)
                .ThenByDescending(s => s.Id)
                .ToListAsync();

            foreach (var s in subs)
            {
                s.Status = SubscriptionStatuses.Normalize(s.Status, s.Plan);
            }

            return Ok(subs);
        }

        public class UpdatePlanRequest
        {
            public TenantPlan Plan { get; set; }
            public decimal Price { get; set; }
            public int DurationDays { get; set; }
            public string? Status { get; set; }
        }

        [HttpPost("subscriptions/{tenantId}")]
        public async Task<IActionResult> UpdateSubscription(long tenantId, [FromBody] UpdatePlanRequest request)
        {
            if (request == null) return BadRequest("Subscription request payload is required.");
            if (request.Price < 0m) return BadRequest("Subscription price cannot be negative.");
            if (request.DurationDays <= 0 || request.DurationDays > 3650)
                return BadRequest("Subscription duration must be between 1 and 3650 days.");

            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var previousPlan = tenant.Plan;
            var isRenewal = previousPlan == request.Plan;

            // Normalize target subscription status
            var resolvedSubStatus = !string.IsNullOrWhiteSpace(request.Status)
                ? SubscriptionStatuses.Normalize(request.Status, request.Plan)
                : (request.Plan == TenantPlan.Trial ? SubscriptionStatuses.Trial : SubscriptionStatuses.Active);

            if (!SubscriptionStatuses.IsValid(resolvedSubStatus))
            {
                return BadRequest($"Invalid subscription status '{request.Status}'.");
            }

            // Close previous active/trial subscription rows to preserve clean history
            var previousActiveSubs = await _context.TenantSubscriptions
                .Where(s => s.TenantId == tenantId && (s.Status == "Active" || s.Status == "ACTIVE" || s.Status == "TRIAL" || s.Status == "Trial"))
                .ToListAsync();

            var nowUtc = DateTime.UtcNow;
            foreach (var oldSub in previousActiveSubs)
            {
                if (oldSub.EndDate > nowUtc)
                {
                    oldSub.EndDate = nowUtc;
                }
                oldSub.Status = SubscriptionStatuses.Expired;
            }

            // CRITICAL RULE 2.2: Payment & subscription updates are independent of manual suspension.
            // If a tenant was manually suspended by an administrator, keep manual suspension intact
            // unless explicitly reactivated via the suspension/activation endpoint.
            tenant.Plan = request.Plan;
            tenant.PlanPrice = Math.Round(request.Price, 3);
            tenant.Currency = OfficialCurrency;

            if (tenant.Status != TenantStatus.Suspended)
            {
                tenant.Status = request.Plan == TenantPlan.Trial ? TenantStatus.Trial : TenantStatus.Active;
                tenant.IsActive = true;
                tenant.ActivatedAt ??= nowUtc;
            }

            var sub = new TenantSubscription
            {
                TenantId = tenantId,
                Plan = request.Plan,
                Status = resolvedSubStatus,
                StartDate = nowUtc,
                EndDate = nowUtc.AddDays(request.DurationDays),
                Price = Math.Round(request.Price, 3),
                CreatedAt = nowUtc
            };

            await _context.TenantSubscriptions.AddAsync(sub);

            var auditLog = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = isRenewal ? "Subscription Renewed" : "Subscription Plan Updated",
                Details = $"SaaS plan {(isRenewal ? "renewed" : $"changed from {previousPlan} to {request.Plan}")} ({resolvedSubStatus}) for {sub.Price:F3} {OfficialCurrency} with duration {request.DurationDays} days.",
                PerformedBy = GetAdminActor(),
                Timestamp = nowUtc
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            if (_notificationDispatcher != null)
            {
                var eventType = isRenewal ? "SUBSCRIPTION_RENEWED" : "SUBSCRIPTION_CHANGED";
                var notifTitle = isRenewal
                    ? $"Abonnement {request.Plan.ToString().ToUpperInvariant()} renouvelé"
                    : $"Forfait mis à jour : {request.Plan.ToString().ToUpperInvariant()}";
                var notifMsg = isRenewal
                    ? $"Votre abonnement ACYA Élancé ({request.Plan.ToString().ToUpperInvariant()}) a été renouvelé jusqu'au {sub.EndDate:dd/MM/yyyy} ({sub.Price:F3} {OfficialCurrency})."
                    : $"Votre abonnement ACYA Élancé est passé au forfait {request.Plan.ToString().ToUpperInvariant()} ({sub.Price:F3} {OfficialCurrency}) valable jusqu'au {sub.EndDate:dd/MM/yyyy}.";

                await _notificationDispatcher.TryCreateNotificationAsync(
                    tenantId,
                    notifTitle,
                    notifMsg,
                    notificationType: 3, // Success
                    priority: 1, // Normal
                    relatedEntityType: "SaaSSubscription",
                    relatedEntityId: $"SUB:{sub.Id}:{eventType}");
            }

            return Ok(sub);
        }

        [HttpGet("invoices/{tenantId}")]
        public async Task<IActionResult> GetInvoices(long tenantId)
        {
            var invoices = await _context.TenantInvoices
                .AsNoTracking()
                .Where(i => i.TenantId == tenantId)
                .OrderByDescending(i => i.BillingDate)
                .ThenByDescending(i => i.Id)
                .ToListAsync();

            var payments = await _context.TenantPayments
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId)
                .OrderByDescending(p => p.PaymentDate)
                .ThenByDescending(p => p.Id)
                .ToListAsync();

            var nowUtc = DateTime.UtcNow;
            var result = invoices.Select(inv =>
            {
                var invPayments = payments.Where(p => p.InvoiceId == inv.Id && p.Status == "Completed").ToList();
                var paidAmount = Math.Round(invPayments.Sum(p => p.Amount), 3);
                var remaining = Math.Max(0m, Math.Round(inv.Amount - paidAmount, 3));

                string effectiveStatus;
                if (string.Equals(inv.Status, InvoiceStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
                {
                    effectiveStatus = InvoiceStatuses.Cancelled;
                }
                else if (remaining <= 0m)
                {
                    effectiveStatus = InvoiceStatuses.Paid;
                }
                else if (paidAmount > 0m)
                {
                    effectiveStatus = inv.DueDate < nowUtc ? InvoiceStatuses.Overdue : InvoiceStatuses.PartiallyPaid;
                }
                else
                {
                    effectiveStatus = inv.DueDate < nowUtc ? InvoiceStatuses.Overdue : InvoiceStatuses.Unpaid;
                }

                return new InvoiceDetailDto
                {
                    Id = inv.Id,
                    TenantId = inv.TenantId,
                    InvoiceNumber = inv.InvoiceNumber,
                    Amount = Math.Round(inv.Amount, 3),
                    PaidAmount = paidAmount,
                    RemainingBalance = remaining,
                    Currency = string.IsNullOrWhiteSpace(inv.Currency) ? OfficialCurrency : inv.Currency.ToUpperInvariant(),
                    Status = effectiveStatus,
                    BillingDate = inv.BillingDate,
                    DueDate = inv.DueDate,
                    CreatedAt = inv.CreatedAt,
                    Payments = invPayments
                };
            }).ToList();

            return Ok(result);
        }

        [HttpGet("payments/{tenantId}")]
        public async Task<IActionResult> GetPaymentsByTenant(long tenantId)
        {
            var payments = await _context.TenantPayments
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId)
                .OrderByDescending(p => p.PaymentDate)
                .ThenByDescending(p => p.Id)
                .ToListAsync();

            return Ok(payments);
        }

        public class CreateInvoiceRequest
        {
            public decimal Amount { get; set; }
            public string Currency { get; set; } = OfficialCurrency;
            public int DueDays { get; set; } = 30;
        }

        [HttpPost("invoices/{tenantId}")]
        public async Task<IActionResult> CreateInvoice(long tenantId, [FromBody] CreateInvoiceRequest request)
        {
            if (request == null) return BadRequest("Invoice request payload is required.");
            if (request.Amount <= 0m) return BadRequest("Invoice amount must be strictly greater than zero.");
            if (request.DueDays < 0 || request.DueDays > 365)
                return BadRequest("Invoice due days must be between 0 and 365.");

            // Enforce official TND billing currency
            if (!string.IsNullOrWhiteSpace(request.Currency) &&
                !string.Equals(request.Currency.Trim(), OfficialCurrency, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest($"Only {OfficialCurrency} (Tunisian Dinar) is supported as the official billing currency.");
            }

            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var nowUtc = DateTime.UtcNow;
            var invoiceNumber = $"INV-{nowUtc.Year}-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}";

            var invoice = new TenantInvoice
            {
                TenantId = tenantId,
                InvoiceNumber = invoiceNumber,
                Amount = Math.Round(request.Amount, 3),
                Currency = OfficialCurrency,
                Status = InvoiceStatuses.Unpaid,
                BillingDate = nowUtc,
                DueDate = nowUtc.AddDays(request.DueDays),
                CreatedAt = nowUtc
            };

            await _context.TenantInvoices.AddAsync(invoice);

            // Update current active subscription status to PAYMENT_DUE if not already OVERDUE/SUSPENDED
            var currentSub = await _context.TenantSubscriptions
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.StartDate)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            if (currentSub != null)
            {
                var norm = SubscriptionStatuses.Normalize(currentSub.Status, currentSub.Plan);
                if (norm == SubscriptionStatuses.Active || norm == SubscriptionStatuses.Trial)
                {
                    currentSub.Status = request.DueDays == 0 ? SubscriptionStatuses.PaymentDue : currentSub.Status;
                }
            }

            var auditLog = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = "Invoice Generated",
                Details = $"Manual Invoice {invoiceNumber} generated for amount {invoice.Amount:F3} {OfficialCurrency} (Due: {invoice.DueDate:yyyy-MM-dd}).",
                PerformedBy = GetAdminActor(),
                Timestamp = nowUtc
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            if (_notificationDispatcher != null)
            {
                await _notificationDispatcher.TryCreateNotificationAsync(
                    tenantId,
                    title: $"Nouvelle facture émise ({invoice.InvoiceNumber})",
                    message: $"Une facture de {invoice.Amount:F3} {OfficialCurrency} (Réf : {invoice.InvoiceNumber}) a été émise. Date d'échéance : {invoice.DueDate:dd/MM/yyyy}.",
                    notificationType: 0, // Info
                    priority: 1, // Normal
                    relatedEntityType: "SaaSInvoice",
                    relatedEntityId: $"INV:{invoice.InvoiceNumber}:GENERATED");
            }

            return Ok(new InvoiceDetailDto
            {
                Id = invoice.Id,
                TenantId = invoice.TenantId,
                InvoiceNumber = invoice.InvoiceNumber,
                Amount = invoice.Amount,
                PaidAmount = 0m,
                RemainingBalance = invoice.Amount,
                Currency = OfficialCurrency,
                Status = InvoiceStatuses.Unpaid,
                BillingDate = invoice.BillingDate,
                DueDate = invoice.DueDate,
                CreatedAt = invoice.CreatedAt,
                Payments = new List<TenantPayment>()
            });
        }

        public class RegisterPaymentRequest
        {
            public decimal Amount { get; set; }
            public string PaymentMethod { get; set; } = "WireTransfer";
            public string TransactionId { get; set; } = string.Empty;
        }

        [HttpPost("payments/{invoiceId}")]
        public async Task<IActionResult> RegisterPayment(long invoiceId, [FromBody] RegisterPaymentRequest request)
        {
            if (request == null) return BadRequest("Payment request payload is required.");
            if (request.Amount <= 0m) return BadRequest("Payment amount must be strictly greater than zero.");
            if (string.IsNullOrWhiteSpace(request.PaymentMethod))
                return BadRequest("Payment method is required.");

            var invoice = await _context.TenantInvoices.FindAsync(invoiceId);
            if (invoice == null) return NotFound("Invoice not found.");

            var existingPayments = await _context.TenantPayments
                .Where(p => p.InvoiceId == invoiceId && p.Status == "Completed")
                .ToListAsync();

            var cleanTxnId = request.TransactionId?.Trim();
            if (!string.IsNullOrEmpty(cleanTxnId))
            {
                bool duplicateTxn = await _context.TenantPayments
                    .AnyAsync(p => p.TenantId == invoice.TenantId &&
                                   p.TransactionId != null &&
                                   p.TransactionId.ToLower() == cleanTxnId.ToLower() &&
                                   p.Status == "Completed");
                if (duplicateTxn)
                {
                    return Conflict($"A payment with transaction reference '{cleanTxnId}' has already been recorded for this tenant.");
                }
            }

            var alreadyPaid = Math.Round(existingPayments.Sum(p => p.Amount), 3);
            var remainingBefore = Math.Round(invoice.Amount - alreadyPaid, 3);

            if (remainingBefore <= 0m || string.Equals(invoice.Status, InvoiceStatuses.Paid, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("This invoice is already fully paid.");
            }

            var paymentAmount = Math.Round(request.Amount, 3);
            var invoiceCurrency = string.IsNullOrWhiteSpace(invoice.Currency)
                ? OfficialCurrency
                : invoice.Currency.Trim().ToUpperInvariant();
            if (paymentAmount > remainingBefore)
            {
                return BadRequest($"Payment amount ({paymentAmount:F3} {invoiceCurrency}) exceeds the remaining invoice balance ({remainingBefore:F3} {invoiceCurrency}).");
            }

            var nowUtc = DateTime.UtcNow;
            var remainingAfter = Math.Round(remainingBefore - paymentAmount, 3);

            invoice.Status = remainingAfter <= 0m
                ? InvoiceStatuses.Paid
                : (invoice.DueDate < nowUtc ? InvoiceStatuses.Overdue : InvoiceStatuses.PartiallyPaid);

            var payment = new TenantPayment
            {
                TenantId = invoice.TenantId,
                InvoiceId = invoiceId,
                Amount = paymentAmount,
                PaymentDate = nowUtc,
                PaymentMethod = request.PaymentMethod.Trim(),
                TransactionId = string.IsNullOrEmpty(cleanTxnId) ? null : cleanTxnId,
                Status = "Completed",
                CreatedAt = nowUtc
            };

            await _context.TenantPayments.AddAsync(payment);

            // Reconcile subscription billing status when payment is recorded
            var latestSub = await _context.TenantSubscriptions
                .Where(s => s.TenantId == invoice.TenantId)
                .OrderByDescending(s => s.StartDate)
                .ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            if (latestSub != null)
            {
                // Check if any other invoices remain unpaid/overdue
                var otherUnpaidExists = await _context.TenantInvoices
                    .Where(i => i.TenantId == invoice.TenantId && i.Id != invoiceId)
                    .AnyAsync(i => i.Status != InvoiceStatuses.Paid && i.Status != "Paid" && i.Status != InvoiceStatuses.Cancelled);

                if (remainingAfter <= 0m && !otherUnpaidExists && latestSub.EndDate > nowUtc)
                {
                    var normSub = SubscriptionStatuses.Normalize(latestSub.Status, latestSub.Plan);
                    if (normSub == SubscriptionStatuses.Overdue || normSub == SubscriptionStatuses.PaymentDue)
                    {
                        latestSub.Status = latestSub.Plan == TenantPlan.Trial
                            ? SubscriptionStatuses.Trial
                            : SubscriptionStatuses.Active;
                    }
                }
            }

            var auditLog = new MasterAuditLog
            {
                TenantId = invoice.TenantId,
                Action = "Payment Registered",
                Details = $"Payment of {paymentAmount:F3} {invoiceCurrency} ({payment.PaymentMethod}{(payment.TransactionId != null ? $", Ref: {payment.TransactionId}" : "")}) registered for Invoice {invoice.InvoiceNumber}. Remaining balance: {remainingAfter:F3} {invoiceCurrency}. Status: {invoice.Status}.",
                PerformedBy = GetAdminActor(),
                Timestamp = nowUtc
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);

            await _context.SaveChangesAsync();

            if (_notificationDispatcher != null)
            {
                var msg = remainingAfter <= 0m
                    ? $"Votre paiement de {paymentAmount:F3} {invoiceCurrency} pour la facture {invoice.InvoiceNumber} a été enregistré. La facture est entièrement réglée."
                    : $"Votre paiement partiel de {paymentAmount:F3} {invoiceCurrency} pour la facture {invoice.InvoiceNumber} a été enregistré. Solde restant : {remainingAfter:F3} {invoiceCurrency}.";

                await _notificationDispatcher.TryCreateNotificationAsync(
                    invoice.TenantId,
                    title: $"Paiement enregistré ({invoice.InvoiceNumber})",
                    message: msg,
                    notificationType: 3, // Success
                    priority: 1, // Normal
                    relatedEntityType: "SaaSInvoice",
                    relatedEntityId: $"INV:{invoice.InvoiceNumber}:PAYMENT:{payment.Id}");
            }

            return Ok(payment);
        }

        [HttpGet("connections/{tenantId}")]
        public async Task<IActionResult> GetTenantConnections(long tenantId)
        {
            var tenant = await _context.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var nowUtc = DateTime.UtcNow;
            var activeSessions = await _context.TenantActiveSessions
                .AsNoTracking()
                .Where(s => s.TenantId == tenantId && !s.IsRevoked && s.ExpiresAt > nowUtc)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new ActiveSessionItemDto
                {
                    SessionId = s.SessionId,
                    UserId = s.UserId,
                    Username = s.Username,
                    CreatedAt = s.CreatedAt,
                    ExpiresAt = s.ExpiresAt,
                    LastActivityAt = s.LastActivityAt
                })
                .ToListAsync();

            var maxUsers = tenant.MaxConnectedUsers > 0 ? tenant.MaxConnectedUsers : 5;
            var connectedCount = activeSessions.Count;

            return Ok(new TenantConnectionSummaryDto
            {
                TenantId = tenant.Id,
                TenantSlug = tenant.Slug,
                TenantName = tenant.Name,
                MaxConnectedUsers = maxUsers,
                ConnectedUsers = connectedCount,
                AvailableSlots = Math.Max(0, maxUsers - connectedCount),
                IsExceedingLimit = connectedCount > maxUsers,
                ActiveSessions = activeSessions
            });
        }

        [HttpPut("connections/{tenantId}")]
        public async Task<IActionResult> UpdateConnectionLimit(long tenantId, [FromBody] UpdateConnectionLimitRequest request)
        {
            if (request == null) return BadRequest("Connection limit payload is required.");
            if (request.MaxConnectedUsers < 1 || request.MaxConnectedUsers > 1000)
            {
                return BadRequest("Maximum concurrent connected users must be between 1 and 1000.");
            }

            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var oldLimit = tenant.MaxConnectedUsers > 0 ? tenant.MaxConnectedUsers : 5;
            var newLimit = request.MaxConnectedUsers;

            tenant.MaxConnectedUsers = newLimit;

            var nowUtc = DateTime.UtcNow;
            var activeSessionsCount = await _context.TenantActiveSessions
                .AsNoTracking()
                .CountAsync(s => s.TenantId == tenantId && !s.IsRevoked && s.ExpiresAt > nowUtc);

            // Rule 3.6 & 3.7: Existing connected sessions are never disconnected when the limit is decreased.
            var auditLog = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = "Connection Limit Updated",
                Details = $"Maximum concurrent connected users for tenant '{tenant.Name}' ({tenant.Slug}) changed from {oldLimit} to {newLimit} (Currently connected: {activeSessionsCount}). Existing sessions preserved.",
                PerformedBy = GetAdminActor(),
                Timestamp = nowUtc
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return Ok(new TenantConnectionSummaryDto
            {
                TenantId = tenant.Id,
                TenantSlug = tenant.Slug,
                TenantName = tenant.Name,
                MaxConnectedUsers = newLimit,
                ConnectedUsers = activeSessionsCount,
                AvailableSlots = Math.Max(0, newLimit - activeSessionsCount),
                IsExceedingLimit = activeSessionsCount > newLimit
            });
        }

        [HttpGet("reminder-settings")]
        public async Task<IActionResult> GetReminderSettings()
        {
            var config = await LoadReminderConfigAsync();
            return Ok(config);
        }

        [HttpPut("reminder-settings")]
        public async Task<IActionResult> UpdateReminderSettings([FromBody] BillingReminderIntervalsConfig request)
        {
            if (request == null) return BadRequest("Reminder configuration is required.");
            if (request.AfterDueIntervalDays < 1 || request.AfterDueIntervalDays > 90)
                return BadRequest("AfterDueIntervalDays must be between 1 and 90 days.");

            var normalized = new BillingReminderIntervalsConfig
            {
                BeforeDueDays = (request.BeforeDueDays ?? new List<int> { 7, 3 })
                    .Where(d => d > 0 && d <= 90)
                    .Distinct()
                    .OrderByDescending(d => d)
                    .ToList(),
                OnDueDate = request.OnDueDate,
                AfterDueIntervalDays = request.AfterDueIntervalDays,
                SubscriptionExpiringBeforeDays = (request.SubscriptionExpiringBeforeDays ?? new List<int> { 7, 3 })
                    .Where(d => d > 0 && d <= 90)
                    .Distinct()
                    .OrderByDescending(d => d)
                    .ToList()
            };

            var json = JsonSerializer.Serialize(normalized);
            var existing = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == ReminderSettingsKey);
            if (existing == null)
            {
                await _context.PlatformSettings.AddAsync(new PlatformSetting
                {
                    Key = ReminderSettingsKey,
                    Value = json,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.Value = json;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _context.MasterAuditLogs.AddAsync(new MasterAuditLog
            {
                Action = "Billing Reminder Intervals Updated",
                Details = $"Billing reminder intervals updated: BeforeDue=[{string.Join(",", normalized.BeforeDueDays)}], OnDueDate={normalized.OnDueDate}, AfterDueEvery={normalized.AfterDueIntervalDays}d.",
                PerformedBy = GetAdminActor(),
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return Ok(normalized);
        }

        private async Task<BillingReminderIntervalsConfig> LoadReminderConfigAsync()
        {
            var setting = await _context.PlatformSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == ReminderSettingsKey);

            if (setting != null && !string.IsNullOrWhiteSpace(setting.Value))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<BillingReminderIntervalsConfig>(
                        setting.Value,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null) return parsed;
                }
                catch
                {
                    // Fallback to defaults
                }
            }

            return new BillingReminderIntervalsConfig();
        }
    }
}
