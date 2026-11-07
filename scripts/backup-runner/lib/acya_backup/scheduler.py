"""
ACYA Automated Production Backup — Scheduler Management Module
Version: 1.0.0
Description: Restricted, safe management of the production systemd backup timer
Security:
  - Operates strictly on acya-backup-runner.timer and acya-backup-runner.service
  - No arbitrary systemd unit names, shell strings, or command injection
  - Argument array execution (execve style) without shell=True
  - Atomic drop-in configuration replacement and verification
  - Comprehensive audit trail recording all schedule updates
"""

import os
import sys
import json
import re
import zoneinfo
import datetime
import subprocess
from typing import Optional, Dict, Any, Tuple

from acya_backup.config import Config, load_config
from acya_backup.errors import BackupError

TIME_REGEX = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
TIMER_UNIT = "acya-backup-runner.timer"
SERVICE_UNIT = "acya-backup-runner.service"
BASE_TIMER_PATH = f"/etc/systemd/system/{TIMER_UNIT}"
DROPIN_DIR = f"/etc/systemd/system/{TIMER_UNIT}.d"
DROPIN_FILE = f"{DROPIN_DIR}/10-schedule.conf"
DEFAULT_STATE_DIR = "/opt/acya-backup/state"
DEFAULT_CONFIG_PATH = "/opt/acya-backup/config/backup.json"
SCHEDULER_CONFIG_FILE = "scheduler-config.json"
AUDIT_LOG_FILE = "/opt/acya-backup/logs/scheduler-audit.log"


class SchedulerError(Exception):
    """Raised when scheduler management operations fail."""
    def __init__(self, message: str, code: str = "scheduler_error"):
        super().__init__(message)
        self.code = code
        self.message = message


def run_systemctl_command(args: list[str]) -> Tuple[int, str, str]:
    """Execute a systemctl command safely with argument array, no shell interpolation."""
    cmd = ["systemctl"] + args
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=15
        )
        return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
    except subprocess.TimeoutExpired:
        raise SchedulerError(f"Command '{' '.join(cmd)}' timed out", "systemctl_timeout")
    except FileNotFoundError:
        raise SchedulerError("systemctl binary not found on host", "systemctl_missing")
    except Exception as e:
        raise SchedulerError(f"Failed to execute systemctl: {e}", "systemctl_exec_error")


def validate_time_and_timezone(time_str: str, timezone_str: str) -> Tuple[int, int, zoneinfo.ZoneInfo]:
    """Validate 24h HH:mm time and IANA timezone strictly."""
    if not isinstance(time_str, str) or not TIME_REGEX.match(time_str.strip()):
        raise SchedulerError(
            f"Invalid time format '{time_str}'. Expected 24h HH:mm format (e.g., '02:00').",
            "invalid_time_format"
        )

    if not isinstance(timezone_str, str) or not timezone_str.strip():
        raise SchedulerError("Timezone cannot be empty.", "empty_timezone")

    tz_clean = timezone_str.strip()
    try:
        tz = zoneinfo.ZoneInfo(tz_clean)
    except Exception as e:
        raise SchedulerError(
            f"Invalid or unrecognized IANA timezone '{tz_clean}': {e}",
            "invalid_timezone"
        )

    parts = time_str.strip().split(":")
    hour = int(parts[0])
    minute = int(parts[1])
    return hour, minute, tz


def calculate_schedule_details(time_str: str, timezone_str: str) -> Dict[str, Any]:
    """Calculate UTC equivalence and systemd calendar expression for given local time & tz."""
    hour, minute, tz = validate_time_and_timezone(time_str, timezone_str)

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_local = now_utc.astimezone(tz)

    # Local target for today
    sched_local_today = datetime.datetime(
        now_local.year, now_local.month, now_local.day, hour, minute, 0, tzinfo=tz
    )
    sched_utc_today = sched_local_today.astimezone(datetime.timezone.utc)

    utc_time_str = sched_utc_today.strftime("%H:%M")
    on_calendar = f"*-*-* {sched_utc_today.strftime('%H:%M:%S')} UTC"

    # Calculate next occurrence
    next_local = sched_local_today
    if now_local >= sched_local_today:
        next_local = sched_local_today + datetime.timedelta(days=1)
    next_utc = next_local.astimezone(datetime.timezone.utc)

    return {
        "time": f"{hour:02d}:{minute:02d}",
        "timezone": tz.key,
        "utcTime": utc_time_str,
        "onCalendar": on_calendar,
        "summary": f"Daily at {hour:02d}:{minute:02d} {tz.key} ({utc_time_str} UTC)",
        "nextRunTimeUtc": next_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "nextRunTimeLocal": f"{next_local.strftime('%Y-%m-%d %H:%M')} ({tz.key})"
    }


def record_scheduler_audit(action: str, performed_by: str, details: Dict[str, Any], log_file: str = AUDIT_LOG_FILE):
    """Append structured audit entry for scheduler configuration changes."""
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "action": action,
        "performedBy": performed_by,
        "details": details
    }
    line = json.dumps(entry) + "\n"
    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception as e:
        sys.stderr.write(f"[WARN] Failed to write scheduler audit log: {e}\n")


def get_last_run_info(state_dir: str = DEFAULT_STATE_DIR) -> Dict[str, Any]:
    """Inspect state/last-run.json or last-success.json to extract execution summary."""
    last_run_file = os.path.join(state_dir, "last-run.json")
    if not os.path.exists(last_run_file):
        return {
            "timestamp": None,
            "outcome": "none",
            "exitCode": None,
            "durationSeconds": None,
            "trigger": None,
            "snapshotId": None,
            "errorMessage": None
        }

    try:
        with open(last_run_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        snap = data.get("snapshot") or {}
        snap_id = snap.get("snapshotId") if isinstance(snap, dict) else None
        fail = data.get("failure") or {}
        err_msg = fail.get("message") if isinstance(fail, dict) else None

        return {
            "timestamp": data.get("finishedAt") or data.get("startedAt"),
            "outcome": data.get("outcome", "unknown"),
            "exitCode": data.get("exitCode"),
            "durationSeconds": data.get("durationSeconds"),
            "trigger": data.get("trigger"),
            "snapshotId": snap_id,
            "errorMessage": err_msg
        }
    except Exception as e:
        return {
            "timestamp": None,
            "outcome": "error_reading_state",
            "exitCode": None,
            "durationSeconds": None,
            "trigger": None,
            "snapshotId": None,
            "errorMessage": f"Could not read last-run.json: {e}"
        }


def get_persisted_scheduler_config(state_dir: str = DEFAULT_STATE_DIR) -> Dict[str, Any]:
    """Read persisted user-configured schedule from scheduler-config.json, or parse from timer drop-in."""
    cfg_file = os.path.join(state_dir, SCHEDULER_CONFIG_FILE)
    if os.path.exists(cfg_file):
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Fallback to reading drop-in or base timer
    if os.path.exists(DROPIN_FILE):
        try:
            with open(DROPIN_FILE, "r", encoding="utf-8") as f:
                content = f.read()
                m = re.search(r"OnCalendar=\*-\*-\*\s+([0-9]{2}:[0-9]{2}):[0-9]{2}\s+UTC", content)
                if m:
                    utc_time = m.group(1)
                    return {
                        "time": utc_time,
                        "timezone": "UTC",
                        "utcTime": utc_time,
                        "onCalendar": f"*-*-* {utc_time}:00 UTC",
                        "summary": f"Daily at {utc_time} UTC ({utc_time} UTC)"
                    }
        except Exception:
            pass

    # Default
    return {
        "time": "02:00",
        "timezone": "UTC",
        "utcTime": "02:00",
        "onCalendar": "*-*-* 02:00:00 UTC",
        "summary": "Daily at 02:00 UTC (02:00 UTC)"
    }


def get_scheduler_status(
    config_path: str = DEFAULT_CONFIG_PATH,
    state_dir: str = DEFAULT_STATE_DIR,
    override_systemd: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Retrieve full live scheduler status, systemd timer state, and safety guards."""
    if override_systemd is not None:
        timer_enabled = override_systemd.get("enabled", False)
        timer_active = override_systemd.get("active", False)
        service_active = override_systemd.get("serviceActive", False)
        next_elapse = override_systemd.get("nextElapse")
    else:
        # Check systemctl is-enabled
        rc_en, stdout_en, _ = run_systemctl_command(["is-enabled", TIMER_UNIT])
        timer_enabled = (rc_en == 0 and stdout_en.strip() == "enabled")

        # Check systemctl is-active
        rc_act, stdout_act, _ = run_systemctl_command(["is-active", TIMER_UNIT])
        timer_active = (rc_act == 0 and stdout_act.strip() == "active")

        # Check service is-active
        rc_svc, stdout_svc, _ = run_systemctl_command(["is-active", SERVICE_UNIT])
        service_active = (rc_svc == 0 and stdout_svc.strip() == "active")

        # Check NextElapseUSecRealtime
        rc_show, stdout_show, _ = run_systemctl_command(["show", TIMER_UNIT, "--property=NextElapseUSecRealtime"])
        next_elapse = None
        if rc_show == 0 and "=" in stdout_show:
            val = stdout_show.split("=", 1)[1].strip()
            if val.isdigit() and int(val) > 0:
                try:
                    ts = int(val) / 1000000.0
                    dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
                    next_elapse = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                except Exception:
                    next_elapse = None

    sched_cfg = get_persisted_scheduler_config(state_dir)
    time_str = sched_cfg.get("time", "02:00")
    timezone_str = sched_cfg.get("timezone", "UTC")
    details = calculate_schedule_details(time_str, timezone_str)

    last_run = get_last_run_info(state_dir)

    # Repository safety gate inspection
    repo_writes_authorized = False
    try:
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                backup_cfg = json.load(f)
                repo_writes_authorized = bool(backup_cfg.get("repositoryWritesAuthorized", False))
    except Exception:
        repo_writes_authorized = False

    state_label = "active" if timer_active else ("enabled" if timer_enabled else "disabled")

    safety_notice = None
    if not repo_writes_authorized:
        safety_notice = (
            "Repository write authorization is blocked (repositoryWritesAuthorized=false). "
            "The scheduler may be active, but any triggered backup will terminate safely with exit code 10 "
            "without modifying the Restic repository."
        )

    return {
        "schema": "acya.backup.scheduler/v1",
        "timerUnit": TIMER_UNIT,
        "serviceUnit": SERVICE_UNIT,
        "enabled": timer_enabled,
        "active": timer_active,
        "serviceActive": service_active,
        "state": state_label,
        "schedule": {
            "time": details["time"],
            "timezone": details["timezone"],
            "utcTime": details["utcTime"],
            "onCalendar": details["onCalendar"],
            "summary": details["summary"]
        },
        "nextRun": {
            "utc": next_elapse if (timer_active and next_elapse) else (details["nextRunTimeUtc"] if timer_enabled else None),
            "local": details["nextRunTimeLocal"] if timer_enabled else None,
            "systemdNextElapseUtc": next_elapse
        },
        "lastRun": last_run,
        "safety": {
            "repositoryWritesAuthorized": repo_writes_authorized,
            "backupExecutionPermitted": repo_writes_authorized,
            "safetyNotice": safety_notice
        }
    }


def set_daily_schedule(
    time_str: str,
    timezone_str: str,
    performed_by: str = "SuperAdmin",
    config_path: str = DEFAULT_CONFIG_PATH,
    state_dir: str = DEFAULT_STATE_DIR,
    audit_log_file: str = AUDIT_LOG_FILE,
    apply_systemd: bool = True
) -> Dict[str, Any]:
    """Validate schedule, update systemd drop-in override, reload daemon, and persist state."""
    details = calculate_schedule_details(time_str, timezone_str)

    if apply_systemd:
        # Validate calendar expression with systemd-analyze
        try:
            val_proc = subprocess.run(
                ["systemd-analyze", "calendar", details["onCalendar"]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                timeout=10
            )
            if val_proc.returncode != 0:
                raise SchedulerError(
                    f"systemd-analyze calendar rejected OnCalendar expression '{details['onCalendar']}': {val_proc.stderr.strip()}",
                    "invalid_calendar_expression"
                )
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            raise SchedulerError(f"Failed to validate calendar expression: {e}", "calendar_validation_failed")

        os.makedirs(DROPIN_DIR, exist_ok=True)
        tmp_dropin = f"{DROPIN_FILE}.tmp.{os.getpid()}"
        dropin_content = (
            "# ==============================================================================\n"
            "# Drop-in generated automatically by acya-backup-scheduler\n"
            f"# User-facing Schedule: Daily at {details['time']} {details['timezone']}\n"
            f"# Systemd UTC Schedule: {details['onCalendar']}\n"
            f"# Updated At:           {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\n"
            f"# Updated By:           {performed_by}\n"
            "# ==============================================================================\n"
            "[Timer]\n"
            "OnCalendar=\n"
            f"OnCalendar={details['onCalendar']}\n"
        )

        with open(tmp_dropin, "w", encoding="utf-8") as f:
            f.write(dropin_content)
        os.chmod(tmp_dropin, 0o644)
        os.replace(tmp_dropin, DROPIN_FILE)

        # Run systemctl daemon-reload
        rc_reload, _, err_reload = run_systemctl_command(["daemon-reload"])
        if rc_reload != 0:
            raise SchedulerError(f"systemctl daemon-reload failed: {err_reload}", "daemon_reload_failed")

    # Persist scheduler configuration state atomically
    os.makedirs(state_dir, exist_ok=True)
    cfg_file = os.path.join(state_dir, SCHEDULER_CONFIG_FILE)
    tmp_cfg = f"{cfg_file}.tmp.{os.getpid()}"
    state_payload = {
        "time": details["time"],
        "timezone": details["timezone"],
        "utcTime": details["utcTime"],
        "onCalendar": details["onCalendar"],
        "summary": details["summary"],
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedBy": performed_by
    }
    with open(tmp_cfg, "w", encoding="utf-8") as f:
        json.dump(state_payload, f, indent=2)
    os.chmod(tmp_cfg, 0o644)
    os.replace(tmp_cfg, cfg_file)

    record_scheduler_audit(
        "SET_SCHEDULE",
        performed_by,
        {
            "time": details["time"],
            "timezone": details["timezone"],
            "utcTime": details["utcTime"],
            "onCalendar": details["onCalendar"]
        },
        log_file=audit_log_file
    )

    return get_scheduler_status(config_path=config_path, state_dir=state_dir)


def enable_timer(
    performed_by: str = "SuperAdmin",
    config_path: str = DEFAULT_CONFIG_PATH,
    state_dir: str = DEFAULT_STATE_DIR,
    audit_log_file: str = AUDIT_LOG_FILE,
    apply_systemd: bool = True
) -> Dict[str, Any]:
    """Enable and start the production backup timer without triggering a backup."""
    if apply_systemd:
        rc_en, _, err_en = run_systemctl_command(["enable", TIMER_UNIT])
        if rc_en != 0:
            raise SchedulerError(f"systemctl enable {TIMER_UNIT} failed: {err_en}", "enable_timer_failed")

        rc_start, _, err_start = run_systemctl_command(["start", TIMER_UNIT])
        if rc_start != 0:
            raise SchedulerError(f"systemctl start {TIMER_UNIT} failed: {err_start}", "start_timer_failed")

    record_scheduler_audit(
        "ENABLE_TIMER",
        performed_by,
        {"timerUnit": TIMER_UNIT},
        log_file=audit_log_file
    )

    return get_scheduler_status(config_path=config_path, state_dir=state_dir)


def disable_timer(
    performed_by: str = "SuperAdmin",
    config_path: str = DEFAULT_CONFIG_PATH,
    state_dir: str = DEFAULT_STATE_DIR,
    audit_log_file: str = AUDIT_LOG_FILE,
    apply_systemd: bool = True
) -> Dict[str, Any]:
    """Stop and disable the production backup timer safely."""
    if apply_systemd:
        rc_stop, _, err_stop = run_systemctl_command(["stop", TIMER_UNIT])
        if rc_stop != 0:
            raise SchedulerError(f"systemctl stop {TIMER_UNIT} failed: {err_stop}", "stop_timer_failed")

        rc_dis, _, err_dis = run_systemctl_command(["disable", TIMER_UNIT])
        if rc_dis != 0:
            raise SchedulerError(f"systemctl disable {TIMER_UNIT} failed: {err_dis}", "disable_timer_failed")

    record_scheduler_audit(
        "DISABLE_TIMER",
        performed_by,
        {"timerUnit": TIMER_UNIT},
        log_file=audit_log_file
    )

    return get_scheduler_status(config_path=config_path, state_dir=state_dir)
