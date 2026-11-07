# ACYA — Phase 11C.1.7a: Legacy Restore Protection Report

**Date:** `2026-11-07`  
**Phase:** `11C.1.7a` — Neutralize Legacy Restore Endpoint & Prevent In-Place `DROP SCHEMA CASCADE` Execution  
**Target Service:** `admin-elance-back` ([bo-acya-app/admin-elance-back](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back))  
**Safety Status:** **VERIFIED SAFE** — No backups triggered, no Restic writes, no `pg_dump` or `pg_restore` executed, no PostgreSQL data modified, no containers restarted.

---

## 1. Executive Summary

Prior to Phase 11C.1.7a, `admin-elance-back` exposed a legacy single-tenant restore workflow consisting of three code paths:

1. **API Endpoint:** [`BackupController.RequestRestore`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs#L64-L77) (`POST /api/admin/backup/restore/{jobId}`), which queued a `BackupJob` row with `Type = "Restore"` and `Status = "Pending"`.
2. **Background Scheduler:** [`SaaSLifecycleScheduler.ProcessBackupJobsAsync`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/SaaSLifecycleScheduler.cs#L89-L179), which polled `bo_tbl_backup_jobs` every 10 seconds for `Status == "Pending"` and dispatched `job.Type == "Restore"` jobs to `BackupService.RestoreTenantSchemaAsync`.
3. **Destructive Service Method:** [`BackupService.RestoreTenantSchemaAsync`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/BackupService.cs#L83-L94), which opened a connection to `wood-app-db`, executed `DROP SCHEMA IF EXISTS "{schemaName}" CASCADE; CREATE SCHEMA "{schemaName}";` directly against the live production schema without a pre-restore backup or staging verification, and then invoked `pg_restore` from ephemeral container storage (`/app/backups`).

In Phase 11C.1.7a, **all three layers** have been neutralized in defense-in-depth fashion so that **no code path** can queue or execute the legacy `DROP SCHEMA CASCADE` workflow, while preserving existing `bo_tbl_backup_jobs` history records (`GET /api/admin/backup/jobs/{tenantId}`) and leaving the manual backup endpoint (`POST /api/admin/backup/{tenantId}`) untouched.

---

## 2. Changed Files

| File | Change Type | Summary of Modifications |
| :--- | :---: | :--- |
| [BackupController.cs](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs) | Modified | Disabled `POST /api/admin/backup/restore/{jobId}` (`RequestRestore`) to immediately return **HTTP `410 Gone`** (`StatusCodes.Status410Gone`) with code `LEGACY_RESTORE_RETIRED` and a clear retirement message without querying or mutating `MasterDbContext`. Preserved `GetJobs`, `RequestBackup`, and `DownloadBackup`. |
| [BackupService.cs](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/BackupService.cs) | Modified | Removed all `NpgsqlConnection` (`DROP SCHEMA IF EXISTS ... CASCADE; CREATE SCHEMA ...`) and `pg_restore` `Process.Start` logic from `RestoreTenantSchemaAsync`. The method now logs a warning and unconditionally throws `NotSupportedException`. |
| [SaaSLifecycleScheduler.cs](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/SaaSLifecycleScheduler.cs) | Modified | Hardened `ProcessBackupJobsAsync` so any `Pending` job with `Type == "Restore"` is immediately rejected (`Status = "Failed"`, `ErrorMessage = "The legacy in-place schema restore mechanism has been retired and disabled."`) and recorded in `MasterAuditLogs` (`Action = "Schema Restore Rejected (Retired)"`) without calling `RestoreTenantSchemaAsync`. |
| [LegacyRestoreProtectionTests.cs](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/tests/ms.admin.api.acya.tests/LegacyRestoreProtectionTests.cs) | Added | Added 5 xUnit tests proving that `RequestRestore` returns HTTP `410 Gone` without mutating the database, historical backup records and `RequestBackup` remain intact, `RestoreTenantSchemaAsync` throws `NotSupportedException`, and `SaaSLifecycleScheduler` rejects any pending `Restore` job. |

---

## 3. Implementation Details

### 3.1 Controller Layer (`BackupController.RequestRestore`)
In [`BackupController.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs#L64-L77):
- Route `[HttpPost("restore/{jobId}")]` remains bound so callers receive an explicit semantic HTTP status rather than a generic 404.
- Immediately returns **HTTP `410 Gone`**:
  ```json
  {
    "status": 410,
    "code": "LEGACY_RESTORE_RETIRED",
    "message": "The legacy in-place schema restore mechanism has been retired for production safety. Individual tenant restoration must use the verified Restic snapshot recovery workflow."
  }
  ```
- Performs **zero** database writes (`_context.BackupJobs.AddAsync` and `_context.SaveChangesAsync` were completely removed from `RequestRestore`).
- Existing endpoints [`GetJobs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs#L28-L37) (`GET /api/admin/backup/jobs/{tenantId}`), [`RequestBackup`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs#L39-L62) (`POST /api/admin/backup/{tenantId}`), and [`DownloadBackup`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupController.cs#L79-L95) (`GET /api/admin/backup/download/{jobId}`) are unchanged.

### 3.2 Service Layer (`BackupService.RestoreTenantSchemaAsync`)
In [`BackupService.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/BackupService.cs#L83-L94):
- The destructive SQL statement `DROP SCHEMA IF EXISTS "{schemaName}" CASCADE; CREATE SCHEMA "{schemaName}";` and the `pg_restore` subprocess invocation have been completely eliminated from the codebase.
- Calling `RestoreTenantSchemaAsync` now logs a warning and throws `NotSupportedException` before any database connection or external process can be created.

### 3.3 Scheduler Layer (`SaaSLifecycleScheduler.ProcessBackupJobsAsync`)
In [`SaaSLifecycleScheduler.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/SaaSLifecycleScheduler.cs#L107-L129):
- Even if a `BackupJob` row with `Type = "Restore"` and `Status = "Pending"` were ever inserted directly into `bo_tbl_backup_jobs` outside the API controller, `ProcessBackupJobsAsync` intercepts `string.Equals(job.Type, "Restore", StringComparison.OrdinalIgnoreCase)` before setting `Status = "Running"`, marks the job as `Failed` with `CompletedAt = DateTime.UtcNow`, and writes a `MasterAuditLog` entry (`Action = "Schema Restore Rejected (Retired)"`).

---

## 4. Test Verification Results

The full `ms.admin.api.acya.tests` xUnit suite (`169` total tests, including the 5 new tests in [`LegacyRestoreProtectionTests.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/tests/ms.admin.api.acya.tests/LegacyRestoreProtectionTests.cs)) was executed:

```text
Test run for /repo/bo-acya-app/admin-elance-back/tests/ms.admin.api.acya.tests/bin/Debug/net8.0/ms.admin.api.acya.tests.dll (.NETCoreApp,Version=v8.0)
VSTest version 17.11.1 (x64)

Starting test execution, please wait...
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:   169, Skipped:     0, Total:   169, Duration: 1 s - ms.admin.api.acya.tests.dll (net8.0)
```

### Verified Test Cases in `LegacyRestoreProtectionTests`:
1. `RequestRestore_WithCompletedBackupJob_Returns410GoneAndDoesNotModifyDatabase` — Verifies HTTP `410 Gone`, `LEGACY_RESTORE_RETIRED` payload, zero `Restore` jobs queued, and existing `Completed` backup record preserved unchanged.
2. `RequestRestore_WithNonExistentJobId_StillReturns410GoneWithoutDatabaseWrite` — Verifies HTTP `410 Gone` for arbitrary `jobId` with zero database writes.
3. `GetJobs_And_RequestBackup_RemainIntactAfterRestoreRetirement` — Verifies that `GET /api/admin/backup/jobs/{tenantId}` returns existing backup history records intact and `POST /api/admin/backup/{tenantId}` remains unmodified.
4. `RestoreTenantSchemaAsync_ThrowsNotSupportedExceptionAndCannotExecuteDropSchema` — Verifies that `BackupService.RestoreTenantSchemaAsync` immediately throws `NotSupportedException` without opening any PostgreSQL connection or spawning `pg_restore`.
5. `Scheduler_ProcessBackupJobsAsync_RejectsPendingRestoreJobAndPreservesHistory` — Verifies that `SaaSLifecycleScheduler.ProcessBackupJobsAsync` marks any pending `Restore` job as `Failed`, logs `Schema Restore Rejected (Retired)` in `MasterAuditLogs`, and preserves completed `Backup` jobs untouched.

---

## 5. Operational Safety Confirmation

- **No Backups Triggered:** Confirmed.
- **No Restic Write Operations Executed:** Confirmed.
- **No `pg_dump` or `pg_restore` Executed:** Confirmed.
- **No PostgreSQL Data Modified:** Confirmed.
- **Systemd Timer (`acya-backup-runner.timer`):** Remains `disabled` and `inactive`.
- **`repositoryWritesAuthorized` in `/opt/acya-backup/config/backup.json`:** Remains `false`.
- **Production Containers:** Untouched (no container builds, restarts, or redeployments).
- **Git Status:** Uncommitted and unpushed per instructions.

