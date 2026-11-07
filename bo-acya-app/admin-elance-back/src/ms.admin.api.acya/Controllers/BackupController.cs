using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class BackupController : ControllerBase
    {
        public const string LegacyRestoreRetiredMessage =
            "The legacy in-place schema restore mechanism has been retired for production safety. Individual tenant restoration must use the verified Restic snapshot recovery workflow.";

        private readonly MasterDbContext _context;
        private readonly ITenantRestoreManagementService? _restoreService;

        public BackupController(MasterDbContext context, ITenantRestoreManagementService? restoreService = null)
        {
            _context = context;
            _restoreService = restoreService;
        }

        [HttpGet("tenants/{tenantId:long}/history")]
        public async Task<IActionResult> GetTenantRestoreHistory(long tenantId, CancellationToken cancellationToken = default)
        {
            if (_restoreService == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "restore_service_unavailable", message = "Tenant restore management service is not configured." });
            }

            try
            {
                var history = await _restoreService.GetTenantRestoreHistoryAsync(tenantId, cancellationToken);
                return Ok(history);
            }
            catch (TenantRestoreException ex)
            {
                return MapRestoreException(ex);
            }
        }

        [HttpGet("tenants/{tenantId:long}/snapshots/{snapshotId}")]
        public async Task<IActionResult> GetTenantSnapshotEligibility(
            long tenantId,
            string snapshotId,
            CancellationToken cancellationToken = default)
        {
            if (_restoreService == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "restore_service_unavailable", message = "Tenant restore management service is not configured." });
            }

            try
            {
                var detail = await _restoreService.GetSnapshotEligibilityDetailAsync(tenantId, snapshotId, cancellationToken);
                return Ok(detail);
            }
            catch (TenantRestoreException ex)
            {
                return MapRestoreException(ex);
            }
        }

        [HttpPost("tenants/{tenantId:long}/restore")]
        public async Task<IActionResult> SubmitTenantRestore(
            long tenantId,
            [FromBody] SubmitTenantRestoreRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (_restoreService == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "restore_service_unavailable", message = "Tenant restore management service is not configured." });
            }

            var performedBy = User?.Identity?.Name
                ?? User?.FindFirst(ClaimTypes.Name)?.Value
                ?? User?.FindFirst("unique_name")?.Value
                ?? "SuperAdmin";

            try
            {
                var jobStatus = await _restoreService.SubmitRestoreRequestAsync(
                    tenantId,
                    request,
                    performedBy,
                    cancellationToken);

                return StatusCode(StatusCodes.Status202Accepted, jobStatus);
            }
            catch (TenantRestoreException ex)
            {
                return MapRestoreException(ex);
            }
        }

        [HttpGet("tenants/{tenantId:long}/restore-status")]
        public async Task<IActionResult> GetTenantRestoreStatus(long tenantId, CancellationToken cancellationToken = default)
        {
            if (_restoreService == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "restore_service_unavailable", message = "Tenant restore management service is not configured." });
            }

            try
            {
                var status = await _restoreService.GetTenantRestoreStatusAsync(tenantId, cancellationToken);
                return Ok(status);
            }
            catch (TenantRestoreException ex)
            {
                return MapRestoreException(ex);
            }
        }

        [HttpGet("restore-operations/{operationId}")]
        public async Task<IActionResult> GetRestoreOperationStatus(
            string operationId,
            CancellationToken cancellationToken = default)
        {
            if (_restoreService == null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "restore_service_unavailable", message = "Tenant restore management service is not configured." });
            }

            try
            {
                var opStatus = await _restoreService.GetRestoreOperationStatusAsync(operationId, cancellationToken);
                if (opStatus == null)
                {
                    return NotFound(new
                    {
                        status = StatusCodes.Status404NotFound,
                        code = "restore_operation_not_found",
                        message = $"Restore operation '{BrowserPayloadSanitizer.SanitizeText(operationId)}' was not found."
                    });
                }
                return Ok(opStatus);
            }
            catch (TenantRestoreException ex)
            {
                return MapRestoreException(ex);
            }
        }

        private IActionResult MapRestoreException(TenantRestoreException ex)
        {
            var statusCode = ex.Category switch
            {
                "tenant_not_found_in_registry" or "snapshot_not_found" or "tenant_entry_not_found_in_catalog"
                    => StatusCodes.Status404NotFound,
                "concurrent_restore_in_progress"
                    => StatusCodes.Status409Conflict,
                "restore_execution_disabled"
                    => StatusCodes.Status403Forbidden,
                "invalid_tenant_id"
                    or "invalid_snapshot_id"
                    or "invalid_operation_id"
                    or "invalid_restore_request"
                    or "forbidden_client_parameters"
                    or "confirmation_tenant_mismatch"
                    or "confirmation_snapshot_mismatch"
                    or "snapshot_id_ambiguous"
                    => StatusCodes.Status400BadRequest,
                "history_catalog_missing" or "host_restore_cli_unavailable"
                    => StatusCodes.Status503ServiceUnavailable,
                _ => StatusCodes.Status422UnprocessableEntity
            };

            return StatusCode(
                statusCode,
                new
                {
                    status = statusCode,
                    code = ex.Category,
                    stage = ex.Stage.ToString(),
                    message = BrowserPayloadSanitizer.SanitizeText(ex.Message)
                });
        }

        [HttpGet("jobs/{tenantId}")]
        public async Task<IActionResult> GetJobs(long tenantId)
        {
            var jobs = await _context.BackupJobs
                .Where(j => j.TenantId == tenantId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            return Ok(jobs);
        }

        [HttpPost("{tenantId}")]
        public async Task<IActionResult> RequestBackup(long tenantId)
        {
            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var backupsDir = "/app/backups";
            var filePath = Path.Combine(backupsDir, $"backup_{tenant.Slug}_{timestamp}.dump");

            var job = new BackupJob
            {
                TenantId = tenantId,
                Type = "Backup",
                Status = "Pending",
                FilePath = filePath,
                CreatedAt = DateTime.UtcNow
            };

            await _context.BackupJobs.AddAsync(job);
            await _context.SaveChangesAsync();

            return Ok(job);
        }

        [HttpPost("restore/{jobId}")]
        public Task<IActionResult> RequestRestore(long jobId)
        {
            _ = jobId;
            return Task.FromResult<IActionResult>(
                StatusCode(
                    StatusCodes.Status410Gone,
                    new
                    {
                        status = StatusCodes.Status410Gone,
                        code = "LEGACY_RESTORE_RETIRED",
                        message = LegacyRestoreRetiredMessage
                    }));
        }

        [HttpGet("download/{jobId}")]
        public IActionResult DownloadBackup(long jobId)
        {
            var job = _context.BackupJobs.Find(jobId);
            if (job == null || job.Type != "Backup" || job.Status != "Completed")
            {
                return NotFound("Backup job not found or not completed.");
            }

            if (!System.IO.File.Exists(job.FilePath))
            {
                return NotFound("Backup file is missing on disk.");
            }

            var bytes = System.IO.File.ReadAllBytes(job.FilePath);
            return File(bytes, "application/octet-stream", Path.GetFileName(job.FilePath));
        }
    }
}
