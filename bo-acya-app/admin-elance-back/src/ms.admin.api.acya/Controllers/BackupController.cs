using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class BackupController : ControllerBase
    {
        private readonly MasterDbContext _context;

        public BackupController(MasterDbContext context)
        {
            _context = context;
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
        public async Task<IActionResult> RequestRestore(long jobId)
        {
            var sourceJob = await _context.BackupJobs.FindAsync(jobId);
            if (sourceJob == null || sourceJob.Type != "Backup" || sourceJob.Status != "Completed")
            {
                return BadRequest("Invalid or incomplete backup source.");
            }

            var job = new BackupJob
            {
                TenantId = sourceJob.TenantId,
                Type = "Restore",
                Status = "Pending",
                FilePath = sourceJob.FilePath,
                CreatedAt = DateTime.UtcNow
            };

            await _context.BackupJobs.AddAsync(job);
            await _context.SaveChangesAsync();

            return Ok(job);
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
