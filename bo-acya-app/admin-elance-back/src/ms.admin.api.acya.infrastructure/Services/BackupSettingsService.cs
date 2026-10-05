using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace ms.admin.api.acya.infrastructure.Services
{
    public class BackupSettingsService : IBackupSettingsService
    {
        private readonly MasterDbContext _context;
        private readonly ILogger<BackupSettingsService> _logger;
        private readonly IConfiguration _configuration;

        private const string KeyAutoEnabled = "Backup_AutoEnabled";
        private const string KeyFrequency = "Backup_Frequency";
        private const string KeyScheduleTime = "Backup_ScheduleTime";
        private const string KeyTimezone = "Backup_Timezone";
        private const string KeyLastSyncStatus = "Backup_LastSyncStatus";
        private const string KeyLastSyncError = "Backup_LastSyncError";

        private const string DefaultFrequency = "daily";
        private const string DefaultTime = "02:00";
        private const string DefaultTimezone = "Africa/Tunis";

        public BackupSettingsService(
            MasterDbContext context,
            ILogger<BackupSettingsService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<BackupSettingsResponseDto> GetSettingsAsync()
        {
            var settings = await _context.PlatformSettings
                .Where(s => s.Key.StartsWith("Backup_"))
                .ToDictionaryAsync(s => s.Key, s => s.Value);

            bool enabled = settings.TryGetValue(KeyAutoEnabled, out var enabledVal) &&
                           enabledVal.Equals("true", StringComparison.OrdinalIgnoreCase);

            string frequency = settings.TryGetValue(KeyFrequency, out var freqVal) && !string.IsNullOrWhiteSpace(freqVal)
                ? freqVal
                : DefaultFrequency;

            string time = settings.TryGetValue(KeyScheduleTime, out var timeVal) && !string.IsNullOrWhiteSpace(timeVal)
                ? timeVal
                : DefaultTime;

            string timezone = settings.TryGetValue(KeyTimezone, out var tzVal) && !string.IsNullOrWhiteSpace(tzVal)
                ? tzVal
                : DefaultTimezone;

            string syncStatus = settings.TryGetValue(KeyLastSyncStatus, out var syncVal) && !string.IsNullOrWhiteSpace(syncVal)
                ? syncVal
                : "deferred_phase16b";

            // Validate and calculate schedule
            var validation = BackupScheduleCalculator.Validate(enabled, frequency, time, timezone);
            CalculatedSchedule calculated;
            if (validation.IsValid && validation.TimeZone != null)
            {
                calculated = BackupScheduleCalculator.Calculate(time, timezone, validation.TimeZone);
            }
            else
            {
                // Fallback to safe defaults if persisted values were corrupt
                calculated = BackupScheduleCalculator.Calculate(DefaultTime, DefaultTimezone);
            }

            var status = BuildSafeStatus(enabled, calculated);

            return new BackupSettingsResponseDto
            {
                Config = new BackupScheduleConfigDto
                {
                    Enabled = enabled,
                    Frequency = frequency,
                    Time = time,
                    Timezone = timezone
                },
                Status = status,
                ScheduleSummary = calculated.ScheduleSummary,
                UtcEquivalentTime = calculated.UtcEquivalentTime,
                SystemdOnCalendar = calculated.SystemdOnCalendar,
                SyncStatus = syncStatus,
                SyncMessage = "Host systemd timer synchronization is deferred until Phase 16C. Automatic backups remain disabled.",
                ProductionHostTopology = "Production: 51.210.10.108 Strasbourg (SBG), France | Backup VPS: 51.254.216.8 Gravelines (GRA), France"
            };
        }

        public async Task<(bool Success, string? Error, BackupSettingsResponseDto? Result)> UpdateSettingsAsync(
            UpdateBackupSettingsDto dto, string performedBy, string? ipAddress)
        {
            if (dto == null)
            {
                return (false, "Request payload cannot be empty.", null);
            }

            // 1. Strict validation
            var (isValid, errorMessage, tz) = BackupScheduleCalculator.Validate(dto.Enabled, dto.Frequency, dto.Time, dto.Timezone);
            if (!isValid || tz == null)
            {
                return (false, errorMessage, null);
            }

            // 2. Calculate UTC schedule
            var calculated = BackupScheduleCalculator.Calculate(dto.Time, dto.Timezone, tz);

            // 3. Load existing settings to capture old values for audit
            var existingSettings = await _context.PlatformSettings
                .Where(s => s.Key.StartsWith("Backup_"))
                .ToDictionaryAsync(s => s.Key, s => s.Value);

            var oldSettingsSnapshot = new
            {
                Enabled = existingSettings.TryGetValue(KeyAutoEnabled, out var oldEn) && oldEn.Equals("true", StringComparison.OrdinalIgnoreCase),
                Frequency = existingSettings.TryGetValue(KeyFrequency, out var oldFr) ? oldFr : DefaultFrequency,
                Time = existingSettings.TryGetValue(KeyScheduleTime, out var oldTm) ? oldTm : DefaultTime,
                Timezone = existingSettings.TryGetValue(KeyTimezone, out var oldTz) ? oldTz : DefaultTimezone,
                SyncStatus = existingSettings.TryGetValue(KeyLastSyncStatus, out var oldSt) ? oldSt : "deferred_phase16b"
            };

            // 4. Upsert platform settings (Preserve user's local timezone & time)
            await UpsertSettingAsync(KeyAutoEnabled, dto.Enabled ? "true" : "false");
            await UpsertSettingAsync(KeyFrequency, dto.Frequency.Trim().ToLowerInvariant());
            await UpsertSettingAsync(KeyScheduleTime, dto.Time.Trim());
            await UpsertSettingAsync(KeyTimezone, tz.Id);
            await UpsertSettingAsync(KeyLastSyncStatus, "deferred_phase16b");
            await UpsertSettingAsync(KeyLastSyncError, string.Empty);

            // 5. Audit Logging via MasterAuditLog (No secrets recorded)
            var newSettingsSnapshot = new
            {
                Enabled = dto.Enabled,
                Frequency = dto.Frequency.Trim().ToLowerInvariant(),
                Time = dto.Time.Trim(),
                Timezone = tz.Id,
                UtcEquivalentTime = calculated.UtcEquivalentTime,
                SystemdOnCalendar = calculated.SystemdOnCalendar,
                SyncStatus = "deferred_phase16b"
            };

            var auditDetails = JsonSerializer.Serialize(new
            {
                Action = "UPDATE_BACKUP_SETTINGS",
                Old = oldSettingsSnapshot,
                New = newSettingsSnapshot,
                IpAddress = ipAddress ?? "unknown",
                Note = "Configuration saved to database. Host systemd timer synchronization deferred to Phase 16C."
            });

            var auditLog = new MasterAuditLog
            {
                TenantId = null,
                Action = "UPDATE_BACKUP_SETTINGS",
                Details = auditDetails,
                PerformedBy = string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy,
                Timestamp = DateTime.UtcNow
            };

            await _context.MasterAuditLogs.AddAsync(auditLog);

            // 6. Commit Database Transaction
            await _context.SaveChangesAsync();

            // 7. Write state file if shared directory is configured
            TryWriteStateFile(dto, calculated, performedBy);

            _logger.LogInformation(
                "Backup settings updated by {User}. AutoEnabled={Enabled}, Schedule={Time} {Timezone} ({Utc} UTC)",
                performedBy, dto.Enabled, dto.Time, tz.Id, calculated.UtcEquivalentTime);

            var status = BuildSafeStatus(dto.Enabled, calculated);

            var result = new BackupSettingsResponseDto
            {
                Config = new BackupScheduleConfigDto
                {
                    Enabled = dto.Enabled,
                    Frequency = dto.Frequency.Trim().ToLowerInvariant(),
                    Time = dto.Time.Trim(),
                    Timezone = tz.Id
                },
                Status = status,
                ScheduleSummary = calculated.ScheduleSummary,
                UtcEquivalentTime = calculated.UtcEquivalentTime,
                SystemdOnCalendar = calculated.SystemdOnCalendar,
                SyncStatus = "deferred_phase16b",
                SyncMessage = "Backup schedule saved in database. Host systemd timer synchronization remains deferred until Phase 16C.",
                ProductionHostTopology = "Production: 51.210.10.108 Strasbourg (SBG), France | Backup VPS: 51.254.216.8 Gravelines (GRA), France"
            };

            return (true, null, result);
        }

        private async Task UpsertSettingAsync(string key, string value)
        {
            var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
            {
                setting = new PlatformSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.PlatformSettings.AddAsync(setting);
            }
            else
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
                _context.PlatformSettings.Update(setting);
            }
        }

        private BackupScheduleStatusDto BuildSafeStatus(bool enabled, CalculatedSchedule calculated)
        {
            // Do NOT claim repository is healthy unless safely verified.
            // Do NOT run Restic from container or expose credentials.
            // Timer is currently disabled on host.
            return new BackupScheduleStatusDto
            {
                TimerActive = false,
                TimerLoaded = true,
                NextRunTimeUtc = enabled ? calculated.NextRunTimeUtc : null,
                NextRunTimeLocal = enabled ? calculated.NextRunTimeLocal : null,
                LastRunTimeUtc = null,
                LastRunStatus = "statusUnavailable",
                LastSnapshotId = null,
                RepositoryStatus = "statusUnavailable",
                TotalSnapshots = null
            };
        }

        private void TryWriteStateFile(UpdateBackupSettingsDto dto, CalculatedSchedule calculated, string performedBy)
        {
            try
            {
                var statePath = _configuration["BackupScheduleStatePath"];
                if (string.IsNullOrWhiteSpace(statePath))
                {
                    return;
                }

                var dir = Path.GetDirectoryName(statePath);
                if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                {
                    var payload = new
                    {
                        enabled = dto.Enabled,
                        frequency = "daily",
                        time = dto.Time.Trim(),
                        timezone = calculated.Timezone,
                        utcTime = calculated.UtcEquivalentTime,
                        systemdOnCalendar = calculated.SystemdOnCalendar,
                        updatedAt = DateTime.UtcNow.ToString("o"),
                        updatedBy = performedBy
                    };

                    var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
                    var tempFile = $"{statePath}.tmp.{Guid.NewGuid():N}";
                    File.WriteAllText(tempFile, json);
                    File.Move(tempFile, statePath, overwrite: true);
                    _logger.LogInformation("Wrote backup schedule state to {Path}", statePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write state file (non-fatal, deferred to Phase 16C).");
            }
        }
    }
}
