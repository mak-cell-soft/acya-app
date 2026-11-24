using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public class SaaSLifecycleScheduler : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SaaSLifecycleScheduler> _logger;

        public SaaSLifecycleScheduler(IServiceProvider serviceProvider, ILogger<SaaSLifecycleScheduler> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SaaS Lifecycle Scheduler Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dbContext = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
                        var backupService = scope.ServiceProvider.GetRequiredService<BackupService>();
                        var notifDispatcher = scope.ServiceProvider.GetService<ITenantBillingNotificationDispatcher>();

                        await ProcessSubscriptionAndBillingLifecycleAsync(dbContext, notifDispatcher, stoppingToken);
                        await ProcessBackupJobsAsync(dbContext, backupService, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred in SaaS Lifecycle Scheduler loop.");
                }

                // Run check every 10 seconds for responsive lifecycle processing
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }

            _logger.LogInformation("SaaS Lifecycle Scheduler Background Service is stopping.");
        }

        /// <summary>
        /// Evaluates subscription expiration, overdue invoice status transitions, and configurable payment/expiration reminders.
        /// CRITICAL BUSINESS RULE 2.2: Never sets tenant.IsActive = false or disconnects a tenant due to unpaid/overdue invoices.
        /// </summary>
        public async Task ProcessSubscriptionAndBillingLifecycleAsync(
            MasterDbContext dbContext,
            ITenantBillingNotificationDispatcher? notifDispatcher,
            CancellationToken stoppingToken)
        {
            var nowUtc = DateTime.UtcNow;
            var todayUtc = nowUtc.Date;
            var reminderConfig = await LoadReminderConfigAsync(dbContext, stoppingToken);

            // 1. Update subscription statuses (EXPIRING / EXPIRED) without disconnecting active tenants
            var activeSubs = await dbContext.TenantSubscriptions
                .Where(s => s.Status != SubscriptionStatuses.Expired &&
                            s.Status != SubscriptionStatuses.Cancelled &&
                            s.Status != SubscriptionStatuses.Suspended)
                .ToListAsync(stoppingToken);

            bool hasDbChanges = false;

            foreach (var sub in activeSubs)
            {
                if (sub.EndDate <= nowUtc)
                {
                    sub.Status = SubscriptionStatuses.Expired;
                    hasDbChanges = true;

                    await dbContext.MasterAuditLogs.AddAsync(new MasterAuditLog
                    {
                        TenantId = sub.TenantId,
                        Action = "Subscription Expired",
                        Details = $"Subscription #{sub.Id} ({sub.Plan}) reached end date ({sub.EndDate:yyyy-MM-dd}). Connection access preserved per payment independence rule.",
                        PerformedBy = "System Scheduler",
                        Timestamp = nowUtc
                    }, stoppingToken);
                }
                else if (notifDispatcher != null && reminderConfig.SubscriptionExpiringBeforeDays != null)
                {
                    int daysUntilEnd = (int)Math.Ceiling((sub.EndDate.Date - todayUtc).TotalDays);
                    if (reminderConfig.SubscriptionExpiringBeforeDays.Contains(daysUntilEnd))
                    {
                        await notifDispatcher.TryCreateNotificationAsync(
                            sub.TenantId,
                            title: $"Votre abonnement expire dans {daysUntilEnd} jour(s)",
                            message: $"Votre abonnement ACYA Élancé ({sub.Plan.ToString().ToUpperInvariant()}) arrivera à échéance le {sub.EndDate:dd/MM/yyyy}. Pensez à le renouveler.",
                            notificationType: 1, // Warning
                            priority: 2, // High
                            relatedEntityType: "SaaSSubscription",
                            relatedEntityId: $"SUB:{sub.Id}:EXPIRING_BEFORE_{daysUntilEnd}D",
                            cancellationToken: stoppingToken);
                    }
                }
            }

            // 2. Evaluate unpaid/partially-paid invoices and trigger configurable reminders
            var openInvoices = await dbContext.TenantInvoices
                .Where(i => i.Status != InvoiceStatuses.Paid && i.Status != "Paid" && i.Status != InvoiceStatuses.Cancelled)
                .ToListAsync(stoppingToken);

            if (openInvoices.Any())
            {
                var openInvoiceIds = openInvoices.Select(i => i.Id).ToList();
                var payments = await dbContext.TenantPayments
                    .AsNoTracking()
                    .Where(p => openInvoiceIds.Contains(p.InvoiceId) && p.Status == "Completed")
                    .ToListAsync(stoppingToken);

                foreach (var inv in openInvoices)
                {
                    var paid = Math.Round(payments.Where(p => p.InvoiceId == inv.Id).Sum(p => p.Amount), 3);
                    var remaining = Math.Round(inv.Amount - paid, 3);
                    if (remaining <= 0m)
                    {
                        inv.Status = InvoiceStatuses.Paid;
                        hasDbChanges = true;
                        continue;
                    }

                    var currency = string.IsNullOrWhiteSpace(inv.Currency) ? "TND" : inv.Currency.ToUpperInvariant();
                    int daysDiff = (int)(inv.DueDate.Date - todayUtc).TotalDays;

                    if (daysDiff < 0)
                    {
                        if (inv.Status != InvoiceStatuses.Overdue)
                        {
                            inv.Status = InvoiceStatuses.Overdue;
                            hasDbChanges = true;
                        }

                        // Transition tenant's current subscription status to OVERDUE (never disabling tenant.IsActive!)
                        var currentSub = activeSubs
                            .Where(s => s.TenantId == inv.TenantId && s.EndDate > nowUtc)
                            .OrderByDescending(s => s.StartDate)
                            .FirstOrDefault();
                        if (currentSub != null && currentSub.Status != SubscriptionStatuses.Overdue)
                        {
                            currentSub.Status = SubscriptionStatuses.Overdue;
                            hasDbChanges = true;
                        }
                    }

                    if (notifDispatcher != null)
                    {
                        // Upcoming payment deadline reminders (e.g. 7 days, 3 days before due date)
                        if (daysDiff > 0 && reminderConfig.BeforeDueDays != null && reminderConfig.BeforeDueDays.Contains(daysDiff))
                        {
                            await notifDispatcher.TryCreateNotificationAsync(
                                inv.TenantId,
                                title: $"Échéance de paiement dans {daysDiff} jour(s) ({inv.InvoiceNumber})",
                                message: $"Rappel : La facture {inv.InvoiceNumber} d'un montant restant de {remaining:F3} {currency} arrive à échéance le {inv.DueDate:dd/MM/yyyy}.",
                                notificationType: 1, // Warning
                                priority: 1, // Normal
                                relatedEntityType: "SaaSInvoice",
                                relatedEntityId: $"INV:{inv.InvoiceNumber}:BEFORE_{daysDiff}D",
                                cancellationToken: stoppingToken);
                        }
                        // On the due date
                        else if (daysDiff == 0 && reminderConfig.OnDueDate)
                        {
                            await notifDispatcher.TryCreateNotificationAsync(
                                inv.TenantId,
                                title: $"Date d'échéance atteinte ({inv.InvoiceNumber})",
                                message: $"La facture {inv.InvoiceNumber} ({remaining:F3} {currency}) arrive à échéance aujourd'hui ({inv.DueDate:dd/MM/yyyy}).",
                                notificationType: 1, // Warning
                                priority: 2, // High
                                relatedEntityType: "SaaSInvoice",
                                relatedEntityId: $"INV:{inv.InvoiceNumber}:DUE_TODAY",
                                cancellationToken: stoppingToken);
                        }
                        // Every N days after the due date (e.g. every 7 days overdue)
                        else if (daysDiff < 0 && reminderConfig.AfterDueIntervalDays > 0)
                        {
                            int daysOverdue = Math.Abs(daysDiff);
                            if (daysOverdue % reminderConfig.AfterDueIntervalDays == 0)
                            {
                                int cycle = daysOverdue / reminderConfig.AfterDueIntervalDays;
                                await notifDispatcher.TryCreateNotificationAsync(
                                    inv.TenantId,
                                    title: $"Rappel de paiement en retard ({inv.InvoiceNumber})",
                                    message: $"La facture {inv.InvoiceNumber} présente un solde impayé de {remaining:F3} {currency} en retard de {daysOverdue} jour(s) (échéance : {inv.DueDate:dd/MM/yyyy}).",
                                    notificationType: 2, // Alert
                                    priority: 2, // High
                                    relatedEntityType: "SaaSInvoice",
                                    relatedEntityId: $"INV:{inv.InvoiceNumber}:OVERDUE_CYCLE_{cycle}",
                                    cancellationToken: stoppingToken);
                            }
                        }
                    }
                }
            }

            if (hasDbChanges)
            {
                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }

        private static async Task<BillingReminderIntervalsConfig> LoadReminderConfigAsync(
            MasterDbContext dbContext,
            CancellationToken stoppingToken)
        {
            var setting = await dbContext.PlatformSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == "BillingReminderIntervals", stoppingToken);

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
                    // Fallback to default
                }
            }

            return new BillingReminderIntervalsConfig();
        }

        public async Task ProcessBackupJobsAsync(MasterDbContext dbContext, BackupService backupService, CancellationToken stoppingToken)
        {
            var pendingJobs = await dbContext.BackupJobs
                .Include(j => j.Tenant)
                .Where(j => j.Status == "Pending")
                .OrderBy(j => j.CreatedAt)
                .ToListAsync(stoppingToken);

            foreach (var job in pendingJobs)
            {
                if (job.Tenant == null)
                {
                    job.Status = "Failed";
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = "Tenant associated with this backup job is missing.";
                    continue;
                }

                if (string.Equals(job.Type, "Restore", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(
                        "Rejecting retired legacy restore job {Id} for tenant {Tenant}. Legacy restore is disabled.",
                        job.Id,
                        job.Tenant.Name);

                    job.Status = "Failed";
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = "The legacy in-place schema restore mechanism has been retired and disabled.";

                    var rejectedAudit = new MasterAuditLog
                    {
                        TenantId = job.TenantId,
                        Action = "Schema Restore Rejected (Retired)",
                        Details = $"Job {job.Id} rejected: legacy in-place restore mechanism has been retired.",
                        PerformedBy = "System Scheduler",
                        Timestamp = DateTime.UtcNow
                    };
                    await dbContext.MasterAuditLogs.AddAsync(rejectedAudit, stoppingToken);
                    await dbContext.SaveChangesAsync(stoppingToken);
                    continue;
                }

                _logger.LogInformation("Processing backup/restore job {Id} ({Type}) for tenant {Tenant}", job.Id, job.Type, job.Tenant.Name);
                
                job.Status = "Running";
                await dbContext.SaveChangesAsync(stoppingToken);

                try
                {
                    if (job.Type == "Backup")
                    {
                        await backupService.BackupTenantSchemaAsync(job.Tenant.SchemaName, job.FilePath);
                    }
                    else
                    {
                        throw new NotSupportedException($"Unsupported backup job type '{job.Type}'.");
                    }

                    job.Status = "Completed";
                    job.CompletedAt = DateTime.UtcNow;

                    var audit = new MasterAuditLog
                    {
                        TenantId = job.TenantId,
                        Action = "Schema Backup Executed",
                        Details = $"Job {job.Id} completed successfully. File path: {job.FilePath}",
                        PerformedBy = "System Scheduler",
                        Timestamp = DateTime.UtcNow
                    };
                    await dbContext.MasterAuditLogs.AddAsync(audit, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Job {Id} failed.", job.Id);
                    job.Status = "Failed";
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = ex.Message;

                    var audit = new MasterAuditLog
                    {
                        TenantId = job.TenantId,
                        Action = job.Type == "Backup" ? "Schema Backup Failed" : "Schema Restore Failed",
                        Details = $"Job {job.Id} failed. Error: {ex.Message}",
                        PerformedBy = "System Scheduler",
                        Timestamp = DateTime.UtcNow
                    };
                    await dbContext.MasterAuditLogs.AddAsync(audit, stoppingToken);
                }

                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }
    }
}
