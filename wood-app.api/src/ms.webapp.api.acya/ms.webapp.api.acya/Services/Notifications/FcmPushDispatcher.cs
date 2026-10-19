using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services.Notifications
{
    /// <summary>
    /// Dispatches FCM push notifications to active mobile devices registered within the active tenant schema.
    /// Preserves strict multi-tenant boundaries, failure isolation, and payload data privacy.
    /// </summary>
    public class FcmPushDispatcher : IFcmPushDispatcher
    {
        private readonly WoodAppContext _context;
        private readonly TenantContext? _tenantContext;
        private readonly IFirebaseMessagingClient _firebaseClient;
        private readonly ILogger<FcmPushDispatcher> _logger;

        public FcmPushDispatcher(
            WoodAppContext context,
            IFirebaseMessagingClient firebaseClient,
            ILogger<FcmPushDispatcher> logger,
            TenantContext? tenantContext = null)
        {
            _context = context;
            _firebaseClient = firebaseClient;
            _logger = logger;
            _tenantContext = tenantContext;
        }

        private string? GetTenantSlug()
        {
            if (_tenantContext != null && !string.IsNullOrWhiteSpace(_tenantContext.Slug))
            {
                return _tenantContext.Slug.Trim().ToLowerInvariant();
            }

            if (!string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_"))
            {
                return _context.SchemaName.Substring("tenant_".Length).Trim().ToLowerInvariant();
            }

            return null;
        }

        public async Task<FcmDispatchResult> DispatchAsync(AppNotification notification, CancellationToken cancellationToken = default)
        {
            if (notification == null)
            {
                return FcmDispatchResult.Skipped("Notification is null");
            }

            // Exclude email records from mobile push
            if (notification.Type == NotificationType.Email)
            {
                return FcmDispatchResult.Skipped("Email notifications are excluded from mobile push");
            }

            var tenantSlug = GetTenantSlug();
            if (string.IsNullOrEmpty(tenantSlug))
            {
                _logger.LogWarning("FcmPushDispatcher: Tenant slug missing. Suppressing FCM dispatch to prevent cross-tenant leakage.");
                return FcmDispatchResult.Skipped("Tenant context missing");
            }

            if (!_firebaseClient.IsConfigured)
            {
                _logger.LogDebug("FcmPushDispatcher: Firebase is not configured. Skipping push for tenant '{TenantSlug}'", tenantSlug);
                return FcmDispatchResult.Skipped("Firebase is not configured");
            }

            try
            {
                // 1. Resolve eligible recipient UserIds within this tenant schema
                var eligibleUserIds = await ResolveRecipientUserIdsAsync(notification, cancellationToken);
                if (eligibleUserIds == null || eligibleUserIds.Count == 0)
                {
                    _logger.LogDebug("FcmPushDispatcher: No eligible users found for notification targeting (Tenant: '{TenantSlug}')", tenantSlug);
                    return FcmDispatchResult.Empty();
                }

                // 2. Query only active registered device tokens for eligible users in current tenant schema
                var activeTokens = await _context.DevicePushTokens
                    .Where(t => eligibleUserIds.Contains(t.UserId) && t.IsActive)
                    .ToListAsync(cancellationToken);

                if (activeTokens.Count == 0)
                {
                    _logger.LogDebug("FcmPushDispatcher: No active device tokens found for eligible users (Tenant: '{TenantSlug}')", tenantSlug);
                    return FcmDispatchResult.Empty();
                }

                // 3. Deduplicate tokens to ensure a physical device receives only one push
                var distinctTokens = activeTokens
                    .GroupBy(t => t.Token)
                    .Select(g => g.First())
                    .ToList();

                var tokenStrings = distinctTokens.Select(t => t.Token).ToList();

                // 4. Construct generic, privacy-safe notification payload
                // Security: NEVER include customer names, prices, amounts, or transaction messages in FCM payloads!
                var title = "ACYA Élancé";
                var body = "Nouvelle notification reçue";
                var data = new Dictionary<string, string>
                {
                    ["notificationId"] = notification.Id.ToString(),
                    ["tenantSlug"] = tenantSlug,
                    ["type"] = ((int)notification.Type).ToString(),
                    ["priority"] = ((int)notification.Priority).ToString()
                };

                // 5. Send multicast via client
                var sendResult = await _firebaseClient.SendMulticastAsync(
                    tokenStrings,
                    title,
                    body,
                    data,
                    cancellationToken);

                // 6. Automatically deactivate invalid or unregistered tokens
                int deactivatedCount = 0;
                if (sendResult.UnregisteredTokens.Count > 0)
                {
                    var tokensToDeactivate = activeTokens
                        .Where(t => sendResult.UnregisteredTokens.Contains(t.Token))
                        .ToList();

                    foreach (var t in tokensToDeactivate)
                    {
                        t.IsActive = false;
                        t.LastActiveAt = DateTime.UtcNow;
                        deactivatedCount++;
                    }

                    await _context.SaveChangesAsync(cancellationToken);

                    // Security: Log count only; never print raw device tokens
                    _logger.LogInformation("Deactivated {Count} invalid/unregistered FCM device token(s) for tenant '{TenantSlug}'",
                        deactivatedCount, tenantSlug);
                }

                _logger.LogInformation(
                    "FCM dispatch completed for notification {NotificationId} in tenant '{TenantSlug}' (Devices: {Total}, Success: {Success}, Failed: {Failed})",
                    notification.Id, tenantSlug, distinctTokens.Count, sendResult.SuccessCount, sendResult.FailureCount);

                return new FcmDispatchResult
                {
                    IsSuccess = true,
                    TargetedDevicesCount = distinctTokens.Count,
                    SuccessCount = sendResult.SuccessCount,
                    FailureCount = sendResult.FailureCount,
                    DeactivatedTokensCount = deactivatedCount
                };
            }
            catch (OperationCanceledException)
            {
                // Fix 3: Re-throw cancellation to allow caller's timeout boundary to observe it explicitly
                throw;
            }
            catch (Exception ex)
            {
                // Strict failure isolation: Push failure must never bubble up or disrupt notification creation
                _logger.LogError("Unexpected error during FCM dispatch for notification {NotificationId}: {ErrorMessage}",
                    notification.Id, ex.Message);
                return new FcmDispatchResult
                {
                    IsSuccess = false,
                    SkippedReason = ex.Message
                };
            }
        }

        private async Task<List<int>> ResolveRecipientUserIdsAsync(AppNotification notification, CancellationToken cancellationToken)
        {
            // Mode A: Direct User Targeting (Fix 2: Confirm user exists and is active in current tenant schema)
            if (notification.TargetUserId.HasValue)
            {
                var isActiveUser = await _context.AppUsers
                    .AnyAsync(u => u.Id == notification.TargetUserId.Value && u.IsActive, cancellationToken);

                return isActiveUser
                    ? new List<int> { notification.TargetUserId.Value }
                    : new List<int>();
            }

            // Mode B: Role-Based Targeting
            if (!string.IsNullOrWhiteSpace(notification.TargetRole))
            {
                var roleString = notification.TargetRole.Trim();
                Roles? targetRole = null;

                if (Enum.TryParse<Roles>(roleString, true, out var parsedRole))
                {
                    targetRole = parsedRole;
                }
                else if (int.TryParse(roleString, out var roleInt) && Enum.IsDefined(typeof(Roles), (Roles)roleInt))
                {
                    targetRole = (Roles)roleInt;
                }

                if (targetRole.HasValue)
                {
                    return await _context.AppUsers
                        .Where(u => u.IsActive && u.Persons != null && !u.Persons.IsDeleted && u.Persons.Role == targetRole.Value)
                        .Select(u => u.Id)
                        .Distinct()
                        .ToListAsync(cancellationToken);
                }

                _logger.LogWarning("FcmPushDispatcher: Unrecognized target role '{Role}'", roleString);
                return new List<int>();
            }

            // Mode C: Site-Based Targeting
            if (notification.TargetSiteId.HasValue)
            {
                return await _context.AppUsers
                    .Where(u => u.IsActive && u.IdSalesSite == notification.TargetSiteId.Value)
                    .Select(u => u.Id)
                    .Distinct()
                    .ToListAsync(cancellationToken);
            }

            // Mode D: Tenant-Wide Broadcast (TargetUserId, TargetRole, TargetSiteId are all null)
            return await _context.AppUsers
                .Where(u => u.IsActive)
                .Select(u => u.Id)
                .Distinct()
                .ToListAsync(cancellationToken);
        }
    }
}
