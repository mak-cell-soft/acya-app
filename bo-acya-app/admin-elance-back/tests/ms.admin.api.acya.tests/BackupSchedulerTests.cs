using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class BackupSchedulerTests
    {
        private sealed class MockProductionSchedulerBridge : IProductionSchedulerBridge
        {
            public string TransportName => "mock_bridge";
            public string ProductionHost => "51.210.10.108";

            public bool Enabled { get; set; } = false;
            public bool Active { get; set; } = false;
            public string Time { get; set; } = "02:00";
            public string Timezone { get; set; } = "UTC";
            public bool RepositoryWritesAuthorized { get; set; } = false;
            public bool ShouldThrow { get; set; } = false;
            public string LastCommand { get; private set; } = string.Empty;
            public string[] LastArgs { get; private set; } = Array.Empty<string>();

            public Task<string> ExecuteCommandAsync(
                string subcommand,
                string[] args,
                CancellationToken cancellationToken = default)
            {
                LastCommand = subcommand;
                LastArgs = args;

                if (ShouldThrow)
                {
                    throw new SchedulerManagementException("connection_failed", "Mock communication failure", 503);
                }

                if (subcommand == "enable")
                {
                    Enabled = true;
                    Active = true;
                }
                else if (subcommand == "disable")
                {
                    Enabled = false;
                    Active = false;
                }
                else if (subcommand == "set-schedule")
                {
                    for (int i = 0; i < args.Length; i++)
                    {
                        if (args[i] == "--time" && i + 1 < args.Length) Time = args[i + 1];
                        if (args[i] == "--timezone" && i + 1 < args.Length) Timezone = args[i + 1];
                    }
                }

                var status = new SchedulerStatusDto
                {
                    TimerUnit = "acya-backup-runner.timer",
                    ServiceUnit = "acya-backup-runner.service",
                    Enabled = Enabled,
                    Active = Active,
                    ServiceActive = false,
                    State = Active ? "active" : (Enabled ? "enabled" : "disabled"),
                    Schedule = new SchedulerScheduleInfoDto
                    {
                        Time = Time,
                        Timezone = Timezone,
                        UtcTime = Time,
                        OnCalendar = $"*-*-* {Time}:00 UTC",
                        Summary = $"Daily at {Time} {Timezone}"
                    },
                    NextRun = new SchedulerNextRunInfoDto
                    {
                        Utc = Enabled ? "2026-11-08T02:00:00Z" : null,
                        Local = Enabled ? $"2026-11-08 {Time} ({Timezone})" : null
                    },
                    LastRun = new SchedulerLastRunInfoDto
                    {
                        Timestamp = "2026-11-06T10:11:48Z",
                        Outcome = "success",
                        ExitCode = 0,
                        DurationSeconds = 37.924,
                        Trigger = "phase-11c1-first-production-backup"
                    },
                    Safety = new SchedulerSafetyInfoDto
                    {
                        RepositoryWritesAuthorized = RepositoryWritesAuthorized,
                        BackupExecutionPermitted = RepositoryWritesAuthorized,
                        SafetyNotice = RepositoryWritesAuthorized ? null : "Repository writes blocked."
                    },
                    Communication = new SchedulerCommunicationInfoDto
                    {
                        Transport = TransportName,
                        ProductionHost = ProductionHost,
                        Status = "connected"
                    }
                };

                return Task.FromResult(JsonSerializer.Serialize(status));
            }
        }

        private static (BackupSchedulerController Controller, MasterDbContext Db, MockProductionSchedulerBridge Bridge, BackupSchedulerManagementService Service) CreateHarness()
        {
            var dbName = $"scheduler_test_{Guid.NewGuid():N}";
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;

            var db = new MasterDbContext(options);
            var bridge = new MockProductionSchedulerBridge();
            var service = new BackupSchedulerManagementService(db, bridge, NullLogger<BackupSchedulerManagementService>.Instance);
            var controller = new BackupSchedulerController(service)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim(ClaimTypes.Name, "superadmin_test"),
                            new Claim(ClaimTypes.Role, "SUPER_ADMIN")
                        }, "TestAuth"))
                    }
                }
            };

            return (controller, db, bridge, service);
        }

        [Fact]
        public void BackupSchedulerController_HasAuthorizeAttribute_RequiringSuperAdmin()
        {
            var authAttr = typeof(BackupSchedulerController).GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authAttr);
            Assert.Contains("SUPER_ADMIN", authAttr.Roles);
        }

        [Fact]
        public async Task GetSchedulerStatus_ReturnsActualStatusFromBridge()
        {
            var (controller, _, bridge, _) = CreateHarness();
            bridge.Enabled = false;
            bridge.Active = false;

            var result = await controller.GetSchedulerStatus();
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<SchedulerStatusDto>(okResult.Value);

            Assert.Equal("acya-backup-runner.timer", dto.TimerUnit);
            Assert.False(dto.Enabled);
            Assert.False(dto.Active);
            Assert.Equal("disabled", dto.State);
            Assert.False(dto.Safety.RepositoryWritesAuthorized);
            Assert.Equal("mock_bridge", dto.Communication.Transport);
        }

        [Fact]
        public async Task UpdateDailySchedule_ValidParameters_UpdatesScheduleAndAuditLog()
        {
            var (controller, db, bridge, _) = CreateHarness();

            var updateDto = new UpdateDailyScheduleDto
            {
                Time = "03:45",
                Timezone = "Africa/Tunis"
            };

            var result = await controller.UpdateSchedule(updateDto);
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<SchedulerStatusDto>(okResult.Value);

            Assert.Equal("03:45", dto.Schedule.Time);
            Assert.Equal("Africa/Tunis", dto.Schedule.Timezone);
            Assert.Equal("set-schedule", bridge.LastCommand);

            // Verify platform settings updated in DB
            var timeSetting = await db.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_ScheduleTime");
            Assert.NotNull(timeSetting);
            Assert.Equal("03:45", timeSetting.Value);

            // Verify audit log recorded
            var auditLog = await db.MasterAuditLogs.FirstOrDefaultAsync(a => a.Action == "BACKUP_SCHEDULER_UPDATE");
            Assert.NotNull(auditLog);
            Assert.Equal("superadmin_test", auditLog.PerformedBy);
            Assert.Contains("03:45", auditLog.Details);
        }

        [Theory]
        [InlineData("24:00", "UTC")]
        [InlineData("25:99", "Africa/Tunis")]
        [InlineData("abc", "UTC")]
        [InlineData("12:60", "UTC")]
        [InlineData("02:00", "Invalid/Timezone_Name")]
        public async Task UpdateDailySchedule_InvalidTimeOrTimezone_ReturnsError(string time, string tz)
        {
            var (controller, _, _, _) = CreateHarness();

            var updateDto = new UpdateDailyScheduleDto
            {
                Time = time,
                Timezone = tz
            };

            var result = await controller.UpdateSchedule(updateDto);
            var statusResult = Assert.IsAssignableFrom<ObjectResult>(result);
            Assert.True(statusResult.StatusCode >= 400);
        }

        [Fact]
        public async Task EnableScheduler_CallsBridgeAndPersistsEnabled()
        {
            var (controller, db, bridge, _) = CreateHarness();
            bridge.Enabled = false;

            var result = await controller.EnableScheduler();
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<SchedulerStatusDto>(okResult.Value);

            Assert.True(dto.Enabled);
            Assert.Equal("enable", bridge.LastCommand);

            var setting = await db.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_AutoEnabled");
            Assert.NotNull(setting);
            Assert.Equal("true", setting.Value);

            var audit = await db.MasterAuditLogs.FirstOrDefaultAsync(a => a.Action == "BACKUP_SCHEDULER_ENABLE");
            Assert.NotNull(audit);
            Assert.Equal("superadmin_test", audit.PerformedBy);
        }

        [Fact]
        public async Task DisableScheduler_CallsBridgeAndPersistsDisabled()
        {
            var (controller, db, bridge, _) = CreateHarness();
            bridge.Enabled = true;

            var result = await controller.DisableScheduler();
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<SchedulerStatusDto>(okResult.Value);

            Assert.False(dto.Enabled);
            Assert.Equal("disable", bridge.LastCommand);

            var setting = await db.PlatformSettings.FirstOrDefaultAsync(s => s.Key == "Backup_AutoEnabled");
            Assert.NotNull(setting);
            Assert.Equal("false", setting.Value);

            var audit = await db.MasterAuditLogs.FirstOrDefaultAsync(a => a.Action == "BACKUP_SCHEDULER_DISABLE");
            Assert.NotNull(audit);
            Assert.Equal("superadmin_test", audit.PerformedBy);
        }

        [Fact]
        public async Task BridgeFailure_ReturnsGracefulCommunicationErrorStatus()
        {
            var (controller, _, bridge, _) = CreateHarness();
            bridge.ShouldThrow = true;

            var result = await controller.GetSchedulerStatus();
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<SchedulerStatusDto>(okResult.Value);

            Assert.Equal("communication_error", dto.State);
            Assert.Equal("error", dto.Communication.Status);
            Assert.Contains("Mock communication failure", dto.Communication.ErrorMessage);
        }
    }
}

