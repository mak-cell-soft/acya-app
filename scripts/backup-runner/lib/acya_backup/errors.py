"""Exit codes and typed failures.

Exit codes are part of the telemetry contract and of the systemd retry
policy (RestartPreventExitStatus lists every non-retryable code).
"""


class ExitCode:
    SUCCESS = 0
    INTERNAL = 1
    CONFIG = 10                 # invalid config / writes not authorized   (no retry)
    PREFLIGHT = 11              # transient environment problem            (retry)
    DISK_SPACE = 12             # insufficient staging space               (no retry)
    LOCK_CONFLICT = 13          # repository lock conflict                 (retry)
    DATABASE_EXPORT = 20        # pg_dump / psql failure                   (retry)
    TENANT_COVERAGE = 21        # tenant coverage incomplete               (no retry)
    FILE_SCOPE = 30             # required persistent path missing/empty   (no retry)
    MANIFEST = 40               # manifest or size assertion failure       (no retry)
    TRANSFER = 50               # transfer channel failure                 (retry)
    RESTIC_BACKUP = 60          # restic backup failure                    (retry)
    RESTIC_INCOMPLETE = 61      # restic exit 3, incomplete snapshot       (no retry)
    VERIFICATION = 70           # snapshot verification failure            (no retry)
    CONCURRENT = 75             # another run holds the runner lock        (no retry)
    SIGHUP = 129
    SIGINT = 130
    SIGTERM = 143


NON_RETRYABLE = (
    ExitCode.CONFIG, ExitCode.DISK_SPACE, ExitCode.TENANT_COVERAGE,
    ExitCode.FILE_SCOPE, ExitCode.MANIFEST, ExitCode.RESTIC_INCOMPLETE,
    ExitCode.VERIFICATION, ExitCode.CONCURRENT,
    ExitCode.SIGHUP, ExitCode.SIGINT, ExitCode.SIGTERM,
)


class BackupError(Exception):
    """A classified, sanitized failure.

    ``message`` must never contain secrets, file contents or raw
    subprocess output; it is written verbatim into telemetry.
    """

    def __init__(self, stage, category, message, exit_code):
        super().__init__(message)
        self.stage = stage
        self.category = category
        self.message = message
        self.exit_code = exit_code


class Interrupted(BaseException):
    def __init__(self, signum, exit_code):
        super().__init__(f"interrupted by signal {signum}")
        self.signum = signum
        self.exit_code = exit_code

