using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/mobile")]
    [Authorize(Policy = "RequireAdminRole")]
    public class AdminMobileFirebaseController : BaseApiController
    {
        private readonly IFirebaseAppManagementService _firebaseService;
        private readonly ILogger<AdminMobileFirebaseController> _logger;

        private static readonly Regex SlugRegex = new Regex(@"^[a-zA-Z0-9_-]{2,64}$", RegexOptions.Compiled);

        public AdminMobileFirebaseController(
            IFirebaseAppManagementService firebaseService,
            ILogger<AdminMobileFirebaseController> logger)
        {
            _firebaseService = firebaseService;
            _logger = logger;
        }

        private static bool IsValidSlug(string slug)
        {
            return !string.IsNullOrWhiteSpace(slug) && SlugRegex.IsMatch(slug.Trim());
        }

        /// <summary>
        /// Retrieves the list of Firebase application registration summaries for all active tenants in the master registry.
        /// Unregistered tenants are included with status 'NotRegistered'.
        /// Never returns raw google-services.json contents or private keys.
        /// </summary>
        [HttpGet("firebase-apps")]
        public async Task<ActionResult<List<TenantFirebaseAppSummaryDto>>> GetAllFirebaseApps(System.Threading.CancellationToken cancellationToken = default)
        {
            var apps = await _firebaseService.GetAllTenantFirebaseAppsAsync(cancellationToken);
            return Ok(apps);
        }

        /// <summary>
        /// Retrieves the current non-sensitive Firebase application registration status for a tenant.
        /// Exposes project ID, app ID, package name, and provisioning status.
        /// Never returns service account keys, tokens, or google-services.json contents.
        /// </summary>
        [HttpGet("tenants/{slug}/firebase-app")]
        public async Task<ActionResult<TenantFirebaseAppStatusDto>> GetStatus(string slug)
        {
            if (!IsValidSlug(slug))
            {
                return BadRequest(new { message = "Invalid tenant slug format. Must be alphanumeric with '-' or '_' (2-64 characters)." });
            }

            var cleanSlug = slug.Trim().ToLowerInvariant();
            var status = await _firebaseService.GetTenantFirebaseAppStatusAsync(cleanSlug);

            if (status == null)
            {
                return NotFound(new { message = $"Tenant '{cleanSlug}' not found in master enterprise registry." });
            }

            return Ok(status);
        }

        /// <summary>
        /// Ensures the tenant's Android application is registered in the configured Firebase project.
        /// Derives package name server-side, registers application if absent, polls for completion,
        /// and stores the resulting client configuration artifact in the master database.
        /// Idempotent: repeated calls safely return active status.
        /// </summary>
        [HttpPost("tenants/{slug}/firebase-app")]
        public async Task<ActionResult<TenantFirebaseAppStatusDto>> ProvisionOrEnsureRegistered(string slug)
        {
            if (!IsValidSlug(slug))
            {
                return BadRequest(new { message = "Invalid tenant slug format. Must be alphanumeric with '-' or '_' (2-64 characters)." });
            }

            var cleanSlug = slug.Trim().ToLowerInvariant();
            _logger.LogInformation("SuperAdmin initiated Firebase application registration for tenant '{TenantSlug}'.", cleanSlug);

            try
            {
                var result = await _firebaseService.EnsureTenantAppRegisteredAsync(cleanSlug);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Firebase registration failed: Tenant '{TenantSlug}' not found.", cleanSlug);
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogError(ex, "Firebase registration authorization failed for tenant '{TenantSlug}'.", cleanSlug);
                return StatusCode(503, new { message = "Firebase Management API authorization failed. Check provisioning credentials and IAM permissions." });
            }
            catch (TimeoutException ex)
            {
                _logger.LogError(ex, "Firebase registration timed out for tenant '{TenantSlug}'.", cleanSlug);
                return StatusCode(504, new { message = "Firebase application creation timed out while waiting for remote operation completion." });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Firebase registration failed for tenant '{TenantSlug}': {Error}", cleanSlug, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error registering Firebase app for tenant '{TenantSlug}'.", cleanSlug);
                return StatusCode(500, new { message = "An error occurred while provisioning the Firebase application." });
            }
        }
    }
}
