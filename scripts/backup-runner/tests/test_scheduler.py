"""Unit tests for acya_backup.scheduler module."""

import unittest
import os
import json
import tempfile
import shutil
import zoneinfo
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib"))

from acya_backup.scheduler import (
    validate_time_and_timezone,
    calculate_schedule_details,
    record_scheduler_audit,
    get_last_run_info,
    get_persisted_scheduler_config,
    get_scheduler_status,
    set_daily_schedule,
    enable_timer,
    disable_timer,
    SchedulerError,
    TIMER_UNIT
)


class TestSchedulerModule(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="acya-test-scheduler-")
        self.state_dir = os.path.join(self.test_dir, "state")
        self.logs_dir = os.path.join(self.test_dir, "logs")
        self.config_dir = os.path.join(self.test_dir, "config")
        os.makedirs(self.state_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
        os.makedirs(self.config_dir, exist_ok=True)

        self.config_file = os.path.join(self.config_dir, "backup.json")
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump({
                "repositoryWritesAuthorized": False,
                "environment": "production"
            }, f)

        self.audit_log_file = os.path.join(self.logs_dir, "scheduler-audit.log")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_validate_time_and_timezone_valid(self):
        hour, minute, tz = validate_time_and_timezone("02:00", "UTC")
        self.assertEqual(hour, 2)
        self.assertEqual(minute, 0)
        self.assertEqual(tz.key, "UTC")

        hour, minute, tz = validate_time_and_timezone("03:30", "Africa/Tunis")
        self.assertEqual(hour, 3)
        self.assertEqual(minute, 30)
        self.assertEqual(tz.key, "Africa/Tunis")

        hour, minute, tz = validate_time_and_timezone("23:59", "Europe/Paris")
        self.assertEqual(hour, 23)
        self.assertEqual(minute, 59)
        self.assertEqual(tz.key, "Europe/Paris")

    def test_validate_time_invalid_formats(self):
        invalid_times = ["24:00", "25:00", "12:60", "2:00", "02:0", "abc", "", "  ", "12:00:00", "-01:00"]
        for t in invalid_times:
            with self.subTest(time=t):
                with self.assertRaises(SchedulerError) as ctx:
                    validate_time_and_timezone(t, "UTC")
                self.assertEqual(ctx.exception.code, "invalid_time_format")

    def test_validate_timezone_invalid(self):
        invalid_tzs = ["Mars/Olympus", "Unknown", "invalid", "", "   "]
        for tz in invalid_tzs:
            with self.subTest(tz=tz):
                with self.assertRaises(SchedulerError):
                    validate_time_and_timezone("02:00", tz)

    def test_calculate_schedule_details_utc(self):
        details = calculate_schedule_details("02:00", "UTC")
        self.assertEqual(details["time"], "02:00")
        self.assertEqual(details["timezone"], "UTC")
        self.assertEqual(details["utcTime"], "02:00")
        self.assertEqual(details["onCalendar"], "*-*-* 02:00:00 UTC")
        self.assertIn("Daily at 02:00 UTC", details["summary"])
        self.assertIn("T", details["nextRunTimeUtc"])
        self.assertTrue(details["nextRunTimeUtc"].endswith("Z"))

    def test_calculate_schedule_details_timezone_conversion(self):
        # Tunis is UTC+1 (standard time, no DST in 2026)
        details = calculate_schedule_details("03:30", "Africa/Tunis")
        self.assertEqual(details["time"], "03:30")
        self.assertEqual(details["timezone"], "Africa/Tunis")
        self.assertEqual(details["utcTime"], "02:30")
        self.assertEqual(details["onCalendar"], "*-*-* 02:30:00 UTC")

    def test_record_scheduler_audit(self):
        record_scheduler_audit(
            "TEST_ACTION",
            "SuperAdminTest",
            {"key": "value"},
            log_file=self.audit_log_file
        )
        self.assertTrue(os.path.exists(self.audit_log_file))
        with open(self.audit_log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        self.assertEqual(len(lines), 1)
        entry = json.loads(lines[0])
        self.assertEqual(entry["action"], "TEST_ACTION")
        self.assertEqual(entry["performedBy"], "SuperAdminTest")
        self.assertEqual(entry["details"]["key"], "value")
        self.assertTrue(entry["timestamp"].endswith("Z"))

    def test_get_last_run_info_when_missing(self):
        info = get_last_run_info(self.state_dir)
        self.assertEqual(info["outcome"], "none")
        self.assertIsNone(info["timestamp"])

    def test_get_last_run_info_when_present(self):
        last_run_file = os.path.join(self.state_dir, "last-run.json")
        with open(last_run_file, "w", encoding="utf-8") as f:
            json.dump({
                "outcome": "success",
                "exitCode": 0,
                "startedAt": "2026-11-06T10:11:10Z",
                "finishedAt": "2026-11-06T10:11:48Z",
                "durationSeconds": 37.924,
                "trigger": "systemd-timer",
                "snapshot": {"snapshotId": "2071d16434c1"}
            }, f)

        info = get_last_run_info(self.state_dir)
        self.assertEqual(info["outcome"], "success")
        self.assertEqual(info["exitCode"], 0)
        self.assertEqual(info["trigger"], "systemd-timer")
        self.assertEqual(info["snapshotId"], "2071d16434c1")
        self.assertEqual(info["durationSeconds"], 37.924)

    def test_get_scheduler_status_disabled_state(self):
        override_systemd = {
            "enabled": False,
            "active": False,
            "serviceActive": False,
            "nextElapse": None
        }
        status = get_scheduler_status(
            config_path=self.config_file,
            state_dir=self.state_dir,
            override_systemd=override_systemd
        )
        self.assertEqual(status["timerUnit"], TIMER_UNIT)
        self.assertFalse(status["enabled"])
        self.assertFalse(status["active"])
        self.assertEqual(status["state"], "disabled")
        self.assertFalse(status["safety"]["repositoryWritesAuthorized"])
        self.assertFalse(status["safety"]["backupExecutionPermitted"])
        self.assertIsNotNone(status["safety"]["safetyNotice"])

    def test_set_daily_schedule_dry_run(self):
        status = set_daily_schedule(
            time_str="04:15",
            timezone_str="UTC",
            performed_by="Tester",
            config_path=self.config_file,
            state_dir=self.state_dir,
            audit_log_file=self.audit_log_file,
            apply_systemd=False
        )
        self.assertEqual(status["schedule"]["time"], "04:15")
        self.assertEqual(status["schedule"]["timezone"], "UTC")
        self.assertEqual(status["schedule"]["utcTime"], "04:15")
        self.assertEqual(status["schedule"]["onCalendar"], "*-*-* 04:15:00 UTC")

        persisted = get_persisted_scheduler_config(self.state_dir)
        self.assertEqual(persisted["time"], "04:15")
        self.assertEqual(persisted["timezone"], "UTC")

    def test_enable_and_disable_timer_simulation(self):
        status_enabled = enable_timer(
            performed_by="Tester",
            config_path=self.config_file,
            state_dir=self.state_dir,
            audit_log_file=self.audit_log_file,
            apply_systemd=False
        )
        self.assertIsInstance(status_enabled, dict)

        status_disabled = disable_timer(
            performed_by="Tester",
            config_path=self.config_file,
            state_dir=self.state_dir,
            audit_log_file=self.audit_log_file,
            apply_systemd=False
        )
        self.assertIsInstance(status_disabled, dict)


if __name__ == "__main__":
    unittest.main()
