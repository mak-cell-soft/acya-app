using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
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

    public NotificationService(WoodAppContext context, IHubContext<NotificationHub> hubContext, ILogger<StockController> logger)
    {
      _context= context;
      _hubContext= hubContext;
      _logger= logger;
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
        DeliveredAt= DateTime.UtcNow,
        LastAttemptAt= DateTime.UtcNow
      };

      _context!.PendingNotifications.Add(pending);
      await _context.SaveChangesAsync();

      // Try immediate delivery
      await TryDeliver(pending);
    }

    private async Task TryDeliver(PendingNotification pendingNotification)
    {
      //if (pendingNotification.LastAttemptAt > DateTime.UtcNow.AddMinutes(-5))
      //{
      //  return; // Skip if retried recently
      //}

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

        await _hubContext.Clients.Group(pendingNotification.TargetGroup)
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

        _logger.LogInformation("****************************************************************");
        _logger.LogInformation("****************************************************************");
        _logger.LogInformation("Successfully delivered RetryReceiveNotification {NotificationId}", pendingNotification.Id);

        // Update status
        //pendingNotification.Status = TransferStatus.Delivered;
        //pendingNotification.DeliveredAt = DateTime.UtcNow;
        //pendingNotification.ErrorMessage = null;

        _logger.LogInformation("Successfully delivered notification {NotificationId}", pendingNotification.Id);
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
          .Where(n => n.Status == TransferStatus.Pending)
          .ToListAsync();

      foreach (var notification in failed)
      {
        await TryDeliver(notification);
      }
    }
  }
}
