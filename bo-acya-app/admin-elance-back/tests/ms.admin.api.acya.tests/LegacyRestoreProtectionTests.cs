using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class LegacyRestoreProtectionTests
    {
        private static MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        private static BackupService CreateBackupService(MasterDbContext context)
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:MasterConnection"] = "Host=127.0.0.1;Port=1;Database=unreachable_test_db;Username=nobody;Password=none"
                })
                .Build();

            return new BackupService(context, config, NullLogger<BackupService>.Instance);
        }

        [Fact]
        public async Task RequestRestore_WithCompletedBackupJob_Returns410GoneAndDoesNotModifyDatabase()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = new MasterEnterprise
            {
                Id = 32,
                Name = "SOCOFEB",
                Slug = "socofeb",
                SchemaName = "tenant_socofeb",
                IsActive = true
            };
            var existingBackupJob = new BackupJob
            {
                Id = 101,
                TenantId = 32,
                Type = "Backup",
                Status = "Completed",
                FilePath = "/app/backups/backup_socofeb_20260401000000.dump",
                CreatedAt = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                CompletedAt = new DateTime(2026, 4, 1, 0, 1, 0, DateTimeKind.Utc)
            };

            await context.Enterprises.AddAsync(tenant);
            await context.BackupJobs.AddAsync(existingBackupJob);
            await context.SaveChangesAsync();

            var controller = new BackupController(context);

            var actionResult = await controller.RequestRestore(existingBackupJob.Id);

            var objectResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status410Gone, objectResult.StatusCode);

            var payloadJson = JsonSerializer.Serialize(objectResult.Value);
            Assert.Contains("410", payloadJson);
            Assert.Contains("LEGACY_RESTORE_RETIRED", payloadJson);
            Assert.Contains("retired", payloadJson, StringComparison.OrdinalIgnoreCase);

            // Prove no Restore job was queued and existing Backup history record is untouched
            var allJobs = await context.BackupJobs.AsNoTracking().ToListAsync();
            Assert.Single(allJobs);
            Assert.Equal(101, allJobs[0].Id);
            Assert.Equal("Backup", allJobs[0].Type);
            Assert.Equal("Completed", allJobs[0].Status);
            Assert.Equal("/app/backups/backup_socofeb_20260401000000.dump", allJobs[0].FilePath);
            Assert.DoesNotContain(allJobs, j => j.Type == "Restore");
        }

        [Fact]
        public async Task RequestRestore_WithNonExistentJobId_StillReturns410GoneWithoutDatabaseWrite()
        {
            using var context = CreateInMemoryDbContext();
            var controller = new BackupController(context);

            var actionResult = await controller.RequestRestore(999999);

            var objectResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status410Gone, objectResult.StatusCode);
            Assert.Empty(await context.BackupJobs.ToListAsync());
        }

        [Fact]
        public async Task GetJobs_And_RequestBackup_RemainIntactAfterRestoreRetirement()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = new MasterEnterprise
            {
                Id = 20,
                Name = "Ste. Romdhani",
                Slug = "ste-romdhani",
                SchemaName = "tenant_ste_romdhani",
                IsActive = true
            };
            var historicalBackup = new BackupJob
            {
                Id = 50,
                TenantId = 20,
                Type = "Backup",
                Status = "Completed",
                FilePath = "/app/backups/backup_ste-romdhani_20260315120000.dump",
                CreatedAt = new DateTime(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc),
                CompletedAt = new DateTime(2026, 3, 15, 12, 0, 30, DateTimeKind.Utc)
            };

            await context.Enterprises.AddAsync(tenant);
            await context.BackupJobs.AddAsync(historicalBackup);
            await context.SaveChangesAsync();

            var controller = new BackupController(context);

            // 1. Existing backup history records remain intact via GetJobs
            var getJobsResult = Assert.IsType<OkObjectResult>(await controller.GetJobs(20));
            var jobsList = Assert.IsAssignableFrom<IEnumerable<BackupJob>>(getJobsResult.Value).ToList();
            Assert.Single(jobsList);
            Assert.Equal(50, jobsList[0].Id);
            Assert.Equal("Completed", jobsList[0].Status);

            // 2. Manual backup endpoint remains unmodified
            var requestBackupResult = Assert.IsType<OkObjectResult>(await controller.RequestBackup(20));
            var createdBackupJob = Assert.IsType<BackupJob>(requestBackupResult.Value);
            Assert.Equal("Backup", createdBackupJob.Type);
            Assert.Equal("Pending", createdBackupJob.Status);
            Assert.Equal(2, await context.BackupJobs.CountAsync());
        }

        [Fact]
        public async Task RestoreTenantSchemaAsync_ThrowsNotSupportedExceptionAndCannotExecuteDropSchema()
        {
            using var context = CreateInMemoryDbContext();
            var service = CreateBackupService(context);

            var exception = await Assert.ThrowsAsync<NotSupportedException>(
                () => service.RestoreTenantSchemaAsync("tenant_socofeb", "/app/backups/backup_socofeb.dump"));

            Assert.Contains("retired", exception.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Scheduler_ProcessBackupJobsAsync_RejectsPendingRestoreJobAndPreservesHistory()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = new MasterEnterprise
            {
                Id = 32,
                Name = "SOCOFEB",
                Slug = "socofeb",
                SchemaName = "tenant_socofeb",
                IsActive = true
            };
            var completedBackupJob = new BackupJob
            {
                Id = 1,
                TenantId = 32,
                Tenant = tenant,
                Type = "Backup",
                Status = "Completed",
                FilePath = "/app/backups/backup_socofeb_20260401000000.dump",
                CreatedAt = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                CompletedAt = new DateTime(2026, 4, 1, 0, 1, 0, DateTimeKind.Utc)
            };
            var stalePendingRestoreJob = new BackupJob
            {
                Id = 2,
                TenantId = 32,
                Tenant = tenant,
                Type = "Restore",
                Status = "Pending",
                FilePath = "/app/backups/backup_socofeb_20260401000000.dump",
                CreatedAt = new DateTime(2026, 4, 2, 0, 0, 0, DateTimeKind.Utc)
            };

            await context.Enterprises.AddAsync(tenant);
            await context.BackupJobs.AddRangeAsync(completedBackupJob, stalePendingRestoreJob);
            await context.SaveChangesAsync();

            var serviceProvider = new ServiceCollection().BuildServiceProvider();
            var scheduler = new SaaSLifecycleScheduler(serviceProvider, NullLogger<SaaSLifecycleScheduler>.Instance);
            var backupService = CreateBackupService(context);

            await scheduler.ProcessBackupJobsAsync(context, backupService, CancellationToken.None);

            // Historical completed backup record must remain untouched
            var preservedBackup = await context.BackupJobs.FirstAsync(j => j.Id == 1);
            Assert.Equal("Completed", preservedBackup.Status);
            Assert.Null(preservedBackup.ErrorMessage);

            // Pending Restore job must be immediately failed without touching the database schema
            var rejectedRestore = await context.BackupJobs.FirstAsync(j => j.Id == 2);
            Assert.Equal("Failed", rejectedRestore.Status);
            Assert.NotNull(rejectedRestore.CompletedAt);
            Assert.Contains("retired", rejectedRestore.ErrorMessage, StringComparison.OrdinalIgnoreCase);

            // Audit log records the blocked restore attempt
            var audit = await context.MasterAuditLogs.SingleAsync();
            Assert.Equal(32, audit.TenantId);
            Assert.Equal("Schema Restore Rejected (Retired)", audit.Action);
            Assert.Contains("retired", audit.Details, StringComparison.OrdinalIgnoreCase);
        }
    }
}
