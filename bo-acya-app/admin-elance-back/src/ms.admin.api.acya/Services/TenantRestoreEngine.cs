using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public enum TenantRestoreState
    {
        Pending,
        Extracting,
        Verifying,
        Staging,
        Prepared,
        BackingUpCurrent,
        CuttingOver,
        Validating,
        Completed,
        Failed,
        RollingBack,
        RolledBack,
        RollbackFailed
    }

    public sealed class TenantRestoreException : Exception
    {
        public TenantRestoreState Stage { get; }
        public string Category { get; }

        public TenantRestoreException(TenantRestoreState stage, string category, string message)
            : base(message)
        {
            Stage = stage;
            Category = category;
        }
    }

    public sealed record TenantCatalogSnapshotEntry(
        string SnapshotId,
        string SnapshotShortId,
        string SnapshotTimestamp,
        string? StagingRoot,
        string SnapshotVerificationStatus);

    public sealed record TenantCatalogHistoryEntry(
        string SnapshotId,
        string SnapshotShortId,
        string SnapshotTimestamp,
        long? TenantId,
        string TenantSlug,
        string SchemaName,
        string? DumpFilename,
        long? DumpSize,
        string? ManifestSha256,
        string ChecksumVerificationStatus,
        string SnapshotVerificationStatus,
        string TenantPresenceStatus,
        bool RestoreEligibility,
        string? IneligibilityReason);

    public sealed record TenantBackupHistoryCatalog(
        IReadOnlyList<TenantCatalogSnapshotEntry> Snapshots,
        IReadOnlyList<TenantCatalogHistoryEntry> Entries,
        string Schema = "acya.backup.tenant-history/v1",
        string? GeneratedAt = null);

    public sealed record TenantRestoreProgressUpdate(
        string OperationId,
        long TenantId,
        string? TenantSlug,
        string? SchemaName,
        string SnapshotId,
        TenantRestoreState CurrentState,
        IReadOnlyList<TenantRestoreState> StateHistory,
        string Details,
        string? ExtractedDumpSha256 = null,
        bool PreRestoreBackupCreated = false,
        string? PreRestoreBackupSha256 = null,
        int? StagingTableCount = null,
        int? RestoredTableCount = null,
        int? UnaffectedTenantCount = null);

    public sealed record ValidatedTenantRestoreTarget(
        long TenantId,
        string TenantSlug,
        string SchemaName,
        string SnapshotId,
        string SnapshotShortId,
        string SnapshotTimestamp,
        string StagingRoot,
        string DumpRelativePath,
        long ExpectedDumpSize,
        string ExpectedSha256,
        bool OriginalIsActive);

    public sealed record ExtractedTenantArtifacts(
        string WorkDirectory,
        string ExtractedDumpPath,
        long ExtractedDumpSizeBytes,
        string ManifestTxtContent,
        string TenantRegistryJsonContent,
        string? ManifestJsonContent);

    public sealed record TenantSchemaFingerprintRecord(
        string SchemaName,
        long SchemaOid,
        string Owner,
        int TableCount,
        int SequenceCount,
        int ConstraintCount,
        IReadOnlyList<string> TableNames,
        long TotalLiveRows);

    public sealed record PreRestoreBackupArtifact(
        string BackupFilePath,
        string Sha256FilePath,
        string Sha256Digest,
        long SizeBytes);

    public sealed class TenantRestoreResult
    {
        public string OperationId { get; init; } = string.Empty;
        public long TenantId { get; init; }
        public string? TenantSlug { get; init; }
        public string? SchemaName { get; init; }
        public string SnapshotId { get; init; } = string.Empty;
        public TenantRestoreState FinalState { get; init; }
        public IReadOnlyList<TenantRestoreState> StateHistory { get; init; } = Array.Empty<TenantRestoreState>();
        public string? ExtractedDumpSha256 { get; init; }
        public string? PreRestoreBackupPath { get; init; }
        public string? PreRestoreBackupSha256 { get; init; }
        public string? StagingDatabaseName { get; init; }
        public int? StagingTableCount { get; init; }
        public int? RestoredTableCount { get; init; }
        public int? UnaffectedTenantCount { get; init; }
        public bool RecoveryArtifactsRetained { get; init; }
        public string? WorkDirectory { get; init; }
        public string? ErrorCategory { get; init; }
        public string? ErrorMessage { get; init; }
        public bool RollbackPerformed { get; init; }
        public bool? RollbackSucceeded { get; init; }
        public DateTime StartedAtUtc { get; init; }
        public DateTime FinishedAtUtc { get; init; }
    }

    public interface ITenantRestoreCatalogProvider
    {
        Task<TenantBackupHistoryCatalog> LoadCatalogAsync(CancellationToken cancellationToken = default);
    }

    public interface IResticSnapshotExtractor
    {
        Task<ExtractedTenantArtifacts> ExtractTenantArtifactsAsync(
            ValidatedTenantRestoreTarget target,
            string workDirectory,
            CancellationToken cancellationToken = default);
    }

    public interface ITenantDatabaseRestoreOperator
    {
        string ProductionDatabaseName { get; }

        Task<string> InspectArchiveTocAsync(string dumpPath, CancellationToken cancellationToken = default);

        Task CreateStagingDatabaseAsync(string stagingDatabaseName, CancellationToken cancellationToken = default);

        Task DropStagingDatabaseIfExistsAsync(string stagingDatabaseName, CancellationToken cancellationToken = default);

        Task RestoreDumpToDatabaseAsync(
            string databaseName,
            string schemaName,
            string dumpPath,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<string>> ListNonSystemSchemasAsync(
            string databaseName,
            CancellationToken cancellationToken = default);

        Task<TenantSchemaFingerprintRecord?> InspectSchemaFingerprintAsync(
            string databaseName,
            string schemaName,
            CancellationToken cancellationToken = default);

        Task<PreRestoreBackupArtifact> CreatePreRestoreBackupAsync(
            string schemaName,
            string workDirectory,
            CancellationToken cancellationToken = default);

        Task TerminateTenantSessionsAsync(string schemaName, CancellationToken cancellationToken = default);

        Task RenameProductionSchemaAsync(
            string currentSchemaName,
            string rollbackSchemaName,
            CancellationToken cancellationToken = default);

        Task PreserveSchemaOwnershipAndPermissionsAsync(
            string schemaName,
            string ownerRole,
            CancellationToken cancellationToken = default);

        Task DropRollbackSchemaIfExistsAsync(
            string rollbackSchemaName,
            CancellationToken cancellationToken = default);

        Task RollbackProductionSchemaAsync(
            string schemaName,
            string rollbackSchemaName,
            string? preRestoreDumpPath,
            CancellationToken cancellationToken = default);
    }

    public sealed class FileTenantRestoreCatalogProvider : ITenantRestoreCatalogProvider
    {
        private readonly string _catalogPath;

        public FileTenantRestoreCatalogProvider(string catalogPath = "/opt/acya-backup/state/tenant-backup-history.json")
        {
            _catalogPath = catalogPath;
        }

        public async Task<TenantBackupHistoryCatalog> LoadCatalogAsync(CancellationToken cancellationToken = default)
        {
            if (!File.Exists(_catalogPath))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "history_catalog_missing",
                    "Trusted tenant backup history catalog file does not exist.");
            }

            using var stream = File.OpenRead(_catalogPath);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = doc.RootElement;

            var snapshots = new List<TenantCatalogSnapshotEntry>();
            if (root.TryGetProperty("snapshots", out var snapsEl) && snapsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in snapsEl.EnumerateArray())
                {
                    snapshots.Add(new TenantCatalogSnapshotEntry(
                        item.GetProperty("snapshotId").GetString() ?? string.Empty,
                        item.GetProperty("snapshotShortId").GetString() ?? string.Empty,
                        item.GetProperty("snapshotTimestamp").GetString() ?? string.Empty,
                        item.TryGetProperty("stagingRoot", out var sr) && sr.ValueKind == JsonValueKind.String ? sr.GetString() : null,
                        item.GetProperty("snapshotVerificationStatus").GetString() ?? string.Empty));
                }
            }

            var entries = new List<TenantCatalogHistoryEntry>();
            if (root.TryGetProperty("entries", out var entriesEl) && entriesEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in entriesEl.EnumerateArray())
                {
                    long? tenantId = item.TryGetProperty("tenantId", out var tid) && tid.ValueKind == JsonValueKind.Number
                        ? tid.GetInt64()
                        : null;
                    long? dumpSize = item.TryGetProperty("dumpSize", out var ds) && ds.ValueKind == JsonValueKind.Number
                        ? ds.GetInt64()
                        : null;
                    entries.Add(new TenantCatalogHistoryEntry(
                        item.GetProperty("snapshotId").GetString() ?? string.Empty,
                        item.GetProperty("snapshotShortId").GetString() ?? string.Empty,
                        item.GetProperty("snapshotTimestamp").GetString() ?? string.Empty,
                        tenantId,
                        item.GetProperty("tenantSlug").GetString() ?? string.Empty,
                        item.GetProperty("schemaName").GetString() ?? string.Empty,
                        item.TryGetProperty("dumpFilename", out var df) && df.ValueKind == JsonValueKind.String ? df.GetString() : null,
                        dumpSize,
                        item.TryGetProperty("manifestSha256", out var ms) && ms.ValueKind == JsonValueKind.String ? ms.GetString() : null,
                        item.GetProperty("checksumVerificationStatus").GetString() ?? string.Empty,
                        item.GetProperty("snapshotVerificationStatus").GetString() ?? string.Empty,
                        item.GetProperty("tenantPresenceStatus").GetString() ?? string.Empty,
                        item.GetProperty("restoreEligibility").GetBoolean(),
                        item.TryGetProperty("ineligibilityReason", out var ir) && ir.ValueKind == JsonValueKind.String ? ir.GetString() : null));
                }
            }

            var schema = root.TryGetProperty("schema", out var scEl) && scEl.ValueKind == JsonValueKind.String
                ? scEl.GetString() ?? "acya.backup.tenant-history/v1"
                : "acya.backup.tenant-history/v1";
            var generatedAt = root.TryGetProperty("generatedAt", out var genEl) && genEl.ValueKind == JsonValueKind.String
                ? genEl.GetString()
                : null;

            return new TenantBackupHistoryCatalog(snapshots, entries, schema, generatedAt);
        }
    }

    public static class TenantRestoreValidator
    {
        private static readonly Regex SnapshotIdRegex = new(@"^[0-9a-f]{8,64}$", RegexOptions.Compiled);
        private static readonly Regex FullSnapshotIdRegex = new(@"^[0-9a-f]{64}$", RegexOptions.Compiled);
        private static readonly Regex Sha256Regex = new(@"^[0-9a-f]{64}$", RegexOptions.Compiled);
        private static readonly Regex SlugRegex = new(@"^[a-z0-9][a-z0-9_-]{0,59}$", RegexOptions.Compiled);
        private static readonly Regex TenantSchemaRegex = new(@"^tenant_[a-z0-9_]{1,57}$", RegexOptions.Compiled);
        private static readonly Regex StageRootRegex = new(
            @"^(/opt/acya-backup/staging/stage-[A-Za-z0-9_-]+|/var/backups/acya-backup-stage-[A-Za-z0-9_-]+|/home/ubuntu/acya-backup-stage)$",
            RegexOptions.Compiled);
        private static readonly Regex TocLineRegex = new(
            @"^\s*\d+;\s+\d+\s+\d+\s+([A-Z][A-Z ]*?)\s+(\S+)\s+(\S+)\s+(\S+)\s*$",
            RegexOptions.Compiled);

        private static readonly HashSet<string> ForbiddenTocObjectTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "ROLE",
            "DATABASE",
            "TABLESPACE",
            "EXTENSION",
            "EVENT TRIGGER",
            "PUBLICATION",
            "SUBSCRIPTION",
            "FOREIGN DATA WRAPPER",
            "SERVER"
        };

        public static string ExpectedSchemaForSlug(string slug)
        {
            var normalized = Regex.Replace(slug.ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_');
            return $"tenant_{normalized}";
        }

        public static ValidatedTenantRestoreTarget ValidateRequest(
            long tenantId,
            string? snapshotId,
            MasterEnterprise? liveEnterprise,
            TenantBackupHistoryCatalog catalog)
        {
            if (tenantId <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_id",
                    $"Tenant ID must be a positive integer (received {tenantId}).");
            }

            if (string.IsNullOrWhiteSpace(snapshotId) || !SnapshotIdRegex.IsMatch(snapshotId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_snapshot_id",
                    "Snapshot ID must be an 8-to-64 character lowercase hexadecimal identifier.");
            }

            if (liveEnterprise == null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_found_in_registry",
                    $"Tenant ID {tenantId} does not exist in the master enterprise registry.");
            }

            var liveSlug = (liveEnterprise.Slug ?? string.Empty).Trim();
            var liveSchema = (liveEnterprise.SchemaName ?? string.Empty).Trim();
            if (!SlugRegex.IsMatch(liveSlug)
                || !TenantSchemaRegex.IsMatch(liveSchema)
                || !SchemaSanitizer.IsValidIdentifier(liveSchema)
                || !string.Equals(ExpectedSchemaForSlug(liveSlug), liveSchema, StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_tenant_schema_mapping",
                    $"Live registry mapping for tenant {tenantId} ({liveSlug} -> {liveSchema}) is invalid.");
            }

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
            if (!FullSnapshotIdRegex.IsMatch(snap.SnapshotId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_snapshot_id",
                    "Catalog snapshot ID is not a valid 64-character hex digest.");
            }

            if (!string.Equals(snap.SnapshotVerificationStatus, "verified", StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "snapshot_not_verified",
                    $"Snapshot '{snap.SnapshotShortId}' has verification status '{snap.SnapshotVerificationStatus}' and is not eligible for restore.");
            }

            if (string.IsNullOrWhiteSpace(snap.StagingRoot) || !StageRootRegex.IsMatch(snap.StagingRoot))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "staging_root_invalid",
                    $"Snapshot '{snap.SnapshotShortId}' has an invalid staging root.");
            }

            var matchingEntries = catalog.Entries
                .Where(e => e.SnapshotId == snap.SnapshotId
                         && (e.TenantId == tenantId || string.Equals(e.TenantSlug, liveSlug, StringComparison.Ordinal)))
                .ToList();

            if (matchingEntries.Count != 1)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_entry_not_found_in_catalog",
                    $"Tenant {tenantId} has no catalog entry for snapshot '{snap.SnapshotShortId}'.");
            }

            var entry = matchingEntries[0];
            if (!string.Equals(entry.SnapshotVerificationStatus, "verified", StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "snapshot_degraded_or_invalid",
                    $"Snapshot '{snap.SnapshotShortId}' is '{entry.SnapshotVerificationStatus}'.");
            }

            if (!string.Equals(entry.TenantPresenceStatus, "present", StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "tenant_not_present_in_snapshot",
                    $"Tenant {tenantId} is unavailable in snapshot '{snap.SnapshotShortId}' ({entry.IneligibilityReason ?? entry.TenantPresenceStatus}).");
            }

            if (!entry.RestoreEligibility || entry.IneligibilityReason != null)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "snapshot_restore_ineligible",
                    $"Snapshot '{snap.SnapshotShortId}' is ineligible for tenant {tenantId}: {entry.IneligibilityReason ?? "ineligible"}.");
            }

            if (!string.Equals(entry.TenantSlug, liveSlug, StringComparison.Ordinal)
                || !string.Equals(entry.SchemaName, liveSchema, StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "catalog_registry_mapping_mismatch",
                    "Catalog tenant/schema mapping does not match the live enterprise registry.");
            }

            var expectedRelDump = $"tenants/{liveSchema}.dump";
            if (!string.Equals(entry.DumpFilename, expectedRelDump, StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "unexpected_dump_filename",
                    $"Catalog dump filename '{entry.DumpFilename}' does not match '{expectedRelDump}'.");
            }

            if (entry.DumpSize is null or <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_dump_size",
                    "Catalog dump size must be a positive integer.");
            }

            if (string.IsNullOrWhiteSpace(entry.ManifestSha256) || !Sha256Regex.IsMatch(entry.ManifestSha256))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "missing_manifest_sha256",
                    "Catalog entry is missing a valid 64-character SHA-256 manifest digest.");
            }

            return new ValidatedTenantRestoreTarget(
                tenantId,
                liveSlug,
                liveSchema,
                snap.SnapshotId,
                snap.SnapshotShortId,
                entry.SnapshotTimestamp,
                snap.StagingRoot,
                expectedRelDump,
                entry.DumpSize.Value,
                entry.ManifestSha256,
                liveEnterprise.IsActive);
        }

        public static string VerifyExtractedDumpAndToc(
            ValidatedTenantRestoreTarget target,
            ExtractedTenantArtifacts artifacts,
            string tocText)
        {
            if (!File.Exists(artifacts.ExtractedDumpPath))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "extracted_dump_missing",
                    "Extracted tenant dump file does not exist on disk.");
            }

            var fileInfo = new FileInfo(artifacts.ExtractedDumpPath);
            if (fileInfo.Length <= 0 || fileInfo.Length != target.ExpectedDumpSize)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "extracted_dump_size_mismatch",
                    $"Extracted dump size ({fileInfo.Length}) does not match expected size ({target.ExpectedDumpSize}).");
            }

            // Verify manifest.txt contains the expected SHA-256 for this tenant dump
            var expectedFullPath = $"{target.StagingRoot.TrimEnd('/')}/{target.DumpRelativePath}";
            var manifestMatchFound = false;
            foreach (var rawLine in artifacts.ManifestTxtContent.Split('\n'))
            {
                var line = rawLine.Trim();
                if (line.Length < 66) continue;
                var parts = line.Split(new[] { ' ', '\t' }, 2, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2 && Sha256Regex.IsMatch(parts[0]))
                {
                    var pathPart = parts[1].Trim();
                    if (pathPart == expectedFullPath || pathPart == target.DumpRelativePath)
                    {
                        if (!string.Equals(parts[0], target.ExpectedSha256, StringComparison.Ordinal))
                        {
                            throw new TenantRestoreException(
                                TenantRestoreState.Verifying,
                                "manifest_catalog_sha256_mismatch",
                                "Extracted manifest.txt SHA-256 does not match the catalog SHA-256.");
                        }
                        manifestMatchFound = true;
                    }
                }
            }

            if (!manifestMatchFound)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "manifest_entry_missing",
                    "Extracted manifest.txt does not contain an entry for the target tenant dump.");
            }

            // Compute actual SHA-256 of extracted dump file
            string actualSha256;
            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(artifacts.ExtractedDumpPath))
            {
                actualSha256 = Convert.ToHexString(sha.ComputeHash(stream)).ToLowerInvariant();
            }

            if (!string.Equals(actualSha256, target.ExpectedSha256, StringComparison.Ordinal))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "checksum_mismatch",
                    $"Extracted dump SHA-256 ({actualSha256}) does not match manifest SHA-256 ({target.ExpectedSha256}).");
            }

            // Validate pg_restore -l TOC
            ValidateArchiveTocSingleSchema(tocText, target.SchemaName);
            return actualSha256;
        }

        public static void ValidateArchiveTocSingleSchema(string tocText, string expectedSchema)
        {
            if (string.IsNullOrWhiteSpace(tocText))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "archive_toc_empty",
                    "Archive TOC is empty.");
            }

            var hasExpectedSchemaObjects = false;
            var tableCount = 0;

            foreach (var rawLine in tocText.Split('\n'))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrEmpty(line) || line.StartsWith(';'))
                {
                    continue;
                }

                var match = TocLineRegex.Match(line);
                if (!match.Success)
                {
                    continue;
                }

                var objType = match.Groups[1].Value.Trim();
                var objSchema = match.Groups[2].Value.Trim();
                var objName = match.Groups[3].Value.Trim();

                if (ForbiddenTocObjectTypes.Contains(objType))
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Verifying,
                        "forbidden_global_object_in_dump",
                        $"Tenant dump contains forbidden global object '{objType}' ({objName}).");
                }

                if (string.Equals(objType, "SCHEMA", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.Equals(objName, expectedSchema, StringComparison.Ordinal))
                    {
                        throw new TenantRestoreException(
                            TenantRestoreState.Verifying,
                            "foreign_schema_in_dump",
                            $"Tenant dump attempts to create foreign schema '{objName}'.");
                    }
                    hasExpectedSchemaObjects = true;
                    continue;
                }

                if (objSchema != "-" && !string.Equals(objSchema, expectedSchema, StringComparison.Ordinal))
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Verifying,
                        "foreign_schema_object_in_dump",
                        $"Tenant dump contains object '{objName}' in foreign schema '{objSchema}'.");
                }

                if (string.Equals(objSchema, expectedSchema, StringComparison.Ordinal))
                {
                    hasExpectedSchemaObjects = true;
                    if (string.Equals(objType, "TABLE", StringComparison.OrdinalIgnoreCase))
                    {
                        tableCount++;
                    }
                }
            }

            if (!hasExpectedSchemaObjects || tableCount <= 0)
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Verifying,
                    "expected_schema_missing_in_dump",
                    $"Archive TOC contains no tables for expected schema '{expectedSchema}'.");
            }
        }
    }

    public sealed class TenantRestoreConcurrencyGate
    {
        private readonly SemaphoreSlim _semaphore = new(1, 1);

        public bool IsHeld => _semaphore.CurrentCount == 0;

        public Task<bool> TryAcquireAsync(CancellationToken cancellationToken = default)
            => _semaphore.WaitAsync(0, cancellationToken);

        public void Release()
            => _semaphore.Release();
    }

    public sealed class TenantRestoreEngine
    {
        private static readonly TenantRestoreConcurrencyGate DefaultEngineGate = new();
        private static readonly Regex OperationIdRegex = new(@"^restore-\d{8}T\d{6}Z-[0-9a-f]{8}$", RegexOptions.Compiled);

        private readonly MasterDbContext _dbContext;
        private readonly ITenantRestoreCatalogProvider _catalogProvider;
        private readonly IResticSnapshotExtractor _extractor;
        private readonly ITenantDatabaseRestoreOperator _dbOperator;
        private readonly ILogger<TenantRestoreEngine> _logger;
        private readonly string _workRootDirectory;
        private readonly TenantRestoreConcurrencyGate _concurrencyGate;

        public TenantRestoreEngine(
            MasterDbContext dbContext,
            ITenantRestoreCatalogProvider catalogProvider,
            IResticSnapshotExtractor extractor,
            ITenantDatabaseRestoreOperator dbOperator,
            ILogger<TenantRestoreEngine> logger,
            string workRootDirectory = "/opt/acya-backup/restore-work",
            TenantRestoreConcurrencyGate? concurrencyGate = null)
        {
            _dbContext = dbContext;
            _catalogProvider = catalogProvider;
            _extractor = extractor;
            _dbOperator = dbOperator;
            _logger = logger;
            _workRootDirectory = workRootDirectory;
            _concurrencyGate = concurrencyGate ?? DefaultEngineGate;
        }

        public Task<TenantRestoreResult> ExecuteRestoreAsync(
            long tenantId,
            string snapshotId,
            string performedBy,
            CancellationToken cancellationToken = default)
            => ExecuteRestoreAsync(tenantId, snapshotId, performedBy, null, null, false, cancellationToken);

        public async Task<TenantRestoreResult> ExecuteRestoreAsync(
            long tenantId,
            string snapshotId,
            string performedBy,
            string? preAllocatedOperationId,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task>? onStateTransition,
            bool lockAlreadyHeld = false,
            CancellationToken cancellationToken = default)
        {
            var operationId = string.IsNullOrWhiteSpace(preAllocatedOperationId)
                ? $"restore-{DateTime.UtcNow:yyyyMMddTHHmmssZ}-{Guid.NewGuid().ToString("N")[..8]}"
                : preAllocatedOperationId;

            if (!OperationIdRegex.IsMatch(operationId))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "invalid_operation_id",
                    "Operation ID format is invalid.");
            }

            var shortToken = operationId.Split('-')[^1];
            var startedAt = DateTime.UtcNow;

            if (!lockAlreadyHeld && !await _concurrencyGate.TryAcquireAsync(cancellationToken))
            {
                await RecordAuditAsync(
                    operationId,
                    tenantId > 0 ? tenantId : null,
                    TenantRestoreState.Failed,
                    "TENANT_RESTORE_CONCURRENT_REJECTED",
                    $"Rejected concurrent restore request for snapshot '{snapshotId}'. Another restore operation is active.",
                    performedBy,
                    cancellationToken);

                throw new TenantRestoreException(
                    TenantRestoreState.Pending,
                    "concurrent_restore_in_progress",
                    "Another tenant restore operation is currently active.");
            }

            try
            {
                return await RunRestoreStateMachineAsync(
                    operationId,
                    shortToken,
                    startedAt,
                    tenantId,
                    snapshotId,
                    performedBy,
                    onStateTransition,
                    cancellationToken);
            }
            finally
            {
                if (!lockAlreadyHeld)
                {
                    _concurrencyGate.Release();
                }
            }
        }

        private async Task<TenantRestoreResult> RunRestoreStateMachineAsync(
            string operationId,
            string shortToken,
            DateTime startedAt,
            long tenantId,
            string snapshotId,
            string performedBy,
            Func<TenantRestoreProgressUpdate, CancellationToken, Task>? onStateTransition,
            CancellationToken cancellationToken)
        {
            var stateHistory = new List<TenantRestoreState> { TenantRestoreState.Pending };
            ValidatedTenantRestoreTarget? target = null;
            MasterEnterprise? targetEnterprise = null;
            var workDir = Path.Combine(_workRootDirectory, operationId);
            var stagingDbName = $"acya_restore_stage_{shortToken}";
            string? rollbackSchemaName = null;
            var cutoverStarted = false;
            var tenantDeactivated = false;
            PreRestoreBackupArtifact? preBackup = null;
            string? verifiedSha256 = null;
            int? stagingTableCount = null;
            int? restoredTableCount = null;
            int? unaffectedCount = null;

            async Task NotifyProgressAsync(TenantRestoreState currentState, string details)
            {
                if (onStateTransition == null) return;
                await onStateTransition(
                    new TenantRestoreProgressUpdate(
                        operationId,
                        target?.TenantId ?? tenantId,
                        target?.TenantSlug,
                        target?.SchemaName,
                        target?.SnapshotId ?? snapshotId,
                        currentState,
                        stateHistory.ToArray(),
                        details,
                        verifiedSha256,
                        preBackup != null,
                        preBackup?.Sha256Digest,
                        stagingTableCount,
                        restoredTableCount,
                        unaffectedCount),
                    cancellationToken);
            }

            async Task TransitionAsync(TenantRestoreState nextState, string details)
            {
                stateHistory.Add(nextState);
                await RecordAuditAsync(
                    operationId,
                    target?.TenantId ?? (tenantId > 0 ? tenantId : null),
                    nextState,
                    $"TENANT_RESTORE_{nextState.ToString().ToUpperInvariant()}",
                    details,
                    performedBy,
                    cancellationToken);
                await NotifyProgressAsync(nextState, details);
            }

            const string initialDetails = "Initiating single-tenant restore request.";
            await RecordAuditAsync(
                operationId,
                tenantId > 0 ? tenantId : null,
                TenantRestoreState.Pending,
                "TENANT_RESTORE_PENDING",
                $"Initiating single-tenant restore request for tenantId={tenantId}, snapshotId={snapshotId}.",
                performedBy,
                cancellationToken);
            await NotifyProgressAsync(TenantRestoreState.Pending, initialDetails);

            try
            {
                // 1. Pending: Validate request and resolve exclusively from catalog + MasterDbContext
                var allEnterprises = await _dbContext.Enterprises.ToListAsync(cancellationToken);
                targetEnterprise = allEnterprises.FirstOrDefault(e => e.Id == tenantId);
                var catalog = await _catalogProvider.LoadCatalogAsync(cancellationToken);

                target = TenantRestoreValidator.ValidateRequest(tenantId, snapshotId, targetEnterprise, catalog);
                rollbackSchemaName = $"{target.SchemaName[..Math.Min(45, target.SchemaName.Length)]}__rb_{shortToken}";

                // Capture baseline fingerprints of all 15 unaffected tenants
                var unaffectedBefore = await CaptureUnaffectedFingerprintsAsync(
                    target.SchemaName,
                    allEnterprises,
                    cancellationToken);
                unaffectedCount = unaffectedBefore.Count;

                // 2. Extracting: Extract only the selected tenant dump and metadata via read-only Restic
                await TransitionAsync(
                    TenantRestoreState.Extracting,
                    $"Extracting {target.DumpRelativePath} from verified snapshot {target.SnapshotShortId}.");
                Directory.CreateDirectory(workDir);
                var extracted = await _extractor.ExtractTenantArtifactsAsync(target, workDir, cancellationToken);

                // 3. Verifying: Verify SHA-256 against manifest and inspect archive TOC
                await TransitionAsync(
                    TenantRestoreState.Verifying,
                    $"Verifying SHA-256 and TOC for {target.SchemaName} against manifest digest {target.ExpectedSha256}.");
                var tocText = await _dbOperator.InspectArchiveTocAsync(extracted.ExtractedDumpPath, cancellationToken);
                verifiedSha256 = TenantRestoreValidator.VerifyExtractedDumpAndToc(target, extracted, tocText);

                // 4. Staging: Restore into isolated temporary PostgreSQL database & validate objects/data
                await TransitionAsync(
                    TenantRestoreState.Staging,
                    $"Restoring {target.SchemaName} into isolated staging database {stagingDbName}.");
                await _dbOperator.CreateStagingDatabaseAsync(stagingDbName, cancellationToken);
                await _dbOperator.RestoreDumpToDatabaseAsync(
                    stagingDbName,
                    target.SchemaName,
                    extracted.ExtractedDumpPath,
                    cancellationToken);

                var stagingSchemas = await _dbOperator.ListNonSystemSchemasAsync(stagingDbName, cancellationToken);
                var unexpectedSchemas = stagingSchemas
                    .Where(s => !string.Equals(s, target.SchemaName, StringComparison.Ordinal)
                             && !string.Equals(s, "public", StringComparison.Ordinal))
                    .ToList();
                if (unexpectedSchemas.Count > 0)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Staging,
                        "staging_unexpected_schemas",
                        $"Staging restore created unexpected schema(s): {string.Join(", ", unexpectedSchemas)}.");
                }

                var stagedFp = await _dbOperator.InspectSchemaFingerprintAsync(
                    stagingDbName,
                    target.SchemaName,
                    cancellationToken);
                if (stagedFp == null || stagedFp.TableCount <= 0 || stagedFp.ConstraintCount <= 0)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Staging,
                        "staging_validation_failed",
                        $"Staged schema '{target.SchemaName}' failed structural table/constraint validation.");
                }
                stagingTableCount = stagedFp.TableCount;

                // 5. Prepared
                await TransitionAsync(
                    TenantRestoreState.Prepared,
                    $"Staging database {stagingDbName} validated ({stagedFp.TableCount} tables, {stagedFp.ConstraintCount} constraints).");

                // 6. BackingUpCurrent: Pre-restore backup of live tenant schema + checksum verification
                await TransitionAsync(
                    TenantRestoreState.BackingUpCurrent,
                    $"Creating and verifying pre-restore backup of live schema {target.SchemaName}.");
                var liveBeforeFp = await _dbOperator.InspectSchemaFingerprintAsync(
                    _dbOperator.ProductionDatabaseName,
                    target.SchemaName,
                    cancellationToken);
                if (liveBeforeFp == null)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.BackingUpCurrent,
                        "live_schema_missing",
                        $"Live production schema '{target.SchemaName}' does not exist.");
                }

                preBackup = await _dbOperator.CreatePreRestoreBackupAsync(target.SchemaName, workDir, cancellationToken);
                if (preBackup.SizeBytes <= 0 || string.IsNullOrWhiteSpace(preBackup.Sha256Digest))
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.BackingUpCurrent,
                        "pre_restore_backup_invalid",
                        "Pre-restore backup failed size or SHA-256 verification.");
                }
                var preBackupToc = await _dbOperator.InspectArchiveTocAsync(preBackup.BackupFilePath, cancellationToken);
                TenantRestoreValidator.ValidateArchiveTocSingleSchema(preBackupToc, target.SchemaName);

                // 7. CuttingOver: Deactivate tenant, rename live schema to rollback schema, restore verified dump
                await TransitionAsync(
                    TenantRestoreState.CuttingOver,
                    $"Deactivating tenant {target.TenantSlug} and replacing {target.SchemaName} (pre-backup SHA-256: {preBackup.Sha256Digest}).");
                targetEnterprise!.IsActive = false;
                await _dbContext.SaveChangesAsync(cancellationToken);
                tenantDeactivated = true;

                await _dbOperator.TerminateTenantSessionsAsync(target.SchemaName, cancellationToken);
                cutoverStarted = true;
                await _dbOperator.RenameProductionSchemaAsync(target.SchemaName, rollbackSchemaName, cancellationToken);
                await _dbOperator.RestoreDumpToDatabaseAsync(
                    _dbOperator.ProductionDatabaseName,
                    target.SchemaName,
                    extracted.ExtractedDumpPath,
                    cancellationToken);
                await _dbOperator.PreserveSchemaOwnershipAndPermissionsAsync(
                    target.SchemaName,
                    liveBeforeFp.Owner,
                    cancellationToken);

                // 8. Validating: Validate restored schema and verify all 15 unaffected tenants remain unchanged
                await TransitionAsync(
                    TenantRestoreState.Validating,
                    $"Validating restored schema {target.SchemaName} and verifying isolation across {unaffectedCount} unaffected tenants.");
                var restoredFp = await _dbOperator.InspectSchemaFingerprintAsync(
                    _dbOperator.ProductionDatabaseName,
                    target.SchemaName,
                    cancellationToken);
                if (restoredFp == null
                    || restoredFp.TableCount != stagedFp.TableCount
                    || restoredFp.ConstraintCount != stagedFp.ConstraintCount
                    || !string.Equals(restoredFp.Owner, liveBeforeFp.Owner, StringComparison.Ordinal))
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Validating,
                        "post_restore_validation_mismatch",
                        "Restored production schema does not match staged schema fingerprint or ownership.");
                }
                restoredTableCount = restoredFp.TableCount;

                var unaffectedAfter = await CaptureUnaffectedFingerprintsAsync(
                    target.SchemaName,
                    allEnterprises,
                    cancellationToken);
                VerifyUnaffectedTenantsUnchanged(unaffectedBefore, unaffectedAfter);

                await _dbOperator.DropRollbackSchemaIfExistsAsync(rollbackSchemaName, cancellationToken);
                await _dbOperator.DropStagingDatabaseIfExistsAsync(stagingDbName, cancellationToken);

                // Reactivate tenant only after all checks pass
                targetEnterprise.IsActive = target.OriginalIsActive;
                await _dbContext.SaveChangesAsync(cancellationToken);
                tenantDeactivated = false;

                // 9. Completed
                await TransitionAsync(
                    TenantRestoreState.Completed,
                    $"Successfully restored {target.SchemaName} from snapshot {target.SnapshotShortId}. Verified {unaffectedCount} unaffected tenants.");

                return new TenantRestoreResult
                {
                    OperationId = operationId,
                    TenantId = target.TenantId,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    FinalState = TenantRestoreState.Completed,
                    StateHistory = stateHistory,
                    ExtractedDumpSha256 = verifiedSha256,
                    PreRestoreBackupPath = preBackup.BackupFilePath,
                    PreRestoreBackupSha256 = preBackup.Sha256Digest,
                    StagingDatabaseName = stagingDbName,
                    StagingTableCount = stagingTableCount,
                    RestoredTableCount = restoredTableCount,
                    UnaffectedTenantCount = unaffectedCount,
                    RecoveryArtifactsRetained = true,
                    WorkDirectory = workDir,
                    RollbackPerformed = false,
                    RollbackSucceeded = null,
                    StartedAtUtc = startedAt,
                    FinishedAtUtc = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                var errCategory = ex is TenantRestoreException tre ? tre.Category : "unexpected_restore_failure";
                var errMessage = ex.Message;

                try
                {
                    await _dbOperator.DropStagingDatabaseIfExistsAsync(stagingDbName, cancellationToken);
                }
                catch (Exception cleanupEx)
                {
                    _logger.LogWarning(cleanupEx, "Failed to drop temporary staging DB {StagingDb}", stagingDbName);
                }

                if (cutoverStarted && target != null && rollbackSchemaName != null && targetEnterprise != null)
                {
                    var rollingBackDetails = $"Cutover/validation failed ({errCategory}: {errMessage}). Rolling back {target.SchemaName}.";
                    stateHistory.Add(TenantRestoreState.RollingBack);
                    await RecordAuditAsync(
                        operationId,
                        target.TenantId,
                        TenantRestoreState.RollingBack,
                        "TENANT_RESTORE_ROLLING_BACK",
                        rollingBackDetails,
                        performedBy,
                        cancellationToken);
                    await NotifyProgressAsync(TenantRestoreState.RollingBack, rollingBackDetails);

                    try
                    {
                        await _dbOperator.RollbackProductionSchemaAsync(
                            target.SchemaName,
                            rollbackSchemaName,
                            preBackup?.BackupFilePath,
                            cancellationToken);

                        targetEnterprise.IsActive = target.OriginalIsActive;
                        await _dbContext.SaveChangesAsync(cancellationToken);

                        var rolledBackDetails = $"Successfully rolled back {target.SchemaName} after failure ({errCategory}). Recovery artifacts retained at {workDir}.";
                        stateHistory.Add(TenantRestoreState.RolledBack);
                        await RecordAuditAsync(
                            operationId,
                            target.TenantId,
                            TenantRestoreState.RolledBack,
                            "TENANT_RESTORE_ROLLED_BACK",
                            rolledBackDetails,
                            performedBy,
                            cancellationToken);
                        await NotifyProgressAsync(TenantRestoreState.RolledBack, rolledBackDetails);

                        return new TenantRestoreResult
                        {
                            OperationId = operationId,
                            TenantId = target.TenantId,
                            TenantSlug = target.TenantSlug,
                            SchemaName = target.SchemaName,
                            SnapshotId = target.SnapshotId,
                            FinalState = TenantRestoreState.RolledBack,
                            StateHistory = stateHistory,
                            ExtractedDumpSha256 = verifiedSha256,
                            PreRestoreBackupPath = preBackup?.BackupFilePath,
                            PreRestoreBackupSha256 = preBackup?.Sha256Digest,
                            StagingDatabaseName = stagingDbName,
                            StagingTableCount = stagingTableCount,
                            UnaffectedTenantCount = unaffectedCount,
                            RecoveryArtifactsRetained = true,
                            WorkDirectory = workDir,
                            ErrorCategory = errCategory,
                            ErrorMessage = errMessage,
                            RollbackPerformed = true,
                            RollbackSucceeded = true,
                            StartedAtUtc = startedAt,
                            FinishedAtUtc = DateTime.UtcNow
                        };
                    }
                    catch (Exception rbEx)
                    {
                        var combinedError = $"Cutover error: {errMessage}; Rollback error: {rbEx.Message}";
                        var rbFailedDetails = $"CRITICAL: Rollback failed for {target.SchemaName} ({combinedError}). Pre-restore backup retained at {preBackup?.BackupFilePath}.";
                        stateHistory.Add(TenantRestoreState.RollbackFailed);
                        await RecordAuditAsync(
                            operationId,
                            target.TenantId,
                            TenantRestoreState.RollbackFailed,
                            "TENANT_RESTORE_ROLLBACK_FAILED",
                            rbFailedDetails,
                            performedBy,
                            cancellationToken);
                        await NotifyProgressAsync(TenantRestoreState.RollbackFailed, rbFailedDetails);

                        return new TenantRestoreResult
                        {
                            OperationId = operationId,
                            TenantId = target.TenantId,
                            TenantSlug = target.TenantSlug,
                            SchemaName = target.SchemaName,
                            SnapshotId = target.SnapshotId,
                            FinalState = TenantRestoreState.RollbackFailed,
                            StateHistory = stateHistory,
                            ExtractedDumpSha256 = verifiedSha256,
                            PreRestoreBackupPath = preBackup?.BackupFilePath,
                            PreRestoreBackupSha256 = preBackup?.Sha256Digest,
                            StagingDatabaseName = stagingDbName,
                            StagingTableCount = stagingTableCount,
                            UnaffectedTenantCount = unaffectedCount,
                            RecoveryArtifactsRetained = true,
                            WorkDirectory = workDir,
                            ErrorCategory = "rollback_failed",
                            ErrorMessage = combinedError,
                            RollbackPerformed = true,
                            RollbackSucceeded = false,
                            StartedAtUtc = startedAt,
                            FinishedAtUtc = DateTime.UtcNow
                        };
                    }
                }

                if (tenantDeactivated && target != null && targetEnterprise != null)
                {
                    targetEnterprise.IsActive = target.OriginalIsActive;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                var failedDetails = $"Restore failed in pre-cutover stage ({errCategory}: {errMessage}).";
                stateHistory.Add(TenantRestoreState.Failed);
                await RecordAuditAsync(
                    operationId,
                    target?.TenantId ?? (tenantId > 0 ? tenantId : null),
                    TenantRestoreState.Failed,
                    "TENANT_RESTORE_FAILED",
                    failedDetails,
                    performedBy,
                    cancellationToken);
                await NotifyProgressAsync(TenantRestoreState.Failed, failedDetails);

                return new TenantRestoreResult
                {
                    OperationId = operationId,
                    TenantId = target?.TenantId ?? tenantId,
                    TenantSlug = target?.TenantSlug,
                    SchemaName = target?.SchemaName,
                    SnapshotId = target?.SnapshotId ?? snapshotId,
                    FinalState = TenantRestoreState.Failed,
                    StateHistory = stateHistory,
                    ExtractedDumpSha256 = verifiedSha256,
                    PreRestoreBackupPath = preBackup?.BackupFilePath,
                    PreRestoreBackupSha256 = preBackup?.Sha256Digest,
                    StagingDatabaseName = stagingDbName,
                    StagingTableCount = stagingTableCount,
                    UnaffectedTenantCount = unaffectedCount,
                    RecoveryArtifactsRetained = Directory.Exists(workDir),
                    WorkDirectory = Directory.Exists(workDir) ? workDir : null,
                    ErrorCategory = errCategory,
                    ErrorMessage = errMessage,
                    RollbackPerformed = false,
                    RollbackSucceeded = null,
                    StartedAtUtc = startedAt,
                    FinishedAtUtc = DateTime.UtcNow
                };
            }
        }

        private async Task<Dictionary<string, TenantSchemaFingerprintRecord>> CaptureUnaffectedFingerprintsAsync(
            string targetSchema,
            IReadOnlyList<MasterEnterprise> enterprises,
            CancellationToken cancellationToken)
        {
            var result = new Dictionary<string, TenantSchemaFingerprintRecord>(StringComparer.Ordinal);
            foreach (var ent in enterprises)
            {
                var schema = (ent.SchemaName ?? string.Empty).Trim();
                if (string.IsNullOrEmpty(schema) || string.Equals(schema, targetSchema, StringComparison.Ordinal))
                {
                    continue;
                }

                var fp = await _dbOperator.InspectSchemaFingerprintAsync(
                    _dbOperator.ProductionDatabaseName,
                    schema,
                    cancellationToken);
                if (fp == null)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Pending,
                        "unaffected_tenant_schema_missing",
                        $"Unaffected tenant schema '{schema}' is missing in database.");
                }
                result[schema] = fp;
            }
            return result;
        }

        private static void VerifyUnaffectedTenantsUnchanged(
            IReadOnlyDictionary<string, TenantSchemaFingerprintRecord> before,
            IReadOnlyDictionary<string, TenantSchemaFingerprintRecord> after)
        {
            if (before.Count != after.Count || !before.Keys.All(after.ContainsKey))
            {
                throw new TenantRestoreException(
                    TenantRestoreState.Validating,
                    "unaffected_tenants_set_changed",
                    "The set of unaffected tenant schemas changed during restoration.");
            }

            foreach (var (schema, fpBefore) in before)
            {
                var fpAfter = after[schema];
                if (fpBefore.SchemaOid != fpAfter.SchemaOid
                    || !string.Equals(fpBefore.Owner, fpAfter.Owner, StringComparison.Ordinal)
                    || fpBefore.TableCount != fpAfter.TableCount
                    || fpBefore.SequenceCount != fpAfter.SequenceCount
                    || fpBefore.ConstraintCount != fpAfter.ConstraintCount
                    || fpBefore.TotalLiveRows != fpAfter.TotalLiveRows
                    || !fpBefore.TableNames.SequenceEqual(fpAfter.TableNames, StringComparer.Ordinal))
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Validating,
                        "unaffected_tenant_modified",
                        $"Unaffected tenant schema '{schema}' fingerprint changed during restoration.");
                }
            }
        }

        private async Task RecordAuditAsync(
            string operationId,
            long? tenantId,
            TenantRestoreState state,
            string action,
            string details,
            string performedBy,
            CancellationToken cancellationToken)
        {
            var audit = new MasterAuditLog
            {
                TenantId = tenantId,
                Action = action,
                Details = $"[Op={operationId}][State={state}] {details}",
                PerformedBy = performedBy,
                Timestamp = DateTime.UtcNow
            };
            await _dbContext.MasterAuditLogs.AddAsync(audit, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}

