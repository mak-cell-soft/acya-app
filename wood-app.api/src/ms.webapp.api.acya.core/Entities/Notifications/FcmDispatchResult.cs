using System;

namespace ms.webapp.api.acya.core.Entities.Notifications
{
    /// <summary>
    /// Encapsulates the execution metrics of an FCM push dispatch attempt.
    /// </summary>
    public class FcmDispatchResult
    {
        public bool IsSuccess { get; set; }
        public int TargetedDevicesCount { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public int DeactivatedTokensCount { get; set; }
        public string? SkippedReason { get; set; }

        public static FcmDispatchResult Skipped(string reason) => new() 
        { 
            IsSuccess = true, 
            SkippedReason = reason 
        };

        public static FcmDispatchResult Empty() => new() 
        { 
            IsSuccess = true, 
            SkippedReason = "No active device tokens found for recipient." 
        };
    }
}
