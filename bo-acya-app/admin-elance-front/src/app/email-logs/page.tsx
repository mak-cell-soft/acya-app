"use client";

import { useEffect, useState } from "react";
import { 
  Mail, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  Eye, 
  RotateCw, 
  Loader2, 
  ChevronRight, 
  X, 
  Send,
  Building2,
  Copy,
  Check
} from "lucide-react";

interface EmailLogItem {
  id: number;
  tenantId: number | null;
  tenantName: string | null;
  tenantSlug: string | null;
  registrationId: number;
  correlationId: string | null;
  messageId: string | null;
  recipient: string;
  template: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailLogEvent {
  id: number;
  eventId: string;
  eventType: string;
  status: string;
  timestamp: string;
  reason: string | null;
  severity: string | null;
  code: number | null;
  description: string | null;
  createdAt: string;
}

interface EmailLogDetail extends EmailLogItem {
  events: EmailLogEvent[];
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [selectedLog, setSelectedLog] = useState<EmailLogDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendSuccessMsg, setResendSuccessMsg] = useState("");

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  const fetchEmailLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      let url = `${apiBase}admin/email-logs?page=${page}&pageSize=${pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (selectedStatus !== "ALL") {
        url += `&status=${encodeURIComponent(selectedStatus)}`;
      }

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        throw new Error("Failed to fetch email logs.");
      }

      const data = await res.json();
      setLogs(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading email logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmailLogs();
  };

  const handleViewDetails = async (id: number) => {
    setLoadingDetail(true);
    setResendSuccessMsg("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/email-logs/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch log details.");
      const data = await res.json();
      setSelectedLog(data);
    } catch (err: any) {
      alert(err.message || "Failed to load log details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleResend = async (id: number) => {
    setResendingId(id);
    setResendSuccessMsg("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/email-logs/${id}/resend`, {
        method: "POST",
        headers: getHeaders()
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to resend email.");
      }

      const resData = await res.json();
      setResendSuccessMsg("Email welcome resend triggered successfully!");
      fetchEmailLogs();
      if (selectedLog && selectedLog.id === id) {
        handleViewDetails(id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to trigger email resend.");
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(text);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case "BOUNCED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Bounced
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case "FAILED_SEND":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <XCircle className="w-3.5 h-3.5" /> Send Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Mail className="text-primary w-8 h-8" />
            Email Activity & Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time audit trail of transactional email dispatches and Mailgun delivery events.
          </p>
        </div>
        <button
          onClick={() => fetchEmailLogs()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-foreground text-sm font-medium rounded-lg border border-border transition-all hover:scale-[1.02] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Total Emails Logged</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalCount}</h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Delivered</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              {logs.filter(l => l.currentStatus === "DELIVERED").length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Bounced / Rejected</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">
              {logs.filter(l => l.currentStatus === "BOUNCED" || l.currentStatus === "REJECTED").length}
            </h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase font-semibold">Accepted / Pending</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">
              {logs.filter(l => l.currentStatus === "ACCEPTED").length}
            </h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipient, template, messageId..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
          {["ALL", "DELIVERED", "BOUNCED", "ACCEPTED", "FAILED_SEND"].map((st) => (
            <button
              key={st}
              onClick={() => { setSelectedStatus(st); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedStatus === st
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading email log history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Mail className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-base font-medium text-foreground">No email logs found</p>
            <p className="text-xs">No email dispatches match the selected search or status criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase font-mono border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Recipient</th>
                  <th className="px-5 py-3.5 font-semibold">Enterprise / Tenant</th>
                  <th className="px-5 py-3.5 font-semibold">Template</th>
                  <th className="px-5 py-3.5 font-semibold">Message ID</th>
                  <th className="px-5 py-3.5 font-semibold">Sent Date</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-5 py-4 whitespace-nowrap">
                      {getStatusBadge(log.currentStatus)}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {log.recipient}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {log.tenantName ? (
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {log.tenantName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Registration #{log.registrationId}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-secondary text-foreground text-xs font-mono">
                        {log.template}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                      {log.messageId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[180px]" title={log.messageId}>
                            {log.messageId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(log.messageId!)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Message ID"
                          >
                            {copiedMessageId === log.messageId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(log.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
                          title="View Details & History"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          Details
                        </button>

                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={resendingId === log.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-xs font-medium text-primary border border-primary/20 transition-colors cursor-pointer"
                          title="Resend Welcome Email"
                        >
                          {resendingId === log.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                          Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-secondary/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} total logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details & Event Timeline Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Email Lifecycle Details
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit log ID #{selectedLog.id} • Recipient: {selectedLog.recipient}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {resendSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {resendSuccessMsg}
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground">Current Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedLog.currentStatus)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Template:</span>
                  <p className="font-mono text-foreground font-semibold mt-1">{selectedLog.template}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enterprise:</span>
                  <p className="text-foreground font-medium mt-1">
                    {selectedLog.tenantName || `Registration #${selectedLog.registrationId}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Correlation ID:</span>
                  <p className="font-mono text-muted-foreground mt-1 truncate" title={selectedLog.correlationId || ""}>
                    {selectedLog.correlationId || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Mailgun Message ID:</span>
                  <p className="font-mono text-primary font-medium mt-1 break-all select-all">
                    {selectedLog.messageId || "N/A (Pending / Failed Send)"}
                  </p>
                </div>
              </div>

              {/* Event Timeline History */}
              <div>
                <h4 className="text-xs uppercase font-mono font-bold text-muted-foreground mb-3 tracking-wider">
                  Event Timeline & Delivery History ({selectedLog.events?.length || 0})
                </h4>

                {loadingDetail ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !selectedLog.events || selectedLog.events.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground bg-secondary/20 rounded-lg">
                    No individual delivery events recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {selectedLog.events.map((evt) => (
                      <div key={evt.id} className="relative group">
                        {/* Timeline Bullet Dot */}
                        <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-card ${
                          evt.status === "DELIVERED" ? "bg-emerald-400" :
                          evt.status === "BOUNCED" ? "bg-rose-400" : "bg-blue-400"
                        }`} />

                        <div className="p-3 bg-secondary/40 rounded-lg border border-border/40 text-xs space-y-1">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-foreground uppercase font-mono font-bold tracking-tight">
                              {evt.status} ({evt.eventType})
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {new Date(evt.timestamp).toLocaleString()}
                            </span>
                          </div>

                          {evt.reason && (
                            <p className="text-muted-foreground">
                              <strong className="text-slate-300">Reason:</strong> {evt.reason}
                            </p>
                          )}

                          {(evt.code || evt.severity) && (
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 font-mono pt-1">
                              {evt.code && <span>SMTP Code: {evt.code}</span>}
                              {evt.severity && <span>Severity: {evt.severity}</span>}
                            </div>
                          )}

                          <p className="text-[10px] font-mono text-slate-500 pt-0.5">
                            Event ID: {evt.eventId}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-secondary text-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => handleResend(selectedLog.id)}
                disabled={resendingId === selectedLog.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {resendingId === selectedLog.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                Resend Welcome Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
