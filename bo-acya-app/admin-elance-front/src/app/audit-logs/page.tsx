"use client";

import { useEffect, useState } from "react";
import { Terminal, Shield, RefreshCw, Loader2 } from "lucide-react";

interface AuditLog {
  id: number;
  tenantId: number | null;
  tenantName: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/auditlogs?limit=150`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch SaaS audit trail.");
      }

      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "An error occurred loading audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Terminal className="text-primary w-8 h-8" />
            Global Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">SaaS central operations audit trail and security ledger.</p>
        </div>
        <button 
          onClick={fetchAuditLogs}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-2 text-sm font-mono"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          REFRESH LEDGER
        </button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          STREAMING SAAS AUDIT LEDGER...
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden bg-card/25 border border-border/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Actor / Origin</th>
                <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Tenant Schema</th>
                <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Operation Action</th>
                <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Details Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono text-xs text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    NO RECORDED SAAS AUDIT ENTRIES FOUND
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-200">
                      {log.performedBy}
                    </td>
                    <td className="px-6 py-4">
                      {log.tenantName === "System" ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {log.tenantName}
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {log.tenantName}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-primary font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
