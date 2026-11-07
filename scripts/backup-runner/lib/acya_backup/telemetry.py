"""Execution telemetry (contract: acya.backup.run/v1).

Files written under <stateDir>:
  current-run.json   present only while a run is in progress
  last-run.json      latest terminal record (completed / failed / interrupted)
  last-success.json  latest record with outcome == "success"
and an append-only event stream <logDir>/telemetry.jsonl.

Records contain only identifiers, counts, sizes, digests of
non-secret artifacts, timestamps and sanitized failure categories.
"""

import json
import os
import socket
import tempfile

from . import RUNNER_VERSION, TELEMETRY_SCHEMA
from .proc import iso, utcnow

STAGES = (
    "preflight",
    "repository_preflight",
    "lock_inspection",
    "database_export",
    "tenant_coverage",
    "file_collection",
    "secret_collection",
    "manifest",
    "size_assertions",
    "transfer",
    "snapshot",
    "verification",
)


def atomic_write_json(path, obj, mode=0o644):
    directory = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, indent=2, sort_keys=False)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


class RunTelemetry:
    def __init__(self, cfg, run_id, mode, trigger):
        self.cfg = cfg
        self.started = utcnow()
        self.record = {
            "schema": TELEMETRY_SCHEMA,
            "event": "run.started",
            "runId": run_id,
            "runTag": f"run-{run_id}",
            "runnerVersion": RUNNER_VERSION,
            "environment": cfg.environment,
            "host": socket.gethostname(),
            "mode": mode,
            "trigger": trigger,
            "outcome": "running",
            "exitCode": None,
            "failure": None,
            "warnings": [],
            "startedAt": iso(self.started),
            "finishedAt": None,
            "durationSeconds": None,
            "stages": {s: {"status": "pending"} for s in STAGES},
            "databases": {"status": "not_run", "expected": [], "exported": [], "missing": [], "unlisted": []},
            "tenants": {"status": "not_run"},
            "artifacts": {
                "staged": {"count": 0, "bytes": 0},
                "files": {"count": 0, "bytes": 0},
                "secrets": {"count": 0, "bytes": 0},
                "total": {"count": 0, "bytes": 0},
                "zeroSizeViolations": None,
            },
            "manifest": {"status": "not_run"},
            "locks": {"status": "not_run"},
            "transfer": {"status": "not_run", "mechanism": cfg.mechanism, "attempts": 0},
            "restic": {"snapshotId": None, "shortId": None, "exitCode": None},
            "verification": {"status": "not_run"},
            "recoveryPoint": None,
        }
        self._stage_started = {}

    # -- stage tracking ---------------------------------------------------
    def stage_start(self, name):
        self._stage_started[name] = utcnow()
        self.record["stages"][name] = {"status": "running", "startedAt": iso(self._stage_started[name])}

    def stage_end(self, name, status="succeeded", **extra):
        st = self._stage_started.get(name, utcnow())
        end = utcnow()
        entry = {"status": status, "startedAt": iso(st), "finishedAt": iso(end),
                 "durationSeconds": round((end - st).total_seconds(), 3)}
        entry.update(extra)
        self.record["stages"][name] = entry

    def stage_skip(self, name, reason):
        self.record["stages"][name] = {"status": "skipped", "reason": reason}

    def warn(self, code, detail=None):
        w = {"code": code}
        if detail is not None:
            w["detail"] = detail
        self.record["warnings"].append(w)

    # -- persistence ------------------------------------------------------
    def _path(self, name):
        return os.path.join(self.cfg.state_dir, name)

    def _append_event(self, obj):
        path = os.path.join(self.cfg.log_dir, "telemetry.jsonl")
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o640)
        with os.fdopen(fd, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(obj, separators=(",", ":")) + "\n")

    def emit_started(self):
        atomic_write_json(self._path("current-run.json"), self.record)
        self._append_event(self.record)

    def snapshot_copy(self):
        return json.loads(json.dumps(self.record))

    def finish(self, outcome, exit_code, failure=None):
        end = utcnow()
        self.record["finishedAt"] = iso(end)
        self.record["durationSeconds"] = round((end - self.started).total_seconds(), 3)
        self.record["outcome"] = outcome
        self.record["exitCode"] = exit_code
        self.record["failure"] = failure
        self.record["event"] = "run.completed" if outcome in ("success", "partial") else "run.failed"
        for name, st in self.record["stages"].items():
            if st.get("status") == "running":
                st["status"] = "failed" if failure and failure.get("stage") == name else "aborted"
        # Only full runs update last-run/last-success; preflight/stage-only
        # modes write their own file so they never mask production state.
        if self.record["mode"] == "full":
            atomic_write_json(self._path("last-run.json"), self.record)
            if outcome == "success":
                atomic_write_json(self._path("last-success.json"), self.record)
        else:
            atomic_write_json(self._path(f"last-{self.record['mode']}.json"), self.record)
        self._append_event(self.record)
        try:
            os.unlink(self._path("current-run.json"))
        except FileNotFoundError:
            pass


def record_interrupted_previous(cfg, logger):
    """If current-run.json survived (crash, power loss, SIGKILL), close it."""
    path = os.path.join(cfg.state_dir, "current-run.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            prev = json.load(fh)
    except (OSError, ValueError):
        prev = {"schema": TELEMETRY_SCHEMA, "runId": "unknown"}
    prev["event"] = "run.failed"
    prev["outcome"] = "interrupted"
    prev["exitCode"] = None
    prev["finishedAt"] = None
    prev["failure"] = {"stage": None, "category": "interrupted_unclean",
                       "message": "previous run ended without writing a terminal record"}
    prev["detectedAt"] = iso(utcnow())
    if prev.get("mode") == "full":
        atomic_write_json(os.path.join(cfg.state_dir, "last-run.json"), prev)
    lp = os.path.join(cfg.log_dir, "telemetry.jsonl")
    fd = os.open(lp, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o640)
    with os.fdopen(fd, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(prev, separators=(",", ":")) + "\n")
    os.unlink(path)
    logger.warn(f"previous run {prev.get('runId')} was interrupted uncleanly; recorded as interrupted")
    return prev.get("runId")

