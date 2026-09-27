using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Controllers
{
    [ApiController]
    [Route("api/mobile/releases")]
    public class MobileReleasesController : BaseApiController
    {
        private readonly IMobileBuildService _buildService;
        private readonly TenantContext _tenantContext;
        private readonly ILogger<MobileReleasesController> _logger;

        public MobileReleasesController(
            IMobileBuildService buildService,
            TenantContext tenantContext,
            ILogger<MobileReleasesController> logger)
        {
            _buildService = buildService;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        private string? ResolveAuthenticatedTenantSlug()
        {
            // 1. Check validated TenantContext from middleware
            if (_tenantContext.IsEnabled && !string.IsNullOrWhiteSpace(_tenantContext.Slug))
            {
                return _tenantContext.Slug.Trim().ToLowerInvariant();
            }

            // 2. Check JWT claim
            var jwtTenant = User.FindFirst("tenant_slug")?.Value;
            if (!string.IsNullOrWhiteSpace(jwtTenant))
            {
                return jwtTenant.Trim().ToLowerInvariant();
            }

            return null;
        }

        /// <summary>
        /// Lists all succeeded releases for the authenticated user's tenant.
        /// </summary>
        [HttpGet]
        [Authorize(Policy = "MobileApp.CanView")]
        public async Task<ActionResult<MobileReleasesListDto>> GetReleases()
        {
            var tenantSlug = ResolveAuthenticatedTenantSlug();
            if (string.IsNullOrEmpty(tenantSlug))
            {
                return Forbid();
            }

            var items = (await _buildService.GetReleasesForTenantAsync(tenantSlug)).ToList();
            return Ok(new MobileReleasesListDto
            {
                Items = items,
                TotalCount = items.Count
            });
        }

        /// <summary>
        /// Retrieves release details by ID, verifying tenant ownership.
        /// </summary>
        [HttpGet("{id:int}")]
        [Authorize(Policy = "MobileApp.CanView")]
        public async Task<ActionResult<MobileReleaseDto>> GetRelease(int id)
        {
            var tenantSlug = ResolveAuthenticatedTenantSlug();
            if (string.IsNullOrEmpty(tenantSlug))
            {
                return Forbid();
            }

            var release = await _buildService.GetReleaseByIdAsync(id, tenantSlug);
            if (release == null)
            {
                // Verify whether release belongs to another tenant to return 403 or 404 without leaking info
                var buildAnyTenant = await _buildService.GetBuildByIdAsync(id);
                if (buildAnyTenant != null && !string.Equals(buildAnyTenant.TenantId, tenantSlug, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Access denied: User from tenant '{UserTenant}' requested release {Id} belonging to '{ReleaseTenant}'",
                        tenantSlug, id, buildAnyTenant.TenantId);
                    return Forbid();
                }

                return NotFound(new { message = $"Release {id} not found." });
            }

            return Ok(release);
        }

        /// <summary>
        /// Authorizes and generates a short-lived, tamper-proof download URL for a release.
        /// Requires MobileApp.CanDownload permission and valid tenant ownership.
        /// </summary>
        [HttpPost("{id:int}/download")]
        [Authorize(Policy = "MobileApp.CanDownload")]
        public async Task<ActionResult<MobileDownloadResponseDto>> RequestDownload(int id)
        {
            var tenantSlug = ResolveAuthenticatedTenantSlug();
            if (string.IsNullOrEmpty(tenantSlug))
            {
                return Forbid();
            }

            int? userId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var downloadInfo = await _buildService.PrepareDownloadAsync(id, tenantSlug, userId, baseUrl);

            if (downloadInfo == null)
            {
                // Defense-in-depth: check if release exists under another tenant
                var buildAnyTenant = await _buildService.GetBuildByIdAsync(id);
                if (buildAnyTenant != null && !string.Equals(buildAnyTenant.TenantId, tenantSlug, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Security Violation: User from tenant '{UserTenant}' tried to download release {Id} of '{ReleaseTenant}'",
                        tenantSlug, id, buildAnyTenant.TenantId);
                    return Forbid();
                }

                return NotFound(new { message = "Release not found or not available for download." });
            }

            return Ok(downloadInfo);
        }

        /// <summary>
        /// Secure artifact download endpoint. Validates cryptographic token and streams the private APK.
        /// </summary>
        [HttpGet("download")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadArtifact([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { message = "Download token is required." });
            }

            var result = await _buildService.GetDownloadArtifactAsync(token);
            if (result == null || result.Value.Stream == null)
            {
                return Unauthorized(new { message = "Invalid or expired download token." });
            }

            return File(result.Value.Stream, result.Value.ContentType, result.Value.FileName, enableRangeProcessing: true);
        }
    }
}
