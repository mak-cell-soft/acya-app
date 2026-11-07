# ACYA — Phase 11C.1.9 Implementation Report
## Backoffice Integration & UI for Individual Tenant Restore Management

### 1. Executive Summary

Phase 11C.1.9 integrates the host-level Individual Tenant Restore Engine (Phase 11C.1.8) and Tenant Backup History indexer (Phase 11C.1.7b) into the Backoffice administration platform (`bo-acya-app`):
- **Backend API (`admin-elance-back`):** Implemented authenticated Super Admin endpoints in `BackupController`, background task orchestration in `TenantRestoreManagementService`, host CLI bridge execution via `HostCliTenantRestoreBridge`, in-process test engine bridge via `EngineTenantRestoreBridge`, concurrency locking via `TenantRestoreConcurrencyGate`, and response sanitization via `BrowserPayloadSanitizer`.
- **Frontend UI (`admin-elance-front`):** Implemented `TenantRestorePanel` on the Monitoring page (`/monitoring`), replacing the legacy manual-backup button with interactive restore point browsing, snapshot verification & eligibility inspection, strict double-confirmation dialog, live 9-stage progress tracking, and resilient status recovery across page refreshes.
- **Legacy Protection:** Maintained permanent retirement of legacy restore endpoints (`410 Gone`) and prevented arbitrary file path, schema name, or SQL injection from client requests.

---

### 2. Architecture & Backend Endpoints

#### A. Super Admin API Routes (`BackupController.cs`)

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/backup/tenants/{tenantId}/history` | `GET` | `SUPER_ADMIN` | Lists historical snapshots for tenant with eligibility flags and reasons. |
| `/api/admin/backup/tenants/{tenantId}/snapshots/{snapshotId}` | `GET` | `SUPER_ADMIN` | Returns eligibility and verification details for a single snapshot. |
| `/api/admin/backup/tenants/{tenantId}/restore` | `POST` | `SUPER_ADMIN` | Submits single-tenant restore request after validation (`202 Accepted`). |
| `/api/admin/backup/tenants/{tenantId}/restore-status` | `GET` | `SUPER_ADMIN` | Polls the latest restore operation status for the specified tenant. |
| `/api/admin/backup/restore-operations/{operationId}` | `GET` | `SUPER_ADMIN` | Retrieves execution details and live stage progress by operation ID. |
| `/api/admin/backup/restore/{jobId}` | `POST` | Retired | Returns `410 Gone` with legacy restore retirement notice. |

#### B. Execution & Security Controls (`TenantRestoreManagementService.cs`)

1. **Strict Client Input Allowlist:** Clients submit only `tenantId`, `snapshotId`, `confirmTenantSlug`, and `confirmSnapshotId`. No schema names, dump file paths, or shell strings are accepted.
2. **Schema & Snapshot Verification:** Schema names and dump filenames are resolved exclusively by mapping the database `bo_tbl_enterprise` record against the trusted index `/opt/acya-backup/state/tenant-backup-history.json`.
3. **Double Confirmation Enforcement:** Requests are rejected with `422 Unprocessable Entity` unless `confirmTenantSlug` and `confirmSnapshotId` exactly match the target.
4. **Non-Blocking Background Orchestration:** Restore execution runs asynchronously in the background. Endpoints respond immediately (`202 Accepted`) with an `operationId`, allowing the UI to poll progress without holding long-lived HTTP connections.
5. **Concurrency Gate:** `TenantRestoreConcurrencyGate` guarantees only one restore operation can run across the entire platform at any given time. Concurrent submissions are rejected with `409 Conflict`.
6. **Path & Credential Sanitization:** `BrowserPayloadSanitizer` automatically redacts server paths (`/opt/acya-backup/...`, `/var/...`) and sensitive parameters before DTOs are sent to the client browser.
7. **State Persistence & Recovery:** Operations are persisted in `bo_tbl_platform_settings` under keys `restore_op:<operationId>` and `restore_latest:<tenantId>`, allowing admins to reload the page or navigate away without losing track of restore progress.

---

### 3. Frontend Implementation (`admin-elance-front`)

#### A. Components & Pages
- **`src/types/restore.ts`:** Domain TypeScript definitions for restore points, operation states, progress stages, and API requests/responses.
- **`src/components/TenantRestorePanel.tsx`:**
  - Displays historical snapshots table showing snapshot timestamp, short ID, dump archive size, manifest SHA-256 fingerprint, and eligibility status badge.
  - Snapshot selection restricted strictly to eligible restore points; ineligible points display explicit reasons (e.g., pre-dates tenant provisioning, missing checksum, corrupted manifest).
  - Restore Action Modal requiring explicit typed confirmation of both tenant slug and snapshot ID.
  - Real-time 9-stage stepper matching backend state machine:
    `Pending → Extracting → Verifying → Staging → Prepared → BackingUpCurrent → CuttingOver → Validating → Completed`
  - Distinct visual states for completion, failure, and rollback outcomes (`RolledBack`, `RollbackFailed`, `Failed`).
  - Automatic 1.5s polling while active, recovering immediately on page reload.
- **`src/app/monitoring/page.tsx`:**
  - Removed legacy manual backup button and legacy restore action.
  - Embedded `TenantRestorePanel` bound to active selected enterprise (`?tenantId=<id>` URL query support).
  - Sanitized historical backup job list to prevent leakage of server filesystem paths.

---

### 4. Verification & Test Matrix

| Test Suite / Tool | Target | Result | Details |
| :--- | :--- | :--- | :--- |
| **xUnit Test Suite** | `ms.admin.api.acya.tests` | **199 / 199 Passed** | Full suite including `TenantRestoreManagementControllerTests`, `TenantRestoreEngineTests`, and `LegacyRestoreProtectionTests`. |
| **Python Unit Tests** | `test_backup_runner.py`<br>`test_backup_history.py`<br>`test_tenant_restore.py` | **37 / 37 Passed** | Full coverage of runner, history indexer, and restore engine CLI workflows. |
| **ESLint** | `TenantRestorePanel.tsx`<br>`types/restore.ts`<br>`monitoring/page.tsx` | **0 Errors, 0 Warnings** | Clean React 19 / TypeScript 5 lint compliance. |
| **TypeScript Compiler** | `npx tsc --noEmit -p .` | **Exit code 0** | Full strict typecheck pass with zero errors. |
| **Next.js Production Build** | `npx next build --webpack` | **Exit code 0** | 27/27 static & dynamic routes compiled and optimized, including `/monitoring`. |

---

### 5. Production & Operational Safety Compliance

- **Production Restoration:** ZERO production restores executed (`0`).
- **Global Restic Repository:** Append-only integrity preserved; zero individual-tenant snapshots created.
- **Repository Authorization:** `repositoryWritesAuthorized = false` confirmed intact.
- **Production Timer:** `acya-backup-runner.timer` confirmed inactive/disabled.
- **Docker Containers:** Production services (`wood-app-api`, `bo-admin-api`, `wood-app-db`, etc.) remain online and untouched.
- **Git State:** No commits or pushes made. Changes isolated strictly to Phase 11C.1.9 scope.

