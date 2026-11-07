"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2,
  History,
  Lock,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  ORDERED_RESTORE_STAGES,
  SubmitTenantRestoreRequest,
  TenantRestoreHistoryResponse,
  TenantRestoreJobStatus,
  TenantSnapshotEligibilityDetail,
  TenantSnapshotRestorePoint,
} from "@/types/restore";

interface TenantRestorePanelProps {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  onRestoreStateChanged?: () => void;
}

export function TenantRestorePanel({
  tenantId,
  tenantName,
  tenantSlug,
  onRestoreStateChanged,
}: TenantRestorePanelProps) {
  const [historyData, setHistoryData] = useState<TenantRestoreHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string>("");

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<TenantRestoreJobStatus | null>(null);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [eligibilityDetail, setEligibilityDetail] = useState<TenantSnapshotEligibilityDetail | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState<boolean>(false);
  const [eligibilityError, setEligibilityError] = useState<string>("");
  const [confirmTenantSlugInput, setConfirmTenantSlugInput] = useState<string>("");
  const [confirmSnapshotIdInput, setConfirmSnapshotIdInput] = useState<string>("");
  const [submittingRestore, setSubmittingRestore] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []);

  const formatBytes = (bytes: number | null) => {
    if (bytes === null || bytes === undefined || bytes <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  const formatTimestamp = (isoString: string | null | undefined) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const fetchHistoryAndStatus = useCallback(
    async (silent = false) => {
      if (!silent) {
        setHistoryLoading(true);
      }
      setHistoryError("");

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
        const res = await fetch(`${apiBase}admin/backup/tenants/${tenantId}/history`, {
          headers: getHeaders(),
        });

        if (!res.ok) {
          let errMsg = "Failed to load tenant restore history.";
          try {
            const errJson = await res.json();
            if (errJson?.message) errMsg = errJson.message;
          } catch {
            // keep default message
          }
          throw new Error(errMsg);
        }

        const data: TenantRestoreHistoryResponse = await res.json();
        setHistoryData(data);
        setActiveOperation(data.activeOrLatestOperation || null);

        // Pre-select the newest eligible snapshot if none is selected or if tenant changed
        setSelectedSnapshotId((prev) => {
          const stillValid = data.restorePoints.find(
            (p) => p.snapshotId === prev && p.restoreEligibility
          );
          if (stillValid) return prev;
          const newestEligible = data.restorePoints.find((p) => p.restoreEligibility);
          return newestEligible ? newestEligible.snapshotId : null;
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unable to load tenant restore catalog.";
        setHistoryError(message);
      } finally {
        if (!silent) {
          setHistoryLoading(false);
        }
      }
    },
    [tenantId, getHeaders]
  );

  // Load history on mount (parent remounts this panel via `key` whenever the selected tenant changes)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistoryAndStatus(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHistoryAndStatus]);

  // Poll active restore operation until it reaches a terminal state (recovers automatically after refresh)
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!activeOperation || activeOperation.isTerminal) {
      return;
    }

    const opId = activeOperation.operationId;
    pollTimerRef.current = setInterval(async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
        const res = await fetch(
          `${apiBase}admin/backup/restore-operations/${encodeURIComponent(opId)}`,
          {
            headers: getHeaders(),
          }
        );
        if (!res.ok) return;
        const updated: TenantRestoreJobStatus = await res.json();
        setActiveOperation(updated);
        if (updated.isTerminal) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          fetchHistoryAndStatus(true);
          onRestoreStateChanged?.();
        }
      } catch {
        // Keep polling on transient network blip
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeOperation, fetchHistoryAndStatus, getHeaders, onRestoreStateChanged]);

  const selectedPoint = useMemo<TenantSnapshotRestorePoint | null>(() => {
    if (!historyData || !selectedSnapshotId) return null;
    return (
      historyData.restorePoints.find(
        (p) => p.snapshotId === selectedSnapshotId && p.restoreEligibility
      ) || null
    );
  }, [historyData, selectedSnapshotId]);

  const isRestoreRunning = Boolean(
    (activeOperation && !activeOperation.isTerminal) || historyData?.anotherRestoreInProgress
  );

  const handleOpenConfirmModal = async (point: TenantSnapshotRestorePoint) => {
    if (!point.restoreEligibility || isRestoreRunning) return;

    setSelectedSnapshotId(point.snapshotId);
    setConfirmTenantSlugInput("");
    setConfirmSnapshotIdInput("");
    setSubmitError("");
    setEligibilityError("");
    setEligibilityDetail(null);
    setConfirmModalOpen(true);
    setEligibilityLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(
        `${apiBase}admin/backup/tenants/${tenantId}/snapshots/${encodeURIComponent(point.snapshotId)}`,
        {
          headers: getHeaders(),
        }
      );

      if (!res.ok) {
        let msg = "Failed to verify snapshot eligibility.";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const detail: TenantSnapshotEligibilityDetail = await res.json();
      setEligibilityDetail(detail);
    } catch (err: unknown) {
      setEligibilityError(
        err instanceof Error ? err.message : "Could not verify snapshot eligibility."
      );
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleCloseConfirmModal = () => {
    if (submittingRestore) return;
    setConfirmModalOpen(false);
    setSubmitError("");
    setEligibilityError("");
  };

  const expectedSlug = eligibilityDetail?.requiredConfirmationTenantSlug || historyData?.tenantSlug || tenantSlug;
  const expectedSnapshotShortId =
    eligibilityDetail?.requiredConfirmationSnapshotId || selectedPoint?.snapshotShortId || "";

  const isConfirmationValid =
    Boolean(selectedPoint) &&
    Boolean(eligibilityDetail?.canSubmitRestore) &&
    confirmTenantSlugInput.trim() === expectedSlug &&
    (confirmSnapshotIdInput.trim() === expectedSnapshotShortId ||
      confirmSnapshotIdInput.trim() === selectedPoint?.snapshotId);

  const handleSubmitRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint || !isConfirmationValid || submittingRestore) return;

    setSubmittingRestore(true);
    setSubmitError("");

    const payload: SubmitTenantRestoreRequest = {
      snapshotId: selectedPoint.snapshotId,
      confirmTenantSlug: confirmTenantSlugInput.trim(),
      confirmSnapshotId: confirmSnapshotIdInput.trim(),
    };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/tenants/${tenantId}/restore`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Restore request was rejected.";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const jobStatus: TenantRestoreJobStatus = await res.json();
      setActiveOperation(jobStatus);
      setConfirmModalOpen(false);
      onRestoreStateChanged?.();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit restore request.");
    } finally {
      setSubmittingRestore(false);
    }
  };

  const renderOutcomeBanner = (op: TenantRestoreJobStatus) => {
    const state = op.finalState || op.currentState;

    if (!op.isTerminal) {
      return (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-mono font-bold text-amber-300 uppercase tracking-wide">
              Restore In Progress — Current Stage: {op.currentState}
            </div>
            <p className="text-slate-300 text-pretty leading-relaxed">
              Restoring <span className="font-mono font-semibold text-white">{op.schemaName}</span> from verified
              snapshot <span className="font-mono font-semibold text-amber-300">{op.snapshotShortId}</span>. During
              cutover and validation, the tenant is temporarily deactivated while all 15 unaffected tenants remain
              isolated.
            </p>
          </div>
        </div>
      );
    }

    if (state === "Completed") {
      return (
        <div
          data-testid="restore-outcome-completed"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-bold text-emerald-300 uppercase tracking-wide">
                Restore Completed Successfully
              </span>
              <span className="font-mono text-[11px] text-emerald-400/90 tabular-nums">
                Finished: {formatTimestamp(op.finishedAtUtc)}
              </span>
            </div>
            <p className="text-slate-200 text-pretty leading-relaxed">
              Schema <span className="font-mono font-semibold text-white">{op.schemaName}</span> was restored from
              snapshot <span className="font-mono font-semibold text-emerald-300">{op.snapshotShortId}</span>,
              validated in an isolated staging database, backed up prior to cutover, and reactivated.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 font-mono text-[11px] text-slate-300 tabular-nums">
              {op.restoredTableCount !== null && (
                <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800">
                  Restored Tables: <strong className="text-emerald-300">{op.restoredTableCount}</strong>
                </span>
              )}
              {op.unaffectedTenantCount !== null && (
                <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800">
                  Unaffected Tenants Verified: <strong className="text-emerald-300">{op.unaffectedTenantCount}</strong>
                </span>
              )}
              {op.preRestoreBackupCreated && (
                <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800">
                  Pre-Restore Safety Backup: <strong className="text-emerald-300">Verified</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (state === "RolledBack") {
      return (
        <div
          data-testid="restore-outcome-rolled-back"
          className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3"
        >
          <RotateCcw className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-bold text-cyan-300 uppercase tracking-wide">
                Restore Aborted — Automatic Rollback Succeeded (RolledBack)
              </span>
              <span className="font-mono text-[11px] text-cyan-400/90 tabular-nums">
                Finished: {formatTimestamp(op.finishedAtUtc)}
              </span>
            </div>
            <p className="text-slate-200 text-pretty leading-relaxed">
              Cutover or post-restore validation encountered an error, and the restore engine{" "}
              <strong className="text-cyan-300">automatically rolled back</strong>{" "}
              <span className="font-mono font-semibold text-white">{op.schemaName}</span> to its verified pre-restore
              state. The tenant has been restored to its original status and recovery artifacts were retained.
            </p>
            {op.errorMessage && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/20 font-mono text-[11px] text-cyan-200">
                Triggering Error ({op.errorCategory || "cutover_validation_error"}): {op.errorMessage}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (state === "RollbackFailed") {
      return (
        <div
          data-testid="restore-outcome-rollback-failed"
          className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/50 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-bold text-rose-300 uppercase tracking-wide">
                CRITICAL: Cutover & Automatic Rollback Failed (RollbackFailed)
              </span>
              <span className="font-mono text-[11px] text-rose-300 tabular-nums">
                Finished: {formatTimestamp(op.finishedAtUtc)}
              </span>
            </div>
            <p className="text-rose-100 text-pretty leading-relaxed">
              Automatic schema rollback did not complete cleanly. For safety, tenant{" "}
              <span className="font-mono font-semibold text-white">{op.tenantSlug}</span> remains deactivated and the
              verified pre-restore schema backup has been retained on the host for operator recovery.
            </p>
            {op.errorMessage && (
              <div className="p-2.5 rounded-lg bg-slate-950/90 border border-rose-500/30 font-mono text-[11px] text-rose-300">
                {op.errorMessage}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default: pre-cutover Failed
    return (
      <div
        data-testid="restore-outcome-failed"
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
      >
        <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-bold text-amber-300 uppercase tracking-wide">
              Restore Failed Prior to Cutover (Live Schema Untouched)
            </span>
            <span className="font-mono text-[11px] text-amber-400/90 tabular-nums">
              Finished: {formatTimestamp(op.finishedAtUtc)}
            </span>
          </div>
          <p className="text-slate-200 text-pretty leading-relaxed">
            The restore operation stopped during pre-cutover verification or staging. Production schema{" "}
            <span className="font-mono font-semibold text-white">{op.schemaName}</span> was not modified.
          </p>
          {op.errorMessage && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/20 font-mono text-[11px] text-amber-200">
              {op.errorCategory ? `[${op.errorCategory}] ` : ""}
              {op.errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="tenant-restore" className="glass-panel p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-100 text-balance">
              Individual Tenant Recovery & Snapshot Restore Points
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
              Restic Verified Catalog
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono text-pretty">
            Browse verified global Restic snapshots for{" "}
            <span className="text-slate-200 font-semibold">{tenantName}</span> (
            <span className="text-primary">{historyData?.schemaName || `tenant_${tenantSlug}`}</span>) and execute
            isolated single-tenant schema restoration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchHistoryAndStatus(false)}
            disabled={historyLoading}
            className="min-h-[40px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.96] text-slate-200 rounded-xl text-xs font-mono font-semibold transition-[transform,background-color] cursor-pointer inline-flex items-center gap-1.5 select-none disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
            <span>REFRESH CATALOG</span>
          </button>

          <button
            type="button"
            onClick={() => selectedPoint && handleOpenConfirmModal(selectedPoint)}
            disabled={!selectedPoint || isRestoreRunning || historyLoading}
            className="min-h-[40px] px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.96] text-xs font-mono cursor-pointer inline-flex items-center gap-2 transition-[transform,background-color,opacity] shadow-[0_0_15px_rgba(16,185,129,0.2)] select-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRestoreRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>RESTORE ACTIVE...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {selectedPoint
                    ? `RESTORE SNAPSHOT ${selectedPoint.snapshotShortId}`
                    : "SELECT ELIGIBLE SNAPSHOT"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {historyError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-mono text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{historyError}</span>
        </div>
      )}

      {/* Active or Most Recent Restore State Machine Progress */}
      {activeOperation && (
        <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Restore Execution State Machine
              </span>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                ({activeOperation.operationId})
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground tabular-nums">
              <span>
                Snapshot: <strong className="text-slate-200">{activeOperation.snapshotShortId}</strong>
              </span>
              <span>
                Operator: <strong className="text-slate-200">{activeOperation.requestedBy}</strong>
              </span>
              <span>
                Started: <strong className="text-slate-200">{formatTimestamp(activeOperation.startedAtUtc)}</strong>
              </span>
            </div>
          </div>

          {/* Outcome Banner */}
          {renderOutcomeBanner(activeOperation)}

          {/* 9-Stage Pipeline Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
            {ORDERED_RESTORE_STAGES.map((stageDef) => {
              const reached = activeOperation.stateHistory.includes(stageDef.state);
              const isCurrent = activeOperation.currentState === stageDef.state;
              const isCompletedStage =
                reached &&
                (!isCurrent || activeOperation.currentState === "Completed");

              let cardClasses =
                "border-slate-800/80 bg-slate-900/40 text-muted-foreground";
              if (isCurrent && !activeOperation.isTerminal) {
                cardClasses =
                  "border-amber-500/50 bg-amber-500/10 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.12)]";
              } else if (isCompletedStage) {
                cardClasses =
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
              }

              return (
                <div
                  key={stageDef.state}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${cardClasses}`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                    <span className="tabular-nums opacity-75">0{stageDef.stepNumber}</span>
                    {isCurrent && !activeOperation.isTerminal ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : isCompletedStage ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Clock className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] font-bold mt-1 truncate" title={stageDef.label}>
                    {stageDef.label}
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5 leading-tight line-clamp-2">
                    {stageDef.shortDescription}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rollback / Failure State Pill when triggered */}
          {(activeOperation.stateHistory.includes("RollingBack") ||
            activeOperation.currentState === "Failed" ||
            activeOperation.currentState === "RolledBack" ||
            activeOperation.currentState === "RollbackFailed") && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">Failure / Recovery Path:</span>
              {activeOperation.stateHistory.includes("RollingBack") && (
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  RollingBack
                </span>
              )}
              {activeOperation.currentState === "RolledBack" && (
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-bold">
                  RolledBack (Live Schema Restored to Pre-Cutover State)
                </span>
              )}
              {activeOperation.currentState === "RollbackFailed" && (
                <span className="px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-200 font-bold">
                  RollbackFailed (Manual Intervention Required)
                </span>
              )}
              {activeOperation.currentState === "Failed" && (
                <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">
                  Failed (Aborted Safely Before Cutover)
                </span>
              )}
            </div>
          )}

          {/* Sanitized Audit Trail */}
          {activeOperation.auditTrail && activeOperation.auditTrail.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Immutable Restore Audit Trail ({activeOperation.auditTrail.length} events)
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 font-mono text-[11px]">
                {activeOperation.auditTrail.map((entry, idx) => (
                  <div key={`${entry.timestampUtc}-${idx}`} className="px-3 py-2 flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                          {entry.state}
                        </span>
                        <span className="text-slate-400 text-[10px]">{entry.action}</span>
                      </div>
                      <div className="text-slate-200 break-words">{entry.summary}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {formatTimestamp(entry.timestampUtc)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Catalog Summary Strip */}
      {historyData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-muted-foreground">INDEXED GLOBAL SNAPSHOTS</span>
            <span className="text-sm font-bold text-slate-100 tabular-nums">
              {historyData.totalSnapshotsIndexed}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-muted-foreground">ELIGIBLE RESTORE POINTS</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {historyData.eligibleSnapshotCount} / {historyData.restorePoints.length}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-muted-foreground">CATALOG INDEXED AT</span>
            <span className="text-[11px] font-semibold text-slate-200 tabular-nums">
              {formatTimestamp(historyData.catalogGeneratedAt)}
            </span>
          </div>
        </div>
      )}

      {/* Restore Points Table */}
      {historyLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-mono flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>READING VERIFIED TENANT BACKUP HISTORY CATALOG...</span>
        </div>
      ) : !historyData || historyData.restorePoints.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-mono border border-dashed border-slate-800 rounded-xl">
          NO SNAPSHOT RESTORE POINTS INDEXED FOR THIS TENANT
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-muted-foreground uppercase text-[11px]">
                  <th className="px-4 py-3 w-10">Select</th>
                  <th className="px-4 py-3">Snapshot Date (UTC)</th>
                  <th className="px-4 py-3">Snapshot ID</th>
                  <th className="px-4 py-3">Snapshot Status</th>
                  <th className="px-4 py-3">Archive Size & Checksum</th>
                  <th className="px-4 py-3">Restore Eligibility & Details</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {historyData.restorePoints.map((point) => {
                  const isEligible = point.restoreEligibility;
                  const isSelected = selectedSnapshotId === point.snapshotId && isEligible;

                  return (
                    <tr
                      key={point.snapshotId}
                      onClick={() => {
                        if (isEligible && !isRestoreRunning) {
                          setSelectedSnapshotId(point.snapshotId);
                        }
                      }}
                      className={`transition-colors ${
                        isEligible
                          ? isSelected
                            ? "bg-primary/10 hover:bg-primary/15 cursor-pointer"
                            : "hover:bg-slate-900/50 cursor-pointer"
                          : "opacity-60 bg-slate-950/40 cursor-not-allowed"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="radio"
                          name={`restore-point-${tenantId}`}
                          checked={isSelected}
                          disabled={!isEligible || isRestoreRunning}
                          onChange={() => {
                            if (isEligible && !isRestoreRunning) {
                              setSelectedSnapshotId(point.snapshotId);
                            }
                          }}
                          aria-label={`Select snapshot ${point.snapshotShortId}`}
                          className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="px-4 py-3.5 text-slate-200 tabular-nums whitespace-nowrap">
                        <div className="font-semibold">{formatTimestamp(point.snapshotTimestamp)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{point.snapshotTimestamp}</div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-primary font-bold border border-slate-700 tabular-nums">
                          {point.snapshotShortId}
                        </span>
                        <div
                          className="text-[10px] text-muted-foreground mt-1 max-w-[140px] truncate tabular-nums"
                          title={point.snapshotId}
                        >
                          {point.snapshotId}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {point.snapshotVerificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            {point.snapshotVerificationStatus}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums">
                        <div className="text-slate-200 font-semibold">{formatBytes(point.dumpSize)}</div>
                        {point.manifestSha256 ? (
                          <div
                            className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"
                            title={`Manifest SHA-256: ${point.manifestSha256}`}
                          >
                            <FileCheck2 className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>SHA-256: {point.manifestSha256.slice(0, 12)}…</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-400/90 mt-0.5">No SHA-256 manifest digest</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        {isEligible ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Eligible for Restore
                            </span>
                            <div className="text-[10px] text-muted-foreground font-sans">
                              Dump present & manifest SHA-256 recorded (verified upon extraction).
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                              <Lock className="w-3 h-3" />
                              {point.tenantPresenceStatus === "unavailable" ? "Unavailable" : "Ineligible"}
                            </span>
                            <div className="text-[11px] text-amber-300/90 font-sans leading-snug text-pretty">
                              {point.ineligibilityExplanation ||
                                point.ineligibilityReason ||
                                "Snapshot is not eligible for tenant restoration."}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isEligible ? (
                          <button
                            type="button"
                            disabled={isRestoreRunning}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfirmModal(point);
                            }}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 font-mono text-xs font-semibold transition-[transform,background-color,color] active:scale-[0.96] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Not Selectable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPLICIT CONFIRMATION MODAL */}
      {confirmModalOpen && selectedPoint && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-confirm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingRestore) {
              handleCloseConfirmModal();
            }
          }}
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 id="restore-confirm-modal-title" className="text-base font-bold text-slate-100 text-balance">
                    Confirm Individual Tenant Schema Restoration
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Target Tenant: <strong className="text-slate-200">{tenantName}</strong> ({expectedSlug})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirmModal}
                disabled={submittingRestore}
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close confirmation modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {eligibilityLoading ? (
              <div className="py-8 text-center font-mono text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>VERIFYING SNAPSHOT ELIGIBILITY & LOCK STATUS...</span>
              </div>
            ) : eligibilityError ? (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-mono text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{eligibilityError}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitRestore} className="space-y-4">
                {/* Target Summary Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">TARGET TENANT SLUG</span>
                    <span className="font-bold text-slate-100">{expectedSlug}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">POSTGRESQL SCHEMA</span>
                    <span className="font-bold text-primary">
                      {eligibilityDetail?.schemaName || historyData?.schemaName || `tenant_${expectedSlug}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SELECTED SNAPSHOT</span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      {selectedPoint.snapshotShortId} ({formatTimestamp(selectedPoint.snapshotTimestamp)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ARCHIVE SIZE</span>
                    <span className="text-slate-200 tabular-nums">{formatBytes(selectedPoint.dumpSize)}</span>
                  </div>
                  {selectedPoint.manifestSha256 && (
                    <div className="pt-1 border-t border-slate-800/80">
                      <div className="text-[10px] text-muted-foreground">MANIFEST SHA-256 DIGEST</div>
                      <div className="text-[11px] text-cyan-300 break-all tabular-nums mt-0.5">
                        {selectedPoint.manifestSha256}
                      </div>
                    </div>
                  )}
                </div>

                {/* Safety Notice */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/95 space-y-1.5 leading-relaxed text-pretty">
                  <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 shrink-0" />
                    <span>Controlled 9-Stage Restoration Safeguards</span>
                  </div>
                  <p>
                    The restore engine will extract only <code className="text-white">{expectedSlug}</code> via
                    read-only Restic, verify its SHA-256 digest and archive TOC, stage and validate all tables in a
                    temporary database, create a verified pre-restore backup of the current live schema, and replace
                    only this tenant&apos;s schema while keeping all other 15 tenants untouched.
                  </p>
                </div>

                {!eligibilityDetail?.canSubmitRestore && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-start gap-2">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Production restoration execution is currently disabled by server policy. Historical snapshots and verification metadata may be inspected, but actual cutover cannot be executed until authorized.
                    </span>
                  </div>
                )}

                {submitError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-mono text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Explicit Confirmation Inputs */}
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label
                      htmlFor="confirm-tenant-slug-input"
                      className="block text-xs font-mono text-slate-300"
                    >
                      1. Type the tenant slug{" "}
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-primary font-bold">
                        {expectedSlug}
                      </span>{" "}
                      to confirm the target tenant:
                    </label>
                    <input
                      id="confirm-tenant-slug-input"
                      type="text"
                      required
                      autoComplete="off"
                      value={confirmTenantSlugInput}
                      onChange={(e) => setConfirmTenantSlugInput(e.target.value)}
                      placeholder={expectedSlug}
                      disabled={submittingRestore}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="confirm-snapshot-id-input"
                      className="block text-xs font-mono text-slate-300"
                    >
                      2. Type the snapshot short ID{" "}
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold tabular-nums">
                        {expectedSnapshotShortId}
                      </span>{" "}
                      to confirm the selected restore point:
                    </label>
                    <input
                      id="confirm-snapshot-id-input"
                      type="text"
                      required
                      autoComplete="off"
                      value={confirmSnapshotIdInput}
                      onChange={(e) => setConfirmSnapshotIdInput(e.target.value)}
                      placeholder={expectedSnapshotShortId}
                      disabled={submittingRestore}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-100 tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseConfirmModal}
                    disabled={submittingRestore}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.96] text-xs font-mono font-semibold text-slate-200 transition-[transform,background-color] cursor-pointer"
                  >
                    CANCEL
                  </button>

                  <button
                    type="submit"
                    disabled={!isConfirmationValid || submittingRestore}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.96] text-xs font-mono font-bold text-primary-foreground transition-[transform,background-color,opacity] cursor-pointer inline-flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submittingRestore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>STARTING RESTORE...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>CONFIRM &amp; RESTORE TENANT</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

