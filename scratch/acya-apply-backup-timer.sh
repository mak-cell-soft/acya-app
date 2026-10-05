#!/usr/bin/env bash
# ==============================================================================
# ACYA Automated Production Backup — Host Timer Synchronizer
# Version: 1.1.0
# Description: Synchronizes validated backup schedule state to systemd timer drop-in
# Security: Root-owned (0750), strict input validation, zero shell command execution
# Topology:
#   Production VPS: 51.210.10.108 — Strasbourg (SBG), France
#   Backup VPS:     51.254.216.8 — Gravelines (GRA), France
# ==============================================================================
set -euo pipefail

SCRIPT_NAME="acya-apply-backup-timer"
DEFAULT_STATE_FILE="/var/lib/acya-backup-state/backup-schedule.json"
DEFAULT_STATUS_FILE="/var/lib/acya-backup-state/backup-status.json"
DROPIN_DIR="/etc/systemd/system/acya-backup.timer.d"
DROPIN_FILE="${DROPIN_DIR}/10-schedule.conf"
BASE_TIMER="/etc/systemd/system/acya-backup.timer"

log_info() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [INFO] $*"
    logger -t "${SCRIPT_NAME}" -p user.info "$*" 2>/dev/null || true
}

log_error() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [ERROR] $*" >&2
    logger -t "${SCRIPT_NAME}" -p user.err "$*" 2>/dev/null || true
}

# Require root
if [[ $(id -u) -ne 0 ]]; then
    log_error "This script must be run as root."
    exit 1
fi

DRY_RUN=false
STATE_FILE="${DEFAULT_STATE_FILE}"

# Parse optional arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run|--check)
            DRY_RUN=true
            shift
            ;;
        --file)
            if [[ -n "${2:-}" && -f "$2" ]]; then
                STATE_FILE="$2"
                shift 2
            else
                log_error "Argument --file requires an existing file path."
                exit 2
            fi
            ;;
        *)
            if [[ -f "$1" ]]; then
                STATE_FILE="$1"
                shift
            else
                log_error "Unknown argument: $1"
                exit 2
            fi
            ;;
    esac
done

if [[ ! -f "${STATE_FILE}" ]]; then
    log_error "State file does not exist: ${STATE_FILE}"
    exit 3
fi

# Step 1: Strict JSON parsing and validation using Python 3 standard library
PARSER_OUTPUT=$(python3 - "${STATE_FILE}" <<'PY_EOF'
import json, sys, re, zoneinfo, datetime

state_path = sys.argv[1]

try:
    with open(state_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    sys.stderr.write(f"PARSE_ERROR: Cannot read/parse JSON from {state_path}: {e}\n")
    sys.exit(10)

if not isinstance(data, dict):
    sys.stderr.write("VALIDATION_ERROR: JSON payload must be an object\n")
    sys.exit(11)

enabled = data.get("enabled")
if not isinstance(enabled, bool):
    sys.stderr.write("VALIDATION_ERROR: 'enabled' must be boolean true/false\n")
    sys.exit(12)

frequency = str(data.get("frequency", "")).strip().lower()
if frequency != "daily":
    sys.stderr.write(f"VALIDATION_ERROR: Unsupported frequency '{frequency}'. Only 'daily' is supported.\n")
    sys.exit(13)

time_str = str(data.get("time", "")).strip()
if not re.match(r"^([01][0-9]|2[0-3]):[0-5][0-9]$", time_str):
    sys.stderr.write(f"VALIDATION_ERROR: Invalid time '{time_str}'. Expected 24h HH:mm format.\n")
    sys.exit(14)

tz_str = str(data.get("timezone", "")).strip()
try:
    tz = zoneinfo.ZoneInfo(tz_str)
except Exception as e:
    sys.stderr.write(f"VALIDATION_ERROR: Invalid IANA timezone '{tz_str}': {e}\n")
    sys.exit(15)

# Calculate UTC schedule
hour, minute = map(int, time_str.split(":"))
now_local = datetime.datetime.now(tz)
sched_local = datetime.datetime(now_local.year, now_local.month, now_local.day, hour, minute, 0, tzinfo=tz)
sched_utc = sched_local.astimezone(datetime.timezone.utc)

utc_time = sched_utc.strftime("%H:%M")
on_calendar = f"*-*-* {sched_utc.strftime('%H:%M:%S')} UTC"

# Output validated key-value pairs
print(f"OUT_ENABLED='{'true' if enabled else 'false'}'")
print(f"OUT_FREQUENCY='daily'")
print(f"OUT_TIME='{time_str}'")
print(f"OUT_TIMEZONE='{tz.key}'")
print(f"OUT_UTC_TIME='{utc_time}'")
print(f"OUT_ON_CALENDAR='{on_calendar}'")
PY_EOF
) || {
    EXIT_CODE=$?
    log_error "Validation failed with exit code ${EXIT_CODE}"
    if [[ -d "/var/lib/acya-backup-state" && "${DRY_RUN}" = false ]]; then
        cat <<EOF > "${DEFAULT_STATUS_FILE}.tmp.$$"
{
  "syncStatus": "error",
  "syncTimeUtc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "error": "State validation failed (code ${EXIT_CODE})",
  "timerActive": false,
  "serviceActive": false
}
EOF
        chmod 0644 "${DEFAULT_STATUS_FILE}.tmp.$$"
        mv "${DEFAULT_STATUS_FILE}.tmp.$$" "${DEFAULT_STATUS_FILE}" 2>/dev/null || true
    fi
    exit "${EXIT_CODE}"
}

# Source parsed values safely
eval "${PARSER_OUTPUT}"

log_info "Validated Schedule: Enabled=${OUT_ENABLED}, Frequency=${OUT_FREQUENCY}, Time=${OUT_TIME} ${OUT_TIMEZONE} -> ${OUT_UTC_TIME} UTC (${OUT_ON_CALENDAR})"

# Step 2: Validate calendar expression with systemd-analyze
if ! systemd-analyze calendar "${OUT_ON_CALENDAR}" >/dev/null 2>&1; then
    log_error "systemd-analyze calendar rejected OnCalendar expression: ${OUT_ON_CALENDAR}"
    exit 16
fi

if [[ "${DRY_RUN}" = true ]]; then
    log_info "Dry-run mode: validation succeeded. No changes made to systemd."
    exit 0
fi

# Step 3: Ensure drop-in directory exists
mkdir -p "${DROPIN_DIR}"
chmod 0755 "${DROPIN_DIR}"

# Step 4: Backup existing drop-in for rollback safety
BACKUP_DROPIN=""
if [[ -f "${DROPIN_FILE}" ]]; then
    BACKUP_DROPIN="${DROPIN_DIR}/10-schedule.conf.bak.$$"
    cp "${DROPIN_FILE}" "${BACKUP_DROPIN}"
fi

# Step 5: Write candidate drop-in atomically
TMP_DROPIN="${DROPIN_DIR}/10-schedule.conf.tmp.$$"
cat <<EOF > "${TMP_DROPIN}"
# ==============================================================================
# Drop-in generated automatically by acya-apply-backup-timer.sh
# User-facing Schedule: Daily at ${OUT_TIME} ${OUT_TIMEZONE}
# Systemd UTC Schedule: ${OUT_ON_CALENDAR}
# Synchronized At:      $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================
[Timer]
OnCalendar=
OnCalendar=${OUT_ON_CALENDAR}
EOF
chmod 0644 "${TMP_DROPIN}"
mv "${TMP_DROPIN}" "${DROPIN_FILE}"

# Step 6: Validate full timer with drop-in using systemd-analyze verify
if ! systemd-analyze verify "${BASE_TIMER}" >/dev/null 2>&1; then
    log_error "systemd-analyze verify failed on timer with candidate drop-in. Rolling back..."
    if [[ -n "${BACKUP_DROPIN}" && -f "${BACKUP_DROPIN}" ]]; then
        mv "${BACKUP_DROPIN}" "${DROPIN_FILE}"
    else
        rm -f "${DROPIN_FILE}"
    fi
    systemctl daemon-reload
    exit 20
fi

# Clean up backup drop-in
if [[ -n "${BACKUP_DROPIN}" && -f "${BACKUP_DROPIN}" ]]; then
    rm -f "${BACKUP_DROPIN}"
fi

# Step 7: Reload systemd configuration
systemctl daemon-reload

# Step 8: Apply timer activation/deactivation state
if [[ "${OUT_ENABLED}" = "true" ]]; then
    log_info "Enabling and starting acya-backup.timer..."
    systemctl enable acya-backup.timer --no-pager
    systemctl start acya-backup.timer --no-pager
else
    log_info "Disabling and stopping acya-backup.timer..."
    systemctl disable acya-backup.timer --no-pager
    systemctl stop acya-backup.timer --no-pager
fi

# Step 9: Inspect live systemd state
if systemctl is-enabled acya-backup.timer >/dev/null 2>&1; then
    TIMER_ENABLED="enabled"
else
    TIMER_ENABLED="disabled"
fi

if systemctl is-active acya-backup.timer >/dev/null 2>&1; then
    TIMER_ACTIVE="active"
else
    TIMER_ACTIVE="inactive"
fi

if systemctl is-active acya-backup.service >/dev/null 2>&1; then
    SERVICE_ACTIVE="active"
else
    SERVICE_ACTIVE="inactive"
fi

# Step 10: Atomically write status file
STATUS_TMP="${DEFAULT_STATUS_FILE}.tmp.$$"
cat <<EOF > "${STATUS_TMP}"
{
  "syncStatus": "synced",
  "syncTimeUtc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "enabled": ${OUT_ENABLED},
  "frequency": "daily",
  "time": "${OUT_TIME}",
  "timezone": "${OUT_TIMEZONE}",
  "utcTime": "${OUT_UTC_TIME}",
  "systemdOnCalendar": "${OUT_ON_CALENDAR}",
  "timerState": "${TIMER_ENABLED}",
  "timerActive": $([ "${TIMER_ACTIVE}" = "active" ] && echo "true" || echo "false"),
  "serviceActive": $([ "${SERVICE_ACTIVE}" = "active" ] && echo "true" || echo "false"),
  "error": null
}
EOF
chmod 0644 "${STATUS_TMP}"
mv "${STATUS_TMP}" "${DEFAULT_STATUS_FILE}"

log_info "Synchronization completed successfully. TimerState=${TIMER_ENABLED}, TimerActive=${TIMER_ACTIVE}."
