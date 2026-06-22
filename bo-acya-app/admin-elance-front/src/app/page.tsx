"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({ totalTenants: 0, activeTenants: 0, monthlyRecurringRevenue: 0 });
  const [loading, setLoading] = useState(true);

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
