using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.Attributes;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/mobile/builds")]
    public class AdminMobileBuildsController : BaseApiController
    {
        private readonly IMobileBuildService _buildService;
        private readonly IMobileTenantConfigService _configService;
        private readonly IGitHubBuildDispatcher _buildDispatcher;
        private readonly ILogger<AdminMobileBuildsController> _logger;

        public AdminMobileBuildsController(
            IMobileBuildService buildService,
            IMobileTenantConfigService configService,
            IGitHubBuildDispatcher buildDispatcher,
            ILogger<AdminMobileBuildsController> logger)
        {
            _buildService = buildService;
            _configService = configService;
            _buildDispatcher = buildDispatcher;
            _logger = logger;
        }

        /// <summary>
        /// Initiates a new mobile build record for a specific tenant and dispatches GitHub Actions workflow.
        /// </summary>
        [HttpPost]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<MobileBuildDto>> CreateBuild([FromBody] CreateMobileBuildDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var createdBy = User.FindFirst(ClaimTypes.Name)?.Value 
                         ?? User.FindFirst(ClaimTypes.Email)?.Value 
                         ?? "Admin";

            MobileBuildDto build;
            try
            {
                build = await _buildService.CreateBuildAsync(dto, createdBy);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            // Dispatch build to GitHub Actions runner
            try
            {
                var dispatched = await _buildDispatcher.DispatchBuildAsync(build, dto.Environment);
                if (!dispatched)
                {
                    _logger.LogWarning("GitHub Actions dispatch returned false for build {Id}. Marking build as Failed.", build.Id);
                    await _buildService.UpdateBuildStatusAsync(build.Id, new UpdateMobileBuildStatusDto
                    {
                        Status = MobileBuildStatus.Failed,
                        ErrorMessage = "Failed to dispatch build to GitHub Actions workflow."
                    });
                    build = (await _buildService.GetBuildByIdAsync(build.Id))!;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception dispatching build {Id} to GitHub Actions. Marking build as Failed.", build.Id);
                await _buildService.UpdateBuildStatusAsync(build.Id, new UpdateMobileBuildStatusDto
                {
                    Status = MobileBuildStatus.Failed,
                    ErrorMessage = $"GitHub dispatch failed: {ex.Message}"
                });
                build = (await _buildService.GetBuildByIdAsync(build.Id))!;
            }

            return CreatedAtAction(nameof(GetBuild), new { id = build.Id }, build);
        }

        /// <summary>
        /// Lists mobile builds across tenants with optional filtering.
        /// </summary>
        [HttpGet]
        [Authorize(Policy = "RequireAdminRole")]
        public async Task<ActionResult<IEnumerable<MobileBuildDto>>> GetBuilds(
            [FromQuery] string? tenantId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var builds = await _buildService.GetBuildsAsync(tenantId, status, page, pageSize);
            return Ok(builds);
        }

        /// <summary>
        /// Retrieves a specific build by ID.
        /// Accessible by Admins or CI worker.
        /// </summary>
        [HttpGet("{id:int}")]
        [AuthorizeAdminOrCiToken]
        public async Task<ActionResult<MobileBuildDto>> GetBuild(int id)
        {
            var build = await _buildService.GetBuildByIdAsync(id);
            if (build == null)
            {
                return NotFound(new { message = $"Build {id} not found." });
            }

            return Ok(build);
        }

        /// <summary>
        /// Generates dynamic mobile tenant configuration JSON for a build.
        /// Accessible by Admins or CI worker.
        /// </summary>
        [HttpGet("{id:int}/config")]
        [AuthorizeAdminOrCiToken]
        public async Task<ActionResult<MobileTenantConfigDto>> GetBuildConfig(int id)
        {
            var build = await _buildService.GetBuildByIdAsync(id);
            if (build == null)
            {
                return NotFound(new { message = $"Build {id} not found." });
            }

            var config = await _configService.GenerateConfigForTenantAsync(build.TenantId);
            if (config == null)
            {
                return NotFound(new { message = $"Tenant '{build.TenantId}' configuration could not be generated." });
            }

            return Ok(config);
        }

        /// <summary>
        /// Updates build status and artifact details. Used by CI/CD workers (GitHub Actions).
        /// Accessible by Admins or CI worker.
        /// </summary>
        [HttpPatch("{id:int}/status")]
        [AuthorizeAdminOrCiToken]
        public async Task<ActionResult<MobileBuildDto>> UpdateBuildStatus(int id, [FromBody] UpdateMobileBuildStatusDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _buildService.UpdateBuildStatusAsync(id, dto);
                if (updated == null)
                {
                    return NotFound(new { message = $"Build {id} not found." });
                }

                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Uploads the binary artifact (APK/AAB) for a mobile build directly to private storage.
        /// Accessible by Admins or CI worker.
        /// </summary>
        [HttpPost("{id:int}/artifact")]
        [AuthorizeAdminOrCiToken]
        public async Task<ActionResult<MobileBuildDto>> UploadArtifact(
            int id,
            IFormFile file,
            [FromHeader(Name = "X-Artifact-Sha256")] string? expectedSha256)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded or file is empty." });
            }

            try
            {
                using var stream = file.OpenReadStream();
                var updated = await _buildService.UploadArtifactAsync(id, file.FileName, stream, expectedSha256);
                if (updated == null)
                {
                    return NotFound(new { message = $"Build {id} not found." });
                }

                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
