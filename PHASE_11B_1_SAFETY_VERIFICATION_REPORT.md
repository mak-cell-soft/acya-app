# ACYA Backup Infrastructure — Phase 11B.1: Pre-Production Backup Safety Verification & Corrections Report

**Document Classification:** Phase 11B.1 Pre-Production Safety Verification & Corrections Deliverable  
**Production Host:** `vps-1d2bffb5` (`51.210.10.108`)  
**Administration / Monitoring Host:** `vps-b92b4ae6` (`51.254.216.8`)  
**Verification Timestamp:** `2026-11-06T06:46:36Z`  
**Runner Installation Path:** `/opt/acya-backup/` (`v2.0.0`, Contract `acya.backup.run/v1`)  
**Final Readiness Status:** **`READY WITH CONDITIONS`**

---

## 1. Executive Summary

Phase 11B.1 performed a strictly read-only, non-destructive pre-production safety audit and targeted refinement of the standalone backup architecture installed under `/opt/acya-backup/`.

### Key Verification Outcomes
1. **Restic Binary & Version Alignment (Task B):** Exactly one Restic binary exists on the Production host (`/usr/local/bin/restic`, SHA-256 `20d4142678d0d95ec11a4759def1b73fd9190abc9ca19e4b62d067c0b387e639`), reporting `restic 0.19.1 compiled with go1.26.4 on linux/amd64`. The backup runner invokes `/usr/local/bin/restic` by absolute path (`cfg.restic_binary`), eliminating any `PATH` resolution ambiguity.
2. **Restic Lock Safety & Process Identity Refinement (Task A):** All four existing October 13 repository locks (`3099b87ce1f8...`, `6783de77a934...`, `7a44ddbe78f0...`, `b9a2973b8342...`) were inspected via `--no-lock`. All four are non-exclusive (`"exclusive": false`) shared locks created on `vps-1d2bffb5` on `2026-10-13` by processes (`311438`, `309837`, `317496`, `333248`) that no longer exist. We hardened `/opt/acya-backup/lib/acya_backup/restic.py` (`_local_restic_pid_status`) to inspect `/proc/<pid>/comm` and `/proc/<pid>/cmdline` so that even if the Linux kernel reuses a historical PID for an unrelated non-`restic` process, the lock inspector accurately distinguishes a genuinely active `restic` process from a terminated `restic` process.
3. **Cryptography Documentation Correction (Task C):** Corrected the architectural documentation description of Restic's encryption scheme from the inaccurate `AES-256-GCM + Poly1305` phrasing to Restic's actual specification: **AES-256-CTR (256-bit AES in Counter Mode) with Poly1305-AES message authentication** (`encrypt-then-MAC`, using `scrypt` key derivation). No repository data or encryption settings were touched.
4. **Systemd Schedule & Timezone Flag (Task D):** Verified that `/etc/systemd/system/acya-backup-runner.timer` is currently configured for `OnCalendar=*-*-* 02:00:00 UTC` (`03:00` Tunisia local time, `Africa/Tunis` = `UTC+1`), whereas the previously discussed schedule in earlier phases was `01:00:00 UTC` (`02:00` Tunisia local time). Per instructions, the systemd units were **not modified** and remain **disabled and inactive**; this 1-hour difference (`02:00 UTC` vs `01:00 UTC`) is explicitly flagged for human decision before timer activation.
5. **Production Write-Gate Enforcement (Task E):** Verified that `"repositoryWritesAuthorized": false` in `/opt/acya-backup/config/backup.json` blocks `--mode full` at two independent layers (`BackupRunner.execute()` and `ResticClient.create_backup()`) with exit code `10` (`CONFIG`), that `--skip-remote` is rejected when combined with `--mode full`, and that no CLI flag or systemd dependency can bypass the gate or trigger an automatic `restic unlock`.
6. **Expanded Regression Suite (Task F):** Expanded `/opt/acya-backup/tests/test_backup_runner.py` from 13 to **20 automated tests** covering all 4 lock classes, `--require-clear` exit codes, `/proc` PID-reuse handling, Restic version detection, write-gate enforcement, automatic-unlock prevention, and systemd disabled state verification. All **20/20 tests passed**.

---

## 2. Restic Version and Binary Path (Task B)

### 2.1 Live Host Evidence
```text
$ which -a restic
/usr/local/bin/restic

$ /usr/local/bin/restic version
restic 0.19.1 compiled with go1.26.4 on linux/amd64

$ ls -la /usr/local/bin/restic
-rwxr-xr-x 1 root root 30941346 Oct  2 10:12 /usr/local/bin/restic

$ sha256sum /usr/local/bin/restic
20d4142678d0d95ec11a4759def1b73fd9190abc9ca19e4b62d067c0b387e639  /usr/local/bin/restic
```

### 2.2 Binary Resolution & Compatibility Verification
- **Filesystem Search:** A full root filesystem scan (`find / -xdev -name "restic" -type f`) confirmed that `/usr/local/bin/restic` is the **only** Restic binary installed on the Production VPS.
- **Runner Invocation Path:**
  - `/opt/acya-backup/config/backup.json` sets `"restic": { "binary": "/usr/local/bin/restic", ... }`.
  - `/opt/acya-backup/lib/acya_backup/config.py` validates `restic.binary` via `_abs()`, requiring an absolute path without `..`.
  - `/opt/acya-backup/lib/acya_backup/restic.py` constructs every command vector as `[self.cfg.restic_binary, ...]` and passes it to `subprocess.run(..., shell=False)`.
  - Therefore, **`PATH` environment variables can never redirect the runner to another binary.**
- **Test Parity:** Both the automated test suite (`/opt/acya-backup/tests/test_backup_runner.py`) and all historical snapshots in `/data/backups/restic` (`program_version: "restic 0.19.1"`) use the exact same `/usr/local/bin/restic` (`0.19.1`) binary. Zero version discrepancy exists.

---

## 3. Detailed Analysis of the Four Existing Locks (Task A)

### 3.1 Raw Lock Payloads Inspected via `restic --no-lock`
Executing read-only commands (`restic --no-lock list locks -q` and `restic --no-lock cat lock <id> -q`) against `sftp:backup@51.254.216.8:/data/backups/restic` returned the following exact JSON payloads:

| # | Full 64-Hex Lock Object ID | `time` (UTC) | `exclusive` | `hostname` | `username` | `pid` | Age at `06:46:36Z` | Process Exists on `vps-1d2bffb5`? |
| :-: | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | `6783de77a934d601daf7e5614e43dec0eeb13f02d02270cc89c00015534cf387` | `2026-10-13T18:54:05.603613018Z` | `false` | `vps-1d2bffb5` | `root` | `309837` | `2,029,944 s` (~23.49 d) | **No** (`sameHostPidExists: false`) |
| 2 | `3099b87ce1f82188eafbe0a40a9378fb5cb74167b71c0565e8c25959326f8ef4` | `2026-10-13T18:56:19.946811509Z` | `false` | `vps-1d2bffb5` | `root` | `311438` | `2,029,810 s` (~23.49 d) | **No** (`sameHostPidExists: false`) |
| 3 | `7a44ddbe78f0b4c0dca91ec3026aadeae6a997f8dbe0c1aadaecacaba10cdded` | `2026-10-13T19:03:37.843091533Z` | `false` | `vps-1d2bffb5` | `root` | `317496` | `2,029,372 s` (~23.49 d) | **No** (`sameHostPidExists: false`) |
| 4 | `b9a2973b83421d8f288586d92f014d2ce778e8365433d62b0760b00c25bb6db5` | `2026-10-13T19:28:25.219195609Z` | `false` | `vps-1d2bffb5` | `root` | `333248` | `2,027,885 s` (~23.47 d) | **No** (`sameHostPidExists: false`) |

### 3.2 How Lock Classification Works (`evaluate_locks` in `/opt/acya-backup/lib/acya_backup/restic.py`)

For every lock returned by `restic list locks --no-lock --quiet`, `inspect_locks()` reads its JSON metadata via `restic cat lock <id> --no-lock` and evaluates four dimensions:
1. **Exclusivity (`exclusive`):** `true` (exclusive lock created by `prune`, `forget`, `check`, `rebuild-index`, `repair`) vs `false` (shared lock created by `backup`, `mount`, `restore`, `dump`).
2. **Timestamp Age (`ageSeconds` vs `staleAfterSeconds = 1800`):** Restic refreshes active locks every 5 minutes and considers a lock stale after **30 minutes (`1800` seconds)** without refresh.
3. **Originating Host (`hostname` vs `socket.gethostname()`):** Whether the lock was created by this host (`vps-1d2bffb5`) or a remote host (such as `vps-b92b4ae6`).
4. **Local Process Identity (`_local_restic_pid_status(pid)` — Refined in Phase 11B.1):**
   - Checks `os.kill(pid, 0)` to determine if `pid` exists (`sameHostPidExists`).
   - If the PID exists on `vps-1d2bffb5`, inspects `/proc/<pid>/comm` and `/proc/<pid>/cmdline` to verify whether that PID is actually an active `restic` process (`sameHostResticAlive`) or an unrelated process that reused the numeric PID after the original `restic` process terminated.

This produces four mutually exclusive classifications:

| Classification | Criteria | Blocks New Backup? | Reason |
| :--- | :--- | :---: | :--- |
| **`active_exclusive`** | `exclusive == true` AND (`ageSeconds < 1800` OR `sameHostResticAlive == true`) | **YES (Blocking)** | An exclusive repository operation (`prune`, `check`, etc.) is actively running. |
| **`active_shared`** | `exclusive == false` AND (`ageSeconds < 1800` OR `sameHostResticAlive == true`) | **YES (Blocking)** | Another Restic operation (`backup`, `mount`, etc.) is currently active or was refreshed within the last 30 minutes. |
| **`stale_exclusive`** | `exclusive == true` AND `ageSeconds >= 1800` AND `sameHostResticAlive == false` | **YES (Blocking)** | **Restic 0.19.1 refuses to acquire a shared `backup` lock if ANY exclusive lock file exists in `/repo/locks/`, regardless of age** (exits with code `11`). Furthermore, an interrupted exclusive operation may indicate an incomplete prune/repair that requires operator review. |
| **`stale_shared`** | `exclusive == false` AND `ageSeconds >= 1800` AND `sameHostResticAlive == false` | **Non-Blocking** (when `allowStaleShared: true`) | The originating shared operation terminated $>30\text{ minutes}$ ago (`sameHostResticAlive: false`), and Restic 0.19.1 natively permits new shared `backup` locks alongside existing non-exclusive locks. Emits a `stale_shared_lock_present` warning in telemetry. |

---

## 4. Exact Behavior of `--require-clear` (Task A.3 & A.4)

In `/opt/acya-backup/bin/acya-backup-lock-inspect`:
```python
report = client.inspect_locks()
output = {
    "repository": probe,
    "lockReport": report,
}
print(json.dumps(output, indent=2))
if args.require_clear and not report["canProceedWithBackup"]:
    return ExitCode.LOCK_CONFLICT  # exit code 13
return ExitCode.SUCCESS            # exit code 0
```

Where `canProceedWithBackup` is `len(blockingReasons) == 0`. Consequently, with the active production configuration (`"allowStaleShared": true`, `"staleAfterSeconds": 1800`):

| Lock Condition Present in Repository | `blockingReasons` Populated? | `canProceedWithBackup` | `acya-backup-lock-inspect --require-clear` Behavior |
| :--- | :---: | :---: | :--- |
| **Active exclusive lock (`active_exclusive`)** | Yes (`active_exclusive:<id>`) | `false` | **REJECTS** — Exits with code `13` (`LOCK_CONFLICT`) |
| **Active shared lock (`active_shared`)** | Yes (`active_shared:<id>`) | `false` | **REJECTS** — Exits with code `13` (`LOCK_CONFLICT`) |
| **Stale exclusive lock (`stale_exclusive`)** | Yes (`stale_exclusive:<id>`) | `false` | **REJECTS** — Exits with code `13` (`LOCK_CONFLICT`) |
| **Verified stale shared lock (`stale_shared`)** | No (`[]`) | `true` | **ALLOWS** — Exits with code `0` (`SUCCESS`), reports `"status": "stale_shared_only"` |
| *(If `"allowStaleShared": false` is configured)* | Yes (`stale_shared_disallowed:<id>`) | `false` | **REJECTS** — Exits with code `13` (`LOCK_CONFLICT`) |

---

## 5. Lock Compatibility and Safety Conclusions (Task A.5 & A.6)

1. **Empirical Validation Against Installed Restic `0.19.1`:**
   - Tested directly against `/usr/local/bin/restic` (`0.19.1`) in isolated disposable repositories:
     - When an **exclusive** lock (`exclusive: true`) is left behind by a killed process (`kill -9`), `restic backup` **fails with exit code `11`** (`unable to create lock in backend: repository is already locked exclusively`). Our lock inspector classifies this as `stale_exclusive` and **blocks** execution (`exit 13`).
     - When a **shared** lock (`exclusive: false`) is left behind by a killed process (`kill -9`), `restic backup` **succeeds (`rc=0`)** because Restic allows concurrent/subsequent shared locks when no exclusive lock is present.
     - Even though Restic itself would allow two concurrent `restic backup` processes to acquire shared locks simultaneously, **our pre-backup gate is stricter than Restic**: if any shared lock is `< 30 minutes` old OR its `restic` PID is alive on `vps-1d2bffb5` (`active_shared`), `evaluate_locks()` **blocks** execution (`exit 13`) to prevent concurrent operations or SFTP contention.
2. **Zero Automatic Lock Cleanup:**
   - Neither `acya-backup-lock-inspect`, `acya-backup-runner`, nor `acya-backup-verify` ever executes `restic unlock` or deletes lock files.
   - `unlock` is hardcoded in `FORBIDDEN_SUBCOMMANDS` in `/opt/acya-backup/lib/acya_backup/restic.py` and raises `BackupError("preflight", "forbidden_restic_command", ..., ExitCode.CONFIG)` before any subprocess can be spawned.
   - All 4 October 13 locks remain untouched in `/data/backups/restic/locks/`.

---

## 6. Cryptography Documentation Correction (Task C)

### 6.1 Audit of Code and Documentation
- **Codebase under `/opt/acya-backup/`:** Zero inaccurate cryptographic claims existed in `/opt/acya-backup/bin/`, `/opt/acya-backup/lib/`, `/opt/acya-backup/config/`, or `/opt/acya-backup/systemd/`.
- **Prior Reports:** `ACYA_PRODUCTION_BACKUP_COMPLEMENTARY_AUDIT.md` (lines 64, 595) and `PHASE_11B_BACKUP_ARCHITECTURE_IMPLEMENTATION_REPORT.md` (lines 47, 116, 194) inaccurately referred to Restic's encryption as `AES-256-GCM + Poly1305`.

### 6.2 Authoritative Restic Cryptographic Specification
Per the official Restic Cryptography Specification (Repository Format v2 used by Restic `0.19.1`):
- **Symmetric Encryption:** **AES-256 in Counter Mode (`AES-256-CTR`)** with a 32-byte (256-bit) encryption key and a randomly generated 16-byte (128-bit) IV prepended to each ciphertext message.
- **Message Authentication (MAC):** **Poly1305-AES** (`Poly1305` universal hash using AES-128 as the pseudorandom function, requiring a 16-byte AES key and 16-byte Poly1305 key, producing a 16-byte authentication tag appended to the ciphertext in an **Encrypt-then-MAC** construction).
- **Master Key Derivation (KDF):** **`scrypt`** (`N = 32768`, `r = 8`, `p = 1` by default) derives 64 bytes of key material from `.restic_password` to decrypt the repository master key JSON stored in `/data/backups/restic/keys/`.
- **Content Addressing & Chunking:** **SHA-256** over content-defined Rabin fingerprint chunks.

---

## 7. Systemd Timer Configuration and Timezone Analysis (Task D)

### 7.1 Installed Systemd Unit Inspection (`/etc/systemd/system/acya-backup-runner.timer`)
- **Actual `OnCalendar` Expression:** `OnCalendar=*-*-* 02:00:00 UTC`
- **Service Timezone Environment:** `Environment="TZ=UTC"` (and host OS timezone is `Etc/UTC`).
- **Next Scheduled Execution (if enabled, per `systemd-analyze calendar`):**
  - For `*-*-* 02:00:00 UTC`: `Sat 2026-11-07 02:00:00 UTC` (`03:00:00 Africa/Tunis`).
  - For `*-*-* 01:00:00 UTC`: `Sat 2026-11-07 01:00:00 UTC` (`02:00:00 Africa/Tunis`).
- **Current Enabled / Active Status:**
  - `acya-backup-runner.timer`: **`disabled`** / **`inactive (dead)`**
  - `acya-backup-runner.service`: **`disabled`** / **`inactive (dead)`**
  - Legacy `acya-backup.timer` & `acya-backup.service`: **`disabled`** / **`inactive (dead)`**
- **Reverse Dependency Check (`systemctl list-dependencies --reverse acya-backup-runner.service`):**
  - No active target or unit wants or requires `acya-backup-runner.service`.
- **Manual Trigger Behavior:**
  - Because `acya-backup-runner.service` is `Type=oneshot`, a root administrator could invoke `sudo systemctl start acya-backup-runner.service` manually, **however**, its `ExecStart` runs `--mode full` against `/opt/acya-backup/config/backup.json` where `"repositoryWritesAuthorized": false`, so even a manual `systemctl start` immediately aborts at Stage 1 preflight with exit code `10` (`writes_not_authorized`) and `RestartPreventExitStatus=10` prevents any retry.

### 7.2 Schedule Discrepancy Flagged for Explicit Approval (`02:00 UTC` vs `01:00 UTC`)
> [!IMPORTANT]
> **Schedule Decision Required Before Phase 11C Timer Activation:**
> - **Legacy Schedule (`acya-backup.timer.d/10-schedule.conf` & `backup-schedule.json`):** Configured for `02:00 Africa/Tunis` (`UTC+1`), which corresponds to **`01:00:00 UTC`**.
> - **Phase 11B Installed Timer (`acya-backup-runner.timer`):** Configured for **`02:00:00 UTC`** (per Phase 11B Section 7 specification), which corresponds to **`03:00:00 Africa/Tunis`**.
> - Per Phase 11B.1 Section 6 & Section 9 restrictions, `/etc/systemd/system/acya-backup-runner.timer` was **not modified** during this phase. Please confirm before Phase 11C whether the timer should remain at `02:00:00 UTC` (`03:00 Tunisia`) or be adjusted to `01:00:00 UTC` (`02:00 Tunisia`).

---

## 8. Production Write-Gate Verification (Task E)

### 8.1 Multi-Layer Gate Architecture
1. **Configuration Gate (`/opt/acya-backup/config/backup.json`):**
   - `"repositoryWritesAuthorized": false`
   - `"testMode": false`
2. **Pipeline Gate (`/opt/acya-backup/lib/acya_backup/pipeline.py` lines 169–175):**
   - In `BackupRunner.execute()`, before `_run_stages()` is called:
     ```python
     if self.mode == "full" and not self.cfg.repository_writes_authorized:
         raise BackupError(
             "preflight",
             "writes_not_authorized",
             "full backup execution is blocked while repositoryWritesAuthorized is false",
             ExitCode.CONFIG,
         )
     ```
3. **Client Gate (`/opt/acya-backup/lib/acya_backup/restic.py` lines 313–320):**
   - Inside `ResticClient.create_backup()`:
     ```python
     if not self.cfg.repository_writes_authorized:
         raise BackupError(
             "snapshot",
             "writes_not_authorized",
             "repositoryWritesAuthorized is false; refusing to execute restic backup",
             ExitCode.CONFIG,
         )
     ```
4. **CLI Argument Validation (`/opt/acya-backup/bin/acya-backup-runner`):**
   - Only accepts `--config`, `--mode {full,preflight,stage-only,lock-inspect}`, `--trigger`, `--skip-remote`, and `--print-telemetry`.
   - There is **no** CLI flag (such as `--force` or `--authorize-writes`) that can override `repositoryWritesAuthorized`.
   - Combining `--skip-remote` with `--mode full` or `--mode lock-inspect` is rejected immediately with exit code `10`.

### 8.2 Live Safe Rejection Path Verification
Executed during Phase 11B.1:
- `sudo /opt/acya-backup/bin/acya-backup-runner --config /opt/acya-backup/config/backup.json --mode full --trigger test` $\rightarrow$ **Rejected immediately (`exit 10`, `writes_not_authorized`)**.
- `sudo /opt/acya-backup/bin/acya-backup-runner --config /opt/acya-backup/config/backup.json --mode full --skip-remote --trigger test` $\rightarrow$ **Rejected immediately (`exit 10`)**.
- `sudo /opt/acya-backup/bin/acya-backup-runner --config /opt/acya-backup/config/backup.rest-append-only.template.json --mode full --trigger test` $\rightarrow$ **Rejected immediately (`exit 10`, `writes_not_authorized`)**.

---

## 9. Tests Executed and Results (Task F)

Executed `sudo python3 /opt/acya-backup/tests/test_backup_runner.py` — **20/20 tests passed in 6.366s**:

| Test Class | Test Case | Target Verified | Result |
| :--- | :--- | :--- | :---: |
| `TestConfigAndRedaction` | `test_production_config_valid_and_safe_defaults` | `backup.json` loads with `repositoryWritesAuthorized: false` & excluded containers | `OK` |
| `TestConfigAndRedaction` | `test_append_only_template_config_valid` | `backup.rest-append-only.template.json` validates with `repositoryWritesAuthorized: false` | `OK` |
| `TestConfigAndRedaction` | `test_local_test_rejected_when_test_mode_false` | `local-test` transport rejected when `testMode: false` | `OK` |
| `TestConfigAndRedaction` | `test_secret_redaction` | Passwords, REST credentials, JSON `private_key`, and PEM keys redacted | `OK` |
| `TestTenantCoverageLogic` | `test_complete_16_tenant_coverage` | 16/16 registry, catalog, per-tenant dump, and full-dump TOC coverage | `OK` |
| `TestTenantCoverageLogic` | `test_missing_catalog_schema_detected` | Missing catalog schema triggers `registry_schema_missing` | `OK` |
| `TestTenantCoverageLogic` | `test_missing_from_full_dump_detected` | Missing schema in full dump TOC triggers `tenant_absent_from_full_dump` | `OK` |
| `TestLockEvaluationAndForbiddenCommands` | `test_october_13_historical_shared_locks_classified_as_stale_shared` | 4 Oct 13 shared locks classified as `stale_shared_only` (`unlockPerformed: false`) | `OK` |
| `TestLockEvaluationAndForbiddenCommands` | `test_stale_exclusive_lock_blocks_backup` | Stale exclusive lock blocks backup (`canProceedWithBackup: false`) | `OK` |
| `TestLockEvaluationAndForbiddenCommands` | `test_active_shared_lock_blocks_backup` | Active shared lock blocks backup (`canProceedWithBackup: false`) | `OK` |
| `TestLockEvaluationAndForbiddenCommands` | `test_forbidden_subcommands_rejected` | `unlock`, `repair`, `prune`, `forget`, `restore`, `rebuild-index`, `key`, `migrate` blocked | `OK` |
| `TestManifestAndSecretIsolation` | `test_secret_in_staging_rejected_and_manifest_verified` | Symmetric SHA-256 check + `firebase-service-account.json` in staging rejected | `OK` |
| `TestEndToEndDisposableRepository` | `test_disposable_restic_snapshot_and_verification_without_leaking_secrets` | Disposable local Restic repo E2E + interrupted run recovery + staging sweep | `OK` |
| `TestPhase11B1RegressionSuite` | `test_active_exclusive_lock_detection_and_rejection` | Active exclusive lock (`< 30m`) sets `status: blocked`, `activeExclusive: 1` | `OK` |
| `TestPhase11B1RegressionSuite` | `test_pid_reuse_by_non_restic_process_classified_as_stale` | `/proc/<pid>` check distinguishes non-`restic` PID reuse from live `restic` process | `OK` |
| `TestPhase11B1RegressionSuite` | `test_require_clear_cli_behavior_on_all_four_lock_classes` | `--require-clear` exits `13` on `active_exclusive`, `active_shared`, `stale_exclusive` and `0` on `stale_shared` | `OK` |
| `TestPhase11B1RegressionSuite` | `test_restic_version_detection_and_absolute_binary_path` | `/usr/local/bin/restic` absolute path & `restic 0.19.1` version verification | `OK` |
| `TestPhase11B1RegressionSuite` | `test_repository_write_gate_blocks_create_backup_and_full_mode` | `ResticClient.create_backup` raises `writes_not_authorized` (`ExitCode.CONFIG = 10`) | `OK` |
| `TestPhase11B1RegressionSuite` | `test_prevention_of_automatic_unlock_anywhere_in_codebase` | `unlock` rejected in both `read_only=True` and `read_only=False` modes | `OK` |
| `TestPhase11B1RegressionSuite` | `test_systemd_timer_and_service_remain_disabled_and_inactive` | Confirms `acya-backup-runner.timer/.service` and legacy units are `disabled` & `inactive` | `OK` |

---

## 10. Files Modified During Phase 11B.1

In strict compliance with Section 9 (**"Only modify files under `/opt/acya-backup/`"**), only two files inside `/opt/acya-backup/` were updated, plus this standalone report file:

| File Path | Change Summary |
| :--- | :--- |
| `/opt/acya-backup/lib/acya_backup/restic.py` | Replaced `_local_pid_alive()` with `_local_restic_pid_status()`, inspecting `/proc/<pid>/comm` and `/proc/<pid>/cmdline` so PID reuse by a non-`restic` process cannot misclassify a stale lock as active; added `sameHostPidExists` and `sameHostResticAlive` fields to per-lock telemetry. |
| `/opt/acya-backup/tests/test_backup_runner.py` | Added `TestPhase11B1RegressionSuite` (7 new regression tests; 20 total tests). |
| `/opt/acya-backup/PHASE_11B_1_SAFETY_VERIFICATION_REPORT.md`<br>`/home/ubuntu/acya-app/PHASE_11B_1_SAFETY_VERIFICATION_REPORT.md` | This Phase 11B.1 verification report. |

Zero files in `/home/ubuntu/acya-app/` application/scripts code, `/etc/systemd/system/`, Docker Compose, or Admin-Dash were modified.

---

## 11. Remaining Risks and Unresolved Questions

1. **Schedule Timezone Alignment (`02:00 UTC` vs `01:00 UTC`):**
   - `acya-backup-runner.timer` is currently set to `02:00:00 UTC` (`03:00` Tunisia local time), whereas the legacy schedule was `01:00:00 UTC` (`02:00` Tunisia local time). Explicit operator confirmation is required before enabling the timer in Phase 11C.
2. **Disposition of the Four Historical October 13 Shared Locks:**
   - Although the 4 `stale_shared` locks (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) do **not** block `restic backup` and `acya-backup-lock-inspect --require-clear` exits `0`, they will continue to generate `stale_shared_lock_present` warnings on every run (and would block any future maintenance `restic check` without `--no-lock` or `restic prune`) until an explicitly authorized one-time `restic unlock` is executed.
3. **Remote Process Visibility for Cross-Host Locks:**
   - For locks created on `vps-1d2bffb5`, the runner verifies both `/proc/<pid>` process identity and lock age. For any lock created by another host (e.g., `vps-b92b4ae6`), Production cannot inspect remote `/proc` and relies on Restic's 30-minute lock refresh window (`staleAfterSeconds: 1800`) plus the unconditional block on any `exclusive: true` lock.

---

## 12. Explicit Readiness Assessment for Phase 11C

**Status:** **`READY WITH CONDITIONS`**

### Conditions for Proceeding to Phase 11C (First Controlled Production Backup):
1. **Explicit Human Authorization to Open the Write Gate:** Approval to set `"repositoryWritesAuthorized": true` in `/opt/acya-backup/config/backup.json` and execute the first controlled production backup (`--mode full`).
2. **Explicit Decision on Historical Lock Cleanup:** Decide whether to leave the 4 non-blocking October 13 `stale_shared` locks untouched during the first backup or authorize a one-time `restic unlock` prior to the first backup.
3. **Explicit Decision on Daily Schedule Time:** Confirm whether `acya-backup-runner.timer` should remain at `02:00:00 UTC` (`03:00 Tunisia`) or be updated to `01:00:00 UTC` (`02:00 Tunisia`) before enabling the timer.

---

## 13. Mandatory Final Confirmation

I explicitly confirm that during Phase 11B.1:
- **No Restic backup was executed.**
- **No Restic unlock was executed.**
- **No Restic repository data was modified.**
- **No existing lock was deleted** (all 4 October 13 locks remain intact in `/data/backups/restic/locks/`).
- **No snapshot was deleted or modified** (all 5 snapshots `5a78f673` .. `36a26b4e` remain intact).
- **No systemd timer was enabled or started** (`acya-backup-runner.timer` and `acya-backup.timer` remain `disabled` and `inactive`).
- **`repositoryWritesAuthorized` remains `false`** in `/opt/acya-backup/config/backup.json` (and in `backup.rest-append-only.template.json`).
- **No production application or Docker container was modified** (`acya-restore-test-pg`, `acya-restore-n8n-pg`, and all production containers remain untouched).
- **No Git commit or push was performed.**
