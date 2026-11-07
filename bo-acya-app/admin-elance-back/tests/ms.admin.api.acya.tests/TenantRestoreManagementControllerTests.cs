using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class TenantRestoreManagementControllerTests
    {
        private const string Snap2071 = "2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59";
        private const string Snap36a2 = "36a26b4ef4f93e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59";
        private const string Snap5a78 = "5a78f67376640df19168aa96aa0e9515488b4e6cb20e374bb004628d18a92d8f";
        private const string ValidSha = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

        private sealed class FakeCatalogProvider : ITenantRestoreCatalogProvider
        {
            private readonly TenantBackupHistoryCatalog _catalog;

            public FakeCatalogProvider(TenantBackupHistoryCatalog catalog)
            {
                _catalog = catalog;
            }

            public Task<TenantBackupHistoryCatalog> LoadCatalogAsync(CancellationToken cancellationToken = default)
                => Task.FromResult(_catalog);
        }

        private sealed class ConfigurableExecutionBridge : ITenantRestoreExecutionBridge
        {
            public Func<ValidatedTenantRestoreTarget, string, string, Func<TenantRestoreProgressUpdate, CancellationToken, Task>, CancellationToken, Task<TenantRestoreResult>> Handler { get; set; }

            public ConfigurableExecutionBridge(
                Func<ValidatedTenantRestoreTarget, string, string, Func<TenantRestoreProgressUpdate, CancellationToken, Task>, CancellationToken, Task<TenantRestoreResult>> handler)
            {
                Handler = handler;
            }

            public Task<TenantRestoreResult> ExecuteRestoreAsync(
                ValidatedTenantRestoreTarget target,
                string operationId,
                string performedBy,
                Func<TenantRestoreProgressUpdate, CancellationToken, Task> onStateTransition,
                CancellationToken cancellationToken = default)
                => Handler(target, operationId, performedBy, onStateTransition, cancellationToken);
        }

        private static TenantBackupHistoryCatalog CreateSampleCatalog()
        {
            var snapshots = new List<TenantCatalogSnapshotEntry>
            {
                new(Snap2071, "2071d164", "2026-11-06T10:11:37Z", "/opt/acya-backup/staging/stage-20261106", "verified"),
                new(Snap36a2, "36a26b4e", "2026-04-06T03:00:08Z", "/var/backups/acya-backup-stage-20260406", "verified"),
                new(Snap5a78, "5a78f673", "2026-04-01T14:53:46Z", "/home/ubuntu/acya-backup-stage", "degraded")
            };

            var entries = new List<TenantCatalogHistoryEntry>
            {
                new(
                    Snap2071,
                    "2071d164",
                    "2026-11-06T10:11:37Z",
                    32,
                    "socofeb",
                    "tenant_socofeb",
                    "tenants/tenant_socofeb.dump",
                    221790,
                    ValidSha,
                    "manifest_recorded_unverified",
                    "verified",
                    "present",
                    true,
                    null),
                new(
                    Snap36a2,
                    "36a26b4e",
                    "2026-04-06T03:00:08Z",
                    null,
                    "socofeb",
                    "tenant_socofeb",
                    null,
                    null,
                    null,
                    "missing",
                    "verified",
                    "unavailable",
                    false,
                    "tenant_not_present_in_snapshot"),
                new(
                    Snap5a78,
                    "5a78f673",
                    "2026-04-01T14:53:46Z",
                    null,
                    "socofeb",
                    "tenant_socofeb",
                    null,
                    null,
                    null,
                    "missing",
                    "degraded",
                    "unavailable",
                    false,
                    "tenant_not_present_in_snapshot")
            };

            return new TenantBackupHistoryCatalog(snapshots, entries, "acya.backup.tenant-history/v1", "2026-11-07T08:52:48Z");
        }

        private static (ServiceProvider Provider, MasterDbContext Context, BackupController Controller, ITenantRestoreManagementService Service) BuildTestHarness(
            ITenantRestoreExecutionBridge bridge,
            string? hostStateDir = null,
            bool executionEnabled = true)
        {
            var dbName = $"restore_mgmt_test_{Guid.NewGuid():N}";
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<MasterDbContext>(opts => opts.UseInMemoryDatabase(dbName));
            services.AddSingleton<ITenantRestoreCatalogProvider>(new FakeCatalogProvider(CreateSampleCatalog()));
            services.AddSingleton(bridge);
            var gate = new TenantRestoreConcurrencyGate();
            services.AddSingleton(gate);
            services.AddScoped<ITenantRestoreManagementService>(sp => new TenantRestoreManagementService(
                sp.GetRequiredService<MasterDbContext>(),
                sp.GetRequiredService<ITenantRestoreCatalogProvider>(),
                sp.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<TenantRestoreManagementService>.Instance,
                hostStateDir ?? Path.Combine(Path.GetTempPath(), $"empty-state-{Guid.NewGuid():N}"),
                sp.GetRequiredService<TenantRestoreConcurrencyGate>(),
                executionEnabled: executionEnabled));

            var provider = services.BuildServiceProvider();
            var context = provider.GetRequiredService<MasterDbContext>();
            context.Enterprises.Add(new MasterEnterprise
            {
                Id = 32,
                Name = "SOCOFEB",
                Slug = "socofeb",
                SchemaName = "tenant_socofeb",
                IsActive = true
            });
            context.SaveChanges();

            var restoreService = provider.GetRequiredService<ITenantRestoreManagementService>();
            var controller = new BackupController(context, restoreService)
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

            return (provider, context, controller, restoreService);
        }

        private static ConfigurableExecutionBridge CreateDefaultSuccessBridge()
        {
            return new ConfigurableExecutionBridge(async (target, opId, actor, onTransition, ct) =>
            {
                var states = new[]
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
                };

                var history = new List<TenantRestoreState> { TenantRestoreState.Pending };
                for (var i = 1; i < states.Length; i++)
                {
                    history.Add(states[i]);
                    await onTransition(
                        new TenantRestoreProgressUpdate(
                            opId,
                            target.TenantId,
                            target.TenantSlug,
                            target.SchemaName,
                            target.SnapshotId,
                            states[i],
                            history.ToArray(),
                            $"Transitioned to {states[i]}",
                            ValidSha,
                            i >= 5,
                            i >= 5 ? ValidSha : null,
                            i >= 3 ? 42 : null,
                            i >= 7 ? 42 : null,
                            15),
                        ct);
                }

                return new TenantRestoreResult
                {
                    OperationId = opId,
                    TenantId = target.TenantId,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    FinalState = TenantRestoreState.Completed,
                    StateHistory = history,
                    ExtractedDumpSha256 = ValidSha,
                    PreRestoreBackupPath = "/opt/acya-backup/restore-work/secret-host-path/pre_restore_tenant_socofeb.dump",
                    PreRestoreBackupSha256 = ValidSha,
                    StagingTableCount = 42,
                    RestoredTableCount = 42,
                    UnaffectedTenantCount = 15,
                    RecoveryArtifactsRetained = true,
                    WorkDirectory = "/opt/acya-backup/restore-work/secret-host-path",
                    RollbackPerformed = false,
                    RollbackSucceeded = null,
                    StartedAtUtc = DateTime.UtcNow.AddSeconds(-2),
                    FinishedAtUtc = DateTime.UtcNow
                };
            });
        }

        [Fact]
        public void BackupController_EnforcesSuperAdminAuthorizeAttribute()
        {
            var attr = typeof(BackupController).GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(attr);
            Assert.Equal("SUPER_ADMIN", attr!.Roles);
        }

        [Fact]
        public async Task GetTenantRestoreHistory_ReturnsRestorePointsAndNeverLeaksHostFilesystemPaths()
        {
            var (provider, _, controller, _) = BuildTestHarness(CreateDefaultSuccessBridge());
            using var _ = provider;

            var actionResult = await controller.GetTenantRestoreHistory(32);
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var dto = Assert.IsType<TenantRestoreHistoryResponseDto>(okResult.Value);

            Assert.Equal(32, dto.TenantId);
            Assert.Equal("SOCOFEB", dto.TenantName);
            Assert.Equal("socofeb", dto.TenantSlug);
            Assert.Equal("tenant_socofeb", dto.SchemaName);
            Assert.Equal(3, dto.TotalSnapshotsIndexed);
            Assert.Equal(1, dto.EligibleSnapshotCount);
            Assert.Equal(3, dto.RestorePoints.Count);

            var eligiblePoint = dto.RestorePoints.First(p => p.SnapshotShortId == "2071d164");
            Assert.True(eligiblePoint.RestoreEligibility);
            Assert.Equal("verified", eligiblePoint.SnapshotVerificationStatus);
            Assert.Equal("present", eligiblePoint.TenantPresenceStatus);
            Assert.Equal("manifest_recorded_unverified", eligiblePoint.ChecksumVerificationStatus);
            Assert.Null(eligiblePoint.IneligibilityReason);

            var unavailablePoint = dto.RestorePoints.First(p => p.SnapshotShortId == "36a26b4e");
            Assert.False(unavailablePoint.RestoreEligibility);
            Assert.Equal("tenant_not_present_in_snapshot", unavailablePoint.IneligibilityReason);
            Assert.Contains("did not exist", unavailablePoint.IneligibilityExplanation, StringComparison.OrdinalIgnoreCase);

            var json = JsonSerializer.Serialize(dto);
            Assert.DoesNotContain("/opt/acya-backup", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("/var/backups", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("/home/ubuntu", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("stagingRoot", json, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GetTenantSnapshotEligibility_ReturnsDetailedEligibilityAndConfirmationRequirements()
        {
            var (provider, _, controller, _) = BuildTestHarness(CreateDefaultSuccessBridge());
            using var _ = provider;

            var eligibleRes = Assert.IsType<OkObjectResult>(await controller.GetTenantSnapshotEligibility(32, "2071d164"));
            var eligibleDetail = Assert.IsType<TenantSnapshotEligibilityDetailDto>(eligibleRes.Value);
            Assert.True(eligibleDetail.RestoreEligibility);
            Assert.True(eligibleDetail.RegistryMappingVerified);
            Assert.True(eligibleDetail.CanSubmitRestore);
            Assert.Equal("socofeb", eligibleDetail.RequiredConfirmationTenantSlug);
            Assert.Equal("2071d164", eligibleDetail.RequiredConfirmationSnapshotId);

            var ineligibleRes = Assert.IsType<OkObjectResult>(await controller.GetTenantSnapshotEligibility(32, "5a78f673"));
            var ineligibleDetail = Assert.IsType<TenantSnapshotEligibilityDetailDto>(ineligibleRes.Value);
            Assert.False(ineligibleDetail.RestoreEligibility);
            Assert.False(ineligibleDetail.CanSubmitRestore);
            Assert.Equal("degraded", ineligibleDetail.SnapshotVerificationStatus);
        }

        [Fact]
        public async Task SubmitTenantRestore_RejectsForbiddenClientParameters_SchemaNames_DumpPaths_OrCommands()
        {
            var (provider, _, controller, _) = BuildTestHarness(CreateDefaultSuccessBridge());
            using var _ = provider;

            var rawPayload = JsonSerializer.Deserialize<SubmitTenantRestoreRequestDto>(
                """
                {
                  "SnapshotId": "2071d164",
                  "ConfirmTenantSlug": "socofeb",
                  "ConfirmSnapshotId": "2071d164",
                  "schemaName": "tenant_other",
                  "dumpPath": "/tmp/evil.dump",
                  "command": "rm -rf /"
                }
                """)!;

            var result = await controller.SubmitTenantRestore(32, rawPayload);
            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status400BadRequest, objResult.StatusCode);

            var body = JsonSerializer.Serialize(objResult.Value);
            Assert.Contains("forbidden_client_parameters", body);
        }

        [Fact]
        public async Task SubmitTenantRestore_RejectsMismatchedConfirmationAndIneligibleSnapshots()
        {
            var (provider, _, controller, _) = BuildTestHarness(CreateDefaultSuccessBridge());
            using var _ = provider;

            // 1. Mismatched tenant slug confirmation -> 400 Bad Request
            var badSlugRes = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "wrong-slug",
                ConfirmSnapshotId = "2071d164"
            }));
            Assert.Equal(StatusCodes.Status400BadRequest, badSlugRes.StatusCode);
            Assert.Contains("confirmation_tenant_mismatch", JsonSerializer.Serialize(badSlugRes.Value));

            // 2. Mismatched snapshot confirmation -> 400 Bad Request
            var badSnapConfirmRes = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "36a26b4e"
            }));
            Assert.Equal(StatusCodes.Status400BadRequest, badSnapConfirmRes.StatusCode);
            Assert.Contains("confirmation_snapshot_mismatch", JsonSerializer.Serialize(badSnapConfirmRes.Value));

            // 3. Ineligible historical snapshot -> 422 Unprocessable Entity
            var ineligibleRes = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "36a26b4e",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "36a26b4e"
            }));
            Assert.Equal(StatusCodes.Status422UnprocessableEntity, ineligibleRes.StatusCode);
            Assert.Contains("tenant_not_present_in_snapshot", JsonSerializer.Serialize(ineligibleRes.Value));
        }

        [Fact]
        public async Task SubmitTenantRestore_ExecutesAsynchronously_PersistsStatesForRefreshRecovery_AndSanitizesPaths()
        {
            var (provider, _, controller, service) = BuildTestHarness(CreateDefaultSuccessBridge());
            using var _ = provider;

            var submitRes = await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "2071d164"
            });

            var acceptedResult = Assert.IsType<ObjectResult>(submitRes);
            Assert.Equal(StatusCodes.Status202Accepted, acceptedResult.StatusCode);
            var initialJob = Assert.IsType<TenantRestoreJobStatusDto>(acceptedResult.Value);
            Assert.StartsWith("restore-", initialJob.OperationId);

            // Wait for background restore completion
            var completedJob = await service.WaitForOperationCompletionAsync(initialJob.OperationId, TimeSpan.FromSeconds(5));
            Assert.NotNull(completedJob);
            Assert.Equal("Completed", completedJob!.CurrentState);
            Assert.Equal("Completed", completedJob.FinalState);
            Assert.True(completedJob.IsTerminal);
            Assert.Equal("succeeded", completedJob.Outcome);
            Assert.Equal(
                new[]
                {
                    "Pending",
                    "Extracting",
                    "Verifying",
                    "Staging",
                    "Prepared",
                    "BackingUpCurrent",
                    "CuttingOver",
                    "Validating",
                    "Completed"
                },
                completedJob.StateHistory);
            Assert.True(completedJob.PreRestoreBackupCreated);
            Assert.Equal(42, completedJob.RestoredTableCount);
            Assert.Equal(15, completedJob.UnaffectedTenantCount);

            // Simulate browser page refresh by querying status endpoints
            var statusOverviewRes = Assert.IsType<OkObjectResult>(await controller.GetTenantRestoreStatus(32));
            var statusOverview = Assert.IsType<TenantRestoreStatusOverviewDto>(statusOverviewRes.Value);
            Assert.NotNull(statusOverview.ActiveOrLatestOperation);
            Assert.Equal(initialJob.OperationId, statusOverview.ActiveOrLatestOperation!.OperationId);
            Assert.Equal("Completed", statusOverview.ActiveOrLatestOperation.CurrentState);

            var opRes = Assert.IsType<OkObjectResult>(await controller.GetRestoreOperationStatus(initialJob.OperationId));
            var opDto = Assert.IsType<TenantRestoreJobStatusDto>(opRes.Value);
            Assert.Equal("Completed", opDto.CurrentState);

            var serialized = JsonSerializer.Serialize(opDto);
            Assert.DoesNotContain("/opt/acya-backup", serialized, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("secret-host-path", serialized, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task SubmitTenantRestore_RejectsConcurrentRestoresWith409Conflict()
        {
            var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var startedSignal = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

            var blockingBridge = new ConfigurableExecutionBridge(async (target, opId, actor, onTransition, ct) =>
            {
                startedSignal.TrySetResult(true);
                await gate.Task;
                return new TenantRestoreResult
                {
                    OperationId = opId,
                    TenantId = target.TenantId,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    FinalState = TenantRestoreState.Completed,
                    StateHistory = new[] { TenantRestoreState.Pending, TenantRestoreState.Completed },
                    StartedAtUtc = DateTime.UtcNow,
                    FinishedAtUtc = DateTime.UtcNow
                };
            });

            var (provider, _, controller, service) = BuildTestHarness(blockingBridge);
            using var _ = provider;

            var firstSubmit = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "2071d164"
            }));
            Assert.Equal(StatusCodes.Status202Accepted, firstSubmit.StatusCode);
            var firstJob = Assert.IsType<TenantRestoreJobStatusDto>(firstSubmit.Value);

            await startedSignal.Task.WaitAsync(TimeSpan.FromSeconds(5));

            // Second concurrent restore request must be rejected with 409 Conflict
            var secondSubmit = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "2071d164"
            }));
            Assert.Equal(StatusCodes.Status409Conflict, secondSubmit.StatusCode);
            Assert.Contains("concurrent_restore_in_progress", JsonSerializer.Serialize(secondSubmit.Value));

            gate.TrySetResult(true);
            await service.WaitForOperationCompletionAsync(firstJob.OperationId, TimeSpan.FromSeconds(5));
        }

        [Theory]
        [InlineData(TenantRestoreState.Failed, "failed", false, null)]
        [InlineData(TenantRestoreState.RolledBack, "rolled_back", true, true)]
        [InlineData(TenantRestoreState.RollbackFailed, "rollback_failed", true, false)]
        public async Task SubmitTenantRestore_DistinguishesFailed_RolledBack_AndRollbackFailedOutcomes(
            TenantRestoreState terminalState,
            string expectedOutcome,
            bool expectedRollbackPerformed,
            bool? expectedRollbackSucceeded)
        {
            var bridge = new ConfigurableExecutionBridge((target, opId, actor, onTransition, ct) =>
            {
                var history = terminalState == TenantRestoreState.Failed
                    ? new[] { TenantRestoreState.Pending, TenantRestoreState.Extracting, TenantRestoreState.Verifying, TenantRestoreState.Failed }
                    : new[]
                    {
                        TenantRestoreState.Pending,
                        TenantRestoreState.Extracting,
                        TenantRestoreState.Verifying,
                        TenantRestoreState.Staging,
                        TenantRestoreState.Prepared,
                        TenantRestoreState.BackingUpCurrent,
                        TenantRestoreState.CuttingOver,
                        TenantRestoreState.RollingBack,
                        terminalState
                    };

                return Task.FromResult(new TenantRestoreResult
                {
                    OperationId = opId,
                    TenantId = target.TenantId,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    FinalState = terminalState,
                    StateHistory = history,
                    RecoveryArtifactsRetained = true,
                    WorkDirectory = "/opt/acya-backup/restore-work/op-123",
                    PreRestoreBackupPath = "/opt/acya-backup/restore-work/op-123/pre_restore_tenant_socofeb.dump",
                    RollbackPerformed = expectedRollbackPerformed,
                    RollbackSucceeded = expectedRollbackSucceeded,
                    ErrorCategory = "simulated_failure",
                    ErrorMessage = "Simulated failure at /opt/acya-backup/restore-work/op-123 with RESTIC_PASSWORD=secretval",
                    StartedAtUtc = DateTime.UtcNow,
                    FinishedAtUtc = DateTime.UtcNow
                });
            });

            var (provider, _, controller, service) = BuildTestHarness(bridge);
            using var _ = provider;

            var submitRes = Assert.IsType<ObjectResult>(await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = "2071d164",
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "2071d164"
            }));
            var job = Assert.IsType<TenantRestoreJobStatusDto>(submitRes.Value);

            var finalJob = await service.WaitForOperationCompletionAsync(job.OperationId, TimeSpan.FromSeconds(5));
            Assert.NotNull(finalJob);
            Assert.Equal(terminalState.ToString(), finalJob!.CurrentState);
            Assert.Equal(terminalState.ToString(), finalJob.FinalState);
            Assert.True(finalJob.IsTerminal);
            Assert.Equal(expectedOutcome, finalJob.Outcome);
            Assert.Equal(expectedRollbackPerformed, finalJob.RollbackPerformed);
            Assert.Equal(expectedRollbackSucceeded, finalJob.RollbackSucceeded);
            Assert.DoesNotContain("/opt/acya-backup", finalJob.ErrorMessage ?? string.Empty);
            Assert.DoesNotContain("secretval", finalJob.ErrorMessage ?? string.Empty);
        }

        [Fact]
        public async Task HostCliTenantRestoreBridge_InvokesHostScriptAndStreamsStateTransitions()
        {
            var tempDir = Path.Combine(Path.GetTempPath(), $"host_cli_bridge_test_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            var stateDir = Path.Combine(tempDir, "state");
            Directory.CreateDirectory(Path.Combine(stateDir, "restore-jobs"));
            var fakeCliPath = Path.Combine(tempDir, "fake-acya-tenant-restore.sh");

            await File.WriteAllTextAsync(
                fakeCliPath,
                """
                #!/bin/sh
                set -eu
                TENANT_ID=""
                SNAP_ID=""
                OP_ID=""
                CATALOG=""
                CONFIRM="0"
                while [ $# -gt 0 ]; do
                  case "$1" in
                    --tenant-id) TENANT_ID="$2"; shift 2 ;;
                    --snapshot-id) SNAP_ID="$2"; shift 2 ;;
                    --actor) shift 2 ;;
                    --operation-id) OP_ID="$2"; shift 2 ;;
                    --config) shift 2 ;;
                    --history-catalog) CATALOG="$2"; shift 2 ;;
                    --confirm-restore) CONFIRM="1"; shift 1 ;;
                    *) shift 1 ;;
                  esac
                done
                if [ "$CONFIRM" != "1" ]; then
                  exit 10
                fi
                STATE_DIR="$(dirname "$CATALOG")"
                JOB_FILE="$STATE_DIR/restore-jobs/$OP_ID.json"
                mkdir -p "$(dirname "$JOB_FILE")"
                cat <<EOF > "$JOB_FILE"
                {
                  "schema": "acya.backup.tenant-restore-state/v1",
                  "operationId": "$OP_ID",
                  "tenantId": $TENANT_ID,
                  "tenantSlug": "socofeb",
                  "schemaName": "tenant_socofeb",
                  "snapshotId": "$SNAP_ID",
                  "finalState": "Completed",
                  "stateHistory": [
                    "Pending", "Extracting", "Verifying", "Staging",
                    "Prepared", "BackingUpCurrent", "CuttingOver", "Validating", "Completed"
                  ],
                  "extractedDumpSha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
                  "preRestoreBackupSha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
                  "stagingTableCount": 42,
                  "restoredTableCount": 42,
                  "unaffectedTenantCount": 15,
                  "recoveryArtifactsRetained": true,
                  "rollbackPerformed": false,
                  "rollbackSucceeded": null,
                  "startedAt": "2026-11-07T10:00:00Z",
                  "finishedAt": "2026-11-07T10:00:05Z"
                }
                EOF
                cat "$JOB_FILE"
                """);

            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(
                    fakeCliPath,
                    UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            }

            try
            {
                var bridge = new HostCliTenantRestoreBridge(
                    NullLogger<HostCliTenantRestoreBridge>.Instance,
                    cliBinaryPath: fakeCliPath,
                    configPath: Path.Combine(tempDir, "backup.json"),
                    catalogPath: Path.Combine(stateDir, "tenant-backup-history.json"),
                    stateRootDir: stateDir);

                var target = new ValidatedTenantRestoreTarget(
                    32,
                    "socofeb",
                    "tenant_socofeb",
                    Snap2071,
                    "2071d164",
                    "2026-11-06T10:11:37Z",
                    "/opt/acya-backup/staging/stage-20261106",
                    "tenants/tenant_socofeb.dump",
                    221790,
                    ValidSha,
                    true);

                var observedStates = new List<TenantRestoreState>();
                var opId = "restore-20261107T100000Z-11223344";

                var result = await bridge.ExecuteRestoreAsync(
                    target,
                    opId,
                    "superadmin_test",
                    (update, _) =>
                    {
                        observedStates.Add(update.CurrentState);
                        return Task.CompletedTask;
                    });

                Assert.Equal(TenantRestoreState.Completed, result.FinalState);
                Assert.Equal(9, result.StateHistory.Count);
                Assert.Contains(TenantRestoreState.Completed, observedStates);
                Assert.Equal(42, result.RestoredTableCount);
                Assert.Equal(15, result.UnaffectedTenantCount);
            }
            finally
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }

        [Fact]
        public async Task SubmitTenantRestore_WhenExecutionDisabledByServerPolicy_Returns403Forbidden()
        {
            var bridge = new ConfigurableExecutionBridge((target, opId, user, onTrans, ct) =>
                Task.FromResult(new TenantRestoreResult
                {
                    OperationId = opId,
                    TenantId = target.TenantId,
                    TenantSlug = target.TenantSlug,
                    SchemaName = target.SchemaName,
                    SnapshotId = target.SnapshotId,
                    FinalState = TenantRestoreState.Completed,
                    StateHistory = new List<TenantRestoreState> { TenantRestoreState.Completed }
                }));

            var (_, _, controller, _) = BuildTestHarness(bridge, executionEnabled: false);
            var result = await controller.SubmitTenantRestore(32, new SubmitTenantRestoreRequestDto
            {
                SnapshotId = Snap2071,
                ConfirmTenantSlug = "socofeb",
                ConfirmSnapshotId = "2071d164"
            });

            var obj = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status403Forbidden, obj.StatusCode);
            var json = JsonSerializer.Serialize(obj.Value);
            Assert.Contains("restore_execution_disabled", json);
        }
    }
}
