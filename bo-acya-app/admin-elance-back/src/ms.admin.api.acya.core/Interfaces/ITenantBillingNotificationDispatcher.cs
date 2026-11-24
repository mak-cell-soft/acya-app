using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface ITenantBillingNotificationDispatcher
    {
        /// <summary>
        /// Persists a billing notification directly into the target tenant's AppNotifications table
        /// with idempotency checking on (RelatedEntityType, RelatedEntityId) to prevent duplicate notifications.
        /// Returns true if a new notification was created, false if skipped as duplicate or if schema is unavailable.
        /// </summary>
        Task<bool> TryCreateNotificationAsync(
            long tenantId,
            string title,
            string message,
            int notificationType,
            int priority,
            string relatedEntityType,
            string relatedEntityId,
            CancellationToken cancellationToken = default);
    }
}
