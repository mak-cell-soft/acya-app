"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Clock, RefreshCw } from "lucide-react";

interface ServiceHealth {
  name: string;
  url: string;
  status: "UP" | "DEGRADED" | "DOWN" | string;
  statusCode: number | null;
  latencyMs: number;
  checkedAt: string;
  errorMessage: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({ totalTenants: 0, activeTenants: 0, monthlyRecurringRevenue: 0 });
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [lastHealthChecked, setLastHealthChecked] = useState<string | null>(null);

  const fetchServiceHealth = async () => {
    setHealthLoading(true);
    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/health/services`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setLastHealthChecked(data.checkedAt || new Date().toISOString());
      }
    } catch (err) {
      console.error("Failed to fetch service health", err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceHealth();
    const interval = setInterval(() => {
      fetchServiceHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem("token");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
        const res = await fetch(`${apiBase}admin/dashboard/metrics`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setMetrics({
            totalTenants: data.totalTenants ?? data.TotalTenants ?? 0,
            activeTenants: data.activeTenants ?? data.ActiveTenants ?? 0,
            monthlyRecurringRevenue: data.monthlyRecurringRevenue ?? data.MonthlyRecurringRevenue ?? 0
          });
        }
      } catch (err) {
        console.error("Failed to load metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [router]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and system health.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          LOADING METRICS...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group bg-card/25 border border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-primary/20 transition-colors"></div>
            <span className="text-sm font-medium text-muted-foreground font-mono">TOTAL TENANTS</span>
            <span className="text-4xl font-semibold font-mono tracking-tighter">{metrics.totalTenants}</span>
            <span className="text-xs text-primary mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Central registry registered
            </span>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group bg-card/25 border border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-colors"></div>
            <span className="text-sm font-medium text-muted-foreground font-mono">ACTIVE DATABASES</span>
            <span className="text-4xl font-semibold font-mono tracking-tighter">{metrics.activeTenants}</span>
            <span className="text-xs text-muted-foreground mt-2">
              {metrics.totalTenants - metrics.activeTenants} pending database provisioning
            </span>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group bg-card/25 border border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/20 transition-colors"></div>
            <span className="text-sm font-medium text-muted-foreground font-mono">SYSTEM REVENUE</span>
            <span className="text-4xl font-semibold font-mono tracking-tighter">${metrics.monthlyRecurringRevenue}</span>
            <span className="text-xs text-muted-foreground mt-2">
              Active subscriptions
            </span>
          </div>
        </div>
      )}

      {/* Platform Services Health Section */}
      <div className="glass-panel p-6 rounded-xl bg-card/25 border border-border/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Platform Services Health</h2>
              <p className="text-xs text-muted-foreground font-mono">Live availability & HTTP latency probes for client apps and backend microservices.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastHealthChecked && (
              <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Updated: {new Date(lastHealthChecked).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={fetchServiceHealth}
              disabled={healthLoading}
              className="p-1.5 bg-secondary hover:bg-secondary/80 active:scale-[0.96] text-foreground rounded-md transition-[transform,background-color] cursor-pointer flex items-center gap-1 text-xs font-mono select-none"
              title="Refresh service status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {healthLoading && services.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground font-mono">
            PROBING PLATFORM SERVICES...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map((svc) => (
              <div 
                key={svc.name}
                className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-2.5 relative overflow-hidden group hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-foreground truncate max-w-[180px]" title={svc.name}>
                    {svc.name}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    svc.status === "UP" 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : svc.status === "DEGRADED"
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      svc.status === "UP" 
                        ? "bg-emerald-400 animate-pulse" 
                        : svc.status === "DEGRADED"
                        ? "bg-yellow-400"
                        : "bg-rose-500"
                    }`} />
                    {svc.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-mono pt-1">
                  <span className="text-muted-foreground text-[11px] truncate max-w-[160px]" title={svc.url}>
                    {svc.url}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {svc.latencyMs}ms
                  </span>
                </div>

                {svc.errorMessage && (
                  <div className="text-[10px] text-rose-400 font-mono bg-rose-500/10 p-1.5 rounded border border-rose-500/20 truncate" title={svc.errorMessage}>
                    {svc.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 glass-panel rounded-xl p-6 bg-card/25 border border-border/50">
        <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-border transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Tenant Registry active and running</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">Connected to wood-app-db central registry database.</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
