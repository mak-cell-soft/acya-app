using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.common;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class BackupSettingsTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        [Fact]
        public void Validate_ValidDailyConfiguration_Succeeds()
        {
            var (isValid, error, tz) = BackupScheduleCalculator.Validate(true, "daily", "02:00", "Africa/Tunis");

            Assert.True(isValid);
            Assert.Null(error);
            Assert.NotNull(tz);
            Assert.Equal("Africa/Tunis", tz.Id);
        }

        [Theory]
        [InlineData("25:00")]
        [InlineData("2:00")]
        [InlineData("02:60")]
        [InlineData("12:0")]
        [InlineData("abc")]
        [InlineData("")]
        [InlineData("   ")]
        public void Validate_InvalidTime_ReturnsValidationError(string invalidTime)
        {
            var (isValid, error, tz) = BackupScheduleCalculator.Validate(true, "daily", invalidTime, "Africa/Tunis");

            Assert.False(isValid);
            Assert.Contains("24-hour HH:mm format", error);
            Assert.Null(tz);
        }

        [Theory]
        [InlineData("Invalid/TimeZone")]
        [InlineData("Mars/Phobos")]
        [InlineData("Tunisia/Tunis")]
        public void Validate_InvalidTimezone_ReturnsValidationError(string invalidTz)
        {
            var (isValid, error, tz) = BackupScheduleCalculator.Validate(true, "daily", "02:00", invalidTz);

            Assert.False(isValid);
            Assert.Contains("not a recognized IANA", error);
            Assert.Null(tz);
        }

        [Theory]
        [InlineData("weekly")]
        [InlineData("monthly")]
        [InlineData("hourly")]
        [InlineData("")]
        public void Validate_InvalidFrequency_ReturnsValidationError(string invalidFreq)
        {
            var (isValid, error, tz) = BackupScheduleCalculator.Validate(true, invalidFreq, "02:00", "Africa/Tunis");

            Assert.False(isValid);
            Assert.Contains("only 'daily'", error);
            Assert.Null(tz);
        }

        [Fact]
        public void Calculate_AfricaTunis_0200_ConvertsTo_0100Utc()
        {
            // Africa/Tunis is UTC+1 year-round.
            // 02:00 local time = 01:00 UTC.
            var result = BackupScheduleCalculator.Calculate("02:00", "Africa/Tunis");

            Assert.Equal("02:00", result.Time);
            Assert.Equal("Africa/Tunis", result.Timezone);
            Assert.Equal("01:00", result.UtcEquivalentTime);
            Assert.Equal("*-*-* 01:00:00 UTC", result.SystemdOnCalendar);
            Assert.Equal("Daily at 02:00 Africa/Tunis (01:00 UTC)", result.ScheduleSummary);
        }

        [Fact]
        public async Task Service_GetSettings_ReturnsSafeDefaultsWhenUnset()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new BackupSettingsService(context, NullLogger<BackupSettingsService>.Instance, config);

            var result = await service.GetSettingsAsync();

            Assert.NotNull(result);
            Assert.False(result.Config.Enabled);
            Assert.Equal("daily", result.Config.Frequency);
            Assert.Equal("02:00", result.Config.Time);
            Assert.Equal("Africa/Tunis", result.Config.Timezone);
            Assert.Equal("01:00", result.UtcEquivalentTime);
            Assert.Equal("*-*-* 01:00:00 UTC", result.SystemdOnCalendar);
            Assert.False(result.Status.TimerActive);
            Assert.Equal("statusUnavailable", result.Status.LastRunStatus);
            Assert.Equal("statusUnavailable", result.Status.RepositoryStatus);
            Assert.Equal("deferred_phase16b", result.SyncStatus);
        }

        [Fact]
        public async Task Service_UpdateSettings_PersistsToPlatformSettingsAndAudits()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new BackupSettingsService(context, NullLogger<BackupSettingsService>.Instance, config);

            var updateDto = new UpdateBackupSettingsDto
            {
                Enabled = true,
                Frequency = "daily",
                Time = "02:00",
                Timezone = "Africa/Tunis"
            };

            var (success, error, response) = await service.UpdateSettingsAsync(updateDto, "admin@acya.site", "127.0.0.1");

            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(response);
            Assert.True(response.Config.Enabled);
            Assert.Equal("01:00", response.UtcEquivalentTime);
            Assert.Equal("*-*-* 01:00:00 UTC", response.SystemdOnCalendar);
            Assert.Equal("deferred_phase16b", response.SyncStatus);

            // Verify persistence in platform settings table
            var autoEnabledSetting = await context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_AutoEnabled");
            Assert.NotNull(autoEnabledSetting);
            Assert.Equal("true", autoEnabledSetting.Value);

            var timeSetting = await context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_ScheduleTime");
            Assert.NotNull(timeSetting);
            Assert.Equal("02:00", timeSetting.Value);

            var tzSetting = await context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_Timezone");
            Assert.NotNull(tzSetting);
            Assert.Equal("Africa/Tunis", tzSetting.Value);

            // Verify MasterAuditLog record
            var audit = await context.MasterAuditLogs.FirstOrDefaultAsync(a => a.Action == "UPDATE_BACKUP_SETTINGS");
            Assert.NotNull(audit);
            Assert.Null(audit.TenantId); // Global platform audit
            Assert.Equal("admin@acya.site", audit.PerformedBy);
            Assert.Contains("02:00", audit.Details);
            Assert.Contains("Africa/Tunis", audit.Details);
            Assert.Contains("01:00", audit.Details);
        }

        [Fact]
        public void Controller_RequiresSuperAdminAuthorization()
        {
            var controllerType = typeof(BackupSettingsController);
            var authorizeAttr = controllerType.GetCustomAttribute<AuthorizeAttribute>();

            Assert.NotNull(authorizeAttr);
            Assert.Contains("SUPER_ADMIN", authorizeAttr.Roles);
        }

        [Fact]
        public async Task Security_ExcludesSecretsFromDtoAndAudit()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new BackupSettingsService(context, NullLogger<BackupSettingsService>.Instance, config);

            var updateDto = new UpdateBackupSettingsDto
            {
                Enabled = true,
                Frequency = "daily",
                Time = "02:00",
                Timezone = "Africa/Tunis"
            };

            var (_, _, response) = await service.UpdateSettingsAsync(updateDto, "admin@acya.site", "127.0.0.1");
            var audit = await context.MasterAuditLogs.FirstAsync();

            var serializedResponse = System.Text.Json.JsonSerializer.Serialize(response);

            // Invariant: No passwords, keys, or credentials
            Assert.DoesNotContain("password", serializedResponse, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("secret", serializedResponse, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("restic_password", serializedResponse, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("BEGIN OPENSSH PRIVATE KEY", serializedResponse, StringComparison.OrdinalIgnoreCase);

            Assert.DoesNotContain("password", audit.Details!, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("secret", audit.Details!, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Architecture_Topology_ContainsCorrectLabels()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new BackupSettingsService(context, NullLogger<BackupSettingsService>.Instance, config);

            var settings = await service.GetSettingsAsync();

            Assert.Contains("Production: 51.210.10.108 Strasbourg (SBG), France", settings.ProductionHostTopology);
            Assert.Contains("Backup VPS: 51.254.216.8 Gravelines (GRA), France", settings.ProductionHostTopology);
        }
    }
}
