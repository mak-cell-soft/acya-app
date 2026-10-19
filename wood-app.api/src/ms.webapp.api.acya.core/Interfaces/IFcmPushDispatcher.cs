using System.Threading;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.Notifications;

namespace ms.webapp.api.acya.core.Interfaces
{
    /// <summary>
    /// Contract for dispatching real-time FCM push notifications to active registered devices
    /// in the current tenant schema.
    /// </summary>
    public interface IFcmPushDispatcher
    {
        /// <summary>
        /// Dispatches a generic push notification to eligible active devices for the persisted notification.
        /// </summary>
        Task<FcmDispatchResult> DispatchAsync(AppNotification notification, CancellationToken cancellationToken = default);
    }
}
