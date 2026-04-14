using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.Notifications;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IAppNotificationService
    {
        /// <summary>
        /// Sends a notification to the target (User, Role, or Site) and persists it.
        /// </summary>
        Task<AppNotification> NotifyAsync(string title, string message, NotificationType type = NotificationType.Info, 
            NotificationPriority priority = NotificationPriority.Normal, int? targetUserId = null, 
            string? targetRole = null, int? targetSiteId = null, string? relatedEntityId = null, 
            string? relatedEntityType = null);

        /// <summary>
        /// Specifically for sending emails through the notification system.
        /// </summary>
        Task SendEmailNotificationAsync(string to, string subject, string body, int? targetUserId = null);

        /// <summary>
        /// Marks a notification as read.
        /// </summary>
        Task MarkAsReadAsync(int notificationId);

        /// <summary>
        /// Fetches unread notifications for a specific user, considering their site and role.
        /// </summary>
        Task<IEnumerable<AppNotification>> GetUnreadNotificationsAsync(int userId, int? siteId = null, string? role = null);
    }
}
