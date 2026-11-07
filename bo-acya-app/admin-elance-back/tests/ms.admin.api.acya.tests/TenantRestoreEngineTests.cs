using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class TenantRestoreEngineTests : IDisposable
    {
        private const string Snap2071Full = "2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59";
        private const string Snap36a2Full = "36a26b4e5f749dc3e9e6746d6d4be27dac2676f26599ac6446cdd160a3216e6a";
        private const string Snap5a78Full = "5a78f6730f080f4090672634a42055da2cfa619cf993ec140b59c3a3173fd8ca";
        private const string Stage2071 = "/opt/acya-backup/staging/stage-20261106T101110Z-d2ae662f-cb88kl37";

        private static readonly (long Id, string Slug, string Schema, bool IsActive)[] All16Tenants =
        {
            (16, "piqbit", "tenant_piqbit", true),
            (22, "wellness-medical", "tenant_wellness_medical", false),
            (24, "fleur-de-printemps", "tenant_fleur_de_printemps", false),
            (25, "mansour-construction", "tenant_mansour_construction", true),
            (32, "stramica", "tenant_stramica", false),
            (34, "oise-btp", "tenant_oise_btp", false),
            (35, "ttv", "tenant_ttv", true),
            (36, "tucobois", "tenant_tucobois", false),
            (37, "sheg", "tenant_sheg", false),
            (38, "socofeb", "tenant_socofeb", true),
            (39, "socobois", "tenant_socobois", true),
            (45, "rs-auto-service", "tenant_rs_auto_service", true),
            (46, "zaiemtex", "tenant_zaiemtex", true),
            (47, "inky-pinky", "tenant_inky_pinky", true),
            (48, "oxylab", "tenant_oxylab", true),
            (49, "sotubois", "tenant_sotubois", true)
        };

        private readonly string _tempRoot;

        public TenantRestoreEngineTests()
        {
            _tempRoot = Path.Combine(Path.GetTempPath(), $"acya-restore-tests-{Guid.NewGuid():N}");
            Directory.CreateDirectory(_tempRoot);
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempRoot))
            {
                Directory.Delete(_tempRoot, recursive: true);
            }
        }

        private static string ComputeSha256(byte[] bytes)
        {
            using var sha = SHA256.Create();
            return Convert.ToHexString(sha.ComputeHash(bytes)).ToLowerInvariant();
        }

        private static string MakeValidToc(string schemaName, string? extraLine = null)
        {
            var sb = new StringBuilder();
            sb.AppendLine("; Archive created at 2026-11-06 10:11:15 UTC");
            sb.AppendLine($"6; 2615 2200 SCHEMA - {schemaName} postgres");
            sb.AppendLine($"215; 1259 34100 TABLE {schemaName} tbl_app_user postgres");
            sb.AppendLine($"216; 1259 34110 TABLE {schemaName} tbl_article postgres");
            sb.AppendLine($"217; 1259 34120 TABLE {schemaName} tbl_document postgres");
            sb.AppendLine($"218; 1259 34130 SEQUENCE {schemaName} tbl_document_id_seq postgres");
            sb.AppendLine($"3500; 2606 34200 CONSTRAINT {schemaName} PK_tbl_app_user postgres");
            if (!string.IsNullOrEmpty(extraLine))
            {
                sb.AppendLine(extraLine);
            }
            return sb.ToString();
        }

        private async Task<MasterDbContext> CreateSeededDbContextAsync()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            var context = new MasterDbContext(options);

            foreach (var t in All16Tenants)
            {
                await context.Enterprises.AddAsync(new MasterEnterprise
                {
                    Id = t.Id,
                    Name = t.Slug.ToUpperInvariant(),
                    Slug = t.Slug,
                    SchemaName = t.Schema,
                    IsActive = t.IsActive
                });
            }
            await context.SaveChangesAsync();
            return context;
        }

        private sealed class FakeCatalogProvider : ITenantRestoreCatalogProvider
        {
            public Task<TenantBackupHistoryCatalog> LoadCatalogAsync(CancellationToken cancellationToken = default)
            {
                var snapshots = new List<TenantCatalogSnapshotEntry>
                {
                    new(Snap2071Full, "2071d164", "2026-11-06T10:11:37Z", Stage2071, "verified"),
                    new(Snap36a2Full, "36a26b4e", "2026-10-13T10:52:27Z", "/var/backups/acya-backup-stage-wBiNgj", "verified"),
                    new(Snap5a78Full, "5a78f673", "2026-10-05T07:57:56Z", "/home/ubuntu/acya-backup-stage", "degraded")
                };

                var entries = new List<TenantCatalogHistoryEntry>();
                foreach (var t in All16Tenants)
                {
                    var dumpBytes = Encoding.UTF8.GetBytes($"PGDMP_SNAPSHOT_2071:{t.Schema}:DATA");
                    var sha = ComputeSha256(dumpBytes);
                    entries.Add(new TenantCatalogHistoryEntry(
                        Snap2071Full,
                        "2071d164",
                        "2026-11-06T10:11:37Z",
                        t.Id,
                        t.Slug,
                        t.Schema,
                        $"tenants/{t.Schema}.dump",
                        dumpBytes.Length,
                        sha,
                        "manifest_recorded_unverified",
                        "verified",
                        "present",
                        true,
                        null));
                }

                // Historical snapshot 36a26b4e where tenant 47 (inky-pinky) is unavailable
                entries.Add(new TenantCatalogHistoryEntry(
                    Snap36a2Full,
                    "36a26b4e",
                    "2026-10-13T10:52:27Z",
                    47,
                    "inky-pinky",
                    "tenant_inky_pinky",
                    null,
                    null,
                    null,
                    "missing",
                    "verified",
                    "unavailable",
                    false,
                    "tenant_not_present_in_snapshot"));

                // Degraded snapshot 5a78f673
                entries.Add(new TenantCatalogHistoryEntry(
                    Snap5a78Full,
                    "5a78f673",
                    "2026-10-05T07:57:56Z",
                    38,
                    "socofeb",
                    "tenant_socofeb",
                    "tenants/tenant_socofeb.dump",
                    481000,
                    null,
                    "missing",
                    "degraded",
                    "present",
                    false,
                    "manifest_entry_missing"));

                return Task.FromResult(new TenantBackupHistoryCatalog(snapshots, entries));
            }
        }

        private sealed class FakeResticExtractor : IResticSnapshotExtractor
        {
            public bool FailExtraction { get; set; }
            public bool CorruptExtractedBytes { get; set; }

            public async Task<ExtractedTenantArtifacts> ExtractTenantArtifactsAsync(
                ValidatedTenantRestoreTarget target,
                string workDirectory,
                CancellationToken cancellationToken = default)
            {
                if (FailExtraction)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.Extracting,
                        "restic_extraction_failed",
                        "Simulated Restic read-only extraction failure.");
                }

                var expectedBytes = Encoding.UTF8.GetBytes($"PGDMP_SNAPSHOT_2071:{target.SchemaName}:DATA");
                var expectedSha = ComputeSha256(expectedBytes);
                var writtenBytes = CorruptExtractedBytes
                    ? Encoding.UTF8.GetBytes($"PGDMP_CORRUPTED:{target.SchemaName}:BAD!")
                    : expectedBytes;

                var dumpPath = Path.Combine(workDirectory, $"{target.SchemaName}.dump");
                await File.WriteAllBytesAsync(dumpPath, writtenBytes, cancellationToken);

                var manifestContent = $"{expectedSha}  {target.StagingRoot}/{target.DumpRelativePath}\n";
                return new ExtractedTenantArtifacts(
                    workDirectory,
                    dumpPath,
                    writtenBytes.Length,
                    manifestContent,
                    "[]",
                    null);
            }
        }

        private sealed class FakeDatabaseOperator : ITenantDatabaseRestoreOperator
        {
            public string ProductionDatabaseName => "wood-app-db";
            public Dictionary<string, TenantSchemaFingerprintRecord> ProdSchemas { get; } = new(StringComparer.Ordinal);
            public Dictionary<string, Dictionary<string, TenantSchemaFingerprintRecord>> StagingDbs { get; } = new(StringComparer.Ordinal);

            public bool FailStagingRestore { get; set; }
            public bool FailPreRestoreBackup { get; set; }
            public bool FailCutoverRestore { get; set; }
            public bool CorruptPostRestoreTableCount { get; set; }
            public string? MutateUnaffectedTenantDuringCutover { get; set; }
            public bool FailRollback { get; set; }
            public string? CustomTocText { get; set; }
            public TimeSpan CutoverDelay { get; set; } = TimeSpan.Zero;

            public FakeDatabaseOperator()
            {
                var idx = 0;
                foreach (var t in All16Tenants)
                {
                    idx++;
                    ProdSchemas[t.Schema] = new TenantSchemaFingerprintRecord(
                        t.Schema,
                        10000 + idx,
                        "postgres",
                        61,
                        45,
                        120,
                        new[] { "tbl_app_user", "tbl_article", "tbl_document" },
                        500 + idx * 10);
                }
            }

            public Task<string> InspectArchiveTocAsync(string dumpPath, CancellationToken cancellationToken = default)
            {
                if (CustomTocText != null)
                {
                    return Task.FromResult(CustomTocText);
                }
                var fileName = Path.GetFileNameWithoutExtension(dumpPath);
                var schema = fileName.StartsWith("pre_restore_", StringComparison.Ordinal)
                    ? fileName["pre_restore_".Length..]
                    : fileName;
                return Task.FromResult(MakeValidToc(schema));
            }

            public Task CreateStagingDatabaseAsync(string stagingDatabaseName, CancellationToken cancellationToken = default)
            {
                StagingDbs[stagingDatabaseName] = new Dictionary<string, TenantSchemaFingerprintRecord>(StringComparer.Ordinal);
                return Task.CompletedTask;
            }

            public Task DropStagingDatabaseIfExistsAsync(string stagingDatabaseName, CancellationToken cancellationToken = default)
            {
                StagingDbs.Remove(stagingDatabaseName);
                return Task.CompletedTask;
            }

            public async Task RestoreDumpToDatabaseAsync(
                string databaseName,
                string schemaName,
                string dumpPath,
                CancellationToken cancellationToken = default)
            {
                if (databaseName != ProductionDatabaseName)
                {
                    if (FailStagingRestore)
                    {
                        throw new TenantRestoreException(
                            TenantRestoreState.Staging,
                            "pg_restore_failed",
                            "Simulated staging pg_restore failure.");
                    }

                    StagingDbs[databaseName][schemaName] = new TenantSchemaFingerprintRecord(
                        schemaName,
                        99001,
                        "postgres",
                        61,
                        45,
                        120,
                        new[] { "tbl_app_user", "tbl_article", "tbl_document" },
                        1250);
                    return;
                }

                if (CutoverDelay > TimeSpan.Zero)
                {
                    await Task.Delay(CutoverDelay, cancellationToken);
                }

                if (FailCutoverRestore)
                {
                    ProdSchemas[schemaName] = new TenantSchemaFingerprintRecord(
                        schemaName,
                        88001,
                        "postgres",
                        2,
                        0,
                        0,
                        new[] { "tbl_app_user" },
                        0);
                    throw new TenantRestoreException(
                        TenantRestoreState.CuttingOver,
                        "pg_restore_failed",
                        "Simulated production cutover pg_restore failure.");
                }

                var tableCount = CorruptPostRestoreTableCount ? 10 : 61;
                ProdSchemas[schemaName] = new TenantSchemaFingerprintRecord(
                    schemaName,
                    77001,
                    "postgres",
                    tableCount,
                    45,
                    120,
                    new[] { "tbl_app_user", "tbl_article", "tbl_document" },
                    1250);

                if (MutateUnaffectedTenantDuringCutover != null && ProdSchemas.TryGetValue(MutateUnaffectedTenantDuringCutover, out var otherFp))
                {
                    ProdSchemas[MutateUnaffectedTenantDuringCutover] = otherFp with { TableCount = otherFp.TableCount - 1 };
                }
            }

            public Task<IReadOnlyList<string>> ListNonSystemSchemasAsync(string databaseName, CancellationToken cancellationToken = default)
            {
                if (databaseName == ProductionDatabaseName)
                {
                    return Task.FromResult<IReadOnlyList<string>>(ProdSchemas.Keys.Append("public").OrderBy(x => x).ToList());
                }
                var list = StagingDbs.TryGetValue(databaseName, out var dict)
                    ? dict.Keys.Append("public").OrderBy(x => x).ToList()
                    : new List<string> { "public" };
                return Task.FromResult<IReadOnlyList<string>>(list);
            }

            public Task<TenantSchemaFingerprintRecord?> InspectSchemaFingerprintAsync(
                string databaseName,
                string schemaName,
                CancellationToken cancellationToken = default)
            {
                if (databaseName == ProductionDatabaseName)
                {
                    ProdSchemas.TryGetValue(schemaName, out var fp);
                    return Task.FromResult(fp);
                }
                if (StagingDbs.TryGetValue(databaseName, out var dict) && dict.TryGetValue(schemaName, out var sfp))
                {
                    return Task.FromResult<TenantSchemaFingerprintRecord?>(sfp);
                }
                return Task.FromResult<TenantSchemaFingerprintRecord?>(null);
            }

            public async Task<PreRestoreBackupArtifact> CreatePreRestoreBackupAsync(
                string schemaName,
                string workDirectory,
                CancellationToken cancellationToken = default)
            {
                if (FailPreRestoreBackup)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.BackingUpCurrent,
                        "pre_restore_backup_failed",
                        "Simulated pre-restore pg_dump failure.");
                }

                var backupPath = Path.Combine(workDirectory, $"pre_restore_{schemaName}.dump");
                var shaPath = backupPath + ".sha256";
                var payload = Encoding.UTF8.GetBytes($"LIVE_BACKUP:{schemaName}");
                var sha = ComputeSha256(payload);

                await File.WriteAllBytesAsync(backupPath, payload, cancellationToken);
                await File.WriteAllTextAsync(shaPath, $"{sha}  {backupPath}\n", cancellationToken);
                return new PreRestoreBackupArtifact(backupPath, shaPath, sha, payload.Length);
            }

            public Task TerminateTenantSessionsAsync(string schemaName, CancellationToken cancellationToken = default)
                => Task.CompletedTask;

            public Task RenameProductionSchemaAsync(
                string currentSchemaName,
                string rollbackSchemaName,
                CancellationToken cancellationToken = default)
            {
                var fp = ProdSchemas[currentSchemaName];
                ProdSchemas.Remove(currentSchemaName);
                ProdSchemas[rollbackSchemaName] = fp with { SchemaName = rollbackSchemaName };
                return Task.CompletedTask;
            }

            public Task PreserveSchemaOwnershipAndPermissionsAsync(
                string schemaName,
                string ownerRole,
                CancellationToken cancellationToken = default)
            {
                var fp = ProdSchemas[schemaName];
                ProdSchemas[schemaName] = fp with { Owner = ownerRole };
                return Task.CompletedTask;
            }

            public Task DropRollbackSchemaIfExistsAsync(
                string rollbackSchemaName,
                CancellationToken cancellationToken = default)
            {
                ProdSchemas.Remove(rollbackSchemaName);
                return Task.CompletedTask;
            }

            public Task RollbackProductionSchemaAsync(
                string schemaName,
                string rollbackSchemaName,
                string? preRestoreDumpPath,
                CancellationToken cancellationToken = default)
            {
                if (FailRollback)
                {
                    throw new TenantRestoreException(
                        TenantRestoreState.RollingBack,
                        "rollback_sql_failed",
                        "Simulated catastrophic rollback failure.");
                }

                ProdSchemas.Remove(schemaName);
                var rbFp = ProdSchemas[rollbackSchemaName];
                ProdSchemas.Remove(rollbackSchemaName);
                ProdSchemas[schemaName] = rbFp with { SchemaName = schemaName };
                return Task.CompletedTask;
            }
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-10)]
        [InlineData(9999)]
        public async Task ExecuteRestore_InvalidOrUnknownTenantId_FailsInPendingState(long invalidTenantId)
        {
            using var context = await CreateSeededDbContextAsync();
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(invalidTenantId, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(new[] { TenantRestoreState.Pending, TenantRestoreState.Failed }, res.StateHistory);
            Assert.Contains(res.ErrorCategory, new[] { "invalid_tenant_id", "tenant_not_found_in_registry" });
        }

        [Theory]
        [InlineData("")]
        [InlineData("2071d16")]
        [InlineData("2071D164")]
        [InlineData("../etc/passwd")]
        [InlineData("deadbeef")]
        public async Task ExecuteRestore_InvalidOrUnknownSnapshotId_FailsInPendingState(string invalidSnapshotId)
        {
            using var context = await CreateSeededDbContextAsync();
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, invalidSnapshotId, "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(new[] { TenantRestoreState.Pending, TenantRestoreState.Failed }, res.StateHistory);
            Assert.Contains(res.ErrorCategory, new[] { "invalid_snapshot_id", "snapshot_not_found" });
        }

        [Fact]
        public async Task ExecuteRestore_MissingTenantArtifactInHistoricalSnapshot_Rejected()
        {
            using var context = await CreateSeededDbContextAsync();
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            // Tenant 47 (inky-pinky) was created after snapshot 36a26b4e
            var res = await engine.ExecuteRestoreAsync(47, "36a26b4e", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(new[] { TenantRestoreState.Pending, TenantRestoreState.Failed }, res.StateHistory);
            Assert.Equal("tenant_not_present_in_snapshot", res.ErrorCategory);
        }

        [Fact]
        public async Task ExecuteRestore_DegradedSnapshot_Rejected()
        {
            using var context = await CreateSeededDbContextAsync();
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "5a78f673", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal("snapshot_not_verified", res.ErrorCategory);
        }

        [Fact]
        public async Task ExecuteRestore_ChecksumMismatchOrGlobalRoleInToc_FailsInVerifyingState()
        {
            using var context = await CreateSeededDbContextAsync();
            var extractor = new FakeResticExtractor { CorruptExtractedBytes = true };
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                extractor,
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(
                new[] { TenantRestoreState.Pending, TenantRestoreState.Extracting, TenantRestoreState.Verifying, TenantRestoreState.Failed },
                res.StateHistory);
            Assert.Contains(res.ErrorCategory, new[] { "extracted_dump_size_mismatch", "checksum_mismatch" });

            // Test global ROLE in TOC rejected
            var dbOp = new FakeDatabaseOperator
            {
                CustomTocText = MakeValidToc("tenant_socofeb", "1; 1260 10 ROLE - postgres_hack postgres")
            };
            var engine2 = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res2 = await engine2.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");
            Assert.Equal(TenantRestoreState.Failed, res2.FinalState);
            Assert.Equal("forbidden_global_object_in_dump", res2.ErrorCategory);
        }

        [Fact]
        public async Task ExecuteRestore_ExtractionFailure_FailsInExtractingState()
        {
            using var context = await CreateSeededDbContextAsync();
            var extractor = new FakeResticExtractor { FailExtraction = true };
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                extractor,
                new FakeDatabaseOperator(),
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(
                new[] { TenantRestoreState.Pending, TenantRestoreState.Extracting, TenantRestoreState.Failed },
                res.StateHistory);
            Assert.Equal("restic_extraction_failed", res.ErrorCategory);
        }

        [Fact]
        public async Task ExecuteRestore_StagingRestoreFailure_AbortsBeforeProductionCutover()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator { FailStagingRestore = true };
            var origFp = dbOp.ProdSchemas["tenant_socofeb"];
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(
                new[]
                {
                    TenantRestoreState.Pending,
                    TenantRestoreState.Extracting,
                    TenantRestoreState.Verifying,
                    TenantRestoreState.Staging,
                    TenantRestoreState.Failed
                },
                res.StateHistory);
            Assert.Equal(origFp, dbOp.ProdSchemas["tenant_socofeb"]);
            Assert.Empty(dbOp.StagingDbs);
        }

        [Fact]
        public async Task ExecuteRestore_PreRestoreBackupFailure_AbortsBeforeCutover()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator { FailPreRestoreBackup = true };
            var origFp = dbOp.ProdSchemas["tenant_socofeb"];
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Failed, res.FinalState);
            Assert.Equal(
                new[]
                {
                    TenantRestoreState.Pending,
                    TenantRestoreState.Extracting,
                    TenantRestoreState.Verifying,
                    TenantRestoreState.Staging,
                    TenantRestoreState.Prepared,
                    TenantRestoreState.BackingUpCurrent,
                    TenantRestoreState.Failed
                },
                res.StateHistory);
            Assert.Equal(origFp, dbOp.ProdSchemas["tenant_socofeb"]);
        }

        [Fact]
        public async Task ExecuteRestore_CutoverFailure_RollsBackSuccessfullyAndRetainsRecoveryArtifacts()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator { FailCutoverRestore = true };
            var origFp = dbOp.ProdSchemas["tenant_socofeb"];
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.RolledBack, res.FinalState);
            Assert.True(res.RollbackPerformed);
            Assert.True(res.RollbackSucceeded);
            Assert.True(res.RecoveryArtifactsRetained);
            Assert.NotNull(res.PreRestoreBackupPath);
            Assert.True(File.Exists(res.PreRestoreBackupPath!));
            Assert.Equal(origFp, dbOp.ProdSchemas["tenant_socofeb"]);

            var tenantAfter = await context.Enterprises.FirstAsync(e => e.Id == 38);
            Assert.True(tenantAfter.IsActive);
        }

        [Fact]
        public async Task ExecuteRestore_RollbackFailure_EntersRollbackFailedAndPreservesArtifacts()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator
            {
                FailCutoverRestore = true,
                FailRollback = true
            };
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.RollbackFailed, res.FinalState);
            Assert.True(res.RollbackPerformed);
            Assert.False(res.RollbackSucceeded);
            Assert.True(res.RecoveryArtifactsRetained);
            Assert.True(File.Exists(res.PreRestoreBackupPath!));
        }

        [Fact]
        public async Task ExecuteRestore_UnaffectedTenantModified_TriggersAutomaticRollback()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator
            {
                MutateUnaffectedTenantDuringCutover = "tenant_piqbit"
            };
            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.RolledBack, res.FinalState);
            Assert.Equal("unaffected_tenant_modified", res.ErrorCategory);
            Assert.True(res.RollbackPerformed);
            Assert.True(res.RollbackSucceeded);
        }

        [Fact]
        public async Task ExecuteRestore_ConcurrentRequests_PreventsSecondRestore()
        {
            using var context1 = await CreateSeededDbContextAsync();
            using var context2 = await CreateSeededDbContextAsync();
            var dbOp1 = new FakeDatabaseOperator { CutoverDelay = TimeSpan.FromMilliseconds(250) };
            var dbOp2 = new FakeDatabaseOperator();

            var engine1 = new TenantRestoreEngine(
                context1,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp1,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);
            var engine2 = new TenantRestoreEngine(
                context2,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp2,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var firstTask = engine1.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");
            await Task.Delay(50);

            var ex = await Assert.ThrowsAsync<TenantRestoreException>(
                () => engine2.ExecuteRestoreAsync(16, "2071d164", "superadmin@acya.site"));
            Assert.Equal("concurrent_restore_in_progress", ex.Category);

            var firstResult = await firstTask;
            Assert.Equal(TenantRestoreState.Completed, firstResult.FinalState);
        }

        [Fact]
        public async Task ExecuteRestore_ValidTenantAndSnapshot_CompletesAllNineStatesAndPreserves15OtherTenants()
        {
            using var context = await CreateSeededDbContextAsync();
            var dbOp = new FakeDatabaseOperator();
            var unaffectedBefore = dbOp.ProdSchemas
                .Where(kv => kv.Key != "tenant_socofeb")
                .ToDictionary(kv => kv.Key, kv => kv.Value);
            Assert.Equal(15, unaffectedBefore.Count);

            var engine = new TenantRestoreEngine(
                context,
                new FakeCatalogProvider(),
                new FakeResticExtractor(),
                dbOp,
                NullLogger<TenantRestoreEngine>.Instance,
                _tempRoot);

            var res = await engine.ExecuteRestoreAsync(38, "2071d164", "superadmin@acya.site");

            Assert.Equal(TenantRestoreState.Completed, res.FinalState);
            Assert.Equal(
                new[]
                {
                    TenantRestoreState.Pending,
                    TenantRestoreState.Extracting,
                    TenantRestoreState.Verifying,
                    TenantRestoreState.Staging,
                    TenantRestoreState.Prepared,
                    TenantRestoreState.BackingUpCurrent,
                    TenantRestoreState.CuttingOver,
                    TenantRestoreState.Validating,
                    TenantRestoreState.Completed
                },
                res.StateHistory);
            Assert.Equal(38, res.TenantId);
            Assert.Equal("socofeb", res.TenantSlug);
            Assert.Equal("tenant_socofeb", res.SchemaName);
            Assert.Equal(15, res.UnaffectedTenantCount);
            Assert.Equal(61, res.RestoredTableCount);
            Assert.False(res.RollbackPerformed);
            Assert.True(File.Exists(res.PreRestoreBackupPath!));

            // Verify all 15 unaffected tenants are untouched
            foreach (var (schema, fpBefore) in unaffectedBefore)
            {
                Assert.Equal(fpBefore, dbOp.ProdSchemas[schema]);
            }

            // Verify audit trail recorded all 9 state transitions
            var audits = await context.MasterAuditLogs.OrderBy(a => a.Id).ToListAsync();
            Assert.Equal(9, audits.Count);
            Assert.Equal("TENANT_RESTORE_PENDING", audits.First().Action);
            Assert.Equal("TENANT_RESTORE_COMPLETED", audits.Last().Action);
        }
    }
}

