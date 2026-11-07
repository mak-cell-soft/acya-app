"""PostgreSQL export and tenant coverage (via `docker exec`, read-only)."""

import json
import os
import re

from .errors import BackupError, ExitCode
from .proc import run

TENANT_SCHEMA_RE = re.compile(r"^tenant_[a-z0-9_]{1,57}$")
TOC_SCHEMA_RE = re.compile(r"^\d+;\s+\d+\s+\d+\s+SCHEMA\s+-\s+(\S+)\s", re.M)

REGISTRY_SQL = (
    'SELECT coalesce(json_agg(t ORDER BY t."Id"), \'[]\'::json) FROM ('
    'SELECT "Id", "Slug", "SchemaName", "IsActive", "Status", "Plan", '
    '"CreatedAt", "ActivatedAt" FROM public.bo_tbl_enterprise) t'
)
TENANT_SCHEMAS_SQL = (
    "SELECT schema_name FROM information_schema.schemata "
    "WHERE schema_name LIKE 'tenant\\_%' ORDER BY schema_name"
)
DATABASES_SQL = "SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname"
SERVER_VERSION_SQL = "SHOW server_version"


class Docker:
    def __init__(self, cfg, logger):
        self.cfg = cfg
        self.log = logger
        self.bin = cfg.docker_binary

    def resolve_container(self, project, service):
        """Return (id, name) of the single running container for a compose service."""
        res = run([self.bin, "ps", "--no-trunc",
                   "--filter", f"label=com.docker.compose.project={project}",
                   "--filter", f"label=com.docker.compose.service={service}",
                   "--filter", "status=running",
                   "--format", "{{.ID}}\t{{.Names}}"], timeout=60)
        if res.returncode != 0:
            self.log.stderr_tail("docker ps", res.stderr)
            raise BackupError("preflight", "docker_unavailable",
                              "docker engine query failed", ExitCode.PREFLIGHT)
        rows = [ln.split("\t") for ln in res.stdout.decode().splitlines() if ln.strip()]
        if len(rows) != 1:
            raise BackupError("preflight", "container_not_running",
                              f"expected exactly 1 running container for {project}/{service}, found {len(rows)}",
                              ExitCode.PREFLIGHT)
        cid, name = rows[0][0], rows[0][1]
        excluded = set(self.cfg.excluded_containers)
        if name in excluded or name.lstrip("/") in excluded:
            raise BackupError("preflight", "excluded_container_targeted",
                              f"resolved container is on the exclusion list: {name}", ExitCode.CONFIG)
        return cid, name

    def excluded_container_ids(self):
        ids = set()
        for name in self.cfg.excluded_containers:
            res = run([self.bin, "ps", "-a", "--no-trunc", "--filter", f"name=^/{name}$",
                       "--format", "{{.ID}}"], timeout=60)
            if res.returncode == 0:
                ids.update(x for x in res.stdout.decode().split() if x)
        return ids

    def volume_mountpoint(self, volume):
        res = run([self.bin, "volume", "inspect", "--format", "{{.Mountpoint}}", volume], timeout=60)
        if res.returncode != 0:
            return None
        return res.stdout.decode().strip() or None

    def exec_argv(self, cid, user, *args, interactive=False):
        argv = [self.bin, "exec"]
        if interactive:
            argv.append("-i")
        argv += [cid] + list(args)
        return argv


class PostgresInstance:
    def __init__(self, docker, spec, cid, name, logger):
        self.docker = docker
        self.spec = spec
        self.cid = cid
        self.name = name
        self.log = logger

    def query(self, db, sql, stage):
        argv = self.docker.exec_argv(self.cid, None, "psql", "-X", "-q", "-A", "-t",
                                     "-v", "ON_ERROR_STOP=1",
                                     "-U", self.spec["user"], "-d", db, "-c", sql)
        res = run(argv, timeout=300)
        if res.returncode != 0:
            self.log.stderr_tail(f"psql[{self.spec['id']}/{db}]", res.stderr)
            raise BackupError(stage, "database_query_failed",
                              f"read-only catalog query failed on {self.spec['id']}/{db}",
                              ExitCode.DATABASE_EXPORT)
        return res.stdout.decode("utf-8")

    def server_version(self):
        return self.query("postgres", SERVER_VERSION_SQL, "database_export").strip()

    def list_databases(self):
        out = self.query("postgres", DATABASES_SQL, "database_export")
        return [x.strip() for x in out.splitlines() if x.strip()]

    def dump_database(self, db, dest, schema=None, stage="database_export"):
        args = ["pg_dump", "-U", self.spec["user"], "-d", db, "-Fc", "-Z", "6"]
        if schema is not None:
            if not TENANT_SCHEMA_RE.match(schema):
                raise BackupError(stage, "invalid_schema_name", "refusing to dump an invalid schema name",
                                  ExitCode.TENANT_COVERAGE)
            args.append(f"--schema={schema}")
        argv = self.docker.exec_argv(self.cid, None, *args)
        fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as fh:
            res = run(argv, stdout=fh, timeout=3600)
        if res.returncode != 0:
            self.log.stderr_tail(f"pg_dump[{self.spec['id']}/{db}{'/' + schema if schema else ''}]", res.stderr)
            raise BackupError(stage, "pg_dump_failed",
                              f"pg_dump failed for {self.spec['id']}/{db}" + (f" schema {schema}" if schema else ""),
                              ExitCode.DATABASE_EXPORT)

    def dump_globals(self, dest):
        argv = self.docker.exec_argv(self.cid, None, "pg_dumpall", "-U", self.spec["user"],
                                     "--globals-only", "--no-role-passwords")
        fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as fh:
            res = run(argv, stdout=fh, timeout=600)
        if res.returncode != 0:
            self.log.stderr_tail(f"pg_dumpall[{self.spec['id']}]", res.stderr)
            raise BackupError("database_export", "pg_dumpall_failed",
                              f"globals export failed for {self.spec['id']}", ExitCode.DATABASE_EXPORT)

    def archive_toc(self, path, stage):
        """Validate a custom-format archive via `pg_restore -l` (reads, never restores)."""
        argv = self.docker.exec_argv(self.cid, None, "pg_restore", "-l", interactive=True)
        with open(path, "rb") as fh:
            res = run(argv, stdin=fh, timeout=900)
        if res.returncode != 0:
            self.log.stderr_tail(f"pg_restore -l[{os.path.basename(path)}]", res.stderr)
            raise BackupError(stage, "archive_unreadable",
                              f"archive TOC validation failed for {os.path.basename(path)}",
                              ExitCode.DATABASE_EXPORT)
        return res.stdout.decode("utf-8", "replace")


def toc_schemas(toc_text):
    return set(TOC_SCHEMA_RE.findall(toc_text))


def expected_schema_for_slug(slug):
    return "tenant_" + re.sub(r"[^a-z0-9]+", "_", slug.lower()).strip("_")


def evaluate_coverage(registry, catalog_schemas, dumped_schemas, full_dump_schemas, min_tenant_count):
    """Pure function: compute tenant coverage block for telemetry.

    registry: list of dicts with Id, Slug, SchemaName, IsActive, Status
    catalog_schemas: set of tenant_* schema names present in the catalog
    dumped_schemas: set of schemas with a validated per-tenant dump
    full_dump_schemas: set of SCHEMA entries found in the full-dump TOC
    """
    reg_schemas = [r.get("SchemaName") for r in registry]
    reg_set = set(s for s in reg_schemas if s)
    missing = sorted(reg_set - set(catalog_schemas))
    orphans = sorted(set(catalog_schemas) - reg_set)
    expected_dumps = (reg_set & set(catalog_schemas)) | set(orphans)
    not_dumped = sorted(expected_dumps - set(dumped_schemas))
    not_in_full = sorted(expected_dumps - set(full_dump_schemas))
    invalid_names = sorted(s for s in reg_set if not TENANT_SCHEMA_RE.match(s))
    duplicates = sorted({s for s in reg_schemas if s and reg_schemas.count(s) > 1})
    slug_mismatch = sorted(
        r.get("Slug") for r in registry
        if r.get("Slug") and r.get("SchemaName") and expected_schema_for_slug(r["Slug"]) != r["SchemaName"]
    )
    problems = []
    if missing:
        problems.append("registry_schema_missing")
    if not_dumped:
        problems.append("tenant_dump_missing")
    if not_in_full:
        problems.append("tenant_absent_from_full_dump")
    if invalid_names:
        problems.append("invalid_schema_name")
    if duplicates:
        problems.append("duplicate_schema_in_registry")
    if len(registry) < min_tenant_count:
        problems.append("registry_below_minimum")
    warnings = []
    if orphans:
        warnings.append("orphan_tenant_schema")
    if slug_mismatch:
        warnings.append("slug_schema_naming_mismatch")
    return {
        "status": "complete" if not problems else "incomplete",
        "registryCount": len(registry),
        "activeCount": sum(1 for r in registry if r.get("IsActive")),
        "catalogSchemaCount": len(catalog_schemas),
        "dumpedCount": len(set(dumped_schemas) & expected_dumps),
        "fullDumpContainsAll": not not_in_full,
        "minExpected": min_tenant_count,
        "missingSchemas": missing,
        "orphanSchemas": orphans,
        "notDumped": not_dumped,
        "absentFromFullDump": not_in_full,
        "slugNamingMismatches": slug_mismatch,
        "problems": problems,
        "warnings": warnings,
        "schemas": sorted(expected_dumps),
    }


def parse_registry(text):
    try:
        data = json.loads(text.strip() or "[]")
    except ValueError:
        raise BackupError("tenant_coverage", "registry_unparseable",
                          "tenant registry query returned invalid JSON", ExitCode.DATABASE_EXPORT)
    if not isinstance(data, list):
        raise BackupError("tenant_coverage", "registry_unparseable",
                          "tenant registry is not a JSON array", ExitCode.DATABASE_EXPORT)
    return data

