"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Smartphone, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  Copy, 
  Check, 
  ShieldCheck, 
  Search, 
  X, 
  AlertTriangle,
  HardDrive,
  Calendar,
  User,
  History,
  Tag
} from "lucide-react";
import { MobileRelease, MobileTenantSummary } from "@/types/mobile";

export default function MobileReleasesPage() {
  const [releases, setReleases] = useState<MobileRelease[]>([]);
  const [currentReleases, setCurrentReleases] = useState<MobileRelease[]>([]);
  const [tenants, setTenants] = useState<MobileTenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");

  // Slide-over drawer state
  const [selectedRelease, setSelectedRelease] = useState<MobileRelease | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  // Download UX state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchReleasesData = useCallback(async () => {
    setLoading(true);
    try {
      const [releasesRes, currentRes, tenantsRes] = await Promise.all([
        fetch("/api/mobile/releases"),
        fetch("/api/mobile/releases/current"),
        fetch("/api/mobile/tenants"),
      ]);

      if (!releasesRes.ok) {
        throw new Error(`Failed to load releases (${releasesRes.status})`);
      }

      const releasesData: MobileRelease[] = await releasesRes.json();
      setReleases(releasesData);

      if (currentRes.ok) {
        const currentData: MobileRelease[] = await currentRes.json();
        setCurrentReleases(currentData);
      }

      if (tenantsRes.ok) {
        const tenantsData: MobileTenantSummary[] = await tenantsRes.json();
        setTenants(tenantsData);
      }

      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load mobile releases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleasesData();
  }, [fetchReleasesData]);

  // Format bytes into human-readable size
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes || bytes <= 0) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Format UTC dates
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

  // Copy SHA-256 to clipboard
  const handleCopySha256 = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  // Open Drawer
  const handleOpenDetails = (release: MobileRelease) => {
    setSelectedRelease(release);
    setCopiedSha(false);
    setIsDrawerOpen(true);
  };

  // Secure download trigger using authenticated backend tokens
  const handleDownload = async (release: MobileRelease) => {
    setDownloadingId(release.id);
    try {
      // Use the underlying mobileBuildId to request the short-lived download token
      const res = await fetch(`/api/mobile/builds/${release.mobileBuildId}/download`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.downloadUrl) {
        throw new Error("No download URL returned by authorization service.");
      }

      // Trigger browser download via invisible anchor
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName || `${release.tenantId}-v${release.version}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        type: "success",
        message: `✓ Download initiated for ${release.tenantId.toUpperCase()} v${release.version} (#${release.buildNumber})`,
      });
    } catch (err: unknown) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to initiate download.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Filtered releases history
  const filteredReleases = useMemo(() => {
    return releases.filter((r) => {
      const matchesTenant = tenantFilter === "ALL" || r.tenantId.toLowerCase() === tenantFilter.toLowerCase();
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        r.tenantId.toLowerCase().includes(search) ||
        r.version.toLowerCase().includes(search) ||
        (r.releaseNotes && r.releaseNotes.toLowerCase().includes(search)) ||
        (r.publishedBy && r.publishedBy.toLowerCase().includes(search)) ||
        (r.sha256 && r.sha256.toLowerCase().includes(search));

      return matchesTenant && matchesSearch;
    });
  }, [releases, tenantFilter, searchTerm]);

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
            className="px-4 py-2 rounded-lg text-sm font-medium font-mono bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Releases</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Sparkles className="text-primary w-8 h-8" />
              <span>Mobile Releases</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-sans">
              Explicitly published production APK releases approved for distribution to enterprise tenants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={fetchReleasesData}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.96] text-white rounded-md transition-[transform,background-color] cursor-pointer flex items-center gap-2 text-sm font-mono border border-slate-700 select-none"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchReleasesData}
            className="text-xs underline hover:text-white cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Current Releases Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-mono">
            <Tag className="w-5 h-5 text-emerald-400" />
            <span>Active Current Releases by Tenant</span>
          </h2>
          <span className="text-xs font-mono text-muted-foreground">
            {currentReleases.length} {currentReleases.length === 1 ? "tenant released" : "tenants released"}
          </span>
        </div>

        {currentReleases.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-sm border border-dashed border-zinc-800 rounded-xl bg-card/20 space-y-2">
            <div className="text-zinc-300 font-semibold">No Published Releases Yet</div>
            <div className="text-xs text-muted-foreground max-w-md mx-auto">
              Select a successful build in the <Link href="/mobile/builds" className="text-primary underline">Mobile Builds</Link> page and click <strong>Publish Release</strong> to authorize customer distribution.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentReleases.map((rel) => (
              <div 
                key={rel.id}
                className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-card/40 space-y-4 hover:border-emerald-500/50 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Tenant Enterprise</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{rel.tenantId.toUpperCase()}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CURRENT RELEASE</span>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="text-white font-semibold tabular-nums">v{rel.version} (#{rel.buildNumber})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Published:</span>
                    <span className="text-zinc-300">{formatDate(rel.publishedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Published By:</span>
                    <span className="text-zinc-300 truncate max-w-[160px]">{rel.publishedBy || "Admin"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">APK Size:</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">{formatFileSize(rel.artifactSize)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownload(rel)}
                    disabled={downloadingId === rel.id}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.96] text-white rounded-lg transition-[transform,background-color] cursor-pointer flex items-center justify-center gap-2 text-xs font-mono font-medium disabled:opacity-50 select-none shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  >
                    {downloadingId === rel.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download APK</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDetails(rel)}
                    className="p-2 bg-secondary hover:bg-secondary/80 active:scale-[0.96] text-secondary-foreground rounded-lg transition-[transform,background-color] cursor-pointer select-none"
                    title="View Release Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Release History Header & Filters */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-mono">
            <History className="w-5 h-5 text-primary" />
            <span>Release Distribution History</span>
          </h2>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            Showing {filteredReleases.length} of {releases.length} releases
          </span>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tenant, version, notes, publisher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Tenant Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground uppercase">Tenant:</label>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="ALL">ALL TENANTS</option>
              {tenants.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name.toUpperCase()} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Releases Table */}
        <div className="glass-panel border border-border rounded-xl overflow-hidden bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="p-3 pl-4">Tenant</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Build #</th>
                  <th className="p-3">Release State</th>
                  <th className="p-3">APK Artifact</th>
                  <th className="p-3">Published Date</th>
                  <th className="p-3">Published By</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading && releases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading release records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No release records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredReleases.map((rel) => (
                    <tr 
                      key={rel.id} 
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(rel)}
                    >
                      <td className="p-3 pl-4 font-bold text-white">
                        {rel.tenantId.toUpperCase()}
                      </td>
                      <td className="p-3 text-white tabular-nums">
                        v{rel.version}
                      </td>
                      <td className="p-3 text-muted-foreground tabular-nums">
                        #{rel.buildNumber}
                      </td>
                      <td className="p-3">
                        {rel.isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            CURRENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                            PREVIOUS
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-300">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{formatFileSize(rel.artifactSize)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(rel.publishedAt)}
                      </td>
                      <td className="p-3 text-muted-foreground truncate max-w-[120px]">
                        {rel.publishedBy || "Admin"}
                      </td>
                      <td className="p-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(rel)}
                            disabled={downloadingId === rel.id}
                            className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors cursor-pointer disabled:opacity-50 select-none"
                            title="Download APK"
                          >
                            {downloadingId === rel.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(rel)}
                            className="p-1.5 hover:bg-zinc-800 text-muted-foreground hover:text-white rounded transition-colors cursor-pointer select-none"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Release Details Drawer */}
      {isDrawerOpen && selectedRelease && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>{selectedRelease.tenantId.toUpperCase()}</span>
                      <span className="text-muted-foreground">v{selectedRelease.version}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      Release #{selectedRelease.id} · Build #{selectedRelease.buildNumber}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer select-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Release State Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedRelease.isCurrent
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}>
                  <div className="flex items-center gap-2.5">
                    {selectedRelease.isCurrent ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <History className="w-5 h-5 text-zinc-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold font-mono text-white">
                        {selectedRelease.isCurrent ? "CURRENT ACTIVE RELEASE" : "PREVIOUS RELEASE"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-sans">
                        {selectedRelease.isCurrent 
                          ? "This version is currently approved and distributed to this tenant."
                          : "This release was superseded by a newer release."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Release Metadata */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    Release Metadata
                  </h3>
                  <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/60 font-mono text-xs">
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Tenant</span>
                      <span className="text-white font-bold">{selectedRelease.tenantId.toUpperCase()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="text-white">v{selectedRelease.version}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Build Number</span>
                      <span className="text-white">#{selectedRelease.buildNumber}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <span className="text-white capitalize">{selectedRelease.environment || "Production"}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        Published At
                      </span>
                      <span className="text-zinc-300">{formatDate(selectedRelease.publishedAt)}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        Published By
                      </span>
                      <span className="text-zinc-300 truncate max-w-[200px]">{selectedRelease.publishedBy || "Admin"}</span>
                    </div>
                  </div>
                </div>

                {/* Release Notes */}
                {selectedRelease.releaseNotes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Release Notes
                    </h3>
                    <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
                      {selectedRelease.releaseNotes}
                    </div>
                  </div>
                )}

                {/* Artifact Details Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-primary" />
                    Binary Artifact Details
                  </h3>

                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="font-semibold text-xs text-emerald-400 font-mono">Signed Production APK</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        Verified
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filename:</span>
                        <span className="text-white font-medium">{selectedRelease.artifactFileName || `${selectedRelease.tenantId.toUpperCase()}-${selectedRelease.version}-${selectedRelease.buildNumber}.apk`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="text-white font-bold">{formatFileSize(selectedRelease.artifactSize)}</span>
                      </div>
                      {selectedRelease.artifactSize && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bytes:</span>
                          <span className="text-zinc-400 tabular-nums">{selectedRelease.artifactSize.toLocaleString()} bytes</span>
                        </div>
                      )}

                      {/* SHA-256 Box */}
                      {selectedRelease.sha256 && (
                        <div className="pt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>SHA-256 Checksum:</span>
                            <button
                              type="button"
                              onClick={() => handleCopySha256(selectedRelease.sha256!)}
                              className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedSha ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy SHA-256</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-xs text-emerald-300 break-all select-all">
                            {selectedRelease.sha256}
                          </div>
                        </div>
                      )}

                      {/* Download Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(selectedRelease)}
                          disabled={downloadingId === selectedRelease.id}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.96] text-white font-medium rounded-lg transition-[transform,background-color] cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 select-none text-sm font-mono"
                        >
                          {downloadingId === selectedRelease.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Preparing Secure Download...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>Download APK Binary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
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
    </div>
  );
}
