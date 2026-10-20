using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Notifications
{
    /// <summary>
    /// Request payload for diagnostic device push notification testing.
    /// Never accepts raw FCM tokens.
    /// </summary>
    public class DeviceTestPushRequestDto
    {
        /// <summary>
        /// Optional database registration ID of the target device.
        /// If omitted, the caller's most recently active registered device in the active tenant schema is selected.
        /// </summary>
        public int? DeviceRegistrationId { get; set; }
    }

    /// <summary>
    /// Response payload for diagnostic device push notification testing.
    /// Clearly distinguishes transport acceptance by FCM from physical handset delivery.
    /// </summary>
    public class DeviceTestPushResponseDto
    {
        public bool Success { get; set; }

        /// <summary>
        /// Explicit transport status code: 'AcceptedByFCM', 'RejectedByFCM', 'RateLimited', 'DeviceNotFound', or 'ServiceUnavailable'.
        /// Never claims confirmed handset delivery.
        /// </summary>
        public string Status { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public int TargetedDeviceId { get; set; }

        public int DeviceRegistrationId { get => TargetedDeviceId; set => TargetedDeviceId = value; }

        public string Platform { get; set; } = string.Empty;

        public bool DeliveryConfirmed { get; set; } = false;

        public DateTime TimestampUtc { get; set; }
    }
}
