using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
    public class AppNotificationService : IAppNotificationService
    {
        private readonly WoodAppContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IEmailService _emailService;
        private readonly ILogger<AppNotificationService> _logger;

        public AppNotificationService(
            WoodAppContext context, 
            IHubContext<NotificationHub> hubContext,
            IEmailService emailService,
            ILogger<AppNotificationService> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _emailService = emailService;
            _logger = logger;
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

            // Push via SignalR
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

        public async Task MarkAsReadAsync(int notificationId)
        {
            var notification = await _context.AppNotifications.FindAsync(notificationId);
            if (notification != null)
            {
                notification.IsRead = true;
                notification.ViewedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<AppNotification>> GetUnreadNotificationsAsync(int userId, int? siteId = null, string? role = null)
        {
            return await _context.AppNotifications
                .Where(n => !n.IsRead)
                .Where(n => (n.TargetUserId == userId) || 
                            (n.TargetRole != null && n.TargetRole == role) ||
                            (n.TargetSiteId != null && n.TargetSiteId == siteId) ||
                            (n.TargetUserId == null && n.TargetRole == null && n.TargetSiteId == null)) // Global
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        private async Task PushToSignalR(AppNotification notification)
        {
            try
            {
                IClientProxy? target = null;

                if (notification.TargetUserId.HasValue)
                {
                    target = _hubContext.Clients.Group($"user-{notification.TargetUserId}");
                }
                else if (!string.IsNullOrEmpty(notification.TargetRole))
                {
                    target = _hubContext.Clients.Group($"role-{notification.TargetRole}");
                }
                else if (notification.TargetSiteId.HasValue)
                {
                    target = _hubContext.Clients.Group(notification.TargetSiteId.Value.ToString());
                }
                else
                {
                    target = _hubContext.Clients.All;
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
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error pushing notification to SignalR");
            }
        }
    }
}
