using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public static class BrowserPayloadSanitizer
    {
        private static readonly Regex HostPathRegex = new(
            @"(/opt/acya-backup[^\s""',;)]*|/var/backups[^\s""',;)]*|/etc/acya-backup[^\s""',;)]*|/home/ubuntu[^\s""',;)]*|/app/backups[^\s""',;)]*)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex SecretPatternRegex = new(
            @"(RESTIC_PASSWORD\s*=\s*\S+|PGPASSWORD\s*=\s*\S+|Password\s*=\s*[^;\s""']+|sftp:[^\s""']+|restic_password[^\s""']*)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static string? SanitizeText(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return input;
            }

            var step1 = HostPathRegex.Replace(input, "[host-path-redacted]");
            return SecretPatternRegex.Replace(step1, "[redacted]");
        }

        public static string? GetIneligibilityExplanation(string? reasonCode, string snapshotVerificationStatus, string tenantPresenceStatus)
        {
            if (string.IsNullOrWhiteSpace(reasonCode))
            {
                if (!string.Equals(snapshotVerificationStatus, "verified", StringComparison.OrdinalIgnoreCase))
                {
                    return "Snapshot failed integrity verification and cannot be used for tenant recovery.";
                }
                if (!string.Equals(tenantPresenceStatus, "present", StringComparison.OrdinalIgnoreCase))
                {
                    return "Tenant dump artifact is not present in this historical snapshot.";
                }
                return null;
            }

            return reasonCode switch
            {
                "tenant_not_present_in_snapshot" => "Tenant did not exist when this historical snapshot was created.",
                "manifest_entry_missing" => "Snapshot manifest does not contain a verified SHA-256 entry for this tenant dump.",
                "snapshot_degraded" => "Snapshot is marked degraded because required SHA-256 manifest verification metadata is incomplete.",
                "snapshot_invalid" => "Snapshot structure or metadata failed validation checks.",
                "dump_file_missing" => "Tenant dump file is missing from the snapshot staging directory.",
                "dump_file_empty" => "Tenant dump archive in the snapshot has a zero-byte size.",
                "invalid_tenant_schema_mapping" => "Tenant slug to PostgreSQL schema mapping failed strict validation.",
                "manifest_json_sha256_mismatch" => "Snapshot manifest.txt and manifest.json SHA-256 checksums do not match.",
                "manifest_json_size_mismatch" => "Snapshot manifest dump size does not match the indexed archive size.",
                _ => $"Snapshot is ineligible for restoration ({SanitizeText(reasonCode)})."
            };
        }

        public static string DescribeOutcome(TenantRestoreState state)
        {
            return state switch
            {
                TenantRestoreState.Completed => "succeeded",
                TenantRestoreState.Failed => "failed",
                TenantRestoreState.RolledBack => "rolled_back",
                TenantRestoreState.RollbackFailed => "rollback_failed",
                _ => "in_progress"
            };
        }

        public static bool IsTerminalState(TenantRestoreState state)
        {
            return state is TenantRestoreState.Completed
                or TenantRestoreState.Failed
                or TenantRestoreState.RolledBack
                or TenantRestoreState.RollbackFailed;
        }
    }

    public sealed class SubmitTenantRestoreRequestDto
    {
        public string? SnapshotId { get; set; }
        public string? ConfirmTenantSlug { get; set; }
        public string? ConfirmSnapshotId { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? AdditionalProperties { get; set; }
    }

    public sealed record TenantSnapshotRestorePointDto(
        string SnapshotId,
        string SnapshotShortId,
        string SnapshotTimestamp,
        long? DumpSize,
        string? ManifestSha256,
        string ChecksumVerificationStatus,
        string SnapshotVerificationStatus,
        string TenantPresenceStatus,
        bool RestoreEligibility,
        string? IneligibilityReason,
        string? IneligibilityExplanation);

    public sealed record TenantSnapshotEligibilityDetailDto(
        long TenantId,
        string TenantName,
        string TenantSlug,
        string SchemaName,
        string SnapshotId,
        string SnapshotShortId,
        string SnapshotTimestamp,
        long? DumpSize,
        string? ManifestSha256,
        string ChecksumVerificationStatus,
        string SnapshotVerificationStatus,
        string TenantPresenceStatus,
        bool RestoreEligibility,
        string? IneligibilityReason,
        string? IneligibilityExplanation,
        bool RegistryMappingVerified,
        bool AnotherRestoreInProgress,
        bool CanSubmitRestore,
        string RequiredConfirmationTenantSlug,
        string RequiredConfirmationSnapshotId);

    public sealed record TenantRestoreAuditEntryDto(
        DateTime TimestampUtc,
        string OperationId,
        string State,
        string Action,
        string Summary,
        string PerformedBy);

    public sealed record TenantRestoreJobStatusDto(
        string OperationId,
        long TenantId,
        string TenantName,
        string TenantSlug,
        string SchemaName,
        string SnapshotId,
        string SnapshotShortId,
        string? SnapshotTimestamp,
        string CurrentState,
        string? FinalState,
        bool IsTerminal,
        string Outcome,
        IReadOnlyList<string> StateHistory,
        string? ExtractedDumpSha256,
        bool PreRestoreBackupCreated,
        string? PreRestoreBackupSha256,
        int? StagingTableCount,
        int? RestoredTableCount,
        int? UnaffectedTenantCount,
        bool RecoveryArtifactsRetained,
        bool RollbackPerformed,
        bool? RollbackSucceeded,
        string? ErrorCategory,
        string? ErrorMessage,
        string RequestedBy,
        DateTime StartedAtUtc,
        DateTime UpdatedAtUtc,
        DateTime? FinishedAtUtc,
        IReadOnlyList<TenantRestoreAuditEntryDto> AuditTrail);

    public sealed record TenantRestoreHistoryResponseDto(
        long TenantId,
        string TenantName,
        string TenantSlug,
        string SchemaName,
        bool IsActive,
        string CatalogSchema,
        string? CatalogGeneratedAt,
        int TotalSnapshotsIndexed,
        int EligibleSnapshotCount,
        bool AnotherRestoreInProgress,
        TenantRestoreJobStatusDto? ActiveOrLatestOperation,
        IReadOnlyList<TenantSnapshotRestorePointDto> RestorePoints);

    public sealed record TenantRestoreStatusOverviewDto(
        long TenantId,
        string TenantName,
        string TenantSlug,
        string SchemaName,
        bool AnotherRestoreInProgress,
        TenantRestoreJobStatusDto? ActiveOrLatestOperation,
        IReadOnlyList<TenantRestoreJobStatusDto> RecentOperations);

    public sealed class PersistedRestoreJobRecord
    {
        public string OperationId { get; set; } = string.Empty;
        public long TenantId { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string SchemaName { get; set; } = string.Empty;
        public string SnapshotId { get; set; } = string.Empty;
        public string SnapshotShortId { get; set; } = string.Empty;
        public string? SnapshotTimestamp { get; set; }
        public string CurrentState { get; set; } = nameof(TenantRestoreState.Pending);
        public string? FinalState { get; set; }
        public bool IsTerminal { get; set; }
        public string Outcome { get; set; } = "in_progress";
        public List<string> StateHistory { get; set; } = new() { nameof(TenantRestoreState.Pending) };
        public string? ExtractedDumpSha256 { get; set; }
        public bool PreRestoreBackupCreated { get; set; }
        public string? PreRestoreBackupSha256 { get; set; }
        public int? StagingTableCount { get; set; }
        public int? RestoredTableCount { get; set; }
        public int? UnaffectedTenantCount { get; set; }
        public bool RecoveryArtifactsRetained { get; set; }
        public bool RollbackPerformed { get; set; }
        public bool? RollbackSucceeded { get; set; }
        public string? ErrorCategory { get; set; }
        public string? ErrorMessage { get; set; }
        public string RequestedBy { get; set; } = "SuperAdmin";
        public DateTime StartedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public DateTime? FinishedAtUtc { get; set; }
    }

    public interface ITenantRestoreExecutionBridge
    {
        Task<TenantRestoreResult> ExecuteRestoreAsync(
            ValidatedTenantRestoreTarget target,
            string operationId,
            string performedBy,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task> onStateTransition,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Connects the .NET Backoffice service directly to the host CLI `/opt/acya-backup/bin/acya-tenant-restore`.
    /// Never uses shell execution and never passes client-supplied schema names or file paths.
    /// </summary>
    public sealed class HostCliTenantRestoreBridge : ITenantRestoreExecutionBridge
    {
        private static readonly Regex FullSnapshotIdRegex = new(@"^[0-9a-f]{64}$", RegexOptions.Compiled);
        private static readonly Regex OperationIdRegex = new(@"^restore-\d{8}T\d{6}Z-[0-9a-f]{8}$", RegexOptions.Compiled);
        private static readonly Regex SafeActorRegex = new(@"^[a-zA-Z0-9_.@-]{1,64}$", RegexOptions.Compiled);

        private readonly string _cliBinaryPath;
        private readonly string _configPath;
        private readonly string _catalogPath;
        private readonly string _stateRootDir;
        private readonly ILogger<HostCliTenantRestoreBridge> _logger;

        public HostCliTenantRestoreBridge(
            ILogger<HostCliTenantRestoreBridge> logger,
            string cliBinaryPath = "/opt/acya-backup/bin/acya-tenant-restore",
            string configPath = "/opt/acya-backup/config/backup.json",
            string catalogPath = "/opt/acya-backup/state/tenant-backup-history.json",
            string stateRootDir = "/opt/acya-backup/state")
        {
            _logger = logger;
            _cliBinaryPath = cliBinaryPath;
            _configPath = configPath;
            _catalogPath = catalogPath;
            _stateRootDir = stateRootDir;
        }

        public async Task<TenantRestoreResult> ExecuteRestoreAsync(
            ValidatedTenantRestoreTarget target,
            string operationId,
            string performedBy,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task> onStateTransition,
            CancellationToken cancellationToken = default)
        {
            if (target.TenantId <= 0)
            {
                throw new TenantRestoreException(TenantRestoreState.Pending, "invalid_tenant_id", "Invalid tenant ID.");
            }
            if (!FullSnapshotIdRegex.IsMatch(target.SnapshotId))
            {
                throw new TenantRestoreException(TenantRestoreState.Pending, "invalid_snapshot_id", "Snapshot ID must be a 64-character hex digest.");
            }
            if (!OperationIdRegex.IsMatch(operationId))
            {
                throw new TenantRestoreException(TenantRestoreState.Pending, "invalid_operation_id", "Operation ID format is invalid.");
            }

            var fullCliPath = Path.GetFullPath(_cliBinaryPath);
            if (!File.Exists(fullCliPath))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "host_restore_cli_unavailable",
                    "Host tenant restore binary is not available in the current runtime environment.");
            }

            var sanitizedActor = SafeActorRegex.IsMatch(performedBy ?? string.Empty)
                ? performedBy!
                : "SuperAdmin";

            var startInfo = new ProcessStartInfo
            {
                FileName = fullCliPath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            startInfo.ArgumentList.Add("--tenant-id");
            startInfo.ArgumentList.Add(target.TenantId.ToString(CultureInfo.InvariantCulture));
            startInfo.ArgumentList.Add("--snapshot-id");
            startInfo.ArgumentList.Add(target.SnapshotId);
            startInfo.ArgumentList.Add("--actor");
            startInfo.ArgumentList.Add(sanitizedActor);
            startInfo.ArgumentList.Add("--operation-id");
            startInfo.ArgumentList.Add(operationId);
            startInfo.ArgumentList.Add("--config");
            startInfo.ArgumentList.Add(Path.GetFullPath(_configPath));
            startInfo.ArgumentList.Add("--history-catalog");
            startInfo.ArgumentList.Add(Path.GetFullPath(_catalogPath));
            startInfo.ArgumentList.Add("--confirm-restore");

            var opStateFilePath = Path.Combine(Path.GetFullPath(_stateRootDir), "restore-jobs", $"{operationId}.json");
            var seenHistoryCount = 1; // Pending already recorded

            using var process = Process.Start(startInfo)
                ?? throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "host_restore_process_start_failed",
                    "Failed to launch host tenant restore engine.");

            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

            while (!process.HasExited)
            {
                await Task.Delay(120, cancellationToken);
                seenHistoryCount = await PollHostStateFileAsync(
                    opStateFilePath,
                    target,
                    operationId,
                    seenHistoryCount,
                    onStateTransition,
                    cancellationToken);
            }

            await process.WaitForExitAsync(cancellationToken);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            seenHistoryCount = await PollHostStateFileAsync(
                opStateFilePath,
                target,
                operationId,
                seenHistoryCount,
                onStateTransition,
                cancellationToken);

            var stateJson = File.Exists(opStateFilePath)
                ? await File.ReadAllTextAsync(opStateFilePath, cancellationToken)
                : stdout;

            if (!string.IsNullOrWhiteSpace(stateJson))
            {
                try
                {
                    return ParseHostStateJson(stateJson, target, operationId);
                }
                catch (Exception parseEx)
                {
                    _logger.LogWarning(parseEx, "Failed to parse host restore JSON output for {OperationId}", operationId);
                }
            }

            var fallbackError = BrowserPayloadSanitizer.SanitizeText(stderr)?.Trim();
            return new TenantRestoreResult
            {
                OperationId = operationId,
                TenantId = target.TenantId,
                TenantSlug = target.TenantSlug,
                SchemaName = target.SchemaName,
                SnapshotId = target.SnapshotId,
                FinalState = TenantRestoreState.Failed,
                StateHistory = new[] { TenantRestoreState.Pending, TenantRestoreState.Failed },
                ErrorCategory = "host_restore_cli_failed",
                ErrorMessage = string.IsNullOrWhiteSpace(fallbackError)
                    ? $"Host restore engine exited with code {process.ExitCode}."
                    : fallbackError,
                StartedAtUtc = DateTime.UtcNow,
                FinishedAtUtc = DateTime.UtcNow
            };
        }

        private static async Task<int> PollHostStateFileAsync(
            string opStateFilePath,
            ValidatedTenantRestoreTarget target,
            string operationId,
            int seenHistoryCount,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task> onStateTransition,
            CancellationToken cancellationToken)
        {
            if (!File.Exists(opStateFilePath))
            {
                return seenHistoryCount;
            }

            try
            {
                var content = await File.ReadAllTextAsync(opStateFilePath, cancellationToken);
                var parsed = ParseHostStateJson(content, target, operationId);
                if (parsed.StateHistory.Count > seenHistoryCount)
                {
                    for (var i = seenHistoryCount; i < parsed.StateHistory.Count; i++)
                    {
                        var st = parsed.StateHistory[i];
                        var prefix = parsed.StateHistory.Take(i + 1).ToArray();
                        await onStateTransition(
                            new TenantRestoreProgressUpdate(
                                operationId,
                                target.TenantId,
                                target.TenantSlug,
                                target.SchemaName,
                                target.SnapshotId,
                                st,
                                prefix,
                                $"Host restore engine transitioned to {st}.",
                                parsed.ExtractedDumpSha256,
                                !string.IsNullOrWhiteSpace(parsed.PreRestoreBackupSha256),
                                parsed.PreRestoreBackupSha256,
                                parsed.StagingTableCount,
                                parsed.RestoredTableCount,
                                parsed.UnaffectedTenantCount),
                            cancellationToken);
                    }
                    return parsed.StateHistory.Count;
                }
            }
            catch
            {
                // Ignore transient read race while file is being replaced
            }

            return seenHistoryCount;
        }

        public static TenantRestoreResult ParseHostStateJson(
            string json,
            ValidatedTenantRestoreTarget? target,
            string fallbackOperationId)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var opId = root.TryGetProperty("operationId", out var opEl) && opEl.ValueKind == JsonValueKind.String
                ? opEl.GetString() ?? fallbackOperationId
                : fallbackOperationId;
            var tenantId = root.TryGetProperty("tenantId", out var tidEl) && tidEl.ValueKind == JsonValueKind.Number
                ? tidEl.GetInt64()
                : (target?.TenantId ?? 0);
            var slug = root.TryGetProperty("tenantSlug", out var slugEl) && slugEl.ValueKind == JsonValueKind.String
                ? slugEl.GetString()
                : target?.TenantSlug;
            var schema = root.TryGetProperty("schemaName", out var schEl) && schEl.ValueKind == JsonValueKind.String
                ? schEl.GetString()
                : target?.SchemaName;
            var snapId = root.TryGetProperty("snapshotId", out var snapEl) && snapEl.ValueKind == JsonValueKind.String
                ? snapEl.GetString() ?? (target?.SnapshotId ?? string.Empty)
                : (target?.SnapshotId ?? string.Empty);

            var finalStateStr = root.TryGetProperty("finalState", out var fsEl) && fsEl.ValueKind == JsonValueKind.String
                ? fsEl.GetString()
                : nameof(TenantRestoreState.Pending);
            if (!Enum.TryParse<TenantRestoreState>(finalStateStr, ignoreCase: true, out var finalState))
            {
                finalState = TenantRestoreState.Failed;
            }

            var history = new List<TenantRestoreState>();
            if (root.TryGetProperty("stateHistory", out var histEl) && histEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in histEl.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String
                        && Enum.TryParse<TenantRestoreState>(item.GetString(), ignoreCase: true, out var parsedSt))
                    {
                        history.Add(parsedSt);
                    }
                }
            }
            if (history.Count == 0)
            {
                history.Add(finalState);
            }

            var extractedSha = root.TryGetProperty("extractedDumpSha256", out var exSha) && exSha.ValueKind == JsonValueKind.String
                ? exSha.GetString()
                : null;
            var preBackupSha = root.TryGetProperty("preRestoreBackupSha256", out var pbSha) && pbSha.ValueKind == JsonValueKind.String
                ? pbSha.GetString()
                : null;
            int? stagingTables = root.TryGetProperty("stagingTableCount", out var stc) && stc.ValueKind == JsonValueKind.Number
                ? stc.GetInt32()
                : null;
            int? restoredTables = root.TryGetProperty("restoredTableCount", out var rtc) && rtc.ValueKind == JsonValueKind.Number
                ? rtc.GetInt32()
                : null;
            int? unaffected = root.TryGetProperty("unaffectedTenantCount", out var utc) && utc.ValueKind == JsonValueKind.Number
                ? utc.GetInt32()
                : null;
            var retained = root.TryGetProperty("recoveryArtifactsRetained", out var rar) && rar.ValueKind == JsonValueKind.True;
            var rbPerformed = root.TryGetProperty("rollbackPerformed", out var rbp) && rbp.ValueKind == JsonValueKind.True;
            bool? rbSucceeded = root.TryGetProperty("rollbackSucceeded", out var rbs)
                ? rbs.ValueKind switch
                {
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    _ => null
                }
                : null;
            var errCat = root.TryGetProperty("errorCategory", out var ec) && ec.ValueKind == JsonValueKind.String
                ? ec.GetString()
                : null;
            var errMsg = root.TryGetProperty("errorMessage", out var em) && em.ValueKind == JsonValueKind.String
                ? BrowserPayloadSanitizer.SanitizeText(em.GetString())
                : null;

            var startedAt = DateTime.UtcNow;
            if (root.TryGetProperty("startedAt", out var saEl) && saEl.ValueKind == JsonValueKind.String
                && DateTime.TryParse(saEl.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var parsedStart))
            {
                startedAt = parsedStart;
            }

            var finishedAt = DateTime.UtcNow;
            if (root.TryGetProperty("finishedAt", out var faEl) && faEl.ValueKind == JsonValueKind.String
                && DateTime.TryParse(faEl.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var parsedFin))
            {
                finishedAt = parsedFin;
            }

            return new TenantRestoreResult
            {
                OperationId = opId,
                TenantId = tenantId,
                TenantSlug = slug,
                SchemaName = schema,
                SnapshotId = snapId,
                FinalState = finalState,
                StateHistory = history,
                ExtractedDumpSha256 = extractedSha,
                PreRestoreBackupSha256 = preBackupSha,
                StagingTableCount = stagingTables,
                RestoredTableCount = restoredTables,
                UnaffectedTenantCount = unaffected,
                RecoveryArtifactsRetained = retained,
                RollbackPerformed = rbPerformed,
                RollbackSucceeded = rbSucceeded,
                ErrorCategory = errCat,
                ErrorMessage = errMsg,
                StartedAtUtc = startedAt,
                FinishedAtUtc = finishedAt
            };
        }
    }

    /// <summary>
    /// Bridges `ITenantRestoreExecutionBridge` directly to the in-process `TenantRestoreEngine`
    /// when `IResticSnapshotExtractor` and `ITenantDatabaseRestoreOperator` are registered.
    /// </summary>
    public sealed class EngineTenantRestoreBridge : ITenantRestoreExecutionBridge
    {
        private readonly TenantRestoreEngine _engine;

        public EngineTenantRestoreBridge(TenantRestoreEngine engine)
        {
            _engine = engine;
        }

        public Task<TenantRestoreResult> ExecuteRestoreAsync(
            ValidatedTenantRestoreTarget target,
            string operationId,
            string performedBy,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task> onStateTransition,
            CancellationToken cancellationToken = default)
        {
            return _engine.ExecuteRestoreAsync(
                target.TenantId,
                target.SnapshotId,
                performedBy,
                operationId,
                onStateTransition,
                lockAlreadyHeld: true,
                cancellationToken);
        }
    }

    public interface ITenantRestoreManagementService
    {
        Task<TenantRestoreHistoryResponseDto> GetTenantRestoreHistoryAsync(
            long tenantId,
            CancellationToken cancellationToken = default);

        Task<TenantSnapshotEligibilityDetailDto> GetSnapshotEligibilityDetailAsync(
            long tenantId,
            string snapshotId,
            CancellationToken cancellationToken = default);

        Task<TenantRestoreJobStatusDto> SubmitRestoreRequestAsync(
            long tenantId,
            SubmitTenantRestoreRequestDto request,
            string performedBy,
            CancellationToken cancellationToken = default);

        Task<TenantRestoreStatusOverviewDto> GetTenantRestoreStatusAsync(
            long tenantId,
            CancellationToken cancellationToken = default);

        Task<TenantRestoreJobStatusDto?> GetRestoreOperationStatusAsync(
            string operationId,
            CancellationToken cancellationToken = default);

        Task<TenantRestoreJobStatusDto?> WaitForOperationCompletionAsync(
            string operationId,
            TimeSpan timeout,
            CancellationToken cancellationToken = default);
    }

    public sealed class TenantRestoreManagementService : ITenantRestoreManagementService
    {
        public const string RestoreOpKeyPrefix = "restore_op:";
        public const string RestoreLatestTenantKeyPrefix = "restore_latest:";

        private static readonly Regex SnapshotIdRegex = new(@"^[0-9a-f]{8,64}$", RegexOptions.Compiled);
        private static readonly Regex OperationIdRegex = new(@"^restore-\d{8}T\d{6}Z-[0-9a-f]{8}$", RegexOptions.Compiled);
        private static readonly Regex SlugRegex = new(@"^[a-z0-9][a-z0-9_-]{0,59}$", RegexOptions.Compiled);

        private readonly ConcurrentDictionary<string, Task> _activeBackgroundTasks = new(StringComparer.Ordinal);
        private readonly MasterDbContext _dbContext;
        private readonly ITenantRestoreCatalogProvider _catalogProvider;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TenantRestoreManagementService> _logger;
        private readonly string _hostStateDirectory;
        private readonly TenantRestoreConcurrencyGate _concurrencyGate;
        private readonly bool _executionEnabled;

        public TenantRestoreManagementService(
            MasterDbContext dbContext,
            ITenantRestoreCatalogProvider catalogProvider,
            IServiceScopeFactory scopeFactory,
            ILogger<TenantRestoreManagementService> logger,
            string hostStateDirectory = "/opt/acya-backup/state",
            TenantRestoreConcurrencyGate? concurrencyGate = null,
            bool? executionEnabled = null)
        {
            _dbContext = dbContext;
            _catalogProvider = catalogProvider;
            _scopeFactory = scopeFactory;
            _logger = logger;
            _hostStateDirectory = hostStateDirectory;
            _concurrencyGate = concurrencyGate ?? new TenantRestoreConcurrencyGate();
            _executionEnabled = executionEnabled
                ?? string.Equals(Environment.GetEnvironmentVariable("TENANT_RESTORE_EXECUTION_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<TenantRestoreHistoryResponseDto> GetTenantRestoreHistoryAsync(
            long tenantId,
            CancellationToken cancellationToken = default)
        {
            if (tenantId <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_id",
                    "Tenant ID must be a positive integer.");
            }

            var enterprise = await _dbContext.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId, cancellationToken);

            if (enterprise == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_found_in_registry",
                    $"Tenant ID {tenantId} does not exist in the enterprise registry.");
            }

            var catalog = await _catalogProvider.LoadCatalogAsync(cancellationToken);

            var tenantEntries = catalog.Entries
                .Where(e => e.TenantId == tenantId
                         || string.Equals(e.TenantSlug, enterprise.Slug, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(e => e.SnapshotTimestamp, StringComparer.Ordinal)
                .ThenBy(e => e.SnapshotId, StringComparer.Ordinal)
                .Select(MapToRestorePointDto)
                .ToList();

            var statusOverview = await GetTenantRestoreStatusAsync(tenantId, cancellationToken);

            return new TenantRestoreHistoryResponseDto(
                enterprise.Id,
                enterprise.Name,
                enterprise.Slug,
                enterprise.SchemaName,
                enterprise.IsActive,
                catalog.Schema,
                catalog.GeneratedAt,
                catalog.Snapshots.Count,
                tenantEntries.Count(p => p.RestoreEligibility),
                statusOverview.AnotherRestoreInProgress,
                statusOverview.ActiveOrLatestOperation,
                tenantEntries);
        }

        public async Task<TenantSnapshotEligibilityDetailDto> GetSnapshotEligibilityDetailAsync(
            long tenantId,
            string snapshotId,
            CancellationToken cancellationToken = default)
        {
            if (tenantId <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_id",
                    "Tenant ID must be a positive integer.");
            }

            if (string.IsNullOrWhiteSpace(snapshotId) || !SnapshotIdRegex.IsMatch(snapshotId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_snapshot_id",
                    "Snapshot ID must be an 8-to-64 character lowercase hexadecimal identifier.");
            }

            var enterprise = await _dbContext.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId, cancellationToken);

            if (enterprise == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_found_in_registry",
                    $"Tenant ID {tenantId} does not exist in the enterprise registry.");
            }

            var catalog = await _catalogProvider.LoadCatalogAsync(cancellationToken);

            var matchingSnaps = catalog.Snapshots
                .Where(s => s.SnapshotId == snapshotId
                         || s.SnapshotShortId == snapshotId
                         || s.SnapshotId.StartsWith(snapshotId, StringComparison.Ordinal))
                .ToList();

            if (matchingSnaps.Count == 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "snapshot_not_found",
                    $"Snapshot '{snapshotId}' was not found in the trusted backup history catalog.");
            }

            if (matchingSnaps.Count > 1)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "snapshot_id_ambiguous",
                    $"Snapshot prefix '{snapshotId}' matched multiple snapshots in the catalog.");
            }

            var snap = matchingSnaps[0];
            var entry = catalog.Entries.FirstOrDefault(
                e => e.SnapshotId == snap.SnapshotId
                  && (e.TenantId == tenantId || string.Equals(e.TenantSlug, enterprise.Slug, StringComparison.Ordinal)));

            if (entry == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_entry_not_found_in_catalog",
                    $"Tenant {tenantId} has no catalog entry for snapshot '{snap.SnapshotShortId}'.");
            }

            var registryMappingVerified = false;
            string? validationReasonOverride = entry.IneligibilityReason;
            try
            {
                _ = TenantRestoreValidator.ValidateRequest(tenantId, snap.SnapshotId, enterprise, catalog);
                registryMappingVerified = true;
            }
            catch (TenantRestoreException tre)
            {
                validationReasonOverride ??= tre.Category;
            }

            var anotherRestoreActive = await IsAnyRestoreActiveAsync(cancellationToken);
            var isEligible = entry.RestoreEligibility && registryMappingVerified;
            var explanation = BrowserPayloadSanitizer.GetIneligibilityExplanation(
                validationReasonOverride,
                entry.SnapshotVerificationStatus,
                entry.TenantPresenceStatus);

            return new TenantSnapshotEligibilityDetailDto(
                enterprise.Id,
                enterprise.Name,
                enterprise.Slug,
                enterprise.SchemaName,
                snap.SnapshotId,
                snap.SnapshotShortId,
                entry.SnapshotTimestamp,
                entry.DumpSize,
                entry.ManifestSha256,
                entry.ChecksumVerificationStatus,
                entry.SnapshotVerificationStatus,
                entry.TenantPresenceStatus,
                isEligible,
                validationReasonOverride,
                explanation,
                registryMappingVerified,
                anotherRestoreActive,
                CanSubmitRestore: isEligible && !anotherRestoreActive && _executionEnabled,
                RequiredConfirmationTenantSlug: enterprise.Slug,
                RequiredConfirmationSnapshotId: snap.SnapshotShortId);
        }

        public async Task<TenantRestoreJobStatusDto> SubmitRestoreRequestAsync(
            long tenantId,
            SubmitTenantRestoreRequestDto request,
            string performedBy,
            CancellationToken cancellationToken = default)
        {
            if (!_executionEnabled)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "restore_execution_disabled",
                    "Production restoration execution is currently disabled by server policy. Historical snapshots and restore eligibility may be inspected, but actual cutover execution requires explicit administrator authorization.");
            }

            if (request == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_restore_request",
                    "Restore request payload is required.");
            }

            // Strictly forbid any unexpected client fields (schemaName, dumpPath, filePath, command, etc.)
            if (request.AdditionalProperties is { Count: > 0 })
            {
                var forbiddenKeys = string.Join(", ", request.AdditionalProperties.Keys.OrderBy(k => k, StringComparer.Ordinal));
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "forbidden_client_parameters",
                    $"Restore request contains forbidden client parameter(s): {forbiddenKeys}. Schema names, file paths, and command overrides are never accepted from clients.");
            }

            if (tenantId <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_id",
                    "Tenant ID must be a positive integer.");
            }

            var snapshotId = request.SnapshotId?.Trim();
            if (string.IsNullOrWhiteSpace(snapshotId) || !SnapshotIdRegex.IsMatch(snapshotId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_snapshot_id",
                    "Snapshot ID must be an 8-to-64 character lowercase hexadecimal identifier.");
            }

            var enterprise = await _dbContext.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId, cancellationToken);

            if (enterprise == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_found_in_registry",
                    $"Tenant ID {tenantId} does not exist in the enterprise registry.");
            }

            var catalog = await _catalogProvider.LoadCatalogAsync(cancellationToken);
            var validatedTarget = TenantRestoreValidator.ValidateRequest(tenantId, snapshotId, enterprise, catalog);

            // Require explicit confirmation identifying both the tenant and selected snapshot
            var confirmSlug = request.ConfirmTenantSlug?.Trim() ?? string.Empty;
            var confirmSnapshot = request.ConfirmSnapshotId?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(confirmSlug)
                || !SlugRegex.IsMatch(confirmSlug)
                || !string.Equals(confirmSlug, validatedTarget.TenantSlug, StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "confirmation_tenant_mismatch",
                    $"Explicit tenant confirmation ('{confirmSlug}') does not match the target tenant slug ('{validatedTarget.TenantSlug}').");
            }

            if (string.IsNullOrWhiteSpace(confirmSnapshot)
                || !SnapshotIdRegex.IsMatch(confirmSnapshot)
                || (!string.Equals(confirmSnapshot, validatedTarget.SnapshotShortId, StringComparison.Ordinal)
                    && !string.Equals(confirmSnapshot, validatedTarget.SnapshotId, StringComparison.Ordinal)))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "confirmation_snapshot_mismatch",
                    $"Explicit snapshot confirmation ('{confirmSnapshot}') does not match the selected snapshot ('{validatedTarget.SnapshotShortId}').");
            }

            if (await IsAnyRestoreActiveAsync(cancellationToken)
                || !await _concurrencyGate.TryAcquireAsync(cancellationToken))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "concurrent_restore_in_progress",
                    "Another tenant restore operation is currently active. Concurrent restorations are rejected.");
            }

            var nowUtc = DateTime.UtcNow;
            var operationId = $"restore-{nowUtc:yyyyMMddTHHmmssZ}-{Guid.NewGuid().ToString("N")[..8]}";
            var actor = string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy.Trim();

            var initialRecord = new PersistedRestoreJobRecord
            {
                OperationId = operationId,
                TenantId = validatedTarget.TenantId,
                TenantName = enterprise.Name,
                TenantSlug = validatedTarget.TenantSlug,
                SchemaName = validatedTarget.SchemaName,
                SnapshotId = validatedTarget.SnapshotId,
                SnapshotShortId = validatedTarget.SnapshotShortId,
                SnapshotTimestamp = validatedTarget.SnapshotTimestamp,
                CurrentState = nameof(TenantRestoreState.Pending),
                FinalState = null,
                IsTerminal = false,
                Outcome = "in_progress",
                StateHistory = new List<string> { nameof(TenantRestoreState.Pending) },
                RequestedBy = actor,
                StartedAtUtc = nowUtc,
                UpdatedAtUtc = nowUtc,
                FinishedAtUtc = null
            };

            try
            {
                await SaveJobRecordAsync(_dbContext, initialRecord, cancellationToken);
                await _dbContext.MasterAuditLogs.AddAsync(new MasterAuditLog
                {
                    TenantId = validatedTarget.TenantId,
                    Action = "TENANT_RESTORE_REQUESTED",
                    Details = $"[Op={operationId}][State=Pending] Confirmed restore requested for tenant '{validatedTarget.TenantSlug}' from verified snapshot '{validatedTarget.SnapshotShortId}'.",
                    PerformedBy = actor,
                    Timestamp = nowUtc
                }, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                _concurrencyGate.Release();
                throw;
            }

            // Launch background execution without tying completion to the HTTP request lifetime
            var bgTask = Task.Run(async () =>
            {
                try
                {
                    await ExecuteRestoreBackgroundJobAsync(validatedTarget, enterprise.Name, operationId, actor);
                }
                finally
                {
                    _concurrencyGate.Release();
                    _activeBackgroundTasks.TryRemove(operationId, out _);
                }
            });

            _activeBackgroundTasks[operationId] = bgTask;

            return await BuildJobStatusDtoAsync(_dbContext, initialRecord, cancellationToken);
        }

        public async Task<TenantRestoreStatusOverviewDto> GetTenantRestoreStatusAsync(
            long tenantId,
            CancellationToken cancellationToken = default)
        {
            if (tenantId <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_id",
                    "Tenant ID must be a positive integer.");
            }

            var enterprise = await _dbContext.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId, cancellationToken);

            if (enterprise == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_found_in_registry",
                    $"Tenant ID {tenantId} does not exist in the enterprise registry.");
            }

            await SyncHostStateFilesIfPresentAsync(cancellationToken);

            var allRecords = await LoadAllJobRecordsAsync(_dbContext, cancellationToken);
            var tenantRecords = allRecords
                .Where(r => r.TenantId == tenantId)
                .OrderByDescending(r => r.StartedAtUtc)
                .ThenByDescending(r => r.OperationId, StringComparer.Ordinal)
                .Take(10)
                .ToList();

            var dtos = new List<TenantRestoreJobStatusDto>(tenantRecords.Count);
            foreach (var rec in tenantRecords)
            {
                dtos.Add(await BuildJobStatusDtoAsync(_dbContext, rec, cancellationToken));
            }

            var anotherRestoreActive = _concurrencyGate.IsHeld || allRecords.Any(r => !r.IsTerminal);

            return new TenantRestoreStatusOverviewDto(
                enterprise.Id,
                enterprise.Name,
                enterprise.Slug,
                enterprise.SchemaName,
                anotherRestoreActive,
                dtos.FirstOrDefault(),
                dtos);
        }

        public async Task<TenantRestoreJobStatusDto?> GetRestoreOperationStatusAsync(
            string operationId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(operationId) || !OperationIdRegex.IsMatch(operationId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_operation_id",
                    "Operation ID format is invalid.");
            }

            await SyncHostStateFilesIfPresentAsync(cancellationToken);

            var setting = await _dbContext.PlatformSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == $"{RestoreOpKeyPrefix}{operationId}", cancellationToken);

            if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
            {
                return null;
            }

            var record = JsonSerializer.Deserialize<PersistedRestoreJobRecord>(setting.Value);
            if (record == null)
            {
                return null;
            }

            return await BuildJobStatusDtoAsync(_dbContext, record, cancellationToken);
        }

        public async Task<TenantRestoreJobStatusDto?> WaitForOperationCompletionAsync(
            string operationId,
            TimeSpan timeout,
            CancellationToken cancellationToken = default)
        {
            if (_activeBackgroundTasks.TryGetValue(operationId, out var runningTask))
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(timeout);
                try
                {
                    await runningTask.WaitAsync(cts.Token);
                }
                catch (OperationCanceledException)
                {
                    // Return current state if timed out
                }
            }

            using var scope = _scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
            var setting = await scopedDb.PlatformSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == $"{RestoreOpKeyPrefix}{operationId}", cancellationToken);

            if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
            {
                return null;
            }

            var record = JsonSerializer.Deserialize<PersistedRestoreJobRecord>(setting.Value);
            return record == null ? null : await BuildJobStatusDtoAsync(scopedDb, record, cancellationToken);
        }

        private async Task ExecuteRestoreBackgroundJobAsync(
            ValidatedTenantRestoreTarget target,
            string tenantName,
            string operationId,
            string actor)
        {
            using var scope = _scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
            var bridge = scope.ServiceProvider.GetRequiredService<ITenantRestoreExecutionBridge>();

            async Task OnStateTransitionAsync(TenantRestoreProgressUpdate update, CancellationToken ct)
            {
                var record = await LoadJobRecordAsync(scopedDb, operationId, ct) ?? new PersistedRestoreJobRecord
                {
                    OperationId = operationId,
                    TenantId = target.TenantId,
                    TenantName = tenantName,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    SnapshotShortId = target.SnapshotShortId,
                    SnapshotTimestamp = target.SnapshotTimestamp,
                    RequestedBy = actor,
                    StartedAtUtc = DateTime.UtcNow
                };

                var stateNames = update.StateHistory.Select(s => s.ToString()).ToList();
                if (stateNames.Count == 0 || stateNames[^1] != update.CurrentState.ToString())
                {
                    stateNames.Add(update.CurrentState.ToString());
                }

                record.CurrentState = update.CurrentState.ToString();
                record.StateHistory = stateNames;
                record.IsTerminal = BrowserPayloadSanitizer.IsTerminalState(update.CurrentState);
                record.FinalState = record.IsTerminal ? update.CurrentState.ToString() : null;
                record.Outcome = BrowserPayloadSanitizer.DescribeOutcome(update.CurrentState);
                record.ExtractedDumpSha256 = update.ExtractedDumpSha256 ?? record.ExtractedDumpSha256;
                record.PreRestoreBackupCreated = update.PreRestoreBackupCreated || record.PreRestoreBackupCreated;
                record.PreRestoreBackupSha256 = update.PreRestoreBackupSha256 ?? record.PreRestoreBackupSha256;
                record.StagingTableCount = update.StagingTableCount ?? record.StagingTableCount;
                record.RestoredTableCount = update.RestoredTableCount ?? record.RestoredTableCount;
                record.UnaffectedTenantCount = update.UnaffectedTenantCount ?? record.UnaffectedTenantCount;
                record.UpdatedAtUtc = DateTime.UtcNow;

                await SaveJobRecordAsync(scopedDb, record, ct);
                await scopedDb.SaveChangesAsync(ct);
            }

            try
            {
                var result = await bridge.ExecuteRestoreAsync(
                    target,
                    operationId,
                    actor,
                    OnStateTransitionAsync,
                    CancellationToken.None);

                var finalRecord = await LoadJobRecordAsync(scopedDb, operationId, CancellationToken.None)
                    ?? new PersistedRestoreJobRecord
                    {
                        OperationId = operationId,
                        TenantId = target.TenantId,
                        TenantName = tenantName,
                        TenantSlug = target.TenantSlug,
                        SchemaName = target.SchemaName,
                        SnapshotId = target.SnapshotId,
                        SnapshotShortId = target.SnapshotShortId,
                        SnapshotTimestamp = target.SnapshotTimestamp,
                        RequestedBy = actor,
                        StartedAtUtc = result.StartedAtUtc
                    };

                finalRecord.CurrentState = result.FinalState.ToString();
                finalRecord.FinalState = result.FinalState.ToString();
                finalRecord.IsTerminal = true;
                finalRecord.Outcome = BrowserPayloadSanitizer.DescribeOutcome(result.FinalState);
                finalRecord.StateHistory = result.StateHistory.Select(s => s.ToString()).ToList();
                finalRecord.ExtractedDumpSha256 = result.ExtractedDumpSha256;
                finalRecord.PreRestoreBackupCreated = !string.IsNullOrWhiteSpace(result.PreRestoreBackupSha256)
                    || !string.IsNullOrWhiteSpace(result.PreRestoreBackupPath);
                finalRecord.PreRestoreBackupSha256 = result.PreRestoreBackupSha256;
                finalRecord.StagingTableCount = result.StagingTableCount;
                finalRecord.RestoredTableCount = result.RestoredTableCount;
                finalRecord.UnaffectedTenantCount = result.UnaffectedTenantCount;
                finalRecord.RecoveryArtifactsRetained = result.RecoveryArtifactsRetained;
                finalRecord.RollbackPerformed = result.RollbackPerformed;
                finalRecord.RollbackSucceeded = result.RollbackSucceeded;
                finalRecord.ErrorCategory = result.ErrorCategory;
                finalRecord.ErrorMessage = BrowserPayloadSanitizer.SanitizeText(result.ErrorMessage);
                finalRecord.UpdatedAtUtc = DateTime.UtcNow;
                finalRecord.FinishedAtUtc = result.FinishedAtUtc;

                await SaveJobRecordAsync(scopedDb, finalRecord, CancellationToken.None);
                await scopedDb.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception during background restore operation {OperationId}", operationId);

                var errCategory = ex is TenantRestoreException tre ? tre.Category : "unexpected_restore_failure";
                var errMsg = BrowserPayloadSanitizer.SanitizeText(ex.Message);
                var failedRecord = await LoadJobRecordAsync(scopedDb, operationId, CancellationToken.None)
                    ?? new PersistedRestoreJobRecord
                    {
                        OperationId = operationId,
                        TenantId = target.TenantId,
                        TenantName = tenantName,
                        TenantSlug = target.TenantSlug,
                        SchemaName = target.SchemaName,
                        SnapshotId = target.SnapshotId,
                        SnapshotShortId = target.SnapshotShortId,
                        SnapshotTimestamp = target.SnapshotTimestamp,
                        RequestedBy = actor,
                        StartedAtUtc = DateTime.UtcNow
                    };

                if (!failedRecord.StateHistory.Contains(nameof(TenantRestoreState.Failed), StringComparer.Ordinal))
                {
                    failedRecord.StateHistory.Add(nameof(TenantRestoreState.Failed));
                }

                failedRecord.CurrentState = nameof(TenantRestoreState.Failed);
                failedRecord.FinalState = nameof(TenantRestoreState.Failed);
                failedRecord.IsTerminal = true;
                failedRecord.Outcome = "failed";
                failedRecord.ErrorCategory = errCategory;
                failedRecord.ErrorMessage = errMsg;
                failedRecord.UpdatedAtUtc = DateTime.UtcNow;
                failedRecord.FinishedAtUtc = DateTime.UtcNow;

                await SaveJobRecordAsync(scopedDb, failedRecord, CancellationToken.None);
                await scopedDb.MasterAuditLogs.AddAsync(new MasterAuditLog
                {
                    TenantId = target.TenantId,
                    Action = "TENANT_RESTORE_FAILED",
                    Details = $"[Op={operationId}][State=Failed] Restore failed ({errCategory}: {errMsg}).",
                    PerformedBy = actor,
                    Timestamp = DateTime.UtcNow
                });
                await scopedDb.SaveChangesAsync(CancellationToken.None);
            }
        }

        private async Task<bool> IsAnyRestoreActiveAsync(CancellationToken cancellationToken)
        {
            if (_concurrencyGate.IsHeld || !_activeBackgroundTasks.IsEmpty)
            {
                return true;
            }

            await SyncHostStateFilesIfPresentAsync(cancellationToken);
            var allRecords = await LoadAllJobRecordsAsync(_dbContext, cancellationToken);
            return allRecords.Any(r => !r.IsTerminal);
        }

        private async Task SyncHostStateFilesIfPresentAsync(CancellationToken cancellationToken)
        {
            try
            {
                var jobsDir = Path.Combine(_hostStateDirectory, "restore-jobs");
                var candidateFiles = new List<string>();
                if (Directory.Exists(jobsDir))
                {
                    candidateFiles.AddRange(Directory.GetFiles(jobsDir, "restore-*.json"));
                }

                var lastRestoreFile = Path.Combine(_hostStateDirectory, "last-restore.json");
                if (File.Exists(lastRestoreFile))
                {
                    candidateFiles.Add(lastRestoreFile);
                }

                if (candidateFiles.Count == 0)
                {
                    return;
                }

                var modified = false;
                foreach (var file in candidateFiles)
                {
                    var json = await File.ReadAllTextAsync(file, cancellationToken);
                    if (string.IsNullOrWhiteSpace(json)) continue;

                    var parsed = HostCliTenantRestoreBridge.ParseHostStateJson(json, null, string.Empty);
                    if (string.IsNullOrWhiteSpace(parsed.OperationId)
                        || !OperationIdRegex.IsMatch(parsed.OperationId)
                        || parsed.TenantId <= 0)
                    {
                        continue;
                    }

                    var existing = await LoadJobRecordAsync(_dbContext, parsed.OperationId, cancellationToken);
                    if (existing != null && existing.IsTerminal && existing.StateHistory.Count >= parsed.StateHistory.Count)
                    {
                        continue;
                    }

                    var ent = await _dbContext.Enterprises
                        .AsNoTracking()
                        .FirstOrDefaultAsync(e => e.Id == parsed.TenantId, cancellationToken);

                    var isTerminal = BrowserPayloadSanitizer.IsTerminalState(parsed.FinalState);
                    var record = existing ?? new PersistedRestoreJobRecord
                    {
                        OperationId = parsed.OperationId,
                        TenantId = parsed.TenantId,
                        TenantName = ent?.Name ?? parsed.TenantSlug ?? $"Tenant #{parsed.TenantId}",
                        TenantSlug = parsed.TenantSlug ?? ent?.Slug ?? string.Empty,
                        SchemaName = parsed.SchemaName ?? ent?.SchemaName ?? string.Empty,
                        SnapshotId = parsed.SnapshotId,
                        SnapshotShortId = parsed.SnapshotId.Length >= 8 ? parsed.SnapshotId[..8] : parsed.SnapshotId,
                        RequestedBy = "SuperAdmin",
                        StartedAtUtc = parsed.StartedAtUtc
                    };

                    record.CurrentState = parsed.FinalState.ToString();
                    record.FinalState = isTerminal ? parsed.FinalState.ToString() : null;
                    record.IsTerminal = isTerminal;
                    record.Outcome = BrowserPayloadSanitizer.DescribeOutcome(parsed.FinalState);
                    record.StateHistory = parsed.StateHistory.Select(s => s.ToString()).ToList();
                    record.ExtractedDumpSha256 = parsed.ExtractedDumpSha256;
                    record.PreRestoreBackupCreated = !string.IsNullOrWhiteSpace(parsed.PreRestoreBackupSha256);
                    record.PreRestoreBackupSha256 = parsed.PreRestoreBackupSha256;
                    record.StagingTableCount = parsed.StagingTableCount;
                    record.RestoredTableCount = parsed.RestoredTableCount;
                    record.UnaffectedTenantCount = parsed.UnaffectedTenantCount;
                    record.RecoveryArtifactsRetained = parsed.RecoveryArtifactsRetained;
                    record.RollbackPerformed = parsed.RollbackPerformed;
                    record.RollbackSucceeded = parsed.RollbackSucceeded;
                    record.ErrorCategory = parsed.ErrorCategory;
                    record.ErrorMessage = BrowserPayloadSanitizer.SanitizeText(parsed.ErrorMessage);
                    record.UpdatedAtUtc = DateTime.UtcNow;
                    record.FinishedAtUtc = isTerminal ? parsed.FinishedAtUtc : null;

                    await SaveJobRecordAsync(_dbContext, record, cancellationToken);
                    modified = true;
                }

                if (modified)
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Non-fatal error syncing host restore state files.");
            }
        }

        private static TenantSnapshotRestorePointDto MapToRestorePointDto(TenantCatalogHistoryEntry entry)
        {
            return new TenantSnapshotRestorePointDto(
                entry.SnapshotId,
                entry.SnapshotShortId,
                entry.SnapshotTimestamp,
                entry.DumpSize,
                entry.ManifestSha256,
                entry.ChecksumVerificationStatus,
                entry.SnapshotVerificationStatus,
                entry.TenantPresenceStatus,
                entry.RestoreEligibility,
                entry.IneligibilityReason,
                BrowserPayloadSanitizer.GetIneligibilityExplanation(
                    entry.IneligibilityReason,
                    entry.SnapshotVerificationStatus,
                    entry.TenantPresenceStatus));
        }

        private static async Task<PersistedRestoreJobRecord?> LoadJobRecordAsync(
            MasterDbContext dbContext,
            string operationId,
            CancellationToken cancellationToken)
        {
            var key = $"{RestoreOpKeyPrefix}{operationId}";
            var setting = await dbContext.PlatformSettings
                .FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
            if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
            {
                return null;
            }
            return JsonSerializer.Deserialize<PersistedRestoreJobRecord>(setting.Value);
        }

        private static async Task<List<PersistedRestoreJobRecord>> LoadAllJobRecordsAsync(
            MasterDbContext dbContext,
            CancellationToken cancellationToken)
        {
            var settings = await dbContext.PlatformSettings
                .AsNoTracking()
                .Where(s => s.Key.StartsWith(RestoreOpKeyPrefix))
                .ToListAsync(cancellationToken);

            var list = new List<PersistedRestoreJobRecord>(settings.Count);
            foreach (var s in settings)
            {
                if (string.IsNullOrWhiteSpace(s.Value)) continue;
                try
                {
                    var rec = JsonSerializer.Deserialize<PersistedRestoreJobRecord>(s.Value);
                    if (rec != null)
                    {
                        list.Add(rec);
                    }
                }
                catch
                {
                    // Skip malformed entry
                }
            }
            return list;
        }

        private static async Task SaveJobRecordAsync(
            MasterDbContext dbContext,
            PersistedRestoreJobRecord record,
            CancellationToken cancellationToken)
        {
            var json = JsonSerializer.Serialize(record);
            var opKey = $"{RestoreOpKeyPrefix}{record.OperationId}";
            var latestKey = $"{RestoreLatestTenantKeyPrefix}{record.TenantId}";
            var now = DateTime.UtcNow;

            var opSetting = await dbContext.PlatformSettings
                .FirstOrDefaultAsync(s => s.Key == opKey, cancellationToken);
            if (opSetting == null)
            {
                await dbContext.PlatformSettings.AddAsync(new PlatformSetting
                {
                    Key = opKey,
                    Value = json,
                    UpdatedAt = now
                }, cancellationToken);
            }
            else
            {
                opSetting.Value = json;
                opSetting.UpdatedAt = now;
            }

            var latestSetting = await dbContext.PlatformSettings
                .FirstOrDefaultAsync(s => s.Key == latestKey, cancellationToken);
            if (latestSetting == null)
            {
                await dbContext.PlatformSettings.AddAsync(new PlatformSetting
                {
                    Key = latestKey,
                    Value = record.OperationId,
                    UpdatedAt = now
                }, cancellationToken);
            }
            else
            {
                latestSetting.Value = record.OperationId;
                latestSetting.UpdatedAt = now;
            }
        }

        private static async Task<TenantRestoreJobStatusDto> BuildJobStatusDtoAsync(
            MasterDbContext dbContext,
            PersistedRestoreJobRecord record,
            CancellationToken cancellationToken)
        {
            var opTag = $"[Op={record.OperationId}]";
            var rawAudits = await dbContext.MasterAuditLogs
                .AsNoTracking()
                .Where(a => a.TenantId == record.TenantId && a.Details != null && a.Details.Contains(opTag))
                .OrderBy(a => a.Timestamp)
                .ThenBy(a => a.Id)
                .ToListAsync(cancellationToken);

            var auditEntries = new List<TenantRestoreAuditEntryDto>(rawAudits.Count);
            foreach (var a in rawAudits)
            {
                var details = a.Details ?? string.Empty;
                var stateName = record.CurrentState;
                var stateStart = details.IndexOf("[State=", StringComparison.Ordinal);
                if (stateStart >= 0)
                {
                    var closeIdx = details.IndexOf(']', stateStart);
                    if (closeIdx > stateStart + 7)
                    {
                        stateName = details[(stateStart + 7)..closeIdx];
                        details = details[(closeIdx + 1)..].Trim();
                    }
                }
                else if (details.StartsWith(opTag, StringComparison.Ordinal))
                {
                    details = details[opTag.Length..].Trim();
                }

                auditEntries.Add(new TenantRestoreAuditEntryDto(
                    a.Timestamp,
                    record.OperationId,
                    stateName,
                    a.Action,
                    BrowserPayloadSanitizer.SanitizeText(details) ?? string.Empty,
                    a.PerformedBy));
            }

            return new TenantRestoreJobStatusDto(
                record.OperationId,
                record.TenantId,
                record.TenantName,
                record.TenantSlug,
                record.SchemaName,
                record.SnapshotId,
                record.SnapshotShortId,
                record.SnapshotTimestamp,
                record.CurrentState,
                record.FinalState,
                record.IsTerminal,
                record.Outcome,
                record.StateHistory,
                record.ExtractedDumpSha256,
                record.PreRestoreBackupCreated,
                record.PreRestoreBackupSha256,
                record.StagingTableCount,
                record.RestoredTableCount,
                record.UnaffectedTenantCount,
                record.RecoveryArtifactsRetained,
                record.RollbackPerformed,
                record.RollbackSucceeded,
                record.ErrorCategory,
                BrowserPayloadSanitizer.SanitizeText(record.ErrorMessage),
                record.RequestedBy,
                record.StartedAtUtc,
                record.UpdatedAtUtc,
                record.FinishedAtUtc,
                auditEntries);
        }
    }
}
