using System;
using System.Text.Json.Serialization;

namespace ms.admin.api.acya.core.DTOs
{
    public class BackupScheduleConfigDto
    {
        public bool Enabled { get; set; } = false;
        public string Frequency { get; set; } = "daily";
        public string Time { get; set; } = "02:00";
        public string Timezone { get; set; } = "Africa/Tunis";
    }

    public class UpdateBackupSettingsDto
    {
        public bool Enabled { get; set; }
        public string Frequency { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Timezone { get; set; } = string.Empty;
    }

    public class BackupScheduleStatusDto
    {
        public bool TimerActive { get; set; } = false;
        public bool TimerLoaded { get; set; } = true;
        public DateTime? NextRunTimeUtc { get; set; }
        public string? NextRunTimeLocal { get; set; }
        public DateTime? LastRunTimeUtc { get; set; }
        public string LastRunStatus { get; set; } = "statusUnavailable";
        public string? LastSnapshotId { get; set; }
        public string RepositoryStatus { get; set; } = "statusUnavailable";
        public int? TotalSnapshots { get; set; }
    }

    public class BackupSettingsResponseDto
    {
        public BackupScheduleConfigDto Config { get; set; } = new();
        public BackupScheduleStatusDto Status { get; set; } = new();
        public string ScheduleSummary { get; set; } = string.Empty;
        public string UtcEquivalentTime { get; set; } = string.Empty;
        public string SystemdOnCalendar { get; set; } = string.Empty;
        public string SyncStatus { get; set; } = "deferred_phase16b";
        public string SyncMessage { get; set; } = string.Empty;
        public string ProductionHostTopology { get; set; } = "Production: 51.210.10.108 Strasbourg (SBG), France | Backup VPS: 51.254.216.8 Gravelines (GRA), France";
    }
}
