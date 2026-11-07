using System;
using System.Text.Json.Serialization;

namespace ms.admin.api.acya.core.DTOs
{
    public sealed class UpdateDailyScheduleDto
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = string.Empty;
    }

    public sealed class SchedulerScheduleInfoDto
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = "02:00";

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = "UTC";

        [JsonPropertyName("utcTime")]
        public string UtcTime { get; set; } = "02:00";

        [JsonPropertyName("onCalendar")]
        public string OnCalendar { get; set; } = "*-*-* 02:00:00 UTC";

        [JsonPropertyName("summary")]
        public string Summary { get; set; } = "Daily at 02:00 UTC (02:00 UTC)";
    }

    public sealed class SchedulerNextRunInfoDto
    {
        [JsonPropertyName("utc")]
        public string? Utc { get; set; }

        [JsonPropertyName("local")]
        public string? Local { get; set; }

        [JsonPropertyName("systemdNextElapseUtc")]
        public string? SystemdNextElapseUtc { get; set; }
    }

    public sealed class SchedulerLastRunInfoDto
    {
        [JsonPropertyName("timestamp")]
        public string? Timestamp { get; set; }

        [JsonPropertyName("outcome")]
        public string Outcome { get; set; } = "none";

        [JsonPropertyName("exitCode")]
        public int? ExitCode { get; set; }

        [JsonPropertyName("durationSeconds")]
        public double? DurationSeconds { get; set; }

        [JsonPropertyName("trigger")]
        public string? Trigger { get; set; }

        [JsonPropertyName("snapshotId")]
        public string? SnapshotId { get; set; }

        [JsonPropertyName("errorMessage")]
        public string? ErrorMessage { get; set; }
    }

    public sealed class SchedulerSafetyInfoDto
    {
        [JsonPropertyName("repositoryWritesAuthorized")]
        public bool RepositoryWritesAuthorized { get; set; }

        [JsonPropertyName("backupExecutionPermitted")]
        public bool BackupExecutionPermitted { get; set; }

        [JsonPropertyName("safetyNotice")]
        public string? SafetyNotice { get; set; }
    }

    public sealed class SchedulerCommunicationInfoDto
    {
        [JsonPropertyName("transport")]
        public string Transport { get; set; } = "host_cli";

        [JsonPropertyName("productionHost")]
        public string ProductionHost { get; set; } = "51.210.10.108";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "connected";

        [JsonPropertyName("errorMessage")]
        public string? ErrorMessage { get; set; }
    }

    public sealed class SchedulerStatusDto
    {
        [JsonPropertyName("schema")]
        public string Schema { get; set; } = "acya.backup.scheduler/v1";

        [JsonPropertyName("timerUnit")]
        public string TimerUnit { get; set; } = "acya-backup-runner.timer";

        [JsonPropertyName("serviceUnit")]
        public string ServiceUnit { get; set; } = "acya-backup-runner.service";

        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; }

        [JsonPropertyName("active")]
        public bool Active { get; set; }

        [JsonPropertyName("serviceActive")]
        public bool ServiceActive { get; set; }

        [JsonPropertyName("state")]
        public string State { get; set; } = "disabled";

        [JsonPropertyName("schedule")]
        public SchedulerScheduleInfoDto Schedule { get; set; } = new();

        [JsonPropertyName("nextRun")]
        public SchedulerNextRunInfoDto NextRun { get; set; } = new();

        [JsonPropertyName("lastRun")]
        public SchedulerLastRunInfoDto LastRun { get; set; } = new();

        [JsonPropertyName("safety")]
        public SchedulerSafetyInfoDto Safety { get; set; } = new();

        [JsonPropertyName("communication")]
        public SchedulerCommunicationInfoDto Communication { get; set; } = new();
    }
}

