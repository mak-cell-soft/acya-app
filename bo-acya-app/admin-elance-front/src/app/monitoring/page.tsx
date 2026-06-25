"use client";

import { useEffect, useState } from "react";
import { Database, Users, Activity, Play, Download, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface Enterprise {
  id: number;
  slug: string;
  name: string;
}

interface MonitorStats {
  databaseSize: number;
  userCount: number;
  activeConnections: number;
  lastActivity: string | null;
  status: string;
  errorMessage: string | null;
}

interface BackupJob {
  id: number;
  tenantId: number;
  type: string;
  status: string;
  filePath: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export default function MonitoringPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnt, setSelectedEnt] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);

  const [backupSubmitting, setBackupSubmitting] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  const fetchEnterprises = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setEnterprises(data);
        if (data.length > 0) {
          setSelectedEnt(data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load enterprises.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsAndJobs = async (entId: number) => {
    setStatsLoading(true);
    setBackupsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      // Stats
      const statsRes = await fetch(`${apiBase}admin/monitoring/${entId}`, {
        headers: getHeaders(),
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Backup Jobs
      const backupRes = await fetch(`${apiBase}admin/backup/jobs/${entId}`, {
        headers: getHeaders(),
      });
      if (backupRes.ok) {
        const backupData = await backupRes.json();
        setBackupJobs(backupData);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setStatsLoading(false);
      setBackupsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, []);

  useEffect(() => {
    if (selectedEnt) {
      fetchStatsAndJobs(selectedEnt.id);
    }
  }, [selectedEnt]);

  const handleTriggerBackup = async () => {
    if (!selectedEnt) return;
    setBackupSubmitting(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to queue backup job.");

      fetchStatsAndJobs(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Backup trigger failed.");
    } finally {
      setBackupSubmitting(false);
    }
  };

  const handleTriggerRestore = async (jobId: number) => {
    if (!selectedEnt) return;
    const confirmRestore = window.confirm(
      "CAUTION: Are you sure you want to restore the database to this backup snapshot?\n\nThis will completely overwrite current schema state and cannot be undone."
    );
    if (!confirmRestore) return;

    setRestoreSubmitting(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/backup/restore/${jobId}`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to queue restore job.");

      fetchStatsAndJobs(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Restore trigger failed.");
    } finally {
      setRestoreSubmitting(false);
    }
  };

  const handleDownloadBackup = async (jobId: number, filename: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const res = await fetch(`${apiBase}admin/backup/download/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Download failed.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message || "Backup download failed.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Monitoring & Backup Admin</h1>
          <p className="text-muted-foreground mt-1">Live resource metrics, storage analytics, and database backups coordination.</p>
        </div>
        {selectedEnt && (
          <button 
            onClick={() => fetchStatsAndJobs(selectedEnt.id)}
            disabled={statsLoading || backupsLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-2 text-sm font-mono"
          >
            <RefreshCw className={`w-4 h-4 ${(statsLoading || backupsLoading) ? 'animate-spin' : ''}`} />
            REFRESH DATA
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          LOADING METRICS ENGINE...
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Enterprises Selector */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-muted-foreground">Select Tenant</h3>
            <div className="glass-panel p-2 rounded-xl bg-card/25 border border-border/50 space-y-1">
              {enterprises.map(ent => (
                <button
                  key={ent.id}
                  onClick={() => setSelectedEnt(ent)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedEnt?.id === ent.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-slate-300 hover:bg-slate-800/40"
                  }`}
                >
                  <div>
                    <div>{ent.name}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${selectedEnt?.id === ent.id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{ent.slug}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Monitoring Metrics & Actions */}
          <div className="lg:col-span-3 space-y-8">
            {selectedEnt ? (
              <>
                {/* Stats Panel Cards */}
                {statsLoading ? (
                  <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
                    QUERYING POSTGRES CATALOG METADATA...
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* Database Sizing */}
                    <div className="glass-panel p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-mono">
                        <span>Schema Size</span>
                        <Database className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-100">{formatBytes(stats.databaseSize)}</div>
                      <div className="text-[10px] text-muted-foreground">Total relations size</div>
                    </div>

                    {/* Active User Registrations */}
                    <div className="glass-panel p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-mono">
                        <span>Active Users</span>
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-100">{stats.userCount}</div>
                      <div className="text-[10px] text-muted-foreground">App users registered</div>
                    </div>

                    {/* Database Connections */}
                    <div className="glass-panel p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-mono">
                        <span>DB Connections</span>
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-100">{stats.activeConnections}</div>
                      <div className="text-[10px] text-muted-foreground">Global connection count</div>
                    </div>

                    {/* Catalog Status */}
                    <div className="glass-panel p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-mono">
                        <span>Status</span>
                        {stats.status === "Healthy" ? (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className={`text-xl font-bold font-mono ${stats.status === "Healthy" ? 'text-primary' : 'text-yellow-500'}`}>{stats.status}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{stats.errorMessage || "All schemas online"}</div>
                    </div>

                  </div>
                ) : null}

                {/* Backups Panel */}
                <div className="glass-panel p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Database Backups & Archives</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">Manual trigger and restoration coordinator.</p>
                    </div>

                    <button 
                      onClick={handleTriggerBackup}
                      disabled={backupSubmitting}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                      {backupSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      RUN MANUAL BACKUP
                    </button>
                  </div>

                  {/* Backups List */}
                  {backupsLoading ? (
                    <div className="text-center py-12 text-xs text-muted-foreground font-mono">LOADING BACKUP JOBS...</div>
                  ) : (
                    <div className="glass-panel rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/40 font-mono text-muted-foreground">
                            <th className="px-4 py-3">Job ID</th>
                            <th className="px-4 py-3">Job Type</th>
                            <th className="px-4 py-3">Created At</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Backup File</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {backupJobs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                NO BACKUP HISTORY RECORDS
                              </td>
                            </tr>
                          ) : (
                            backupJobs.map(job => (
                              <tr key={job.id} className="hover:bg-slate-900/10">
                                <td className="px-4 py-3 text-slate-400">#{job.id.toString().padStart(4, '0')}</td>
                                <td className="px-4 py-3 font-bold uppercase">{job.type}</td>
                                <td className="px-4 py-3 text-slate-400">{new Date(job.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    job.status === "Completed" ? "bg-primary/20 text-primary" : 
                                    job.status === "Failed" ? "bg-red-500/20 text-red-400" :
                                    "bg-yellow-500/20 text-yellow-500"
                                  }`}>
                                    {job.status}
                                  </span>
                                  {job.errorMessage && (
                                    <div className="text-[9px] text-red-400 mt-1 max-w-xs truncate" title={job.errorMessage}>
                                      {job.errorMessage}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={job.filePath}>
                                  {job.filePath.split('/').pop()}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                  {job.type === "Backup" && job.status === "Completed" && (
                                    <>
                                      <button 
                                        onClick={() => handleDownloadBackup(job.id, job.filePath.split('/').pop() || "backup.dump")}
                                        className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download
                                      </button>
                                      <button 
                                        onClick={() => handleTriggerRestore(job.id)}
                                        disabled={restoreSubmitting}
                                        className="text-xs font-semibold text-yellow-500 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        Restore
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
                PLEASE REGISTER A TENANT ENTERPRISE IN THE REGISTRY TO ENABLE RESOURCE MONITORING AND BACKUPS.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
