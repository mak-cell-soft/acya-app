using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace ms.webapp.api.acya.api.Services
{
    public class AppNotificationService : IAppNotificationService
    {
        private readonly WoodAppContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IEmailService _emailService;
        private readonly ILogger<AppNotificationService> _logger;
        private readonly TenantContext? _tenantContext;

        public AppNotificationService(
            WoodAppContext context, 
            IHubContext<NotificationHub> hubContext,
            IEmailService emailService,
            ILogger<AppNotificationService> logger)
            : this(context, hubContext, emailService, logger, null)
        {
        }

        public AppNotificationService(
            WoodAppContext context, 
            IHubContext<NotificationHub> hubContext,
            IEmailService emailService,
            ILogger<AppNotificationService> logger,
            TenantContext? tenantContext)
        {
            _context = context;
            _hubContext = hubContext;
            _emailService = emailService;
            _logger = logger;
            _tenantContext = tenantContext;
        }

        private string? GetTenantSlug()
        {
            if (_tenantContext != null && !string.IsNullOrEmpty(_tenantContext.Slug))
            {
                return _tenantContext.Slug.Trim().ToLowerInvariant();
            }

            if (!string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_"))
            {
                return _context.SchemaName.Substring("tenant_".Length).Trim().ToLowerInvariant();
            }

            return null;
        }

        public async Task<AppNotification> NotifyAsync(string title, string message, NotificationType type = NotificationType.Info, 
            NotificationPriority priority = NotificationPriority.Normal, int? targetUserId = null, 
            string? targetRole = null, int? targetSiteId = null, string? relatedEntityId = null, 
            string? relatedEntityType = null)
        {
            var notification = new AppNotification
            {
                Title = title,
                Message = message,
                Type = type,
                Priority = priority,
                TargetUserId = targetUserId,
                TargetRole = targetRole,
                TargetSiteId = targetSiteId,
                RelatedEntityId = relatedEntityId,
                RelatedEntityType = relatedEntityType,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.AppNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // Push via SignalR with strict tenant scoping
            await PushToSignalR(notification);

            return notification;
        }

        public async Task SendEmailNotificationAsync(string to, string subject, string body, int? targetUserId = null)
        {
            var notification = new AppNotification
            {
                Title = subject,
                Message = body,
                Type = NotificationType.Email,
                Priority = NotificationPriority.Normal,
                TargetUserId = targetUserId,
                EmailRecipient = to,
                CreatedAt = DateTime.UtcNow
            };

            _context.AppNotifications.Add(notification);
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendEmailAsync(to, subject, body, true);
                notification.EmailSent = true;
                notification.EmailSentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email notification to {Recipient}", to);
                notification.EmailSent = false;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<bool> MarkAsReadAsync(int notificationId)
        {
            var notification = await _context.AppNotifications.FindAsync(notificationId);
            if (notification == null)
            {
                return false;
            }

            notification.IsRead = true;
            notification.ViewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<AppNotification>> GetUnreadNotificationsAsync(int userId, int? siteId = null, string? role = null)
        {
            return await _context.AppNotifications
                .Where(n => !n.IsRead)
                .Where(n => n.Type != NotificationType.Email) // Exclude email logs from in-app notifications
                .Where(n => (n.TargetUserId == userId) || 
                            (n.TargetRole != null && n.TargetRole == role) ||
                            (n.TargetSiteId != null && n.TargetSiteId == siteId) ||
                            (n.TargetUserId == null && n.TargetRole == null && n.TargetSiteId == null)) // Global within tenant
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        private async Task PushToSignalR(AppNotification notification)
        {
            try
            {
                var tenantSlug = GetTenantSlug();
                if (string.IsNullOrEmpty(tenantSlug))
                {
                    _logger.LogWarning("PushToSignalR: Suppressing broadcast because tenant context is missing. Cross-tenant leakage prevented.");
                    return;
                }

                IClientProxy? target = null;

                if (notification.TargetUserId.HasValue)
                {
                    target = _hubContext.Clients.Group($"tenant:{tenantSlug}:user-{notification.TargetUserId}");
                }
                else if (!string.IsNullOrEmpty(notification.TargetRole))
                {
                    target = _hubContext.Clients.Group($"tenant:{tenantSlug}:role-{notification.TargetRole}");
                }
                else if (notification.TargetSiteId.HasValue)
                {
                    target = _hubContext.Clients.Group($"tenant:{tenantSlug}:site-{notification.TargetSiteId}");
                }
                else
                {
                    // Strictly isolate tenant-wide broadcast to this tenant's group
                    target = _hubContext.Clients.Group($"tenant:{tenantSlug}");
                }

                if (target != null)
                {
                    await target.SendAsync("ReceiveSystemNotification", new
                    {
                        id = notification.Id,
                        title = notification.Title,
                        message = notification.Message,
                        type = (int)notification.Type,
                        priority = (int)notification.Priority,
                        createdAt = notification.CreatedAt,
                        relatedEntityId = notification.RelatedEntityId,
                        relatedEntityType = notification.RelatedEntityType
                    });
                    
                    _logger.LogInformation("SignalR notification pushed for tenant '{TenantSlug}' (NotificationId: {NotificationId})",
                        tenantSlug, notification.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error pushing notification to SignalR");
            }
        }
    }
}
