"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [apiEndpoint, setApiEndpoint] = useState("");

  useEffect(() => {
    setApiEndpoint(process.env.NEXT_PUBLIC_API_URL || window.location.origin + "/api/");
    
    const checkDb = async () => {
      try {
        const token = localStorage.getItem("token");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
        const res = await fetch(`${apiBase}admin/dashboard/metrics`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setDbStatus("Connected (Master Registry OK)");
        } else {
          setDbStatus("Error connecting to Master API");
        }
      } catch {
        setDbStatus("Offline");
      }
    };
    checkDb();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global platform constants and parameters.</p>
      </div>

      <div className="glass-panel p-8 rounded-xl bg-card/25 border border-border/50 space-y-6">
        <h2 className="text-lg font-semibold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          SYSTEM PARAMETERS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">COMMAND CENTER VERSION</div>
            <div className="text-foreground font-semibold">v1.0.0-PROD</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">GATEWAY ROUTING DOMAIN</div>
            <div className="text-primary font-semibold">admin.acya.site</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">API BASE URL</div>
            <div className="text-foreground">{apiEndpoint}</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">DATABASE STATUS</div>
            <div className="text-foreground flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus.includes("Connected") ? "bg-primary animate-pulse" : "bg-destructive"}`}></span>
              {dbStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
