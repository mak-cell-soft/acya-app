using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
  // Backend service to handle notifications
  public class NotificationService
  {
    private readonly WoodAppContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<StockController> _logger;
    private readonly TenantContext? _tenantContext;

    public NotificationService(WoodAppContext context, IHubContext<NotificationHub> hubContext, ILogger<StockController> logger)
      : this(context, hubContext, logger, null)
    {
    }

    public NotificationService(
        WoodAppContext context, 
        IHubContext<NotificationHub> hubContext, 
        ILogger<StockController> logger,
        TenantContext? tenantContext)
    {
      _context = context;
      _hubContext = hubContext;
      _logger = logger;
      _tenantContext = tenantContext;
    }

    private string? GetTenantSlug()
    {
      if (_tenantContext != null && !string.IsNullOrEmpty(_tenantContext.Slug))
        return _tenantContext.Slug.Trim().ToLowerInvariant();
      if (!string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_"))
        return _context.SchemaName.Substring("tenant_".Length).Trim().ToLowerInvariant();
      return null;
    }

    private string ResolveTenantGroup(string targetGroup)
    {
      if (string.IsNullOrEmpty(targetGroup)) return targetGroup;
      if (targetGroup.StartsWith("tenant:")) return targetGroup;
      var slug = GetTenantSlug();
      return !string.IsNullOrEmpty(slug) ? $"tenant:{slug}:site-{targetGroup}" : targetGroup;
    }

    public async Task QueueNotification(core.Entities.DTOs.NotificationDto notification)
    {
      // Store in database
      var pending = new core.Entities.PendingNotification
      {
        Content = JsonSerializer.Serialize(notification),
        TargetGroup = notification.TargetGroup,
        CreatedAt = DateTime.UtcNow,
        Status = TransferStatus.Pending,
        RetryCount = 0
      };

      _context!.PendingNotifications.Add(pending);
      await _context.SaveChangesAsync();

      // Try immediate delivery
      await TryDeliver(pending);
    }

    private async Task TryDeliver(PendingNotification pendingNotification)
    {
      try
      {
        // Deserialize with proper error handling
        var content = JsonSerializer.Deserialize<NotificationDto>(pendingNotification.Content!);
        if (content == null)
        {
          throw new InvalidOperationException("Notification content is invalid");
        }

        // Ensure we have all required data
        if (string.IsNullOrEmpty(pendingNotification.TargetGroup))
        {
          throw new InvalidOperationException("TargetGroup is missing in notification");
        }

        // Construct the complete transfer data
        var additionalData = JsonSerializer.Deserialize<Dictionary<string, string>>(content.AdditionalData?.ToString() ?? "{}");

        var deliveryGroup = ResolveTenantGroup(pendingNotification.TargetGroup);

        await _hubContext.Clients.Group(deliveryGroup)
           .SendAsync("RetryReceiveNotification", new
           {
             transferId = content.TransferId,
             reference = content.Reference,
             originSite = content.OriginSite,
             itemsCount = content.ItemsCount,
             exitDocNumber = additionalData?.GetValueOrDefault("ExitDocNumber"),
             receiptDocNumber = additionalData?.GetValueOrDefault("ReceiptDocNumber"),
             destinationSiteId = content.TargetGroup // Assuming TargetGroup is the site ID
           });

        _logger.LogInformation("Successfully delivered RetryReceiveNotification {NotificationId} to group {DeliveryGroup}", 
            pendingNotification.Id, deliveryGroup);

        // Mark as pushed but keep Pending status until user action
        pendingNotification.DeliveredAt = DateTime.UtcNow;
        pendingNotification.ErrorMessage = null;
      }
      catch (Exception ex)
      {
        pendingNotification.RetryCount++;
        pendingNotification.LastAttemptAt = DateTime.UtcNow;
        pendingNotification.ErrorMessage = ex.Message[..Math.Min(ex.Message.Length, 500)];
        pendingNotification.Status = pendingNotification.RetryCount >= 5
            ? TransferStatus.Failed
            : TransferStatus.Pending;

        _logger.LogError(ex, "Failed to deliver notification {NotificationId}. Retry count: {RetryCount}",
            pendingNotification.Id, pendingNotification.RetryCount);
      }

      await _context.SaveChangesAsync();
    }

    // Run this periodically (via background worker)
    public async Task RetryFailedNotifications()
    {
      var failed = await _context!.PendingNotifications
          .Where(n => n.Status == TransferStatus.Pending && n.DeliveredAt == null)
          .ToListAsync();

      foreach (var notification in failed)
      {
        await TryDeliver(notification);
      }
    }

    public async Task UpdateStatusByTransferId(int transferId, string targetGroup, TransferStatus newStatus)
    {
       var resolvedGroup = ResolveTenantGroup(targetGroup);

       // Fetch all notifications for this group and verify content in memory
       var candidates = await _context!.PendingNotifications
           .Where(n => (n.TargetGroup == targetGroup || n.TargetGroup == resolvedGroup) && 
                      (n.Status == TransferStatus.Pending || n.Status == TransferStatus.Delivered))
           .ToListAsync();

       foreach (var notification in candidates)
       {
           try
           {
               var content = JsonSerializer.Deserialize<NotificationDto>(notification.Content!);
               if (content != null && content.TransferId == transferId)
               {
                   notification.Status = newStatus;
                   
                   if (newStatus == TransferStatus.Confirmed || newStatus == TransferStatus.Rejected)
                   {
                       var groupToSend = ResolveTenantGroup(notification.TargetGroup!);
                       await _hubContext.Clients.Group(groupToSend)
                            .SendAsync("NotificationFinalized", new { id = transferId, status = newStatus.ToString() });
                   }
               }
           }
           catch
           {
               // Ignore parsing errors
           }
       }
       
       await _context.SaveChangesAsync();
    }

    public async Task DeleteNotificationByTransferId(int transferId, string targetGroup)
    {
        await UpdateStatusByTransferId(transferId, targetGroup, TransferStatus.Rejected); 
    }
  }
}
