using System;
using System.Collections.Generic;
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
    [Route("api/admin/mobile/releases")]
    public class AdminMobileReleasesController : BaseApiController
    {
        private readonly IMobileBuildService _buildService;
        private readonly ILogger<AdminMobileReleasesController> _logger;

        public AdminMobileReleasesController(
            IMobileBuildService buildService,
            ILogger<AdminMobileReleasesController> logger)
        {
            _buildService = buildService;
            _logger = logger;
        }

        /// <summary>
        /// Lists all mobile releases across all tenants or filtered by tenantId.
        /// </summary>
        [HttpGet]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<IEnumerable<MobileReleaseDto>>> GetAllReleases([FromQuery] string? tenantId)
        {
            var releases = await _buildService.GetAllReleasesAsync(tenantId);
            return Ok(releases);
        }

        /// <summary>
        /// Retrieves the current published release(s) across all tenants or for a specific tenant.
        /// </summary>
        [HttpGet("current")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<IEnumerable<MobileReleaseDto>>> GetCurrentReleases([FromQuery] string? tenantId)
        {
            if (!string.IsNullOrWhiteSpace(tenantId))
            {
                var single = await _buildService.GetCurrentReleaseForTenantAsync(tenantId);
                var list = single != null ? new List<MobileReleaseDto> { single } : new List<MobileReleaseDto>();
                return Ok(list);
            }

            var currentReleases = await _buildService.GetCurrentReleasesAsync();
            return Ok(currentReleases);
        }

        /// <summary>
        /// Retrieves release details by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<MobileReleaseDto>> GetRelease(int id)
        {
            var releases = await _buildService.GetAllReleasesAsync();
            foreach (var r in releases)
            {
                if (r.Id == id)
                {
                    return Ok(r);
                }
            }

            return NotFound(new { message = $"Release {id} not found." });
        }

        /// <summary>
        /// Lists authorized users for a specific tenant for mobile app distribution.
        /// </summary>
        [HttpGet("tenants/{tenantId}/users")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<IEnumerable<MobileTenantUserDto>>> GetTenantUsers(string tenantId)
        {
            if (string.IsNullOrWhiteSpace(tenantId))
            {
                return BadRequest(new { message = "TenantId is required." });
            }

            var users = await _buildService.GetTenantUsersAsync(tenantId);
            return Ok(users);
        }

        /// <summary>
        /// Sends mobile application download email invitation to an authorized tenant user.
        /// </summary>
        [HttpPost("send")]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<SendMobileAppResultDto>> SendMobileApp([FromBody] SendMobileAppDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.TenantId) || dto.UserId <= 0)
            {
                return BadRequest(new { message = "Valid TenantId and UserId are required." });
            }

            try
            {
                var initiatedBy = User.Identity?.Name ?? "SuperAdmin";
                var result = await _buildService.SendMobileAppToUserAsync(dto.TenantId, dto.UserId, dto.Email, initiatedBy);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching mobile app for tenant '{Tenant}' to user {UserId}", dto.TenantId, dto.UserId);
                return StatusCode(500, new { message = "An error occurred while sending the mobile application." });
            }
        }
    }
}

