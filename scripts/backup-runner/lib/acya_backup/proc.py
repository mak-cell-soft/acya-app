"""Subprocess and logging helpers.

All commands are executed with argument vectors (never through a shell).
Subprocess stderr is redacted and truncated before reaching the log, and
never reaches telemetry.
"""

import datetime as _dt
import os
import re
import subprocess
import sys

_REDACTIONS = [
    (re.compile(r"(?i)(password|passwd|secret|token|api[_-]?key|private[_-]?key)(\s*[=:]\s*)\S+"), r"\1\2[REDACTED]"),
    (re.compile(r"(?i)(rest:https?://)[^@/\s]+@"), r"\1[REDACTED]@"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?(-----END [A-Z ]*PRIVATE KEY-----|$)", re.S), "[REDACTED PRIVATE KEY]"),
    (re.compile(r"\"private_key\"\s*:\s*\"[^\"]*\""), "\"private_key\":\"[REDACTED]\""),
]


def redact(text):
    if not text:
        return ""
    for rx, repl in _REDACTIONS:
        text = rx.sub(repl, text)
    return text


def utcnow():
    return _dt.datetime.now(_dt.timezone.utc)


def iso(ts):
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None


class Logger:
    """Line logger: per-run file (0600) + stderr (captured by journald)."""

    def __init__(self, path=None):
        self.path = path
        self._fh = None
        if path:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            self._fh = os.fdopen(fd, "a", encoding="utf-8")

    def _emit(self, level, msg):
        line = f"{iso(utcnow())} [{level}] {redact(msg)}"
        print(line, file=sys.stderr, flush=True)
        if self._fh:
            self._fh.write(line + "\n")
            self._fh.flush()

    def info(self, msg):
        self._emit("INFO", msg)

    def warn(self, msg):
        self._emit("WARN", msg)

    def error(self, msg):
        self._emit("ERROR", msg)

    def stderr_tail(self, label, data, lines=15):
        if not data:
            return
        text = data.decode("utf-8", "replace") if isinstance(data, bytes) else data
        tail = text.strip().splitlines()[-lines:]
        for ln in tail:
            self._emit("SUBPROC", f"{label}: {ln[:400]}")

    def close(self):
        if self._fh:
            self._fh.close()
            self._fh = None


def run(argv, *, stdin=None, stdout=subprocess.PIPE, env=None, timeout=None, input_bytes=None):
    """Run argv; return CompletedProcess. Never raises on non-zero exit."""
    return subprocess.run(
        argv,
        stdin=stdin if input_bytes is None else None,
        input=input_bytes,
        stdout=stdout,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        check=False,
    )

