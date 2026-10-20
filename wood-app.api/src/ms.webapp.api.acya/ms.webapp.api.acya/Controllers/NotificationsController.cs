using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.api.Services.Notifications;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Notifications;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  public class NotificationsController : BaseApiController
  {
    private readonly IAppNotificationService _appNotificationService;
    private readonly NotificationService _stockNotificationService;
    private readonly WoodAppContext? _context;
    private readonly ILogger<NotificationsController>? _logger;
    private readonly IFirebaseMessagingClient? _firebaseClient;
    private readonly IDeviceTestPushRateLimiter? _rateLimiter;

    [ActivatorUtilitiesConstructor]
    public NotificationsController(
        IAppNotificationService appNotificationService,
        NotificationService stockNotificationService,
        WoodAppContext? context = null,
        ILogger<NotificationsController>? logger = null,
        IFirebaseMessagingClient? firebaseClient = null,
        IDeviceTestPushRateLimiter? rateLimiter = null)
    {
      _appNotificationService = appNotificationService;
      _stockNotificationService = stockNotificationService;
      _context = context;
      _logger = logger;
      _firebaseClient = firebaseClient;
      _rateLimiter = rateLimiter;
    }

    [HttpGet("unreads")]
    public async Task<IActionResult> GetUnreads()
    {
      var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
      var siteId = int.TryParse(User.FindFirst("DefaultSiteId")?.Value, out var sId) ? (int?)sId : null;
      var role = User.FindFirst(ClaimTypes.Role)?.Value;

      if (userId == 0) return Unauthorized();

      var notifications = await _appNotificationService.GetUnreadNotificationsAsync(userId, siteId, role);
      return Ok(notifications);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
      var updated = await _appNotificationService.MarkAsReadAsync(id);
      if (!updated)
      {
        return NotFound(new { message = "Notification non trouvée." });
      }
      return Ok(new { success = true });
    }

    [HttpPost("retry-failed")]
    public async Task<IActionResult> RetryFailed()
    {
      await _stockNotificationService.RetryFailedNotifications();
      return Ok(new
      {
        success = true,
        message = "Retry initiated",
        timestamp = DateTime.UtcNow
      });
    }

    [HttpDelete("{transferId}")]
    public async Task<IActionResult> Delete(int transferId)
    {
      var siteId = User.FindFirst("DefaultSite")?.Value;
      if (string.IsNullOrEmpty(siteId)) return BadRequest("User site context not found.");

      await _stockNotificationService.DeleteNotificationByTransferId(transferId, siteId);
      return Ok();
    }

    /// <summary>
    /// Registers or refreshes an FCM device token for the authenticated user in the current tenant schema.
    /// </summary>
    [HttpPost("devices/register")]
    [Authorize]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceTokenDto dto)
    {
      if (_context == null)
      {
        return StatusCode(500, new { message = "Database context is not configured." });
      }

      var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      if (!int.TryParse(userIdClaim, out var userId) || userId <= 0)
      {
        return Unauthorized(new { message = "Authentification requise ou identité utilisateur invalide." });
      }

      if (dto == null)
      {
        return BadRequest(new { message = "Le corps de la requête est requis." });
      }

      var token = dto.Token?.Trim();
      if (string.IsNullOrEmpty(token))
      {
        return BadRequest(new { message = "Le jeton d'enregistrement FCM est obligatoire." });
      }

      if (token.Length > 512)
      {
        return BadRequest(new { message = "Le jeton d'enregistrement dépasse la longueur maximale autorisée (512 caractères)." });
      }

      var platform = string.IsNullOrWhiteSpace(dto.Platform) ? "android" : dto.Platform.Trim().ToLowerInvariant();
      if (platform != "android" && platform != "ios")
      {
        return BadRequest(new { message = "Plateforme non prise en charge. Les plateformes supportées sont 'android' et 'ios'." });
      }

      // Query token within current tenant schema
      var existing = await _context.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == token);

      if (existing != null)
      {
        if (existing.UserId == userId)
        {
          // Case 1: Same user refreshing or re-registering this device
          existing.IsActive = true;
          existing.Platform = platform;
          existing.AppVersion = dto.AppVersion?.Trim();
          existing.LastActiveAt = DateTime.UtcNow;

          _context.DevicePushTokens.Update(existing);
          await _context.SaveChangesAsync();

          _logger?.LogInformation("Device registration refreshed for user {UserId}", userId);
          return Ok(new DeviceTokenResponseDto { Success = true, Message = "Jeton d'appareil actualisé avec succès." });
        }
        else
        {
          // Token exists but belongs to a different user
          if (existing.IsActive)
          {
            // Case 2: Conflicting active registration by another user in this tenant
            // Reject to prevent silent cross-user hijacking!
            _logger?.LogWarning("Device token registration conflict: Token is actively registered to user {ExistingUserId}, rejecting registration for user {CurrentUserId}",
                existing.UserId, userId);
            return Conflict(new { message = "Ce jeton d'appareil est déjà associé de manière active à un autre compte dans ce tenant." });
          }
          else
          {
            // Case 3: Inactive token previously registered to another user (e.g. logged out)
            // Safe reassignment to newly authenticated user on this physical device
            existing.UserId = userId;
            existing.IsActive = true;
            existing.Platform = platform;
            existing.AppVersion = dto.AppVersion?.Trim();
            existing.LastActiveAt = DateTime.UtcNow;

            _context.DevicePushTokens.Update(existing);
            await _context.SaveChangesAsync();

            _logger?.LogInformation("Inactive device registration safely reassigned to user {UserId}", userId);
            return Ok(new DeviceTokenResponseDto { Success = true, Message = "Jeton d'appareil réassigné avec succès." });
          }
        }
      }
      else
      {
        // Case 4: Brand new device registration
        var newToken = new DevicePushToken
        {
          UserId = userId,
          Token = token,
          Platform = platform,
          AppVersion = dto.AppVersion?.Trim(),
          IsActive = true,
          CreatedAt = DateTime.UtcNow,
          LastActiveAt = DateTime.UtcNow
        };

        await _context.DevicePushTokens.AddAsync(newToken);
        await _context.SaveChangesAsync();

        _logger?.LogInformation("New device registration created for user {UserId}", userId);
        return Ok(new DeviceTokenResponseDto { Success = true, Message = "Appareil enregistré avec succès." });
      }
    }

    /// <summary>
    /// Unregisters (deactivates) an FCM device token owned by the authenticated user in the current tenant schema.
    /// </summary>
    [HttpPost("devices/unregister")]
    [Authorize]
    public async Task<IActionResult> UnregisterDevice([FromBody] UnregisterDeviceTokenDto dto)
    {
      if (_context == null)
      {
        return StatusCode(500, new { message = "Database context is not configured." });
      }

      var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      if (!int.TryParse(userIdClaim, out var userId) || userId <= 0)
      {
        return Unauthorized(new { message = "Authentification requise ou identité utilisateur invalide." });
      }

      if (dto == null)
      {
        return BadRequest(new { message = "Le corps de la requête est requis." });
      }

      var token = dto.Token?.Trim();
      if (string.IsNullOrEmpty(token))
      {
        return BadRequest(new { message = "Le jeton d'enregistrement FCM est obligatoire." });
      }

      var existing = await _context.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == token);

      if (existing != null && existing.UserId == userId)
      {
        // Owner deactivates registration
        existing.IsActive = false;
        existing.LastActiveAt = DateTime.UtcNow;
        _context.DevicePushTokens.Update(existing);
        await _context.SaveChangesAsync();

        _logger?.LogInformation("Device registration deactivated for user {UserId}", userId);
      }
      else
      {
        // Either token does not exist or belongs to another user.
        // Idempotent OK returned; never modify another user's registration and never leak ownership info.
        _logger?.LogInformation("Unregister request for token by user {UserId}: no owned active token modified", userId);
      }

      return Ok(new DeviceTokenResponseDto { Success = true, Message = "Appareil désenregistré avec succès." });
    }

    /// <summary>
    /// Production-safe diagnostic action to test FCM push delivery to the authenticated user's own registered device.
    /// Strictly limits targeting to an active device owned by the caller within the resolved tenant schema.
    /// Never accepts raw tokens, never broadcasts, and enforces single-instance rate limiting.
    /// </summary>
    [HttpPost("devices/test-push")]
    [Authorize]
    public async Task<IActionResult> TestDevicePush([FromBody] DeviceTestPushRequestDto? dto)
    {
      if (_context == null)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Database context is not configured." });
      }

      var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      if (!int.TryParse(userIdClaim, out var userId) || userId <= 0)
      {
        return Unauthorized(new { message = "Authentification requise ou identité utilisateur invalide." });
      }

      // 1. Resolve active tenant slug and validate tenant claim
      var tenantClaim = User.FindFirst("tenant_slug")?.Value?.Trim().ToLowerInvariant();
      var contextTenant = (!string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_"))
          ? _context.SchemaName.Substring("tenant_".Length).Trim().ToLowerInvariant()
          : null;

      if (!string.IsNullOrEmpty(tenantClaim) && !string.IsNullOrEmpty(contextTenant) &&
          !string.Equals(tenantClaim, contextTenant, StringComparison.OrdinalIgnoreCase))
      {
        _logger?.LogWarning("Tenant mismatch detected: token claim '{ClaimTenant}' does not match context '{ContextTenant}'",
            tenantClaim, contextTenant);
        return Unauthorized(new { message = "Incohérence de contexte tenant." });
      }

      var tenantSlug = tenantClaim ?? contextTenant ?? "default";

      // 2. Check rate limit
      if (_rateLimiter != null && !_rateLimiter.IsAllowed(tenantSlug, userId, out var retryAfterSeconds))
      {
        Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
        return StatusCode(StatusCodes.Status429TooManyRequests, new
        {
          success = false,
          status = "RateLimited",
          message = $"Limite de requêtes atteinte. Veuillez réessayer dans {retryAfterSeconds} secondes.",
          retryAfterSeconds
        });
      }

      // 3. Resolve target device strictly owned by caller and active
      DevicePushToken? targetDevice = null;
      if (dto?.DeviceRegistrationId.HasValue == true)
      {
        targetDevice = await _context.DevicePushTokens
            .FirstOrDefaultAsync(d => d.Id == dto.DeviceRegistrationId.Value && d.UserId == userId && d.IsActive);
      }
      else
      {
        targetDevice = await _context.DevicePushTokens
            .Where(d => d.UserId == userId && d.IsActive)
            .OrderByDescending(d => d.LastActiveAt)
            .FirstOrDefaultAsync();
      }

      if (targetDevice == null)
      {
        return NotFound(new
        {
          success = false,
          status = "DeviceNotFound",
          message = "Aucun appareil actif enregistré n'a été trouvé pour votre compte."
        });
      }

      // 4. Verify Firebase Client readiness
      if (_firebaseClient == null || !_firebaseClient.IsConfigured)
      {
        _logger?.LogWarning("Diagnostic push rejected: Firebase messaging is not configured on this server (Tenant: '{TenantSlug}', UserId: {UserId})",
            tenantSlug, userId);
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
          success = false,
          status = "ServiceUnavailable",
          message = "Le service de notification push Firebase n'est pas configuré sur ce serveur."
        });
      }

      // 5. Construct generic harmless diagnostic payload
      var title = "ACYA — Diagnostic Mobile";
      var body = "Test de notification en direct. Aucune action requise.";
      var data = new Dictionary<string, string>
      {
        ["type"] = "diagnostic",
        ["tenantSlug"] = tenantSlug ?? "unknown",
        ["timestamp"] = DateTime.UtcNow.ToString("o")
      };

      // 6. Send single push via IFirebaseMessagingClient.SendMulticastAsync with exactly one token
      FcmBatchSendResult sendResult;
      try
      {
        using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
        sendResult = await _firebaseClient.SendMulticastAsync(
            new[] { targetDevice.Token },
            title,
            body,
            data,
            cts.Token);
      }
      catch (Exception ex)
      {
        _logger?.LogError("Unexpected error during diagnostic FCM dispatch for user {UserId}: {ErrorMessage}", userId, ex.Message);
        return StatusCode(StatusCodes.Status502BadGateway, new
        {
          success = false,
          status = "GatewayError",
          message = "Erreur inattendue lors de la communication avec le service Firebase."
        });
      }

      // 7. Token hygiene: Deactivate ONLY if Firebase reliably reported token as unregistered
      if (sendResult.UnregisteredTokens != null && sendResult.UnregisteredTokens.Contains(targetDevice.Token))
      {
        targetDevice.IsActive = false;
        targetDevice.LastActiveAt = DateTime.UtcNow;
        _context.DevicePushTokens.Update(targetDevice);
        await _context.SaveChangesAsync();

        _logger?.LogInformation("Deactivated unregistered device token for user {UserId} in tenant '{TenantSlug}' (DeviceId: {DeviceId})",
            userId, tenantSlug, targetDevice.Id);
      }

      // 8. Distinguish FCM acceptance from handset delivery
      if (sendResult.SuccessCount > 0)
      {
        _logger?.LogInformation("Diagnostic FCM message accepted by Firebase for user {UserId} (DeviceId: {DeviceId}, Tenant: '{TenantSlug}')",
            userId, targetDevice.Id, tenantSlug);

        return Ok(new DeviceTestPushResponseDto
        {
          Success = true,
          Status = "AcceptedByFCM",
          Message = "Notification de test acceptée par Firebase Cloud Messaging pour acheminement. La réception sur l'appareil dépend de sa connectivité et de ses paramètres système.",
          TargetedDeviceId = targetDevice.Id,
          Platform = targetDevice.Platform,
          DeliveryConfirmed = false,
          TimestampUtc = DateTime.UtcNow
        });
      }
      else
      {
        _logger?.LogWarning("Diagnostic FCM message rejected by Firebase for user {UserId} (DeviceId: {DeviceId}, Tenant: '{TenantSlug}', Failures: {FailureCount})",
            userId, targetDevice.Id, tenantSlug, sendResult.FailureCount);

        return StatusCode(StatusCodes.Status502BadGateway, new DeviceTestPushResponseDto
        {
          Success = false,
          Status = "RejectedByFCM",
          Message = "La requête de notification a été rejetée par Firebase Cloud Messaging.",
          TargetedDeviceId = targetDevice.Id,
          TimestampUtc = DateTime.UtcNow
        });
      }
    }

    /// <summary>
    /// Development-only test endpoint to trigger exactly one controlled FCM test push notification
    /// directed strictly to the authenticated user's registered devices within the 'development' tenant.
    /// </summary>
    [HttpPost("test-push")]
    [Authorize]
    [DevelopmentOnly]
    public async Task<IActionResult> TestPush(
        [FromServices] IWebHostEnvironment env,
        [FromServices] TenantContext? tenantContext)
    {
      // 1. Runtime Environment Guard
      if (env == null || !env.IsDevelopment())
      {
        return NotFound();
      }

      // 2. Strict Tenant Guard (Must match "development" tenant slug)
      var tenantSlug = tenantContext?.Slug?.Trim().ToLowerInvariant();
      if (!string.Equals(tenantSlug, "development", StringComparison.OrdinalIgnoreCase))
      {
        _logger?.LogWarning("TestPush rejected: Request resolved tenant '{TenantSlug}', expected 'development'", tenantSlug);
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "L'accès au test push est restreint au tenant 'development'." });
      }

      // 3. Authenticated Identity Verification
      var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      if (!int.TryParse(userIdClaim, out var userId) || userId <= 0)
      {
        return Unauthorized(new { message = "Authentification requise ou identité utilisateur invalide." });
      }

      // 4. Strict Synthetic User Guard (Only user ID 1 is authorized)
      if (userId != 1)
      {
        _logger?.LogWarning("TestPush rejected: Authenticated user ID {UserId} is not authorized (expected 1)", userId);
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Seul l'utilisateur synthétique de développement (ID 1) est autorisé." });
      }

      // 5. Trigger Single Notification via AppNotificationService
      // Targets userId directly (targetRole and targetSiteId left null; never broadcast)
      var notification = await _appNotificationService.NotifyAsync(
          title: "ACYA Development FCM Test",
          message: "Controlled development push delivery test.",
          type: NotificationType.Info,
          priority: NotificationPriority.Normal,
          targetUserId: userId,
          targetRole: null,
          targetSiteId: null);

      _logger?.LogInformation("Controlled development FCM test push initiated for user {UserId} in tenant '{TenantSlug}' (NotificationId: {NotificationId})",
          userId, tenantSlug, notification?.Id ?? 0);

      // 6. Return Sanitized Metadata Only (No tokens, JWTs, or secrets)
      return Ok(new
      {
        success = true,
        notificationId = notification?.Id ?? 0,
        targetUserId = userId,
        tenant = tenantSlug,
        timestamp = DateTime.UtcNow
      });
    }
  }

  /// <summary>
  /// Restricts controller action registration and invocation strictly to the Development environment.
  /// In non-Development environments:
  /// 1. IActionModelConvention removes selectors and hides the action from ApiExplorer / routing.
  /// 2. IActionConstraint rejects request candidate selection.
  /// </summary>
  [AttributeUsage(AttributeTargets.Method)]
  public class DevelopmentOnlyAttribute : Attribute, IActionModelConvention, IActionConstraint
  {
    public int Order => 0;

    public void Apply(ActionModel action)
    {
      var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
             ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
      if (!string.Equals(env, "Development", StringComparison.OrdinalIgnoreCase))
      {
        action.Selectors.Clear();
        if (action.ApiExplorer != null)
        {
          action.ApiExplorer.IsVisible = false;
        }
      }
    }

    public bool Accept(ActionConstraintContext context)
    {
      var env = context.RouteContext.HttpContext.RequestServices.GetService<IWebHostEnvironment>();
      return env != null && env.IsDevelopment();
    }
  }
}
