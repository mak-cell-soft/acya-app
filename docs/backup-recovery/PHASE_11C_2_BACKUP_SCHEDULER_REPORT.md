# ACYA OMEGA — Phase 11C.2 Verification & Implementation Report
## Production Backup Scheduler Management

**Document Status:** Complete & Verified  
**Date:** November 7, 2026  
**Target Environment:** Production Host (`51.210.10.108`) & Admin Backoffice Suite (`admin.acya.site` / `51.254.216.8`)  
**Security & Operational Posture:** Scheduler timer disabled; Repository write authorization guard enforced (`repositoryWritesAuthorized: false`). No backups or write operations triggered.

---

## 1. Architectural Architecture & Topology

Phase 11C.2 implements secure, remote management of the Production automated backup scheduler from the ACYA Omega Backoffice dashboard while maintaining physical infrastructure separation and tenant data boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ADMIN VPS (51.254.216.8)                              │
│                                                                             │
│  [ admin.acya.site Frontend (Next.js 16.4 / React 19) ]                    │
│        │                                                                    │
│        ▼ HTTPS (JWT Bearer Token / Role: SuperAdmin)                        │
│  [ admin-elance-back Web API (.NET 8) ]                                     │
│        │  Controller: BackupSchedulerController                            │
│        │  Service: BackupSchedulerManagementService                        │
│        │  Bridge: HttpProductionSchedulerBridge (or HostCli fallback)       │
└────────┼────────────────────────────────────────────────────────────────────┘
         │
         │ Authenticated HTTP/mTLS over VPN/Internal Mesh
         │ Header: X-Scheduler-Token (256-bit secret)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION VPS (51.210.10.108)                           │
│                                                                             │
│  [ acya-scheduler-daemon (Port 9095, loopback/restricted interface) ]       │
│        │                                                                    │
│        ▼ Exec / Subprocess (Restricted CLI)                                 │
│  [ acya-backup-scheduler CLI (/opt/acya-backup/bin/acya-backup-scheduler) ] │
│        │                                                                    │
│        ├── Inspects systemctl status acya-backup-runner.timer               │
│        ├── Inspects /opt/acya-backup/state/last-run.json (telemetry)         │
│        ├── Updates /etc/systemd/system/acya-backup-runner.timer.d/           │
│        │          └── 10-schedule.conf (Drop-in OnCalendar override)        │
│        └── Controls systemctl enable/disable/start/stop timer                │
│                                                                             │
│  [ Fail-Safe Guard ]: /opt/acya-backup/config/backup.json                   │
│        └── "repositoryWritesAuthorized": false                              │
│  [ Backup Execution Engine ]: NEVER MOVED TO ADMIN VPS                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Deliverables & File Index

### 2.1 Production VPS Host Controller & Daemon

| File | Type | Permissions | Description |
| :--- | :--- | :--- | :--- |
| [`scripts/backup-runner/lib/acya_backup/scheduler.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/scheduler.py) | Python Module | `0644` | Core scheduler domain logic: systemd timer status, drop-in generation, timezone offset computation, validation, audit logging. |
| [`scripts/backup-runner/bin/acya-backup-scheduler`](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-scheduler) | CLI Executable | `0750` | Command-line management tool supporting `status`, `set-schedule`, `enable`, `disable`, and `--dry-run`. |
| [`scripts/backup-runner/bin/acya-scheduler-daemon`](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-scheduler-daemon) | Daemon Server | `0750` | Lightweight HTTP API daemon listening on port 9095, enforcing constant-time token authentication. |
| [`scripts/backup-runner/systemd/acya-scheduler-daemon.service`](file:///home/ubuntu/acya-app/scripts/backup-runner/systemd/acya-scheduler-daemon.service) | Systemd Unit | `0644` | Systemd service definition running the scheduler daemon under unprivileged isolation. |
| `/opt/acya-backup/config/scheduler-secret.token` | Secret File | `0600` | 256-bit cryptographically secure token restricting daemon access. |

### 2.2 ACYA Omega Backend (.NET 8)

| File | Type | Description |
| :--- | :--- | :--- |
| [`bo-acya-app/admin-elance-back/src/ms.admin.api.acya.core/DTOs/BackupSchedulerDtos.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya.core/DTOs/BackupSchedulerDtos.cs) | C# DTOs | Request and response contracts for status, schedule configuration, and command results. |
| [`bo-acya-app/admin-elance-back/src/ms.admin.api.acya.core/Interfaces/IBackupSchedulerManagementService.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya.core/Interfaces/IBackupSchedulerManagementService.cs) | C# Interfaces | Abstractions for `IProductionSchedulerBridge` and `IBackupSchedulerManagementService`. |
| [`bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/BackupSchedulerManagementService.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Services/BackupSchedulerManagementService.cs) | C# Services | Contains `HttpProductionSchedulerBridge`, `HostCliProductionSchedulerBridge`, and the management coordinator service. |
| [`bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupSchedulerController.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Controllers/BackupSchedulerController.cs) | API Controller | Authenticated endpoints under `api/admin/backup/scheduler`, strictly restricted to SuperAdmin role. |
| [`bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Program.cs`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-back/src/ms.admin.api.acya/Program.cs) | Configuration | Dependency injection registration with dual transport support (`BACKUP_SCHEDULER_URL` or host CLI). |

### 2.3 ACYA Omega Frontend (Next.js 16.4 / React 19)

| File | Type | Description |
| :--- | :--- | :--- |
| [`bo-acya-app/admin-elance-front/src/types/scheduler.ts`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-front/src/types/scheduler.ts) | TypeScript | TypeScript contracts mirroring backend scheduler DTOs. |
| [`bo-acya-app/admin-elance-front/src/components/BackupSchedulerPanel.tsx`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-front/src/components/BackupSchedulerPanel.tsx) | React Component | Interactive scheduler control panel featuring status badges, timer toggle, schedule form, and confirmation dialogs. |
| [`bo-acya-app/admin-elance-front/src/app/monitoring/page.tsx`](file:///home/ubuntu/acya-app/bo-acya-app/admin-elance-front/src/app/monitoring/page.tsx) | Page | Embedded scheduler panel prominently positioned at top of Monitoring & Backup view. |

---

## 3. API Contract & Security Protocol

### 3.1 Endpoints Specification

All endpoints require HTTP Bearer authentication and `SuperAdmin` role:

| Method | Endpoint | Description | Sample Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/backup/scheduler` | Returns full scheduler status, timer state, schedule, telemetry, and guard state. | `200 OK` + `SchedulerStatusDto` |
| `PUT` | `/api/admin/backup/scheduler` | Updates daily execution time and IANA timezone. | `200 OK` + `SchedulerOperationResultDto` |
| `POST` | `/api/admin/backup/scheduler/enable` | Enables and unmasks the systemd timer. | `200 OK` + `SchedulerOperationResultDto` |
| `POST` | `/api/admin/backup/scheduler/disable` | Stops and disables the systemd timer. | `200 OK` + `SchedulerOperationResultDto` |

### 3.2 Security Protections Enforced

1. **Role-Based Authorization:** Controller is annotated with `[Authorize(Roles = "SUPER_ADMIN,SuperAdmin")]`. Normal tenant administrators or unauthorized users receive `403 Forbidden` or `401 Unauthorized`.
2. **Timing-Safe Authentication:** The production daemon uses `hmac.compare_digest` to validate `X-Scheduler-Token`, preventing timing side-channel attacks.
3. **No Shell Injections:** All arguments to system utilities (`systemctl`) are passed as discrete token arrays without shell invocation (`shell=False`).
4. **Strict Input Sanitization:**
   - Daily time must match regex `^(?:[01]\d|2[0-3]):[0-5]\d$` (24-hour format `HH:MM`).
   - Timezone must be a valid IANA identifier verified by Python's `zoneinfo.ZoneInfo`.
5. **Fail-Safe Invariant:** `/opt/acya-backup/config/backup.json` has `"repositoryWritesAuthorized": false`. Even if a timer trigger occurs, the backup runner exits safely with code 10 prior to any repository modification.

---

## 4. Verification & Test Matrix

### 4.1 Backend .NET Tests

Executed via .NET 8 SDK container across all Admin API projects:
```bash
dotnet test tests/ms.admin.api.acya.tests/ms.admin.api.acya.tests.csproj --no-restore --verbosity minimal
```
- **Total Test Cases:** 211
- **Passed:** 211
- **Failed:** 0
- **Scheduler Coverage:**
  - `GetStatusAsync_ReturnsExpectedStatusFromBridge`
  - `UpdateDailyScheduleAsync_ValidatesTimeFormat`
  - `UpdateDailyScheduleAsync_ValidatesTimezone`
  - `UpdateDailyScheduleAsync_DelegatesToBridgeWhenValid`
  - `EnableTimerAsync_DelegatesToBridge`
  - `DisableTimerAsync_DelegatesToBridge`
  - `HttpBridge_GetStatusAsync_SendsCorrectAuthorizationHeader`
  - `HttpBridge_GetStatusAsync_ThrowsOnUnauthorized`
  - `Controller_GetStatus_ReturnsOk`
  - `Controller_UpdateSchedule_ReturnsBadRequestOnValidationError`
  - `Controller_Enable_ReturnsOk`

### 4.2 Python Controller & Daemon Unit Tests

Executed against `scripts/backup-runner/tests/`:
```bash
python3 -m unittest discover -s /home/ubuntu/acya-app/scripts/backup-runner/tests
```
- **Total Test Cases:** 48
- **Passed:** 48
- **Failed:** 0
- **Scheduler Scenarios Covered:**
  - Status retrieval from systemctl and telemetry
  - Time format validation (rejecting `25:00`, `9:00`, `abc`)
  - Timezone validation (rejecting `Invalid/Zone`, empty string)
  - Drop-in file generation with UTC conversion
  - Atomic drop-in file replacement
  - Enabling/disabling systemd timers
  - Dry-run mode without modifying filesystem or systemd
  - Token authentication and 401 rejection on unauthorized requests
  - Daemon HTTP routing and error handling

### 4.3 Frontend Verification

Executed in `bo-acya-app/admin-elance-front`:
1. **ESLint:**
   ```bash
   npx eslint src/components/BackupSchedulerPanel.tsx src/types/scheduler.ts src/app/monitoring/page.tsx
   ```
   *Result:* 0 errors, 0 warnings.
2. **TypeScript Compilation:**
   ```bash
   npx tsc --noEmit -p .
   ```
   *Result:* 0 errors.
3. **Production Next.js Build:**
   ```bash
   NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/next-font-mock.json npx next build --webpack
   ```
   *Result:* 27/27 static and dynamic pages generated successfully. Zero compilation or bundling errors.

---

## 5. Live Production Safeguard Verification

All mandatory safeguards have been checked and verified on the live host:

| Safeguard | Target State | Actual Live State | Status |
| :--- | :--- | :--- | :--- |
| `acya-backup-runner.timer` active | `inactive` | `inactive` | **VERIFIED** |
| `acya-backup-runner.timer` enabled | `disabled` | `disabled` | **VERIFIED** |
| `repositoryWritesAuthorized` | `false` | `false` | **VERIFIED** |
| `acya-scheduler-daemon.service` | `active (running)` | `active (running)` on port 9095 | **VERIFIED** |
| Unintended Git modifications | Clean working tree | Only Phase 11C.2 tracked files | **VERIFIED** |

---

## 6. Conclusion & Next Steps

Phase 11C.2 is completely implemented, verified, and ready for deployment upon authorization:
- The Production VPS scheduler controller and daemon operate securely with restricted privileges.
- The Admin Backoffice API provides authenticated SuperAdmin control with dual bridge capabilities.
- The Admin Backoffice UI provides clear visibility and safe controls for the backup schedule.
- All 259 backend, frontend, and Python tests pass.
- No repository writes or live backup executions have occurred.

