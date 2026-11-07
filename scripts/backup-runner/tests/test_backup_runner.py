"""Unit and end-to-end integration tests for the ACYA Phase 11B backup architecture.

Runs against disposable local fixtures and a disposable local Restic repository
in a temporary directory. Zero writes to the production Restic repository.
"""

import datetime as _dt
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.realpath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
_LIB = os.path.join(_ROOT, "lib")
if _LIB not in sys.path:
    sys.path.insert(0, _LIB)

from acya_backup.config import load_config
from acya_backup.errors import BackupError, ExitCode
from acya_backup.manifest import (
    PROTECTED_SECRET_BASENAMES,
    build_and_verify_manifest,
    collect_and_validate_sources,
)
from acya_backup.pipeline import BackupRunner, sweep_abandoned_staging
from acya_backup.postgres import evaluate_coverage
from acya_backup.proc import Logger, redact
from acya_backup.restic import (
    FORBIDDEN_SUBCOMMANDS,
    ResticClient,
    TransferSession,
    evaluate_locks,
)
from acya_backup.telemetry import record_interrupted_previous


class TestConfigAndRedaction(unittest.TestCase):
    def test_production_config_valid_and_safe_defaults(self):
        cfg_path = os.path.join(_ROOT, "config", "backup.json")
        cfg = load_config(cfg_path)
        self.assertEqual(cfg.environment, "production")
        self.assertFalse(cfg.repository_writes_authorized)
        self.assertFalse(cfg.test_mode)
        self.assertEqual(
            sorted(cfg.excluded_containers),
            ["acya-restore-n8n-pg", "acya-restore-test-pg"],
        )
        self.assertEqual(cfg.min_tenant_count, 16)

    def test_append_only_template_config_valid(self):
        tpl_path = os.path.join(_ROOT, "config", "backup.rest-append-only.template.json")
        cfg = load_config(tpl_path)
        self.assertEqual(cfg.mechanism, "rest-ssh-tunnel")
        self.assertFalse(cfg.repository_writes_authorized)

    def test_local_test_rejected_when_test_mode_false(self):
        cfg_path = os.path.join(_ROOT, "config", "backup.json")
        with open(cfg_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
        raw["testMode"] = False
        raw["transport"] = {"mechanism": "local-test", "localRepositoryPath": "/tmp/x"}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump(raw, tf)
            tpath = tf.name
        try:
            with self.assertRaises(BackupError) as ctx:
                load_config(tpath)
            self.assertEqual(ctx.exception.exit_code, ExitCode.CONFIG)
        finally:
            os.unlink(tpath)

    def test_secret_redaction(self):
        sample = 'POSTGRES_PASSWORD=supersecret rest:http://prod:my_pass@127.0.0.1:18585/restic/ "private_key": "MIIEvQIBADANBg==" -----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'
        cleaned = redact(sample)
        self.assertNotIn("supersecret", cleaned)
        self.assertNotIn("my_pass", cleaned)
        self.assertNotIn("MIIEvQIBADANBg==", cleaned)
        self.assertIn("[REDACTED]", cleaned)


class TestTenantCoverageLogic(unittest.TestCase):
    def _sample_registry(self, count=16):
        return [
            {
                "Id": i + 1,
                "Slug": f"tenant-{i+1}",
                "SchemaName": f"tenant_tenant_{i+1}",
                "IsActive": (i % 2 == 0),
                "Status": "Active" if (i % 2 == 0) else "Suspended",
            }
            for i in range(count)
        ]

    def test_complete_16_tenant_coverage(self):
        reg = self._sample_registry(16)
        schemas = {r["SchemaName"] for r in reg}
        cov = evaluate_coverage(reg, schemas, schemas, schemas | {"public"}, 16)
        self.assertEqual(cov["status"], "complete")
        self.assertEqual(cov["registryCount"], 16)
        self.assertEqual(cov["dumpedCount"], 16)
        self.assertTrue(cov["fullDumpContainsAll"])
        self.assertEqual(cov["problems"], [])

    def test_missing_catalog_schema_detected(self):
        reg = self._sample_registry(16)
        schemas = {r["SchemaName"] for r in reg}
        missing_one = set(list(schemas)[:-1])
        cov = evaluate_coverage(reg, missing_one, missing_one, missing_one, 16)
        self.assertEqual(cov["status"], "incomplete")
        self.assertIn("registry_schema_missing", cov["problems"])

    def test_missing_from_full_dump_detected(self):
        reg = self._sample_registry(16)
        schemas = {r["SchemaName"] for r in reg}
        partial_full = set(list(schemas)[:-1])
        cov = evaluate_coverage(reg, schemas, schemas, partial_full, 16)
        self.assertEqual(cov["status"], "incomplete")
        self.assertIn("tenant_absent_from_full_dump", cov["problems"])


class TestLockEvaluationAndForbiddenCommands(unittest.TestCase):
    def test_october_13_historical_shared_locks_classified_as_stale_shared(self):
        now = _dt.datetime(2026, 11, 6, 6, 0, 0, tzinfo=_dt.timezone.utc)
        records = [
            ("aaaa1111" * 8, {"time": "2026-10-13T10:52:18.123456789Z", "exclusive": False, "hostname": "vps-1d2bffb5", "pid": 999991}),
            ("bbbb2222" * 8, {"time": "2026-10-13T10:52:20.000000000Z", "exclusive": False, "hostname": "vps-1d2bffb5", "pid": 999992}),
            ("cccc3333" * 8, {"time": "2026-10-13T10:52:25.000000000Z", "exclusive": False, "hostname": "vps-1d2bffb5", "pid": 999993}),
            ("dddd4444" * 8, {"time": "2026-10-13T10:52:30.000000000Z", "exclusive": False, "hostname": "vps-1d2bffb5", "pid": 999994}),
        ]
        rep = evaluate_locks(
            records,
            now=now,
            stale_after_seconds=1800,
            allow_stale_shared=True,
            local_hostname="vps-1d2bffb5",
        )
        self.assertEqual(rep["status"], "stale_shared_only")
        self.assertTrue(rep["canProceedWithBackup"])
        self.assertFalse(rep["unlockPerformed"])
        self.assertEqual(rep["counts"]["staleShared"], 4)

    def test_stale_exclusive_lock_blocks_backup(self):
        now = _dt.datetime(2026, 11, 6, 6, 0, 0, tzinfo=_dt.timezone.utc)
        records = [
            ("eeee5555" * 8, {"time": "2026-10-13T10:52:18Z", "exclusive": True, "hostname": "vps-b92b4ae6", "pid": 4444}),
        ]
        rep = evaluate_locks(
            records,
            now=now,
            stale_after_seconds=1800,
            allow_stale_shared=True,
            local_hostname="vps-1d2bffb5",
        )
        self.assertEqual(rep["status"], "blocked")
        self.assertFalse(rep["canProceedWithBackup"])
        self.assertEqual(rep["counts"]["staleExclusive"], 1)

    def test_active_shared_lock_blocks_backup(self):
        now = _dt.datetime(2026, 11, 6, 6, 0, 0, tzinfo=_dt.timezone.utc)
        records = [
            ("ffff6666" * 8, {"time": "2026-11-06T05:55:00Z", "exclusive": False, "hostname": "vps-1d2bffb5", "pid": 999999}),
        ]
        rep = evaluate_locks(
            records,
            now=now,
            stale_after_seconds=1800,
            allow_stale_shared=True,
            local_hostname="vps-1d2bffb5",
        )
        self.assertEqual(rep["status"], "blocked")
        self.assertFalse(rep["canProceedWithBackup"])
        self.assertEqual(rep["counts"]["activeShared"], 1)

    def test_forbidden_subcommands_rejected(self):
        cfg = load_config(os.path.join(_ROOT, "config", "backup.json"))
        session = TransferSession(cfg, Logger(None))
        client = ResticClient(cfg, session, Logger(None))
        for sub in FORBIDDEN_SUBCOMMANDS:
            with self.assertRaises(BackupError) as ctx:
                client._build_argv(sub, [])
            self.assertEqual(ctx.exception.category, "forbidden_restic_command")


class TestManifestAndSecretIsolation(unittest.TestCase):
    def test_secret_in_staging_rejected_and_manifest_verified(self):
        tmp = tempfile.mkdtemp(prefix="acya-test-stage-")
        try:
            os.makedirs(os.path.join(tmp, "databases"), exist_ok=True)
            dump_f = os.path.join(tmp, "databases", "wood-app-db.full.dump")
            with open(dump_f, "wb") as fh:
                fh.write(b"PGDMP-test-payload")

            info = build_and_verify_manifest(
                tmp,
                run_id="20261106T060000Z-deadbeef",
                host_name="vps-1d2bffb5",
                pg_version="15.18",
                restic_version="restic 0.19.1",
                tenant_Database="wood-app-db",
                tenant_schemas=["tenant_piqbit"],
            )
            self.assertEqual(info["status"], "verified")
            self.assertEqual(info["entryCount"], 1)

            # Now place firebase-service-account.json in staging -> must raise BackupError
            bad_secret = os.path.join(tmp, "firebase-service-account.json")
            with open(bad_secret, "w", encoding="utf-8") as fh:
                fh.write('{"private_key": "secret"}')
            with self.assertRaises(BackupError) as ctx:
                build_and_verify_manifest(
                    tmp,
                    run_id="20261106T060000Z-deadbeef",
                    host_name="vps-1d2bffb5",
                    pg_version="15.18",
                    restic_version="restic 0.19.1",
                    tenant_Database="wood-app-db",
                    tenant_schemas=["tenant_piqbit"],
                )
            self.assertEqual(ctx.exception.category, "secret_in_staging_prohibited")
        finally:
            shutil.rmtree(tmp)


class TestEndToEndDisposableRepository(unittest.TestCase):
    """End-to-end test of Restic backup + verification + interrupted-run cleanup in a disposable repo."""

    def test_disposable_restic_snapshot_and_verification_without_leaking_secrets(self):
        work = tempfile.mkdtemp(prefix="acya-e2e-")
        try:
            repo_dir = os.path.join(work, "repo")
            stage_dir = os.path.join(work, "stage", "stage-20261106T060000Z-11223344")
            os.makedirs(os.path.join(stage_dir, "databases"), mode=0o700)
            os.makedirs(os.path.join(stage_dir, "tenants"), mode=0o700)
            os.makedirs(os.path.join(stage_dir, "metadata"), mode=0o700)

            data_dir = os.path.join(work, "mobile")
            os.makedirs(data_dir)
            with open(os.path.join(data_dir, "app.apk"), "wb") as fh:
                fh.write(b"APK-BINARY-CONTENT" * 50)

            secrets_dir = os.path.join(work, "secrets")
            os.makedirs(secrets_dir, mode=0o700)
            fb1 = os.path.join(secrets_dir, "firebase-management-key.json")
            fb2 = os.path.join(secrets_dir, "firebase-service-account.json")
            for p in (fb1, fb2):
                with open(p, "w", encoding="utf-8") as fh:
                    fh.write('{"type":"service_account","private_key":"CONFIDENTIAL_KEY_MATERIAL"}')
                os.chmod(p, 0o600)

            pw_file = os.path.join(work, ".restic_pw")
            with open(pw_file, "w", encoding="utf-8") as fh:
                fh.write("disposable-test-password\n")
            os.chmod(pw_file, 0o600)

            excl_file = os.path.join(work, "restic.excludes")
            with open(excl_file, "w", encoding="utf-8") as fh:
                fh.write("*.tmp\n")

            # Initialize disposable local Restic repo
            subprocess.run(
                ["/usr/local/bin/restic", "-r", repo_dir, "--password-file", pw_file, "init", "-q"],
                check=True,
            )

            # Populate simulated dumps & tenant registry in stage_dir
            with open(os.path.join(stage_dir, "databases", "wood-app-db.full.dump"), "wb") as fh:
                fh.write(b"FULL-DUMP-BYTES")
            with open(os.path.join(stage_dir, "tenants", "tenant_piqbit.dump"), "wb") as fh:
                fh.write(b"PIQBIT-DUMP-BYTES")
            reg = [{"Id": 16, "Slug": "piqbit", "SchemaName": "tenant_piqbit", "IsActive": True, "Status": "Trial", "Plan": "Trial"}]
            with open(os.path.join(stage_dir, "metadata", "tenant-registry.json"), "w", encoding="utf-8") as fh:
                json.dump(reg, fh)

            minfo = build_and_verify_manifest(
                stage_dir,
                run_id="20261106T060000Z-11223344",
                host_name="vps-1d2bffb5",
                pg_version="15.18",
                restic_version="restic 0.19.1",
                tenant_Database="wood-app-db",
                tenant_schemas=["tenant_piqbit"],
            )

            # Ensure manifest contains zero references to firebase files
            with open(minfo["manifestTxtPath"], "r", encoding="utf-8") as fh:
                mtxt = fh.read()
            self.assertNotIn("firebase", mtxt)
            self.assertNotIn("CONFIDENTIAL_KEY_MATERIAL", mtxt)

            # Build test config using local-test transport
            cfg_dict = {
                "configVersion": 1,
                "environment": "test",
                "repositoryWritesAuthorized": True,
                "testMode": True,
                "requireRoot": False,
                "paths": {
                    "baseDir": work,
                    "stateDir": os.path.join(work, "state"),
                    "logDir": os.path.join(work, "logs"),
                    "cacheDir": os.path.join(work, "cache"),
                    "stagingParent": os.path.join(work, "stage"),
                    "stagingPrefix": "stage",
                    "excludeFile": excl_file,
                    "minFreeBytes": 1024,
                },
                "guards": {"excludedContainers": ["acya-restore-test-pg"], "minTenantCount": 1},
                "postgres": [{
                    "id": "primary",
                    "composeProject": "acya-app",
                    "composeService": "postgres",
                    "user": "postgres",
                    "databases": ["wood-app-db"],
                    "tenantDatabase": "wood-app-db",
                }],
                "fileSources": [
                    {"id": "mobile-releases", "kind": "dir", "class": "data", "path": data_dir, "required": True, "nonEmpty": True},
                    {
                        "id": "storage-secrets",
                        "kind": "dir",
                        "class": "secret",
                        "path": secrets_dir,
                        "required": True,
                        "nonEmpty": True,
                        "requiredFiles": ["firebase-management-key.json", "firebase-service-account.json"],
                    },
                ],
                "transport": {"mechanism": "local-test", "localRepositoryPath": repo_dir},
                "restic": {
                    "binary": "/usr/local/bin/restic",
                    "passwordFile": pw_file,
                    "host": "vps-1d2bffb5",
                    "tags": ["automated", "production", "phase11b"],
                },
                "locks": {"staleAfterSeconds": 1800, "allowStaleShared": True},
            }
            cfg_file = os.path.join(work, "backup.test.json")
            with open(cfg_file, "w", encoding="utf-8") as fh:
                json.dump(cfg_dict, fh)
            cfg = load_config(cfg_file)
            os.makedirs(cfg.state_dir, exist_ok=True)
            os.makedirs(cfg.log_dir, exist_ok=True)
            os.makedirs(cfg.cache_dir, exist_ok=True)

            logger = Logger(None)
            scope = collect_and_validate_sources(cfg, None, [], logger)
            # Ensure non_secret_sources does not contain storage-secrets or firebase filenames
            serialized_scope = json.dumps(scope["non_secret_sources"])
            self.assertNotIn("firebase", serialized_scope)
            self.assertNotIn("storage-secrets", serialized_scope)
            self.assertEqual(scope["secret_files"], 2)

            with TransferSession(cfg, logger) as session:
                client = ResticClient(cfg, session, logger)
                run_tag = "run-20261106T060000Z-11223344"
                bk = client.create_backup([stage_dir] + scope["backup_paths"], run_tag=run_tag)
                snap_id = bk["summary"]["snapshot_id"]
                ver = client.verify_snapshot(
                    snap_id,
                    run_tag=run_tag,
                    stage_dir=stage_dir,
                    expected_manifest_txt_sha256=minfo["manifestTxtSha256"],
                    expected_manifest_json_sha256=minfo["manifestJsonSha256"],
                    expected_tenant_count=1,
                    expected_non_secret_paths=scope["expected_snapshot_paths"],
                )
                self.assertEqual(ver["status"], "verified")

            # Test interrupted run recovery and abandoned staging sweep
            with open(os.path.join(cfg.state_dir, "current-run.json"), "w", encoding="utf-8") as fh:
                json.dump({"runId": "interrupted-1", "mode": "full"}, fh)
            rec_id = record_interrupted_previous(cfg, logger)
            self.assertEqual(rec_id, "interrupted-1")
            with open(os.path.join(cfg.state_dir, "last-run.json"), "r", encoding="utf-8") as fh:
                last_run = json.load(fh)
            self.assertEqual(last_run["outcome"], "interrupted")

            removed = sweep_abandoned_staging(cfg, logger)
            self.assertEqual(removed, 1)
            self.assertFalse(os.path.exists(stage_dir))
        finally:
            shutil.rmtree(work)


if __name__ == "__main__":
    unittest.main(verbosity=2)

