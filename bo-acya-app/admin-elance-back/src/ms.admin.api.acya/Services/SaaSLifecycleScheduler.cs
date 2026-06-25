using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public class SaaSLifecycleScheduler : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SaaSLifecycleScheduler> _logger;

        public SaaSLifecycleScheduler(IServiceProvider serviceProvider, ILogger<SaaSLifecycleScheduler> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SaaS Lifecycle Scheduler Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dbContext = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
                        var backupService = scope.ServiceProvider.GetRequiredService<BackupService>();

                        await ProcessTrialExpirationsAsync(dbContext, stoppingToken);
                        await ProcessBackupJobsAsync(dbContext, backupService, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred in SaaS Lifecycle Scheduler loop.");
                }

                // Run check every 10 seconds for highly responsive demo/testing
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }

            _logger.LogInformation("SaaS Lifecycle Scheduler Background Service is stopping.");
        }

        private async Task ProcessTrialExpirationsAsync(MasterDbContext dbContext, CancellationToken stoppingToken)
        {
            var threshold = DateTime.UtcNow.AddDays(-30);
            
            // Fetch active trials that were activated more than 30 days ago
            var expiredTrials = await dbContext.Enterprises
                .Where(e => e.IsActive && e.Plan == TenantPlan.Trial && e.ActivatedAt != null && e.ActivatedAt.Value < threshold)
                .ToListAsync(stoppingToken);

            foreach (var tenant in expiredTrials)
            {
                _logger.LogWarning("Tenant '{Name}' (Slug: {Slug}) trial has expired. Suspending access.", tenant.Name, tenant.Slug);
                
                tenant.IsActive = false;
                tenant.Status = TenantStatus.Expired;

                var audit = new MasterAuditLog
                {
                    TenantId = tenant.Id,
                    Action = "Trial Expired",
                    Details = $"Trial subscription expired automatically. Tenant status set to Expired and deactivated.",
                    PerformedBy = "System Scheduler",
                    Timestamp = DateTime.UtcNow
                };

                await dbContext.MasterAuditLogs.AddAsync(audit, stoppingToken);
            }

            if (expiredTrials.Any())
            {
                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }

        private async Task ProcessBackupJobsAsync(MasterDbContext dbContext, BackupService backupService, CancellationToken stoppingToken)
        {
            var pendingJobs = await dbContext.BackupJobs
                .Include(j => j.Tenant)
                .Where(j => j.Status == "Pending")
                .OrderBy(j => j.CreatedAt)
                .ToListAsync(stoppingToken);

            foreach (var job in pendingJobs)
            {
                if (job.Tenant == null)
                {
                    job.Status = "Failed";
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = "Tenant associated with this backup job is missing.";
                    continue;
                }

                _logger.LogInformation("Processing backup/restore job {Id} ({Type}) for tenant {Tenant}", job.Id, job.Type, job.Tenant.Name);
                
                job.Status = "Running";
                await dbContext.SaveChangesAsync(stoppingToken);

                try
                {
                    if (job.Type == "Backup")
                    {
                        await backupService.BackupTenantSchemaAsync(job.Tenant.SchemaName, job.FilePath);
                    }
                    else if (job.Type == "Restore")
                    {
                        await backupService.RestoreTenantSchemaAsync(job.Tenant.SchemaName, job.FilePath);
                    }

                    job.Status = "Completed";
                    job.CompletedAt = DateTime.UtcNow;

                    var audit = new MasterAuditLog
                    {
                        TenantId = job.TenantId,
                        Action = job.Type == "Backup" ? "Schema Backup Executed" : "Schema Restore Executed",
                        Details = $"Job {job.Id} completed successfully. File path: {job.FilePath}",
                        PerformedBy = "System Scheduler",
                        Timestamp = DateTime.UtcNow
                    };
                    await dbContext.MasterAuditLogs.AddAsync(audit, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Job {Id} failed.", job.Id);
                    job.Status = "Failed";
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = ex.Message;

                    var audit = new MasterAuditLog
                    {
                        TenantId = job.TenantId,
                        Action = job.Type == "Backup" ? "Schema Backup Failed" : "Schema Restore Failed",
                        Details = $"Job {job.Id} failed. Error: {ex.Message}",
                        PerformedBy = "System Scheduler",
                        Timestamp = DateTime.UtcNow
                    };
                    await dbContext.MasterAuditLogs.AddAsync(audit, stoppingToken);
                }

                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }
    }
}
