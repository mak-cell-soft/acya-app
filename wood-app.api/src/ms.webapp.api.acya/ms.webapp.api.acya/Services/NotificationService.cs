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

    /// <summary>
    /// Retrieves active pending transfer notifications for a site, enriched with authoritative
    /// persisted transfer metadata (TransferDate, live Status, OriginSite, ItemsCount) via a single
    /// batched query (zero N+1) and stripped of any ConfirmationCode.
    /// </summary>
    public async Task<List<PendingTransferNotificationDto>> GetEnrichedMissedNotificationsAsync(int siteId)
    {
      var siteIdStr = siteId.ToString();
      var tenantSiteGroup = ResolveTenantGroup(siteIdStr);

      var rawNotifications = await _context.PendingNotifications
          .AsNoTracking()
          .Where(n => n.Status != TransferStatus.Confirmed &&
                      n.Status != TransferStatus.Rejected &&
                      n.Status != TransferStatus.Cancelled &&
                      (n.TargetGroup == siteIdStr || n.TargetGroup == tenantSiteGroup))
          .OrderByDescending(n => n.CreatedAt)
          .ToListAsync();

      if (!rawNotifications.Any())
      {
        return new List<PendingTransferNotificationDto>();
      }

      // Parse TransferIds from JSON payloads
      var parsedItems = new List<(PendingNotification Raw, NotificationDto? Parsed, string ExitDoc, string ReceiptDoc)>();
      var transferIds = new HashSet<int>();

      foreach (var raw in rawNotifications)
      {
        NotificationDto? parsed = null;
        string exitDoc = string.Empty;
        string receiptDoc = string.Empty;

        try
        {
          parsed = JsonSerializer.Deserialize<NotificationDto>(raw.Content ?? "{}");
          if (parsed != null)
          {
            // Strip any legacy ConfirmationCode from raw Content before returning to destination
            if (!string.IsNullOrEmpty(parsed.ConfirmationCode))
            {
              parsed.ConfirmationCode = null;
            }

            if (parsed.TransferId > 0)
            {
              transferIds.Add(parsed.TransferId);
            }

            if (parsed.AdditionalData is JsonElement elem && elem.ValueKind == JsonValueKind.Object)
            {
              if (elem.TryGetProperty("ExitDocNumber", out var exitProp) && exitProp.ValueKind == JsonValueKind.String)
                exitDoc = exitProp.GetString() ?? string.Empty;
              if (elem.TryGetProperty("ReceiptDocNumber", out var recProp) && recProp.ValueKind == JsonValueKind.String)
                receiptDoc = recProp.GetString() ?? string.Empty;
            }
          }
        }
        catch
        {
          // Keep null parsed on malformed legacy JSON
        }

        parsedItems.Add((raw, parsed, exitDoc, receiptDoc));
      }

      // Single batched query for all referenced StockTransfers (zero N+1)
      var liveTransfers = transferIds.Count > 0
          ? await (from st in _context.StockTransfers.AsNoTracking()
                   join docexit in _context.Documents.AsNoTracking() on st.ExitDocumentId equals docexit.Id
                   join docreceipt in _context.Documents.AsNoTracking() on st.ReceiptDocumentId equals docreceipt.Id
                   join ssexit in _context.SalesSites.AsNoTracking() on docexit.SalesSiteId equals ssexit.Id
                   where transferIds.Contains(st.Id)
                   select new
                   {
                     st.Id,
                     st.Reference,
                     st.TransferDate,
                     st.Status,
                     ExitDocNumber = docexit.DocNumber ?? string.Empty,
                     ReceiptDocNumber = docreceipt.DocNumber ?? string.Empty,
                     DestinationSiteId = docreceipt.SalesSiteId,
                     OriginSite = (!string.IsNullOrEmpty(ssexit.Gouvernorate) && !string.IsNullOrEmpty(ssexit.Address))
                         ? ssexit.Gouvernorate + " - " + ssexit.Address
                         : (ssexit.Address ?? ssexit.Gouvernorate ?? string.Empty),
                     ItemsCount = _context.DocumentMerchandises.Count(dm => dm.DocumentId == docexit.Id)
                   }).ToDictionaryAsync(x => x.Id)
          : null;

      var results = new List<PendingTransferNotificationDto>();
      var seenTransferIds = new HashSet<int>();

      foreach (var item in parsedItems)
      {
        int tId = item.Parsed?.TransferId ?? 0;

        if (tId > 0 && liveTransfers != null && liveTransfers.TryGetValue(tId, out var live))
        {
          // Self-healing: exclude notifications whose live transfer is no longer Pending
          if (live.Status != TransferStatus.Pending)
          {
            continue;
          }

          // Deduplicate multiple legacy PendingNotification rows for the same TransferId
          if (!seenTransferIds.Add(tId))
          {
            continue;
          }

          var sanitizedContent = item.Parsed != null ? JsonSerializer.Serialize(item.Parsed) : item.Raw.Content;

          results.Add(new PendingTransferNotificationDto
          {
            Id = item.Raw.Id,
            Content = sanitizedContent,
            TargetGroup = item.Raw.TargetGroup,
            Status = live.Status,
            RetryCount = item.Raw.RetryCount,
            CreatedAt = item.Raw.CreatedAt,
            LastAttemptAt = item.Raw.LastAttemptAt,
            DeliveredAt = item.Raw.DeliveredAt,
            ErrorMessage = item.Raw.ErrorMessage,
            TransferId = live.Id,
            TransferRef = !string.IsNullOrWhiteSpace(live.Reference) ? live.Reference : live.ExitDocNumber,
            OriginSite = live.OriginSite,
            TransferDate = live.TransferDate,
            ItemsCount = live.ItemsCount,
            TransferStatus = live.Status,
            ExitDocNumber = live.ExitDocNumber,
            ReceiptDocNumber = live.ReceiptDocNumber,
            DestinationSiteId = live.DestinationSiteId
          });
        }
        else if (tId == 0)
        {
          // Fallback only if legacy notification had no TransferId
          results.Add(new PendingTransferNotificationDto
          {
            Id = item.Raw.Id,
            Content = item.Parsed != null ? JsonSerializer.Serialize(item.Parsed) : item.Raw.Content,
            TargetGroup = item.Raw.TargetGroup,
            Status = item.Raw.Status,
            RetryCount = item.Raw.RetryCount,
            CreatedAt = item.Raw.CreatedAt,
            LastAttemptAt = item.Raw.LastAttemptAt,
            DeliveredAt = item.Raw.DeliveredAt,
            ErrorMessage = item.Raw.ErrorMessage,
            TransferId = item.Raw.Id,
            TransferRef = item.Parsed?.Reference ?? "Transfert",
            OriginSite = item.Parsed?.OriginSite ?? string.Empty,
            TransferDate = item.Parsed?.TransferDate,
            ItemsCount = item.Parsed?.ItemsCount ?? 0,
            TransferStatus = item.Raw.Status,
            ExitDocNumber = item.ExitDoc,
            ReceiptDocNumber = item.ReceiptDoc,
            DestinationSiteId = siteId
          });
        }
      }

      return results;
    }
  }
}
