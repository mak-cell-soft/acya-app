"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { 
  Smartphone, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Eye, 
  Copy, 
  Check, 
  ShieldCheck, 
  Search, 
  Plus, 
  X, 
  GitBranch, 
  GitCommit, 
  FileCode2, 
  AlertTriangle,
  HardDrive,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { MobileBuild, MobileBuildStatus, MobileTenantSummary } from "@/types/mobile";

export default function MobileBuildsPage() {
  const [builds, setBuilds] = useState<MobileBuild[]>([]);
  const [currentReleasesCount, setCurrentReleasesCount] = useState<number>(0);
  const [currentReleaseMap, setCurrentReleaseMap] = useState<Record<string, number>>({}); // tenantId -> mobileBuildId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");

  // Slide-over drawer state
  const [selectedBuild, setSelectedBuild] = useState<MobileBuild | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  // Publish Release Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<MobileBuild | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  // Download UX state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create build modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [tenants, setTenants] = useState<MobileTenantSummary[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Form fields
  const [formTenantId, setFormTenantId] = useState("");
  const [formVersion, setFormVersion] = useState("1.0.1");
  const [formEnvironment, setFormEnvironment] = useState("production");
  const [formGitBranch, setFormGitBranch] = useState("main");
  const [formReleaseNotes, setFormReleaseNotes] = useState("");

  // Track previous statuses to show live transition notifications
  const prevStatusesRef = useRef<Map<number, MobileBuildStatus>>(new Map());

  const fetchBuilds = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);

    try {
      const [buildsRes, currentReleasesRes] = await Promise.all([
        fetch("/api/mobile/builds"),
        fetch("/api/mobile/releases/current"),
      ]);

      if (!buildsRes.ok) {
        const errorData = await buildsRes.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${buildsRes.status}`);
      }

      const data: MobileBuild[] = await buildsRes.json();
      setBuilds(data);

      if (currentReleasesRes.ok) {
        const currentData: any[] = await currentReleasesRes.json();
        setCurrentReleasesCount(currentData.length);
        const map: Record<string, number> = {};
        currentData.forEach((rel) => {
          map[rel.tenantId.toLowerCase()] = rel.mobileBuildId;
        });
        setCurrentReleaseMap(map);
      }

      setError("");
    } catch (err: unknown) {
      if (!isPolling) {
        setError(err instanceof Error ? err.message : "Failed to load mobile builds.");
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  // Open Publish Modal
  const handleOpenPublishModal = (build: MobileBuild) => {
    setPublishTarget(build);
    setPublishError("");
    setIsPublishModalOpen(true);
  };

  // Execute Publish
  const handleExecutePublish = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    setPublishError("");

    try {
      const res = await fetch(`/api/mobile/builds/${publishTarget.id}/publish`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to publish release (${res.status})`);
      }

      setIsPublishModalOpen(false);
      setToast({
        type: "success",
        message: `✓ Successfully published ${publishTarget.tenantId.toUpperCase()} v${publishTarget.version} (#${publishTarget.buildNumber}) as Current Release.`,
      });

      // Refresh builds and releases
      await fetchBuilds(false);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish release.");
    } finally {
      setPublishing(false);
    }
  };

  // Fetch tenants for Create Modal
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const res = await fetch("/api/mobile/tenants");
      if (res.ok) {
        const data: MobileTenantSummary[] = await res.json();
        setTenants(data);
        // Pre-select socofeb or first active tenant if none selected
        if (!formTenantId && data.length > 0) {
          const defaultTenant = data.find((t) => t.slug === "socofeb") || data[0];
          setFormTenantId(defaultTenant.slug);
        }
      }
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setLoadingTenants(false);
    }
  }, [formTenantId]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBuilds(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBuilds]);

  // Status transition detection and Drawer sync
  useEffect(() => {
    if (builds.length === 0) return;

    builds.forEach((b) => {
      const prev = prevStatusesRef.current.get(b.id);
      if (prev && (prev === "Pending" || prev === "Building")) {
        if (b.status === "Succeeded") {
          setToast({
            type: "success",
            message: `✓ Build #${b.buildNumber} (${b.tenantId.toUpperCase()}) completed successfully.`,
          });
        } else if (b.status === "Failed" || b.status === "Cancelled") {
          setToast({
            type: "error",
            message: `✕ Build #${b.buildNumber} (${b.tenantId.toUpperCase()}) failed: ${b.errorMessage || "CI build error"}`,
          });
        }
      }
      prevStatusesRef.current.set(b.id, b.status);
    });

    // Also update selectedBuild if open
    if (selectedBuild) {
      const updated = builds.find((b) => b.id === selectedBuild.id);
      if (updated && (updated.status !== selectedBuild.status || updated.artifactSize !== selectedBuild.artifactSize)) {
        setSelectedBuild(updated);
      }
    }
  }, [builds, selectedBuild]);

  // Conservative live status polling for in-progress builds (Pending / Building)
  useEffect(() => {
    const hasActiveBuilds = builds.some(
      (b) => b.status === "Pending" || b.status === "Building"
    );

    if (!hasActiveBuilds) return;

    const timer = setInterval(() => {
      fetchBuilds(true);
    }, 10_000);

    return () => clearInterval(timer);
  }, [builds, fetchBuilds]);

  // Dismiss toast automatically after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Extract unique tenant slugs for filter dropdown
  const uniqueTenants = useMemo(() => {
    const set = new Set<string>();
    builds.forEach((b) => {
      if (b.tenantId) set.add(b.tenantId.toLowerCase());
    });
    return Array.from(set).sort();
  }, [builds]);

  // Filtered builds
  const filteredBuilds = useMemo(() => {
    return builds.filter((b) => {
      // Status filter
      if (statusFilter !== "ALL" && b.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Tenant filter
      if (tenantFilter !== "ALL" && b.tenantId.toLowerCase() !== tenantFilter.toLowerCase()) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTenant = b.tenantId?.toLowerCase().includes(q);
        const matchVersion = b.version?.toLowerCase().includes(q);
        const matchBuildNum = `#${b.buildNumber}`.includes(q);
        const matchNotes = b.releaseNotes?.toLowerCase().includes(q);
        const matchCommit = b.gitCommitHash?.toLowerCase().includes(q);
        if (!matchTenant && !matchVersion && !matchBuildNum && !matchNotes && !matchCommit) {
          return false;
        }
      }
      return true;
    });
  }, [builds, statusFilter, tenantFilter, searchTerm]);

  // Format file size
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes || bytes <= 0) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: MobileBuildStatus) => {
    switch (status) {
      case "Succeeded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Succeeded
          </span>
        );
      case "Building":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            Building
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Pending
          </span>
        );
      case "Failed":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Failed
          </span>
        );
    }
  };

  // Secure APK Download Handler
  const handleDownload = async (build: MobileBuild) => {
    if (build.status !== "Succeeded") return;

    setDownloadingId(build.id);
    setToast(null);

    try {
      const res = await fetch(`/api/mobile/builds/${build.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("Unable to download the APK. Please try again.");
      }

      const data = await res.json();
      if (!data.downloadUrl) {
        throw new Error("Unable to download the APK. Please try again.");
      }

      // Trigger browser download via invisible link
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.setAttribute("download", data.fileName || `${build.tenantId.toUpperCase()}-${build.version}-${build.buildNumber}.apk`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({ type: "success", message: "Download started." });
    } catch (err: unknown) {
      console.error("Download failed:", err);
      setToast({ type: "error", message: "Unable to download the APK. Please try again." });
    } finally {
      setDownloadingId(null);
    }
  };

  // Copy SHA-256 to clipboard
  const handleCopySha256 = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  // Open Drawer
  const handleOpenDetails = (build: MobileBuild) => {
    setSelectedBuild(build);
    setCopiedSha(false);
    setIsDrawerOpen(true);
  };

  // Open Create Build Modal
  const openCreateModal = () => {
    setCreateError("");
    setIsCreateModalOpen(true);
    fetchTenants();
  };

  // Handle Create Build Submission
  const handleCreateBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    // Form validation
    if (!formTenantId.trim()) {
      setCreateError("Please select a tenant enterprise.");
      return;
    }

    const semVerRegex = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
    if (!semVerRegex.test(formVersion.trim())) {
      setCreateError("Invalid semantic version format. Examples: 1.0.0, 1.0.1, 2.0.0");
      return;
    }

    if (!formGitBranch.trim()) {
      setCreateError("Git branch cannot be empty.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/mobile/builds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: formTenantId.trim().toLowerCase(),
          version: formVersion.trim().replace(/^v/, ""),
          environment: formEnvironment,
          gitBranch: formGitBranch.trim(),
          releaseNotes: formReleaseNotes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Build creation failed (${res.status})`);
      }

      const newBuild: MobileBuild = data;

      // Close modal on success
      setIsCreateModalOpen(false);
      setFormReleaseNotes("");
      setToast({
        type: "success",
        message: `✓ Build #${newBuild.buildNumber} created (${newBuild.tenantId.toUpperCase()}). CI workflow dispatched.`,
      });

      // Refresh list
      await fetchBuilds(false);

      // Auto-open slide-over details drawer for the newly created build
      setSelectedBuild(newBuild);
      setCopiedSha(false);
      setIsDrawerOpen(true);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create mobile build.");
    } finally {
      setCreating(false);
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
            className="px-4 py-2 rounded-lg text-sm font-medium font-mono bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 cursor-pointer"
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
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Smartphone className="text-primary w-8 h-8" />
              <span>Mobile App Builds</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-sans">
              Centralized CI/CD build artifacts, release binaries, and tamper-proof APK downloads.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 bg-primary hover:bg-primary/90 active:scale-[0.96] text-primary-foreground font-medium rounded-md transition-[transform,background-color] cursor-pointer flex items-center gap-2 text-sm select-none shadow-[0_0_15px_rgba(59,130,246,0.25)] font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Create Build</span>
            </button>

            <button 
              type="button"
              onClick={() => fetchBuilds(false)}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.96] text-white rounded-md transition-[transform,background-color] cursor-pointer flex items-center gap-2 text-sm font-mono border border-slate-700 select-none"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-border/50 bg-card/40">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Builds</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{builds.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-card/40">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Succeeded</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {builds.filter((b) => b.status === "Succeeded").length}
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-card/40">
          <div className="text-xs font-mono text-rose-400 uppercase tracking-wider">Failed / Incomplete</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {builds.filter((b) => b.status === "Failed" || b.status === "Cancelled").length}
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border/50 bg-card/40">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Latest Production Build</div>
          <div className="text-sm font-semibold font-mono text-primary mt-2 truncate">
            {builds.find((b) => b.status === "Succeeded") 
              ? `${builds.find((b) => b.status === "Succeeded")?.tenantId.toUpperCase()} v${builds.find((b) => b.status === "Succeeded")?.version} (#${builds.find((b) => b.status === "Succeeded")?.buildNumber})`
              : "None"}
          </div>
        </div>
        <Link 
          href="/mobile/releases"
          className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-card/40 hover:border-emerald-500/60 transition-colors block cursor-pointer col-span-2 md:col-span-1"
        >
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Current Releases</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums flex items-center justify-between">
            <span>{currentReleasesCount}</span>
            <span className="text-[10px] font-sans font-normal text-muted-foreground underline">Manage →</span>
          </div>
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchBuilds(false)}
            className="text-xs underline hover:text-white cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tenant, version, notes, commit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tenant Dropdown & Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tenant Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground uppercase">Tenant:</label>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="ALL">All Tenants</option>
              {uniqueTenants.map((slug) => (
                <option key={slug} value={slug}>{slug.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground uppercase">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="Succeeded">Succeeded</option>
              <option value="Building">Building</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Builds Table */}
      <div className="glass-panel border border-border rounded-xl overflow-hidden bg-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Version & Build</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && builds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading mobile builds...
                  </td>
                </tr>
              ) : filteredBuilds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono text-sm">
                    No mobile builds found.
                  </td>
                </tr>
              ) : (
                filteredBuilds.map((build) => {
                  const isSucceeded = build.status === "Succeeded";
                  const isDownloading = downloadingId === build.id;

                  return (
                    <tr 
                      key={build.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(build)}
                    >
                      {/* Tenant */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                          {build.tenantId.toUpperCase()}
                        </span>
                      </td>

                      {/* Version & Build Number */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">v{build.version}</span>
                          <span className="text-muted-foreground text-xs font-normal">#{build.buildNumber}</span>
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground capitalize">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {build.environment || "Production"}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {renderStatusBadge(build.status)}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {formatDate(build.createdAt)}
                      </td>

                      {/* Artifact Size */}
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground tabular-nums">
                        {formatFileSize(build.artifactSize)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(build)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                            title="View Build Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Download APK Button */}
                          {isSucceeded ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(build)}
                              disabled={isDownloading}
                              className="px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded text-xs font-mono flex items-center gap-1.5 transition-[transform,background-color] active:scale-[0.96] cursor-pointer disabled:opacity-50 select-none shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              title="Download Signed APK"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>Download</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1.5 bg-zinc-800 text-zinc-500 rounded text-xs font-mono flex items-center gap-1.5 cursor-not-allowed border border-zinc-700/50 opacity-60"
                              title="Artifact unavailable for incomplete or failed builds"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          )}
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

      {/* CREATE MOBILE BUILD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 text-foreground relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Create Mobile Build</h3>
                  <p className="text-xs text-muted-foreground">Dispatch an automated CI build to produce a signed APK.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !creating && setIsCreateModalOpen(false)}
                disabled={creating}
                className="text-muted-foreground hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Alert */}
            {createError && (
              <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-start gap-2.5 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{createError}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateBuild} className="space-y-4">
              {/* Tenant Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-slate-300 flex items-center justify-between">
                  <span>TENANT <span className="text-destructive">*</span></span>
                  {loadingTenants && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading tenants...
                    </span>
                  )}
                </label>
                <select
                  value={formTenantId}
                  onChange={(e) => setFormTenantId(e.target.value)}
                  disabled={creating || loadingTenants}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 font-mono"
                  required
                >
                  <option value="" disabled>Select tenant enterprise...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name} ({t.slug}){t.isActive ? " — Active" : " — Inactive"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Version & Build Number Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    VERSION <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0.1"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    disabled={creating}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">Semantic version (e.g. 1.0.0, 1.0.1)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    BUILD NUMBER
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800/60 rounded-lg text-sm text-slate-400 font-mono flex items-center justify-between select-none">
                    <span>Automatic</span>
                    <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-semibold">Server assigned</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">Sequential allocation by backend</p>
                </div>
              </div>

              {/* Environment & Git Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    ENVIRONMENT <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formEnvironment}
                    onChange={(e) => setFormEnvironment(e.target.value)}
                    disabled={creating}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 font-mono"
                    required
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-300">
                    GIT BRANCH <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formGitBranch}
                      onChange={(e) => setFormGitBranch(e.target.value)}
                      disabled={creating}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-slate-300 flex items-center justify-between">
                  <span>RELEASE NOTES</span>
                  <span className="text-[11px] text-muted-foreground font-normal">(Optional, max 500 chars)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Describe features, fixes, or deployment details included in this build..."
                  value={formReleaseNotes}
                  onChange={(e) => setFormReleaseNotes(e.target.value)}
                  disabled={creating}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 resize-none font-sans"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 text-xs font-mono font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.96] transition-[transform,background-color] cursor-pointer disabled:opacity-50 select-none"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || loadingTenants}
                  className="px-5 py-2 text-xs font-mono font-medium rounded-md bg-primary hover:bg-primary/90 active:scale-[0.96] text-primary-foreground transition-[transform,background-color] cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.25)] disabled:opacity-50 select-none"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Build...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Build</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Build Details Drawer */}
      {isDrawerOpen && selectedBuild && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2 font-mono">
                      <span>Build #{selectedBuild.buildNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        ID: {selectedBuild.id}
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedBuild.tenantId.toUpperCase()} • v{selectedBuild.version}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-muted-foreground hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans text-sm">
                {/* Status Callout Banner */}
                <div className="p-4 rounded-xl border bg-zinc-950/60 flex items-center justify-between border-zinc-800">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Status</span>
                  <div>{renderStatusBadge(selectedBuild.status)}</div>
                </div>

                {/* Build Information Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-primary" />
                    Build Information
                  </h3>
                  <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/60 font-mono text-xs">
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Tenant Enterprise</span>
                      <span className="text-white font-bold">{selectedBuild.tenantId.toUpperCase()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Target Version</span>
                      <span className="text-white">v{selectedBuild.version}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <span className="text-white capitalize">{selectedBuild.environment || "Production"}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-muted-foreground" />
                        Git Branch
                      </span>
                      <span className="text-primary font-mono">{selectedBuild.gitBranch || "main"}</span>
                    </div>
                    {selectedBuild.gitCommitHash && (
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <GitCommit className="w-3 h-3 text-muted-foreground" />
                          Commit Hash
                        </span>
                        <span className="text-zinc-300 font-mono">{selectedBuild.gitCommitHash.slice(0, 8)}</span>
                      </div>
                    )}
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Created Date</span>
                      <span className="text-zinc-300">{formatDate(selectedBuild.createdAt)}</span>
                    </div>
                    {selectedBuild.completedAt && (
                      <div className="p-3 flex justify-between">
                        <span className="text-muted-foreground">Completed Date</span>
                        <span className="text-zinc-300">{formatDate(selectedBuild.completedAt)}</span>
                      </div>
                    )}
                    <div className="p-3 flex justify-between">
                      <span className="text-muted-foreground">Created By</span>
                      <span className="text-zinc-300 truncate max-w-[200px]">{selectedBuild.createdBy || "Admin"}</span>
                    </div>
                  </div>
                </div>

                {/* Release Notes */}
                {selectedBuild.releaseNotes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Release Notes
                    </h3>
                    <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
                      {selectedBuild.releaseNotes}
                    </div>
                  </div>
                )}

                {/* Error Details (if Failed) */}
                {selectedBuild.errorMessage && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Failure Reason
                    </h3>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono leading-relaxed break-words">
                      {selectedBuild.errorMessage}
                    </div>
                  </div>
                )}

                {/* Artifact Details Section */}
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 pt-2">
                  <HardDrive className="w-3.5 h-3.5 text-primary" />
                  Binary Artifact Details
                </h3>

                {selectedBuild.status === "Succeeded" && selectedBuild.isArtifactAvailable ? (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="font-semibold text-xs text-emerald-400 font-mono">Signed Production APK</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        Ready
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filename:</span>
                        <span className="text-white font-medium">{selectedBuild.artifactFileName || `SOCOFEB-${selectedBuild.version}-${selectedBuild.buildNumber}.apk`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="text-white font-bold">{formatFileSize(selectedBuild.artifactSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bytes:</span>
                        <span className="text-zinc-400 tabular-nums">{selectedBuild.artifactSize?.toLocaleString()} bytes</span>
                      </div>

                      {/* SHA-256 Box */}
                      {selectedBuild.sha256 && (
                        <div className="pt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>SHA-256 Checksum:</span>
                            <button
                              type="button"
                              onClick={() => handleCopySha256(selectedBuild.sha256!)}
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
                            {selectedBuild.sha256}
                          </div>
                        </div>
                      )}

                      {/* Download Button in Drawer */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(selectedBuild)}
                          disabled={downloadingId === selectedBuild.id}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.96] text-white font-medium rounded-lg transition-[transform,background-color] cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 select-none text-sm font-mono"
                        >
                          {downloadingId === selectedBuild.id ? (
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

                      {/* Publish Release Action (ONLY for Succeeded builds with artifact) */}
                      <div className="pt-1">
                        {currentReleaseMap[selectedBuild.tenantId.toLowerCase()] === selectedBuild.id ? (
                          <div className="w-full py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium rounded-lg flex items-center justify-center gap-2 select-none text-xs font-mono">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>CURRENT ACTIVE RELEASE</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPublishModal(selectedBuild)}
                            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 active:scale-[0.96] text-primary-foreground font-medium rounded-lg transition-[transform,background-color] cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.25)] select-none text-xs font-mono"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Publish Release</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedBuild.status === "Building" || selectedBuild.status === "Pending" ? (
                  <div className="p-6 text-center text-amber-300 font-mono text-xs border border-dashed border-amber-500/30 bg-amber-500/5 rounded-xl space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-1" />
                    <div className="font-semibold text-amber-300 text-sm">BUILD IN PROGRESS</div>
                    <div className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                      GitHub Actions CI is compiling and signing the APK artifact. Live updates will refresh automatically.
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground font-mono text-xs border border-dashed border-zinc-800 rounded-xl">
                    NO BINARY ARTIFACT ASSOCIATED WITH THIS BUILD RECORD
                  </div>
                )}
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

      {/* Publish Release Confirmation Modal */}
      {isPublishModalOpen && publishTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => !publishing && setIsPublishModalOpen(false)}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 text-foreground animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-mono text-white">Publish Mobile Release</h2>
                    <p className="text-xs text-muted-foreground font-sans">
                      Promote this build artifact to become the tenant&apos;s current release.
                    </p>
                  </div>
                </div>
                {!publishing && (
                  <button 
                    onClick={() => setIsPublishModalOpen(false)}
                    className="text-muted-foreground hover:text-white p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Release Metadata Preview */}
              <div className="bg-zinc-950/70 rounded-xl border border-zinc-800 divide-y divide-zinc-800/80 font-mono text-xs">
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="text-white font-bold">{publishTarget.tenantId.toUpperCase()}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="text-white font-semibold">v{publishTarget.version}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">Build Number:</span>
                  <span className="text-white">#{publishTarget.buildNumber}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-muted-foreground">APK:</span>
                  <span className="text-emerald-400 truncate max-w-[250px]">
                    {publishTarget.artifactFileName || `${publishTarget.tenantId.toUpperCase()}-${publishTarget.version}-${publishTarget.buildNumber}.apk`}
                  </span>
                </div>
                {publishTarget.sha256 && (
                  <div className="p-3 space-y-1">
                    <span className="text-muted-foreground">SHA-256 Checksum:</span>
                    <div className="text-[11px] text-zinc-300 break-all select-all font-mono">
                      {publishTarget.sha256}
                    </div>
                  </div>
                )}
              </div>

              {/* Warning Notice Callout */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 leading-relaxed font-sans flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Distribution Notice:</strong> This build will become the <strong>current mobile release</strong> for <strong>{publishTarget.tenantId.toUpperCase()}</strong>. The previous release, if any, will no longer be the current release.
                </div>
              </div>

              {publishError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                  {publishError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  disabled={publishing}
                  className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer disabled:opacity-50 select-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePublish}
                  disabled={publishing}
                  className="px-5 py-2 text-xs font-mono font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center gap-2 disabled:opacity-50 select-none shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing Release...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Publish Release</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
