"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Flame, 
  Smartphone, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Eye, 
  Copy, 
  Check, 
  Search, 
  X, 
  AlertTriangle,
  Package,
  Globe,
  HelpCircle,
  Plus
} from "lucide-react";
import { FirebaseAppSummary, FirebaseAppProvisioningStatus } from "@/types/mobile";

export default function FirebaseAppsPage() {
  const [apps, setApps] = useState<FirebaseAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Slide-over drawer state
  const [selectedApp, setSelectedApp] = useState<FirebaseAppSummary | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Provisioning confirmation modal state
  const [provisionTarget, setProvisionTarget] = useState<FirebaseAppSummary | null>(null);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchFirebaseAppsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch("/api/mobile/firebase");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }
      const data: FirebaseAppSummary[] = await res.json();
      setApps(data);
      setError("");

      if (selectedApp) {
        const updated = data.find((a) => a.tenantId === selectedApp.tenantId);
        if (updated) setSelectedApp(updated);
      }
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : "Failed to load Firebase applications.");
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/mobile/firebase");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${res.status}`);
        }
        const data: FirebaseAppSummary[] = await res.json();
        if (!ignore) {
          setApps(data);
          setError("");
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load Firebase applications.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  // Derived Overview Metrics calculated directly from data
  const metrics = useMemo(() => {
    const totalTenants = apps.length;
    const registered = apps.filter((a) => a.status === "Active").length;
    const notRegistered = apps.filter((a) => a.status === "NotRegistered").length;
    const configsAvailable = apps.filter((a) => a.hasConfiguration).length;

    return {
      totalTenants,
      registered,
      notRegistered,
      configsAvailable,
    };
  }, [apps]);

  // Filtered and Searched table rows
  const filteredApps = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return apps.filter((app) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "Active" && app.status !== "Active") return false;
        if (statusFilter === "NotRegistered" && app.status !== "NotRegistered") return false;
        if (statusFilter === "Pending" && app.status !== "Pending") return false;
        if (statusFilter === "Failed" && app.status !== "Failed") return false;
      }

      // Search filter
      if (!search) return true;

      const matchesTenant = app.tenantId.toLowerCase().includes(search);
      const matchesName = app.tenantName.toLowerCase().includes(search);
      const matchesPackage = app.packageName.toLowerCase().includes(search);
      const matchesProject = app.firebaseProjectId.toLowerCase().includes(search);
      const matchesAppId = app.firebaseAppId ? app.firebaseAppId.toLowerCase().includes(search) : false;

      return matchesTenant || matchesName || matchesPackage || matchesProject || matchesAppId;
    });
  }, [apps, statusFilter, searchTerm]);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Drawer
  const handleOpenDetails = (app: FirebaseAppSummary) => {
    setSelectedApp(app);
    setCopiedField(null);
    setIsDrawerOpen(true);
  };

  // Open Provision Modal
  const handleOpenProvisionModal = (app: FirebaseAppSummary) => {
    setProvisionTarget(app);
    setProvisionError("");
    setIsProvisionModalOpen(true);
  };

  // Execute Provisioning
  const handleExecuteProvision = async () => {
    if (!provisionTarget || isProvisioning) return;

    setIsProvisioning(true);
    setProvisionError("");

    try {
      const res = await fetch(`/api/mobile/firebase/${encodeURIComponent(provisionTarget.tenantId)}`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Provisioning failed with status ${res.status}`);
      }

      // Success feedback
      setToast({
        type: "success",
        message: `✓ Successfully provisioned Firebase application for ${provisionTarget.tenantName} (${provisionTarget.tenantId.toUpperCase()}).`,
      });

      setIsProvisionModalOpen(false);
      setProvisionTarget(null);

      // Refresh data
      await fetchFirebaseAppsData(false);
    } catch (err: unknown) {
      setProvisionError(err instanceof Error ? err.message : "An unexpected error occurred during provisioning.");
    } finally {
      setIsProvisioning(false);
    }
  };

  // Date formatter
  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  };

  // Render Status Badge
  const renderStatusBadge = (status: FirebaseAppProvisioningStatus | string) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ACTIVE</span>
          </span>
        );
      case "NotRegistered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>NOT REGISTERED</span>
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>PENDING</span>
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 font-mono text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success" 
              ? "bg-slate-900 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10" 
              : "bg-slate-900 border-rose-500/40 text-rose-400 shadow-rose-500/10"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="text-slate-100 font-medium">{toast.message}</span>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Link
            href="/mobile/builds"
            className="px-4 py-2 rounded-lg text-sm font-medium font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-[background-color,color] flex items-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Builds</span>
          </Link>
          <Link
            href="/mobile/releases"
            className="px-4 py-2 rounded-lg text-sm font-medium font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-[background-color,color] flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Releases</span>
          </Link>
          <Link
            href="/mobile/firebase"
            className="px-4 py-2 rounded-lg text-sm font-medium font-mono bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Firebase Apps</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Flame className="text-orange-400 w-8 h-8" />
              <span>Firebase Applications Management</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-sans">
              Administrative Android package identities, Google Firebase registrations, and client configuration status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => fetchFirebaseAppsData(false)}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.96] text-white rounded-md transition-[transform,background-color] cursor-pointer flex items-center gap-2 text-sm font-mono border border-slate-700 select-none"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-border/50 bg-card/40">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Tenants</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{metrics.totalTenants}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-card/40">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Firebase Apps Registered</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{metrics.registered}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-card/40">
          <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">Tenants Not Registered</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">{metrics.notRegistered}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-card/40">
          <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">Configurations Available</div>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1 tabular-nums">{metrics.configsAvailable}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-border/50 bg-card/30">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by tenant name, slug, or package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "Active", "NotRegistered", "Pending", "Failed"].map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-muted-foreground hover:text-white border border-zinc-800"
                }`}
              >
                {status === "ALL" ? "All Statuses" : status === "NotRegistered" ? "Not Registered" : status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-mono text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchFirebaseAppsData(false)}
            className="px-3 py-1 bg-destructive/20 hover:bg-destructive/30 rounded text-xs cursor-pointer font-bold"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 font-semibold">Tenant / Enterprise</th>
                <th className="py-3.5 px-4 font-semibold">Android Package</th>
                <th className="py-3.5 px-4 font-semibold">Firebase Project</th>
                <th className="py-3.5 px-4 font-semibold">Firebase App ID</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Configuration</th>
                <th className="py-3.5 px-4 font-semibold">Last Update</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {loading && apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading Firebase applications registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Flame className="w-8 h-8 text-zinc-600" />
                      <span className="text-zinc-300 font-medium">No Firebase applications match the selected criteria.</span>
                      <span className="text-xs text-muted-foreground">Try clearing filters or search terms.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isRegistered = app.status === "Active";

                  return (
                    <tr 
                      key={app.tenantId}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Tenant Name and Slug */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white font-sans text-sm">
                          {app.tenantName}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300 uppercase">
                            {app.tenantId}
                          </span>
                        </div>
                      </td>

                      {/* Package Name */}
                      <td className="py-3 px-4 text-zinc-300">
                        <span className="text-zinc-200 select-all font-mono">
                          {app.packageName}
                        </span>
                      </td>

                      {/* Firebase Project */}
                      <td className="py-3 px-4 text-zinc-400">
                        <span className="truncate max-w-[160px] inline-block font-mono" title={app.firebaseProjectId}>
                          {app.firebaseProjectId}
                        </span>
                      </td>

                      {/* Firebase App ID */}
                      <td className="py-3 px-4">
                        {app.firebaseAppId ? (
                          <span 
                            className="text-emerald-400/90 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 select-all"
                            title={app.firebaseAppId}
                          >
                            {app.firebaseAppId}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {renderStatusBadge(app.status)}
                      </td>

                      {/* Configuration Availability */}
                      <td className="py-3 px-4">
                        {app.hasConfiguration ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Available</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Last Update */}
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        {formatDate(app.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Provision Action Button for unregistered or failed tenants */}
                          {!isRegistered ? (
                            <button
                              type="button"
                              onClick={() => handleOpenProvisionModal(app)}
                              className="px-2.5 py-1.5 bg-orange-600/90 hover:bg-orange-500 text-white rounded font-mono text-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[transform,background-color] shadow-sm select-none"
                              title="Provision and register in Firebase"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Provision</span>
                            </button>
                          ) : (
                            <span 
                              className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/20 rounded text-[11px] font-mono text-emerald-400 select-none flex items-center gap-1"
                              title="Application registered and active"
                            >
                              <Check className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          )}

                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(app)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors cursor-pointer select-none"
                            title="View Registration Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Details Drawer */}
      {isDrawerOpen && selectedApp && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-bold font-mono text-white">Firebase App Details</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Non-sensitive application registration metadata
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer select-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Hero Card */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted-foreground">Provisioning Status</span>
                    {renderStatusBadge(selectedApp.status)}
                  </div>
                  <div className="text-xl font-bold text-white font-sans">
                    {selectedApp.tenantName}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Tenant Slug: <span className="text-primary uppercase font-bold">{selectedApp.tenantId}</span>
                  </div>
                </div>

                {/* Identity & Android Package Section */}
                <div className="space-y-3 font-mono text-xs">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <span>Android Application Identity</span>
                  </h3>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Canonical Package Name:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedApp.packageName, "package")}
                          className="text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === "package" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-white font-medium select-all break-all">
                        {selectedApp.packageName}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-zinc-800/60">
                      <span className="text-muted-foreground">Display Name:</span>
                      <span className="text-white font-medium">{selectedApp.displayName}</span>
                    </div>
                  </div>
                </div>

                {/* Firebase Infrastructure Section */}
                <div className="space-y-3 font-mono text-xs">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-orange-400" />
                    <span>Firebase Project Infrastructure</span>
                  </h3>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Firebase Project ID:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedApp.firebaseProjectId, "project")}
                          className="text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === "project" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-white font-medium select-all break-all">
                        {selectedApp.firebaseProjectId}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Firebase App ID:</span>
                        {selectedApp.firebaseAppId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedApp.firebaseAppId!, "appId")}
                            className="text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === "appId" ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-white font-medium select-all break-all">
                        {selectedApp.firebaseAppId || "Not Registered"}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-zinc-800/60">
                      <span className="text-muted-foreground">Configuration Artifact:</span>
                      {selectedApp.hasConfiguration ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Present in Master DB</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-500 italic">
                          <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Not Present</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Lifecycle Timestamps */}
                <div className="space-y-3 font-mono text-xs">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Audit Lifecycle</span>
                  </h3>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Created / Registered:</span>
                      <span className="text-zinc-300">{formatDate(selectedApp.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="text-zinc-300">{formatDate(selectedApp.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Unregistered Callout & Action */}
                {selectedApp.status === "NotRegistered" && (
                  <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
                    <div className="flex items-center gap-2 text-orange-400 font-bold font-mono text-xs">
                      <Flame className="w-4 h-4" />
                      <span>Ready for Provisioning</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      This tenant does not have a Firebase application registration yet. Click below to initiate automated provisioning.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenProvisionModal(selectedApp);
                      }}
                      className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 active:scale-[0.96] text-white font-medium rounded-lg transition-[transform,background-color] cursor-pointer flex items-center justify-center gap-2 text-xs font-mono shadow-[0_0_15px_rgba(249,115,22,0.3)] select-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Provision Firebase Application</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.96] transition-[transform,background-color] cursor-pointer select-none"
                >
                  CLOSE DETAILS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provisioning Confirmation Dialog */}
      {isProvisionModalOpen && provisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Confirm Firebase Provisioning</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Register Android application in Firebase project
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isProvisioning}
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer select-none disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Summary Box */}
            <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant / Enterprise:</span>
                <span className="text-white font-bold">{provisionTarget.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant Slug:</span>
                <span className="text-primary font-bold uppercase">{provisionTarget.tenantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Derived Package Name:</span>
                <span className="text-orange-400 font-semibold">{provisionTarget.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Firebase Project:</span>
                <span className="text-zinc-300">{provisionTarget.firebaseProjectId}</span>
              </div>
            </div>

            {/* Warning / Informational note */}
            <div className="text-xs text-zinc-400 font-sans leading-relaxed bg-zinc-950/40 p-3 rounded border border-zinc-800/60">
              This action contacts Google Firebase Management API to register the canonical Android package and generate client configuration files stored in the Master Registry.
            </div>

            {/* Error Message if provision failed */}
            {provisionError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Provisioning Failed</span>
                </div>
                <div>{provisionError}</div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isProvisioning}
                onClick={() => setIsProvisionModalOpen(false)}
                className="px-4 py-2 text-xs font-mono bg-zinc-800 text-muted-foreground rounded-lg hover:bg-zinc-700 active:scale-[0.96] transition-[transform,background-color] cursor-pointer disabled:opacity-50 select-none"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isProvisioning}
                onClick={handleExecuteProvision}
                className="px-4 py-2 text-xs font-mono bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg active:scale-[0.96] transition-[transform,background-color] flex items-center gap-2 cursor-pointer disabled:opacity-50 select-none shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>PROVISIONING...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    <span>CONFIRM & PROVISION</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
