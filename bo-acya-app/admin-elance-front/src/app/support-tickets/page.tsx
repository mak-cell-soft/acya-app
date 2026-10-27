"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Ticket, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  Eye, 
  Loader2, 
  X, 
  Building2, 
  FileText, 
  Paperclip, 
  Terminal, 
  User, 
  Mail, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  Flame,
  ShieldAlert
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface SupportTicketItem {
  id: number;
  ticketReference: string;
  tenantSlug: string;
  tenantName: string;
  userId: number;
  userFullName: string;
  userEmail: string;
  category: string;
  subcategory: string;
  priority: string;
  subject: string;
  hasAttachment: boolean;
  attachmentFileName: string | null;
  attachmentSizeBytes: number | null;
  emailStatus: number;
  emailStatusText: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketDetail extends SupportTicketItem {
  enterpriseName: string;
  description: string;
  currentRoute: string | null;
  appVersion: string | null;
  contextData: string | null;
  attachmentContentType: string | null;
  emailError: string | null;
}

interface EnterpriseOption {
  id: number;
  slug: string;
  name: string;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // Enterprise options for tenant dropdown
  const [enterprises, setEnterprises] = useState<EnterpriseOption[]>([]);

  // Detail Modal / Drawer State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Fetch Enterprise List for tenant filter
  useEffect(() => {
    const loadEnterprises = async () => {
      try {
        const res = await apiFetch("admin/enterprise");
        if (res.ok) {
          const data = await res.json();
          setEnterprises(Array.isArray(data) ? data : data.items || []);
        }
      } catch (e) {
        console.warn("Failed to load enterprises for filter dropdown", e);
      }
    };
    loadEnterprises();
  }, []);

  // Fetch Tickets List
  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedTenant) params.set("tenantSlug", selectedTenant);
      if (selectedPriority) params.set("priority", selectedPriority);
      if (selectedCategory) params.set("category", selectedCategory);
      if (createdFrom) params.set("createdFrom", new Date(createdFrom).toISOString());
      if (createdTo) {
        // Set to end of day UTC
        const toDate = new Date(createdTo);
        toDate.setUTCHours(23, 59, 59, 999);
        params.set("createdTo", toDate.toISOString());
      }

      const res = await apiFetch(`admin/support-tickets?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Impossible de récupérer les tickets de support.");
      }

      const data = await res.json();
      setTickets(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors du chargement des tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, searchTerm, selectedTenant, selectedPriority, selectedCategory, createdFrom, createdTo]);

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setSelectedTenant("");
    setSelectedPriority("");
    setSelectedCategory("");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  };

  // View Ticket Details
  const handleViewDetails = async (tenantSlug: string, ticketId: number) => {
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`admin/support-tickets/${encodeURIComponent(tenantSlug)}/${ticketId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Impossible de charger les détails du ticket.");
      }
      const data = await res.json();
      setSelectedTicket(data);
    } catch (err: any) {
      alert(err.message || "Erreur lors du chargement des détails.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Copy Reference
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Format Date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Format File Size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Priority Badge Styling
  const getPriorityBadge = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("critique")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
          <Flame className="w-3.5 h-3.5 text-rose-400" /> Critique
        </span>
      );
    }
    if (p.includes("élevée") || p.includes("elevee") || p.includes("high")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Élevée
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        Normale
      </span>
    );
  };

  // Email Status Badge
  const getEmailStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Notification envoyée avec succès">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Envoyé
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Échec de délivrance de l'email">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Échoué
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Email en cours ou en attente">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> En attente
          </span>
        );
    }
  };

  // Summary Metrics (Derived from current view or filters)
  const priorityCounts = useMemo(() => {
    return {
      critique: tickets.filter(t => (t.priority || "").toLowerCase().includes("critique")).length,
      elevee: tickets.filter(t => (t.priority || "").toLowerCase().includes("élevée") || (t.priority || "").toLowerCase().includes("elevee")).length,
      normale: tickets.filter(t => (t.priority || "").toLowerCase().includes("normale")).length,
    };
  }, [tickets]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <Ticket className="w-7 h-7" />
            </div>
            Support Tickets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Supervision et gestion centralisée des demandes d'assistance, anomalies et signalements des locataires.
          </p>
        </div>
        <button
          onClick={() => fetchTickets()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-foreground text-sm font-medium rounded-lg border border-border transition-all hover:scale-[1.02] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4.5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Total Requêtes</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">{totalCount}</h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-4.5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Priorité Critique</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">
              {priorityCounts.critique}
            </h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-4.5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Priorité Élevée</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">
              {priorityCounts.elevee}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-4.5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Priorité Normale</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">
              {priorityCounts.normale}
            </h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4.5 space-y-4">
        {/* Search bar + Submit */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par référence (EL-2026-...), sujet ou demandeur..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Search className="w-4 h-4" />
            Rechercher
          </button>
        </form>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-border/50">
          {/* Tenant Select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Locataire (Tenant)</label>
            <select
              value={selectedTenant}
              onChange={(e) => {
                setSelectedTenant(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Tous les locataires</option>
              {enterprises.map((ent) => (
                <option key={ent.id} value={ent.slug}>
                  {ent.name} ({ent.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Priorité</label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Toutes les priorités</option>
              <option value="Critique">Critique</option>
              <option value="Élevée">Élevée</option>
              <option value="Normale">Normale</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Toutes les catégories</option>
              <option value="Technique">Technique</option>
              <option value="Comptabilité">Comptabilité</option>
              <option value="Commercial">Commercial</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Created From */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Depuis le</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => {
                setCreatedFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Created To & Reset */}
          <div className="space-y-1 flex flex-col justify-between">
            <label className="text-xs font-medium text-muted-foreground">Jusqu'au</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={createdTo}
                onChange={(e) => {
                  setCreatedTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleResetFilters}
                title="Réinitialiser tous les filtres"
                className="p-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-md text-xs font-medium cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border text-xs uppercase text-muted-foreground font-mono">
              <tr>
                <th className="py-3 px-4 font-semibold">Référence</th>
                <th className="py-3 px-4 font-semibold">Locataire</th>
                <th className="py-3 px-4 font-semibold">Sujet & Catégorie</th>
                <th className="py-3 px-4 font-semibold">Priorité</th>
                <th className="py-3 px-4 font-semibold">Demandeur</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Email Notif</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary mb-3" />
                    Chargement des tickets de support...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Ticket className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium text-foreground">Aucun ticket trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Essayez de modifier ou réinitialiser vos critères de recherche.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr 
                    key={`${t.tenantSlug}-${t.id}`}
                    className="hover:bg-secondary/30 transition-colors group"
                  >
                    {/* Reference */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {t.ticketReference}
                        </span>
                        {t.hasAttachment && (
                          <span title={`Pièce jointe: ${t.attachmentFileName}`}>
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tenant */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-xs leading-tight">
                          {t.tenantName}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {t.tenantSlug}
                        </span>
                      </div>
                    </td>

                    {/* Subject & Category */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground truncate" title={t.subject}>
                          {t.subject}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {t.category} {t.subcategory ? `• ${t.subcategory}` : ""}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(t.priority)}
                    </td>

                    {/* Submitter */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-foreground">{t.userFullName || "Utilisateur"}</span>
                        <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[150px]">
                          {t.userEmail}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {formatDate(t.createdAt)}
                    </td>

                    {/* Email Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getEmailStatusBadge(t.emailStatus)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(t.tenantSlug, t.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary border border-border transition-all cursor-pointer"
                        title="Voir le détail du ticket"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 bg-secondary/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Affichage de <span className="font-mono font-medium text-foreground">{tickets.length}</span> sur <span className="font-mono font-medium text-foreground">{totalCount}</span> tickets
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-medium text-foreground px-1">
              Page {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Drawer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl h-full bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-start justify-between bg-secondary/30">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20 flex items-center gap-1.5">
                    {selectedTicket.ticketReference}
                    <button
                      onClick={() => handleCopy(selectedTicket.ticketReference)}
                      title="Copier la référence"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedRef === selectedTicket.ticketReference ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border">
                    {selectedTicket.category}
                  </span>
                  {getEmailStatusBadge(selectedTicket.emailStatus)}
                </div>
                <h2 className="text-xl font-bold text-white leading-snug pt-1">
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tenant & Submitter Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-muted-foreground">
                    <Building2 className="w-4 h-4 text-primary" />
                    Locataire (Tenant)
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{selectedTicket.tenantName}</p>
                    <p className="text-xs text-muted-foreground font-mono">Slug: {selectedTicket.tenantSlug}</p>
                    {selectedTicket.enterpriseName && selectedTicket.enterpriseName !== selectedTicket.tenantName && (
                      <p className="text-xs text-muted-foreground">Raison: {selectedTicket.enterpriseName}</p>
                    )}
                  </div>
                </div>

                <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-muted-foreground">
                    <User className="w-4 h-4 text-primary" />
                    Demandeur
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{selectedTicket.userFullName}</p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      {selectedTicket.userEmail}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">ID Utilisateur: {selectedTicket.userId}</p>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-muted-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  Description de la demande
                </div>
                <div className="p-4 bg-secondary/40 border border-border rounded-xl text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachment Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-muted-foreground">
                  <Paperclip className="w-4 h-4 text-primary" />
                  Pièce Jointe
                </div>
                {selectedTicket.hasAttachment ? (
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedTicket.attachmentFileName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedTicket.attachmentContentType || "Format inconnu"} • {formatFileSize(selectedTicket.attachmentSizeBytes)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono bg-secondary px-2.5 py-1 rounded border border-border">
                      Stockage sécurisé serveur
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-secondary/20 border border-border/60 rounded-xl text-xs text-muted-foreground italic">
                    Aucune pièce jointe transmise pour ce ticket.
                  </div>
                )}
              </div>

              {/* Diagnostic & Technical Context */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-muted-foreground">
                  <Terminal className="w-4 h-4 text-primary" />
                  Contexte Diagnostique
                </div>
                <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Route d'origine :</span>
                      <p className="font-mono text-foreground mt-0.5">{selectedTicket.currentRoute || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version client :</span>
                      <p className="font-mono text-foreground mt-0.5">{selectedTicket.appVersion || "-"}</p>
                    </div>
                  </div>

                  {selectedTicket.contextData && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-muted-foreground block mb-1">Métadonnées de contexte :</span>
                      <pre className="p-2.5 bg-black/40 rounded-lg border border-border/80 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedTicket.contextData), null, 2);
                          } catch {
                            return selectedTicket.contextData;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Notification Trace */}
              {selectedTicket.emailError && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-rose-400">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Erreur de Notification Email
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-mono">
                    {selectedTicket.emailError}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Créé le : {formatDate(selectedTicket.createdAt)}</span>
                <span>Dernière mise à jour : {formatDate(selectedTicket.updatedAt)}</span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-lg border border-border transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
