"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Timer
} from "lucide-react";
import { SchedulerStatus, UpdateDailyScheduleRequest } from "@/types/scheduler";

const COMMON_TIMEZONES = [
  { value: "Africa/Tunis", label: "Africa/Tunis (UTC+1, Tunis Time)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET / CEST)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST)" },
  { value: "America/New_York", label: "America/New_York (EST / EDT)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
];

export function BackupSchedulerPanel() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Form state
  const [selectedTime, setSelectedTime] = useState<string>("02:00");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("Africa/Tunis");
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Toggle modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [togglingTimer, setTogglingTimer] = useState<boolean>(false);

  const getHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/scheduler`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        let msg = "Failed to load scheduler status.";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch { }
        throw new Error(msg);
      }

      const data: SchedulerStatus = await res.json();
      setStatus(data);
      if (data.schedule) {
        if (data.schedule.time) setSelectedTime(data.schedule.time);
        if (data.schedule.timezone) setSelectedTimezone(data.schedule.timezone);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error connecting to backup scheduler.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStatus]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setError("");
    setSuccessMessage("");

    const payload: UpdateDailyScheduleRequest = {
      time: selectedTime.trim(),
      timezone: selectedTimezone.trim(),
    };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/scheduler`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to update daily backup schedule.";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch { }
        throw new Error(msg);
      }

      const updated: SchedulerStatus = await res.json();
      setStatus(updated);
      setSuccessMessage(`Daily schedule saved: ${updated.schedule.summary}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleTimer = async () => {
    if (!status) return;
    setTogglingTimer(true);
    setError("");
    setSuccessMessage("");

    const action = status.enabled ? "disable" : "enable";
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/scheduler/${action}`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!res.ok) {
        let msg = `Failed to ${action} backup timer.`;
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch { }
        throw new Error(msg);
      }

      const updated: SchedulerStatus = await res.json();
      setStatus(updated);
      setConfirmModalOpen(false);
      setSuccessMessage(
        updated.enabled
          ? "Production backup timer successfully enabled."
          : "Production backup timer stopped and disabled."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} timer.`);
    } finally {
      setTogglingTimer(false);
    }
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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-base font-bold text-slate-100 tracking-tight">
                Production Backup Scheduler
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Manage automated daily Restic snapshot schedule and systemd timer on Production VPS (51.210.10.108).
              </p>
            </div>
          </div>
        </div>

        {/* Status badges & Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {status && (
            <>
              {status.enabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Timer Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Timer Disabled
                </span>
              )}

              {status.safety.repositoryWritesAuthorized ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Writes Authorized
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Writes Blocked
                </span>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={loading || refreshing}
            className="min-h-[34px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono font-semibold text-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Safety Gate Callout */}
      {status && !status.safety.repositoryWritesAuthorized && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/95 space-y-1 text-xs">
          <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Repository Safety Gate Active</span>
          </div>
          <p className="font-sans leading-relaxed text-pretty">
            {status.safety.safetyNotice ||
              "Repository write authorization is blocked in backup.json. The timer can be scheduled, but automated runs will safely terminate without modifying repository data."}
          </p>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading scheduler configuration...</span>
        </div>
      ) : status ? (
        <div className="space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Schedule Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>DAILY EXECUTION SCHEDULE</span>
              </div>
              <div className="text-base font-bold text-slate-100 tabular-nums">
                {status.schedule.time} <span className="text-xs font-normal text-muted-foreground">({status.schedule.timezone})</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                UTC Equiv: <span className="text-slate-300 font-semibold">{status.schedule.utcTime} UTC</span> ({status.schedule.onCalendar})
              </div>
            </div>

            {/* Next Run */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                <span>NEXT SCHEDULED RUN</span>
              </div>
              <div className="text-sm font-bold text-cyan-300 tabular-nums">
                {status.enabled && status.nextRun.utc ? (
                  formatTimestamp(status.nextRun.utc)
                ) : (
                  <span className="text-slate-500 font-normal">None (Timer Disabled)</span>
                )}
              </div>
              {status.enabled && status.nextRun.local && (
                <div className="text-[11px] text-muted-foreground">
                  Local: {status.nextRun.local}
                </div>
              )}
            </div>

            {/* Last Run */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>LAST RUN OUTCOME</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    status.lastRun.outcome === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : status.lastRun.outcome === "none"
                      ? "bg-slate-800 text-slate-400 border border-slate-700"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {status.lastRun.outcome}
                </span>
                {status.lastRun.durationSeconds && (
                  <span className="text-slate-400 text-[11px] tabular-nums">
                    {status.lastRun.durationSeconds.toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate" title={status.lastRun.timestamp || "—"}>
                {status.lastRun.timestamp ? formatTimestamp(status.lastRun.timestamp) : "No recorded execution"}
              </div>
            </div>
          </div>

          {/* Form & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Schedule Configuration Form */}
            <form onSubmit={handleSaveSchedule} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Configure Daily Schedule</span>
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">Frequency: Daily</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Time Input */}
                <div className="space-y-1.5">
                  <label htmlFor="schedule-time-input" className="block text-xs font-mono text-slate-300">
                    Execution Time (24h)
                  </label>
                  <input
                    id="schedule-time-input"
                    type="time"
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    disabled={savingSchedule}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-primary tabular-nums"
                  />
                  <p className="text-[10px] text-muted-foreground">Format: HH:mm</p>
                </div>

                {/* Timezone Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="schedule-timezone-select" className="block text-xs font-mono text-slate-300">
                    Timezone
                  </label>
                  <select
                    id="schedule-timezone-select"
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    disabled={savingSchedule}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-primary"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">Converts automatically to UTC for systemd</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold transition-[transform,background-color] active:scale-[0.97] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingSchedule ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SAVING SCHEDULE...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>SAVE DAILY SCHEDULE</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Timer State & Toggle Card */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Power className="w-3.5 h-3.5 text-primary" />
                    <span>Timer Activation Gate</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">Unit: {status.timerUnit}</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  The systemd timer executes <code className="text-slate-200">{status.serviceUnit}</code> on the Production VPS.
                  Enabling the timer arms the daily trigger without launching an immediate backup run.
                </p>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Systemd State:</span>
                    <span className="text-slate-200 font-bold capitalize">{status.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Connection:</span>
                    <span className="text-emerald-400">Production VPS ({status.communication.productionHost})</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(true)}
                  className={`w-full min-h-[42px] px-4 py-2 rounded-xl font-mono text-xs font-bold transition-[transform,background-color] active:scale-[0.97] cursor-pointer inline-flex items-center justify-center gap-2 ${
                    status.enabled
                      ? "bg-destructive/15 hover:bg-destructive text-destructive hover:text-white border border-destructive/30"
                      : "bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{status.enabled ? "DISABLE AUTOMATIC BACKUP TIMER" : "ENABLE AUTOMATIC BACKUP TIMER"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal */}
      {confirmModalOpen && status && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${status.enabled ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-mono text-sm font-bold text-slate-100">
                  {status.enabled ? "Disable Automatic Backup Timer?" : "Enable Automatic Backup Timer?"}
                </h4>
                <p className="text-xs text-muted-foreground font-sans">
                  Target: {status.timerUnit} on Production VPS ({status.communication.productionHost})
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              {status.enabled ? (
                <p>
                  Disabling the timer stops the daily automated trigger. Existing backup archives, manual backup commands, and restore history remain completely accessible.
                </p>
              ) : (
                <p>
                  Enabling the timer arms the daily backup trigger at{" "}
                  <strong className="text-primary font-mono">{status.schedule.summary}</strong>.
                  No immediate backup will run upon enablement.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={togglingTimer}
                className="min-h-[38px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleToggleTimer}
                disabled={togglingTimer}
                className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-mono font-bold transition-[transform,background-color] active:scale-[0.97] cursor-pointer inline-flex items-center gap-2 ${
                  status.enabled
                    ? "bg-destructive hover:bg-destructive/90 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {togglingTimer ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>APPLYING...</span>
                  </>
                ) : (
                  <span>{status.enabled ? "CONFIRM & DISABLE" : "CONFIRM & ENABLE"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
