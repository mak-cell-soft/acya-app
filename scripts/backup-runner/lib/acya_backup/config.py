"""Configuration loading and validation (JSON, no shell sourcing)."""

import json
import os
import re

from .errors import BackupError, ExitCode

_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,63}$")
_DB_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$")
_PGUSER_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")
_TAG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")
_HOST_RE = re.compile(r"^[A-Za-z0-9.-]{1,253}$")

FILE_CLASSES = ("data", "config", "secret")
MECHANISMS = ("rest-ssh-tunnel", "sftp", "local-test")


def _fail(msg):
    raise BackupError("preflight", "config_invalid", msg, ExitCode.CONFIG)


def _abs(path, field):
    if not isinstance(path, str) or not os.path.isabs(path) or ".." in path.split("/"):
        _fail(f"{field} must be an absolute path without '..'")
    return os.path.normpath(path)


def _req(d, key, typ, field_prefix):
    if key not in d:
        _fail(f"missing config key {field_prefix}{key}")
    if not isinstance(d[key], typ):
        _fail(f"config key {field_prefix}{key} has wrong type")
    return d[key]


class Config:
    def __init__(self, raw, path):
        self.path = path
        self.raw = raw
        self._validate()

    # ------------------------------------------------------------------
    def _validate(self):
        r = self.raw
        if r.get("configVersion") != 1:
            _fail("configVersion must be 1")
        self.environment = _req(r, "environment", str, "")
        self.repository_writes_authorized = bool(r.get("repositoryWritesAuthorized", False))
        self.test_mode = bool(r.get("testMode", False))

        paths = _req(r, "paths", dict, "")
        self.base_dir = _abs(_req(paths, "baseDir", str, "paths."), "paths.baseDir")
        self.state_dir = _abs(_req(paths, "stateDir", str, "paths."), "paths.stateDir")
        self.log_dir = _abs(_req(paths, "logDir", str, "paths."), "paths.logDir")
        self.cache_dir = _abs(_req(paths, "cacheDir", str, "paths."), "paths.cacheDir")
        self.staging_parent = _abs(_req(paths, "stagingParent", str, "paths."), "paths.stagingParent")
        self.staging_prefix = _req(paths, "stagingPrefix", str, "paths.")
        if not re.match(r"^[A-Za-z0-9-]+$", self.staging_prefix):
            _fail("paths.stagingPrefix must be alphanumeric/dash")
        self.exclude_file = _abs(_req(paths, "excludeFile", str, "paths."), "paths.excludeFile")
        self.min_free_bytes = int(_req(paths, "minFreeBytes", int, "paths."))
        self.log_retention_days = int(paths.get("logRetentionDays", 90))

        guards = _req(r, "guards", dict, "")
        self.excluded_containers = list(_req(guards, "excludedContainers", list, "guards."))
        self.min_tenant_count = int(_req(guards, "minTenantCount", int, "guards."))

        self.postgres = []
        for i, inst in enumerate(_req(r, "postgres", list, "")):
            p = f"postgres[{i}]."
            entry = {
                "id": _req(inst, "id", str, p),
                "composeProject": _req(inst, "composeProject", str, p),
                "composeService": _req(inst, "composeService", str, p),
                "user": _req(inst, "user", str, p),
                "databases": list(_req(inst, "databases", list, p)),
                "ignoreDatabases": list(inst.get("ignoreDatabases", ["postgres"])),
                "autoDiscover": bool(inst.get("autoDiscover", True)),
                "dumpGlobals": bool(inst.get("dumpGlobals", True)),
                "tenantDatabase": inst.get("tenantDatabase"),
            }
            if not _ID_RE.match(entry["id"]):
                _fail(f"{p}id invalid")
            if not _PGUSER_RE.match(entry["user"]):
                _fail(f"{p}user invalid")
            for db in entry["databases"] + entry["ignoreDatabases"]:
                if not isinstance(db, str) or not _DB_RE.match(db):
                    _fail(f"{p}databases contains an invalid name")
            if entry["tenantDatabase"] is not None and entry["tenantDatabase"] not in entry["databases"]:
                _fail(f"{p}tenantDatabase must be listed in databases")
            self.postgres.append(entry)
        if not self.postgres:
            _fail("at least one postgres instance is required")
        if sum(1 for e in self.postgres if e["tenantDatabase"]) != 1:
            _fail("exactly one postgres instance must declare tenantDatabase")

        self.file_sources = []
        seen = set()
        for i, src in enumerate(_req(r, "fileSources", list, "")):
            p = f"fileSources[{i}]."
            entry = {
                "id": _req(src, "id", str, p),
                "kind": _req(src, "kind", str, p),
                "class": _req(src, "class", str, p),
                "required": bool(src.get("required", True)),
                "nonEmpty": bool(src.get("nonEmpty", True)),
                "requiredFiles": list(src.get("requiredFiles", [])),
                "dockerVolume": src.get("dockerVolume"),
            }
            if not _ID_RE.match(entry["id"]) or entry["id"] in seen:
                _fail(f"{p}id invalid or duplicated")
            seen.add(entry["id"])
            if entry["class"] not in FILE_CLASSES:
                _fail(f"{p}class must be one of {FILE_CLASSES}")
            if entry["kind"] in ("file", "dir"):
                entry["path"] = _abs(_req(src, "path", str, p), p + "path")
            elif entry["kind"] == "glob":
                entry["pattern"] = _abs(_req(src, "pattern", str, p), p + "pattern")
                entry["minMatches"] = int(src.get("minMatches", 1))
            else:
                _fail(f"{p}kind must be file, dir or glob")
            for rf in entry["requiredFiles"]:
                if not isinstance(rf, str) or "/" in rf or rf in ("", ".", ".."):
                    _fail(f"{p}requiredFiles entries must be plain file names")
            self.file_sources.append(entry)

        t = _req(r, "transport", dict, "")
        self.transport = dict(t)
        mech = _req(t, "mechanism", str, "transport.")
        if mech not in MECHANISMS:
            _fail(f"transport.mechanism must be one of {MECHANISMS}")
        if mech == "local-test" and not self.test_mode:
            _fail("transport.mechanism local-test is only allowed with testMode=true")
        if mech in ("rest-ssh-tunnel", "sftp"):
            for k in ("sshHost", "sshUser", "sshKeyFile", "knownHostsFile"):
                _req(t, k, str, "transport.")
            if not _HOST_RE.match(t["sshHost"]) or not _PGUSER_RE.match(t["sshUser"].replace("-", "_")):
                _fail("transport.sshHost/sshUser invalid")
            _abs(t["sshKeyFile"], "transport.sshKeyFile")
            _abs(t["knownHostsFile"], "transport.knownHostsFile")
            self.transport.setdefault("sshPort", 22)
            self.transport.setdefault("connectTimeoutSeconds", 15)
        if mech == "rest-ssh-tunnel":
            for k in ("remoteRestPort", "localPort"):
                _req(t, k, int, "transport.")
            _req(t, "repositoryPath", str, "transport.")
            _req(t, "restUsername", str, "transport.")
            _abs(_req(t, "restPasswordFile", str, "transport."), "transport.restPasswordFile")
            self.transport.setdefault("remoteRestHost", "127.0.0.1")
            if not re.match(r"^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$", t["repositoryPath"]):
                _fail("transport.repositoryPath invalid")
        if mech == "sftp":
            _abs(_req(t, "remoteRepositoryPath", str, "transport."), "transport.remoteRepositoryPath")
        if mech == "local-test":
            _abs(_req(t, "localRepositoryPath", str, "transport."), "transport.localRepositoryPath")

        rs = _req(r, "restic", dict, "")
        self.restic_binary = _abs(_req(rs, "binary", str, "restic."), "restic.binary")
        self.restic_password_file = _abs(_req(rs, "passwordFile", str, "restic."), "restic.passwordFile")
        self.restic_host = _req(rs, "host", str, "restic.")
        if not _HOST_RE.match(self.restic_host):
            _fail("restic.host invalid")
        self.restic_tags = list(_req(rs, "tags", list, "restic."))
        for tag in self.restic_tags:
            if not isinstance(tag, str) or not _TAG_RE.match(tag):
                _fail("restic.tags contains an invalid tag")
        self.restic_backup_attempts = max(1, int(rs.get("backupAttempts", 2)))
        self.restic_retry_delay = max(0, int(rs.get("retryDelaySeconds", 120)))
        self.restic_limit_upload_kib = max(0, int(rs.get("limitUploadKiB", 0)))
        self.restic_timeout = max(60, int(rs.get("backupTimeoutSeconds", 10800)))

        lk = _req(r, "locks", dict, "")
        self.lock_stale_after = int(lk.get("staleAfterSeconds", 1800))
        self.lock_allow_stale_shared = bool(lk.get("allowStaleShared", True))

        tools = r.get("tools", {})
        self.docker_binary = _abs(tools.get("docker", "/usr/bin/docker"), "tools.docker")
        self.ssh_binary = _abs(tools.get("ssh", "/usr/bin/ssh"), "tools.ssh")
        self.sha256sum_binary = _abs(tools.get("sha256sum", "/usr/bin/sha256sum"), "tools.sha256sum")
        self.require_root = bool(r.get("requireRoot", True))

    # ------------------------------------------------------------------
    @property
    def mechanism(self):
        return self.transport["mechanism"]

    @property
    def tenant_instance(self):
        return next(e for e in self.postgres if e["tenantDatabase"])

    @property
    def runner_lock_path(self):
        return os.path.join(self.state_dir, "runner.lock")


def load_config(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except FileNotFoundError:
        _fail("configuration file not found")
    except (OSError, ValueError):
        _fail("configuration file unreadable or not valid JSON")
    if not isinstance(raw, dict):
        _fail("configuration root must be an object")
    return Config(raw, path)

