using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
  public class BillingReminderIntervalsOption
  {
    public List<int> BeforeDueDays { get; set; } = new() { 7, 3 };
    public bool OnDueDate { get; set; } = true;
    public int AfterDueIntervalDays { get; set; } = 7;
    public List<int> SubscriptionExpiringBeforeDays { get; set; } = new() { 7, 3 };
  }

  /// <summary>
  /// Background service in Core ERP API that evaluates SaaS invoices and subscriptions per active tenant
  /// and emits deduplicated billing notifications through the existing IAppNotificationService
  /// (AppNotifications table + tenant-isolated SignalR NotificationHub).
  /// </summary>
  public class BillingReminderBackgroundService : BackgroundService
  {
    private readonly IServiceProvider _services;
    private readonly ILogger<BillingReminderBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    public BillingReminderBackgroundService(
        IServiceProvider services,
        ILogger<BillingReminderBackgroundService> logger)
    {
      _services = services;
      _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
      _logger.LogInformation("Billing Reminder Background Service is starting.");

      while (!stoppingToken.IsCancellationRequested)
      {
        try
        {
          using (var scope = _services.CreateScope())
          {
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var isMultiTenant = configuration.GetValue<bool>("MultiTenancy:Enabled");

            if (isMultiTenant)
            {
              var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
              var reminderConfig = await LoadReminderConfigAsync(masterDb, stoppingToken);
              var tenants = await masterDb.TenantRegistries
                  .AsNoTracking()
                  .Where(t => t.IsActive)
                  .ToListAsync(stoppingToken);

              foreach (var tenant in tenants)
              {
                try
                {
                  var connStr = (string.IsNullOrEmpty(tenant.ConnectionString)
                      ? configuration.GetConnectionString("WoodAppContextConnection")
                      : tenant.ConnectionString) ?? "";

                  using (var tenantScope = _services.CreateScope())
                  {
                    var tenantContext = tenantScope.ServiceProvider.GetRequiredService<TenantContext>();
                    tenantContext.IsEnabled = true;
                    tenantContext.TenantId = tenant.Id;
                    tenantContext.Slug = tenant.Slug;
                    tenantContext.SchemaName = tenant.SchemaName;
                    tenantContext.ConnectionString = connStr;

                    var tenantDb = tenantScope.ServiceProvider.GetRequiredService<WoodAppContext>();
                    var notifService = tenantScope.ServiceProvider.GetRequiredService<IAppNotificationService>();

                    await EvaluateTenantBillingRemindersAsync(
                        tenant.Id,
                        masterDb,
                        tenantDb,
                        notifService,
                        reminderConfig,
                        DateTime.UtcNow,
                        stoppingToken);
                  }
                }
                catch (Exception tenantEx)
                {
                  _logger.LogError(tenantEx, "Failed to process billing reminders for tenant '{Slug}'.", tenant.Slug);
                }
              }
            }
          }
        }
        catch (Exception ex)
        {
          _logger.LogError(ex, "Error in BillingReminderBackgroundService execution loop.");
        }

        await Task.Delay(_checkInterval, stoppingToken);
      }

      _logger.LogInformation("Billing Reminder Background Service is stopping.");
    }

    public static async Task<int> EvaluateTenantBillingRemindersAsync(
        long tenantId,
        MasterDbContext masterDb,
        WoodAppContext tenantDb,
        IAppNotificationService notifService,
        BillingReminderIntervalsOption config,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
      int createdCount = 0;
      var todayUtc = nowUtc.Date;

      Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;
      if (masterDb.Database.IsRelational())
      {
        tx = await masterDb.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
        await masterDb.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock(hashtext('acya_billing_reminder_eval_' || {0}));",
            new object[] { tenantId.ToString() },
            cancellationToken);
      }

      try
      {
      // 1. Evaluate active subscriptions approaching expiration
      var subscriptions = await masterDb.TenantSubscriptions
          .AsNoTracking()
          .Where(s => s.TenantId == tenantId && s.EndDate > nowUtc && s.Status != "EXPIRED" && s.Status != "CANCELLED")
          .ToListAsync(cancellationToken);

      foreach (var sub in subscriptions)
      {
        int daysUntilEnd = (int)Math.Ceiling((sub.EndDate.Date - todayUtc).TotalDays);
        if (config.SubscriptionExpiringBeforeDays != null && config.SubscriptionExpiringBeforeDays.Contains(daysUntilEnd))
        {
          var entityId = $"SUB:{sub.Id}:EXPIRING_BEFORE_{daysUntilEnd}D";
          if (await TryEmitDeduplicatedNotificationAsync(
              tenantDb,
              notifService,
              title: $"Votre abonnement expire dans {daysUntilEnd} jour(s)",
              message: $"Votre abonnement ACYA Élancé ({sub.Plan.ToUpperInvariant()}) arrivera à échéance le {sub.EndDate:dd/MM/yyyy}. Pensez à le renouveler.",
              type: NotificationType.Warning,
              priority: NotificationPriority.High,
              relatedEntityType: "SaaSSubscription",
              relatedEntityId: entityId,
              cancellationToken: cancellationToken))
          {
            createdCount++;
          }
        }
      }

      // 2. Evaluate unpaid / partially paid invoices
      var invoices = await masterDb.TenantInvoices
          .AsNoTracking()
          .Where(i => i.TenantId == tenantId && i.Status != "PAID" && i.Status != "Paid" && i.Status != "CANCELLED")
          .ToListAsync(cancellationToken);

      if (invoices.Any())
      {
        var invIds = invoices.Select(i => i.Id).ToList();
        var payments = await masterDb.TenantPayments
            .AsNoTracking()
            .Where(p => invIds.Contains(p.InvoiceId) && p.Status == "Completed")
            .ToListAsync(cancellationToken);

        foreach (var inv in invoices)
        {
          var paid = Math.Round(payments.Where(p => p.InvoiceId == inv.Id).Sum(p => p.Amount), 3);
          var remaining = Math.Round(inv.Amount - paid, 3);
          if (remaining <= 0m) continue;

          var currency = string.IsNullOrWhiteSpace(inv.Currency) ? "TND" : inv.Currency.ToUpperInvariant();
          int daysDiff = (int)(inv.DueDate.Date - todayUtc).TotalDays;

          // Upcoming payment deadline
          if (daysDiff > 0 && config.BeforeDueDays != null && config.BeforeDueDays.Contains(daysDiff))
          {
            var entityId = $"INV:{inv.InvoiceNumber}:BEFORE_{daysDiff}D";
            if (await TryEmitDeduplicatedNotificationAsync(
                tenantDb,
                notifService,
                title: $"Échéance de paiement dans {daysDiff} jour(s) ({inv.InvoiceNumber})",
                message: $"Rappel : La facture {inv.InvoiceNumber} d'un montant restant de {remaining:F3} {currency} arrive à échéance le {inv.DueDate:dd/MM/yyyy}.",
                type: NotificationType.Warning,
                priority: NotificationPriority.Normal,
                relatedEntityType: "SaaSInvoice",
                relatedEntityId: entityId,
                cancellationToken: cancellationToken))
            {
              createdCount++;
            }
          }
          // Due date reached
          else if (daysDiff == 0 && config.OnDueDate)
          {
            var entityId = $"INV:{inv.InvoiceNumber}:DUE_TODAY";
            if (await TryEmitDeduplicatedNotificationAsync(
                tenantDb,
                notifService,
                title: $"Date d'échéance atteinte ({inv.InvoiceNumber})",
                message: $"La facture {inv.InvoiceNumber} ({remaining:F3} {currency}) arrive à échéance aujourd'hui ({inv.DueDate:dd/MM/yyyy}).",
                type: NotificationType.Warning,
                priority: NotificationPriority.High,
                relatedEntityType: "SaaSInvoice",
                relatedEntityId: entityId,
                cancellationToken: cancellationToken))
            {
              createdCount++;
            }
          }
          // Overdue payment reminder every N days after due date
          else if (daysDiff < 0 && config.AfterDueIntervalDays > 0)
          {
            int daysOverdue = Math.Abs(daysDiff);
            if (daysOverdue % config.AfterDueIntervalDays == 0)
            {
              int cycle = daysOverdue / config.AfterDueIntervalDays;
              var entityId = $"INV:{inv.InvoiceNumber}:OVERDUE_CYCLE_{cycle}";
              if (await TryEmitDeduplicatedNotificationAsync(
                  tenantDb,
                  notifService,
                  title: $"Rappel de paiement en retard ({inv.InvoiceNumber})",
                  message: $"La facture {inv.InvoiceNumber} présente un solde impayé de {remaining:F3} {currency} en retard de {daysOverdue} jour(s) (échéance : {inv.DueDate:dd/MM/yyyy}).",
                  type: NotificationType.Alert,
                  priority: NotificationPriority.High,
                  relatedEntityType: "SaaSInvoice",
                  relatedEntityId: entityId,
                  cancellationToken: cancellationToken))
              {
                createdCount++;
              }
            }
          }
        }
      }

      if (tx != null)
      {
        await tx.CommitAsync(cancellationToken);
      }

      return createdCount;
      }
      finally
      {
        if (tx != null)
        {
          await tx.DisposeAsync();
        }
      }
    }

    private static async Task<bool> TryEmitDeduplicatedNotificationAsync(
        WoodAppContext tenantDb,
        IAppNotificationService notifService,
        string title,
        string message,
        NotificationType type,
        NotificationPriority priority,
        string relatedEntityType,
        string relatedEntityId,
        CancellationToken cancellationToken)
    {
      if (await NotificationExistsAsync(tenantDb, relatedEntityType, relatedEntityId, cancellationToken))
      {
        return false;
      }

      try
      {
        await notifService.NotifyAsync(
            title: title,
            message: message,
            type: type,
            priority: priority,
            relatedEntityId: relatedEntityId,
            relatedEntityType: relatedEntityType);
        return true;
      }
      catch (DbUpdateException dbEx) when (
          (dbEx.InnerException?.Message ?? dbEx.Message).Contains("23505", StringComparison.OrdinalIgnoreCase) ||
          (dbEx.InnerException?.Message ?? dbEx.Message).Contains("uq_app_notifications_saas_billing_event", StringComparison.OrdinalIgnoreCase))
      {
        // Concurrent worker already inserted this exact billing event notification
        return false;
      }
    }

    private static async Task<bool> NotificationExistsAsync(
        WoodAppContext tenantDb,
        string relatedEntityType,
        string relatedEntityId,
        CancellationToken cancellationToken)
    {
      return await tenantDb.AppNotifications
          .AsNoTracking()
          .AnyAsync(n => n.RelatedEntityType == relatedEntityType && n.RelatedEntityId == relatedEntityId, cancellationToken);
    }

    public static async Task<BillingReminderIntervalsOption> LoadReminderConfigAsync(
        MasterDbContext masterDb,
        CancellationToken cancellationToken = default)
    {
      var setting = await masterDb.PlatformSettings
          .AsNoTracking()
          .FirstOrDefaultAsync(s => s.Key == "BillingReminderIntervals", cancellationToken);

      if (setting != null && !string.IsNullOrWhiteSpace(setting.Value))
      {
        try
        {
          var parsed = JsonSerializer.Deserialize<BillingReminderIntervalsOption>(
              setting.Value,
              new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
          if (parsed != null) return parsed;
        }
        catch
        {
          // Use defaults
        }
      }

      return new BillingReminderIntervalsOption();
    }
  }
}
