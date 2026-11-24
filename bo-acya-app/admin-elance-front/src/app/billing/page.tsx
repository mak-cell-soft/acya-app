"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  PlusCircle,
  History,
  Receipt,
  DollarSign,
  Loader2,
  ArrowRight,
  Search,
  Filter,
  Users,
  ShieldAlert,
  CheckCircle2,
  Download,
  Clock,
  AlertTriangle,
  Power,
  Sliders,
} from "lucide-react";

interface Enterprise {
  id: number;
  slug: string;
  name: string;
  plan: string;
  status: string;
  isActive: boolean;
  currency?: string | null;
  maxConnectedUsers?: number;
  createdAt?: string;
  activatedAt?: string | null;
}

interface Subscription {
  id: number;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  price: number;
  createdAt: string;
}

interface PaymentRecord {
  id: number;
  tenantId: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string | null;
  status: string;
  createdAt: string;
}

interface Invoice {
  id: number;
  tenantId?: number;
  invoiceNumber: string;
  amount: number;
  paidAmount?: number;
  remainingBalance?: number;
  currency: string;
  status: string;
  billingDate: string;
  dueDate: string;
  payments?: PaymentRecord[];
}

interface ActiveSessionItem {
  sessionId: string;
  userId: number;
  username: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
}

interface TenantConnectionSummary {
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  maxConnectedUsers: number;
  connectedUsers: number;
  availableSlots: number;
  isExceedingLimit: boolean;
  activeSessions: ActiveSessionItem[];
}

interface TenantBillingSummary {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  currentPlan: string;
  subscriptionStatus: string;
  tenantConnectionStatus: string;
  isConnectionActive: boolean;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  outstandingBalance: number;
  currency: string;
  historicalBalancesByCurrency?: Record<string, number>;
  lastPaymentDate?: string | null;
  connectedUsers: number;
  maxConnectedUsers: number;
  availableSlots: number;
}

const OFFICIAL_CURRENCY = "TND";

function resolveRecordCurrency(currency?: string | null): string {
  const clean = (currency || "").trim().toUpperCase();
  return clean || OFFICIAL_CURRENCY;
}

/**
 * Formats a monetary value using exact integer millimes arithmetic (avoiding floating-point drift)
 * and standard 3-decimal TND precision (or 2-decimal precision for historical EUR/USD records).
 */
function formatTnd(amount: number | undefined | null): string {
  const safeVal = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const millimes = Math.round(safeVal * 1000);
  return (millimes / 1000).toFixed(3);
}

function formatMoney(amount: number | undefined | null, currency?: string | null): string {
  const curr = resolveRecordCurrency(currency);
  const safeVal = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  if (curr === OFFICIAL_CURRENCY) {
    return formatTnd(safeVal);
  }
  const cents = Math.round(safeVal * 100);
  return (cents / 100).toFixed(2);
}

function getInvoiceRemaining(inv: Invoice): number {
  if (typeof inv.remainingBalance === "number") {
    return Math.max(0, Math.round(inv.remainingBalance * 1000) / 1000);
  }
  const totalMillimes = Math.round((inv.amount || 0) * 1000);
  const paidMillimes = Math.round((inv.paidAmount || 0) * 1000);
  if (inv.status?.toUpperCase() === "PAID") return 0;
  return Math.max(0, (totalMillimes - paidMillimes) / 1000);
}

function getInvoicePaid(inv: Invoice): number {
  if (typeof inv.paidAmount === "number") {
    return Math.round(inv.paidAmount * 1000) / 1000;
  }
  if (inv.status?.toUpperCase() === "PAID") return inv.amount || 0;
  return 0;
}

function getStatusBadgeClasses(status: string): string {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "ACTIVE":
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    case "TRIAL":
      return "bg-sky-500/20 text-sky-400 border border-sky-500/30";
    case "PAYMENT_DUE":
    case "PARTIALLY_PAID":
    case "UNPAID":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "OVERDUE":
    case "SUSPENDED":
    case "EXPIRED":
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    case "CANCELLED":
      return "bg-slate-700/40 text-slate-400 border border-slate-700";
    default:
      return "bg-slate-800 text-slate-300 border border-slate-700";
  }
}

export default function BillingPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnt, setSelectedEnt] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");

  // Subscriptions, Invoices, Summary & Connections data
  const [summary, setSummary] = useState<TenantBillingSummary | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [connections, setConnections] = useState<TenantConnectionSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Plan Transition Form State
  const [newPlan, setNewPlan] = useState("Starter");
  const [planPrice, setPlanPrice] = useState("90.000");
  const [durationDays, setDurationDays] = useState("30");
  const [planStatus, setPlanStatus] = useState("ACTIVE");
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Invoice Form State (Standardized to TND)
  const [invoiceAmount, setInvoiceAmount] = useState("100.000");
  const [invoiceDueDays, setInvoiceDueDays] = useState("30");
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  // Payment Recording Modal State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("WireTransfer");
  const [transactionId, setTransactionId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Connection Limit Management State & Confirmation Modal
  const [connectionLimitInput, setConnectionLimitInput] = useState("5");
  const [showConnectionConfirmModal, setShowConnectionConfirmModal] = useState(false);
  const [connectionSubmitting, setConnectionSubmitting] = useState(false);

  // Manual Suspend / Reactivate Confirmation Modal
  const [showAccessConfirmModal, setShowAccessConfirmModal] = useState(false);
  const [accessActionSubmitting, setAccessActionSubmitting] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
        if (data.length > 0 && !selectedEnt) {
          setSelectedEnt(data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch enterprises.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (entId: number) => {
    setDetailLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";

      const [summaryRes, subsRes, invRes, payRes, connRes] = await Promise.all([
        fetch(`${apiBase}admin/billing/summary/${entId}`, { headers: getHeaders() }).catch(() => null),
        fetch(`${apiBase}admin/billing/subscriptions/${entId}`, { headers: getHeaders() }).catch(() => null),
        fetch(`${apiBase}admin/billing/invoices/${entId}`, { headers: getHeaders() }).catch(() => null),
        fetch(`${apiBase}admin/billing/payments/${entId}`, { headers: getHeaders() }).catch(() => null),
        fetch(`${apiBase}admin/billing/connections/${entId}`, { headers: getHeaders() }).catch(() => null),
      ]);

      if (summaryRes && summaryRes.ok) {
        const summaryData: TenantBillingSummary = await summaryRes.json();
        setSummary(summaryData);
      } else {
        setSummary(null);
      }

      if (subsRes && subsRes.ok) {
        const subsData: Subscription[] = await subsRes.json();
        setSubs(subsData);
      }

      if (invRes && invRes.ok) {
        const invData: Invoice[] = await invRes.json();
        setInvoices(invData);
      }

      if (payRes && payRes.ok) {
        const payData: PaymentRecord[] = await payRes.json();
        setPayments(payData);
      }

      if (connRes && connRes.ok) {
        const connData: TenantConnectionSummary = await connRes.json();
        setConnections(connData);
        setConnectionLimitInput(String(connData.maxConnectedUsers || 5));
      } else {
        setConnections(null);
        setConnectionLimitInput("5");
      }
    } catch {
      // Handled gracefully
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, []);

  useEffect(() => {
    if (selectedEnt) {
      setError("");
      setSuccessMessage("");
      fetchDetails(selectedEnt.id);
    }
  }, [selectedEnt?.id]);

  // Computed summary metrics (fallbacks when summary endpoint is not populated yet)
  // Never combine different currencies into the TND outstanding balance.
  const computedOutstandingTndMillimes = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      if ((inv.status || "").toUpperCase() === "CANCELLED") return acc;
      const invCurr = resolveRecordCurrency(inv.currency);
      if (invCurr !== OFFICIAL_CURRENCY) return acc;
      return acc + Math.round(getInvoiceRemaining(inv) * 1000);
    }, 0);
  }, [invoices]);

  const historicalCurrencyBalances = useMemo(() => {
    if (summary?.historicalBalancesByCurrency && Object.keys(summary.historicalBalancesByCurrency).length > 0) {
      return summary.historicalBalancesByCurrency;
    }
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      if ((inv.status || "").toUpperCase() === "CANCELLED") continue;
      const invCurr = resolveRecordCurrency(inv.currency);
      if (invCurr === OFFICIAL_CURRENCY) continue;
      const rem = getInvoiceRemaining(inv);
      if (rem > 0) {
        map[invCurr] = Math.round(((map[invCurr] || 0) + rem) * 1000) / 1000;
      }
    }
    return map;
  }, [summary, invoices]);

  const effectiveOutstandingBalance =
    summary !== null ? summary.outstandingBalance : computedOutstandingTndMillimes / 1000;

  const effectiveConnectedUsers = connections?.connectedUsers ?? summary?.connectedUsers ?? 0;
  const effectiveMaxUsers =
    connections?.maxConnectedUsers ?? summary?.maxConnectedUsers ?? selectedEnt?.maxConnectedUsers ?? 5;
  const effectiveAvailableSlots = Math.max(0, effectiveMaxUsers - effectiveConnectedUsers);

  const latestSubscription = subs.length > 0 ? subs[0] : null;
  const effectiveSubStatus =
    summary?.subscriptionStatus ??
    latestSubscription?.status?.toUpperCase() ??
    (selectedEnt?.plan?.toUpperCase() === "TRIAL" ? "TRIAL" : "ACTIVE");

  const effectiveLastPaymentDate = useMemo(() => {
    if (summary?.lastPaymentDate) return summary.lastPaymentDate;
    if (payments.length > 0) return payments[0].paymentDate;
    for (const inv of invoices) {
      if (inv.payments && inv.payments.length > 0) {
        return inv.payments[0].paymentDate;
      }
    }
    return null;
  }, [summary, payments, invoices]);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnt) return;

    const parsedPrice = Number(planPrice);
    const parsedDays = parseInt(durationDays, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Subscription price in TND must be a valid non-negative amount.");
      return;
    }
    if (isNaN(parsedDays) || parsedDays <= 0) {
      setError("Duration must be at least 1 day.");
      return;
    }

    setPlanSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/subscriptions/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          plan: newPlan,
          price: Math.round(parsedPrice * 1000) / 1000,
          durationDays: parsedDays,
          status: planStatus,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Plan transition failed.");
      }

      setEnterprises(
        enterprises.map((ent) =>
          ent.id === selectedEnt.id ? { ...ent, plan: newPlan, currency: OFFICIAL_CURRENCY } : ent
        )
      );
      setSelectedEnt({ ...selectedEnt, plan: newPlan, currency: OFFICIAL_CURRENCY });
      setSuccessMessage(`Subscription updated to ${newPlan.toUpperCase()} (${formatTnd(parsedPrice)} ${OFFICIAL_CURRENCY}).`);
      await fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Plan update failed.");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnt) return;

    const parsedAmount = Number(invoiceAmount);
    const parsedDueDays = parseInt(invoiceDueDays, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Invoice amount in TND must be greater than zero.");
      return;
    }
    if (isNaN(parsedDueDays) || parsedDueDays < 0) {
      setError("Due period days must be a non-negative integer.");
      return;
    }

    setInvoiceSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/invoices/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount: Math.round(parsedAmount * 1000) / 1000,
          currency: OFFICIAL_CURRENCY,
          dueDays: parsedDueDays,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Invoice creation failed.");
      }

      const createdInv: Invoice = await res.json();
      setInvoiceAmount("100.000");
      setSuccessMessage(
        `Invoice ${createdInv.invoiceNumber} generated for ${formatTnd(createdInv.amount)} ${OFFICIAL_CURRENCY}.`
      );
      await fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Invoice generation failed.");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleExportInvoice = (inv: Invoice) => {
    if (typeof window === "undefined" || !selectedEnt) return;
    const paid = getInvoicePaid(inv);
    const remaining = getInvoiceRemaining(inv);
    const invCurrency = resolveRecordCurrency(inv.currency);
    const content = [
      "============================================================",
      "               ACYA OMEGA — SAAS BILLING INVOICE            ",
      "============================================================",
      `Tenant Name      : ${selectedEnt.name}`,
      `Tenant Identifier: ${selectedEnt.slug} (ID #${selectedEnt.id})`,
      `Package Tier     : ${(selectedEnt.plan || "").toUpperCase()}`,
      "------------------------------------------------------------",
      `Invoice Reference: ${inv.invoiceNumber}`,
      `Billing Date     : ${new Date(inv.billingDate).toLocaleDateString()}`,
      `Due Date         : ${new Date(inv.dueDate).toLocaleDateString()}`,
      `Payment Status   : ${(inv.status || "UNPAID").toUpperCase()}`,
      "------------------------------------------------------------",
      `Total Amount     : ${formatMoney(inv.amount, invCurrency)} ${invCurrency}`,
      `Amount Paid      : ${formatMoney(paid, invCurrency)} ${invCurrency}`,
      `Remaining Balance: ${formatMoney(remaining, invCurrency)} ${invCurrency}`,
      `Invoice Currency : ${invCurrency}${invCurrency === OFFICIAL_CURRENCY ? " (Tunisian Dinar)" : " (Historical Record)"}`,
      "============================================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNumber}_${selectedEnt.slug}_${invCurrency}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const invCurrency = resolveRecordCurrency(selectedInvoice.currency);
    const remaining = getInvoiceRemaining(selectedInvoice);
    const parsedPayment = Number(paymentAmount || remaining);
    if (isNaN(parsedPayment) || parsedPayment <= 0) {
      setError("Payment amount must be strictly greater than zero.");
      return;
    }
    if (Math.round(parsedPayment * 1000) > Math.round(remaining * 1000)) {
      setError(
        `Payment amount (${formatMoney(parsedPayment, invCurrency)} ${invCurrency}) cannot exceed remaining invoice balance (${formatMoney(remaining, invCurrency)} ${invCurrency}).`
      );
      return;
    }

    setPaymentSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/payments/${selectedInvoice.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount: Math.round(parsedPayment * 1000) / 1000,
          paymentMethod,
          transactionId: transactionId.trim(),
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Payment record failed.");
      }

      setSelectedInvoice(null);
      setPaymentAmount("");
      setTransactionId("");
      setSuccessMessage(
        `Payment of ${formatMoney(parsedPayment, invCurrency)} ${invCurrency} recorded for ${selectedInvoice.invoiceNumber}.`
      );

      if (selectedEnt) await fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Registering payment failed.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleConfirmUpdateConnectionLimit = async () => {
    if (!selectedEnt) return;
    const parsedLimit = parseInt(connectionLimitInput, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      setError("Connection limit must be between 1 and 1000 concurrent users.");
      setShowConnectionConfirmModal(false);
      return;
    }

    setConnectionSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/connections/${selectedEnt.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ maxConnectedUsers: parsedLimit }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update connection limit.");
      }

      const updated: TenantConnectionSummary = await res.json();
      setConnections((prev) => ({
        ...updated,
        activeSessions: prev?.activeSessions || [],
      }));
      setEnterprises(
        enterprises.map((ent) =>
          ent.id === selectedEnt.id ? { ...ent, maxConnectedUsers: parsedLimit } : ent
        )
      );
      setSelectedEnt({ ...selectedEnt, maxConnectedUsers: parsedLimit });
      setShowConnectionConfirmModal(false);
      setSuccessMessage(
        `Maximum concurrent connected users updated to ${parsedLimit} for ${selectedEnt.name}. Existing sessions remain connected.`
      );
      await fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Failed to update tenant connection limit.");
      setShowConnectionConfirmModal(false);
    } finally {
      setConnectionSubmitting(false);
    }
  };

  const handleConfirmToggleTenantAccess = async () => {
    if (!selectedEnt) return;
    setAccessActionSubmitting(true);
    setError("");
    setSuccessMessage("");

    const isCurrentlyActive = selectedEnt.isActive && selectedEnt.status !== "Suspended";
    const actionEndpoint = isCurrentlyActive ? "suspend" : "activate";

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${selectedEnt.id}/${actionEndpoint}`, {
        method: "PUT",
        headers: getHeaders(),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to ${actionEndpoint} tenant.`);
      }

      const nextIsActive = !isCurrentlyActive;
      const nextStatus = nextIsActive ? "Active" : "Suspended";

      setEnterprises(
        enterprises.map((ent) =>
          ent.id === selectedEnt.id ? { ...ent, isActive: nextIsActive, status: nextStatus } : ent
        )
      );
      setSelectedEnt({ ...selectedEnt, isActive: nextIsActive, status: nextStatus });
      setShowAccessConfirmModal(false);
      setSuccessMessage(
        nextIsActive
          ? `Tenant '${selectedEnt.name}' connection access reactivated.`
          : `Tenant '${selectedEnt.name}' manually suspended by administrator.`
      );
      await fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Failed to update tenant connection access.");
      setShowAccessConfirmModal(false);
    } finally {
      setAccessActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            SaaS Billing, Subscriptions &amp; Connections
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage TND subscription packages, invoices, payments, and concurrent user limits.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <span>OFFICIAL CURRENCY:</span>
          <span className="text-primary font-bold">{OFFICIAL_CURRENCY} (Tunisian Dinar)</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl font-mono text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-mono text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          LOADING SYSTEM BILLING MODULES...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar: Search & Plan Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/50 p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tenant name or slug for billing..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
              {["ALL", "TRIAL", "STARTER", "PRO", "ENTERPRISE"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-transform active:scale-[0.96] cursor-pointer whitespace-nowrap ${
                    planFilter === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Enterprises Selector */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                Select Tenant
              </h3>
              <div className="glass-panel p-2 rounded-2xl bg-card/25 border border-border/50 space-y-1 max-h-[700px] overflow-y-auto">
                {enterprises
                  .filter((ent) => {
                    if (planFilter !== "ALL" && (ent.plan || "").toUpperCase() !== planFilter)
                      return false;
                    if (searchTerm) {
                      const s = searchTerm.toLowerCase();
                      return (
                        ent.name?.toLowerCase().includes(s) || ent.slug?.toLowerCase().includes(s)
                      );
                    }
                    return true;
                  })
                  .map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEnt(ent)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between cursor-pointer ${
                        selectedEnt?.id === ent.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-slate-300 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div>{ent.name}</div>
                        <div
                          className={`text-[10px] font-mono mt-0.5 ${
                            selectedEnt?.id === ent.id
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          {ent.slug}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-lg ${
                          selectedEnt?.id === ent.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {ent.plan}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Billing Control Center */}
            <div className="lg:col-span-3 space-y-8">
              {selectedEnt ? (
                <>
                  {/* PHASE 5.1: TENANT SUMMARY HEADER */}
                  <div className="glass-panel p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold text-slate-100">{selectedEnt.name}</h2>
                          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                            {selectedEnt.slug} (#{selectedEnt.id})
                          </span>
                          <span
                            className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg ${getStatusBadgeClasses(
                              effectiveSubStatus
                            )}`}
                          >
                            {(selectedEnt.plan || "TRIAL").toUpperCase()} — {effectiveSubStatus}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          Payment status is independent of tenant connection access. Overdue invoices never disconnect active tenants.
                        </p>
                      </div>

                      {/* Manual Administrative Suspension / Reactivation Control */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Connection Access
                          </div>
                          <div
                            className={`text-xs font-bold ${
                              selectedEnt.isActive && selectedEnt.status !== "Suspended"
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {selectedEnt.isActive && selectedEnt.status !== "Suspended"
                              ? "AUTHORIZED (ACTIVE)"
                              : "MANUALLY SUSPENDED"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAccessConfirmModal(true)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-[0.96] ${
                            selectedEnt.isActive && selectedEnt.status !== "Suspended"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {selectedEnt.isActive && selectedEnt.status !== "Suspended"
                            ? "Suspend Tenant"
                            : "Reactivate Tenant"}
                        </button>
                      </div>
                    </div>

                    {/* Key Summary Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-xl">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          Connected Users
                        </div>
                        <div className="text-lg font-bold text-slate-100 font-mono mt-1 tabular-nums">
                          {effectiveConnectedUsers} / {effectiveMaxUsers}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400 mt-0.5 tabular-nums">
                          Available Slots: {effectiveAvailableSlots}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-xl">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          Outstanding Balance ({OFFICIAL_CURRENCY})
                        </div>
                        <div
                          className={`text-lg font-bold font-mono mt-1 tabular-nums ${
                            effectiveOutstandingBalance > 0 ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {formatTnd(effectiveOutstandingBalance)} {OFFICIAL_CURRENCY}
                        </div>
                        {Object.keys(historicalCurrencyBalances).length > 0 ? (
                          <div className="text-[10px] font-mono text-amber-300/90 mt-0.5 tabular-nums">
                            Historical:{" "}
                            {Object.entries(historicalCurrencyBalances)
                              .map(([curr, amt]) => `${formatMoney(amt, curr)} ${curr}`)
                              .join(" • ")}
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            Official Billing Currency
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-xl">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          Subscription Period
                        </div>
                        <div className="text-xs font-semibold text-slate-200 font-mono mt-1.5">
                          {latestSubscription
                            ? `${new Date(latestSubscription.startDate).toLocaleDateString()} → ${new Date(
                                latestSubscription.endDate
                              ).toLocaleDateString()}`
                            : summary?.subscriptionStartDate
                            ? new Date(summary.subscriptionStartDate).toLocaleDateString()
                            : "No active period"}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-1">
                          Status: {effectiveSubStatus}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-xl">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          Last Payment Date
                        </div>
                        <div className="text-sm font-semibold text-slate-200 font-mono mt-1.5">
                          {effectiveLastPaymentDate
                            ? new Date(effectiveLastPaymentDate).toLocaleDateString()
                            : "No payments recorded"}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {payments.length} payment record(s)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PHASE 3 & 5.5: TENANT CONNECTION MANAGEMENT SECTION */}
                  <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          TENANT CONNECTION MANAGEMENT
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configure maximum concurrent connected users for {selectedEnt.name}. Default limit is 5 concurrent sessions.
                        </p>
                      </div>
                      <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 tabular-nums">
                        Connected users: <b className="text-primary">{effectiveConnectedUsers} / {effectiveMaxUsers}</b> • Available slots: <b>{effectiveAvailableSlots}</b>
                      </span>
                    </div>

                    {effectiveConnectedUsers > effectiveMaxUsers && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Active connected sessions ({effectiveConnectedUsers}) currently exceed the configured limit ({effectiveMaxUsers}). Existing sessions remain active and are not forcibly disconnected; new logins are blocked until active sessions drop below {effectiveMaxUsers}.
                        </span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-6 items-end">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                        <div className="text-[10px] font-mono uppercase text-muted-foreground">
                          Concurrent Status
                        </div>
                        <div className="text-sm font-mono text-slate-200 tabular-nums">
                          Connected users: <span className="font-bold text-white">{effectiveConnectedUsers} / {effectiveMaxUsers}</span>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 tabular-nums">
                          Available slots: {effectiveAvailableSlots}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-muted-foreground block">
                          Maximum Concurrent Connected Users
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={connectionLimitInput}
                          onChange={(e) => setConnectionLimitInput(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-primary"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowConnectionConfirmModal(true)}
                        disabled={connectionSubmitting}
                        className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-transform active:scale-[0.96] text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-4 h-4" />
                        UPDATE CONNECTION LIMIT
                      </button>
                    </div>
                  </div>

                  {/* SUBSCRIPTION & MANUAL INVOICE FORMS */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Upgrade / Change Plan Form */}
                    <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        UPGRADE / CHANGE SUBSCRIPTION ({OFFICIAL_CURRENCY})
                      </h3>

                      <form onSubmit={handleUpdatePlan} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Select Package
                            </label>
                            <select
                              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-primary"
                              value={newPlan}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewPlan(val);
                                if (val === "Starter") {
                                  setPlanPrice("90.000");
                                  setPlanStatus("ACTIVE");
                                } else if (val === "Pro") {
                                  setPlanPrice("99.000");
                                  setPlanStatus("ACTIVE");
                                } else if (val === "Enterprise") {
                                  setPlanPrice("299.000");
                                  setPlanStatus("ACTIVE");
                                } else {
                                  setPlanPrice("0.000");
                                  setPlanStatus("TRIAL");
                                }
                              }}
                            >
                              <option value="Trial">TRIAL (0.000 TND)</option>
                              <option value="Starter">STARTER (90.000 TND/mo)</option>
                              <option value="Pro">PRO (99.000 TND/mo)</option>
                              <option value="Enterprise">ENTERPRISE (299.000 TND/mo)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Subscription Status
                            </label>
                            <select
                              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-primary font-mono"
                              value={planStatus}
                              onChange={(e) => setPlanStatus(e.target.value)}
                            >
                              <option value="TRIAL">TRIAL</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PAYMENT_DUE">PAYMENT_DUE</option>
                              <option value="OVERDUE">OVERDUE</option>
                              <option value="SUSPENDED">SUSPENDED</option>
                              <option value="CANCELLED">CANCELLED</option>
                              <option value="EXPIRED">EXPIRED</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Price ({OFFICIAL_CURRENCY})
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tabular-nums"
                              value={planPrice}
                              onChange={(e) => setPlanPrice(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Duration (Days)
                            </label>
                            <input
                              type="number"
                              required
                              min={1}
                              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tabular-nums"
                              value={durationDays}
                              onChange={(e) => setDurationDays(e.target.value)}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={planSubmitting}
                          className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-transform active:scale-[0.96] text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {planSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                          EXECUTE PLAN TRANSITION
                        </button>
                      </form>
                    </div>

                    {/* Generate Invoice Form */}
                    <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary" />
                        GENERATE MANUAL INVOICE ({OFFICIAL_CURRENCY})
                      </h3>

                      <form onSubmit={handleCreateInvoice} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">
                            Invoice Amount ({OFFICIAL_CURRENCY})
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tabular-nums"
                            value={invoiceAmount}
                            onChange={(e) => setInvoiceAmount(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Official Currency
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={OFFICIAL_CURRENCY}
                              className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-primary font-mono font-bold cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Due Period (Days)
                            </label>
                            <input
                              type="number"
                              required
                              min={0}
                              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tabular-nums"
                              value={invoiceDueDays}
                              onChange={(e) => setInvoiceDueDays(e.target.value)}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={invoiceSubmitting}
                          className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-transform active:scale-[0.96] text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {invoiceSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Receipt className="w-4 h-4" />
                          )}
                          GENERATE INVOICE ({OFFICIAL_CURRENCY})
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* SUBSCRIPTION HISTORY & INVOICES / PAYMENTS */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Subscription History Logs */}
                    <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" />
                        Subscription Package History
                      </h3>

                      {detailLoading ? (
                        <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                          LOADING SUBSCRIPTIONS...
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {subs.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                              NO SUBSCRIPTION RECORDS
                            </div>
                          ) : (
                            subs.map((s) => (
                              <div
                                key={s.id}
                                className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs flex justify-between items-center font-mono"
                              >
                                <div>
                                  <div className="font-bold text-slate-200 uppercase">{s.plan}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(s.startDate).toLocaleDateString()} →{" "}
                                    {new Date(s.endDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-primary tabular-nums">
                                    {formatTnd(s.price)} {OFFICIAL_CURRENCY}
                                  </div>
                                  <span
                                    className={`inline-block text-[9px] uppercase px-2 py-0.5 rounded-md mt-1 ${getStatusBadgeClasses(
                                      s.status
                                    )}`}
                                  >
                                    {s.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Invoices List with Remaining Balance & Export */}
                    <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                        Invoices &amp; Billing Statements ({OFFICIAL_CURRENCY})
                      </h3>

                      {detailLoading ? (
                        <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                          LOADING INVOICES...
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {invoices.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                              NO INVOICES ISSUED
                            </div>
                          ) : (
                            invoices.map((inv) => {
                              const paid = getInvoicePaid(inv);
                              const remaining = getInvoiceRemaining(inv);
                              const invCurrency = resolveRecordCurrency(inv.currency);
                              const isFullyPaid =
                                remaining <= 0 || (inv.status || "").toUpperCase() === "PAID";

                              return (
                                <div
                                  key={inv.id}
                                  className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs space-y-2 font-mono"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <div className="font-bold text-slate-100 flex items-center gap-2">
                                        <span>{inv.invoiceNumber}</span>
                                        <span
                                          className={`text-[9px] uppercase px-2 py-0.5 rounded-md ${getStatusBadgeClasses(
                                            inv.status
                                          )}`}
                                        >
                                          {inv.status}
                                        </span>
                                        {invCurrency !== OFFICIAL_CURRENCY && (
                                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                                            Historical {invCurrency}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-1">
                                        Issued: {new Date(inv.billingDate).toLocaleDateString()} • Due:{" "}
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleExportInvoice(inv)}
                                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                                        title={`Export Invoice (${invCurrency})`}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      {!isFullyPaid && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedInvoice(inv);
                                            setPaymentAmount(formatMoney(remaining, invCurrency));
                                            setTransactionId("");
                                          }}
                                          className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-transform active:scale-[0.96] cursor-pointer flex items-center gap-1 font-semibold"
                                          title="Record Payment"
                                        >
                                          <DollarSign className="w-3.5 h-3.5" />
                                          <span>Pay</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px] tabular-nums">
                                    <div>
                                      <span className="text-muted-foreground block text-[9px]">
                                        TOTAL AMOUNT
                                      </span>
                                      <span className="text-slate-200 font-semibold">
                                        {formatMoney(inv.amount, invCurrency)} {invCurrency}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-[9px]">
                                        PAID
                                      </span>
                                      <span className="text-emerald-400 font-semibold">
                                        {formatMoney(paid, invCurrency)} {invCurrency}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-muted-foreground block text-[9px]">
                                        REMAINING
                                      </span>
                                      <span
                                        className={`font-bold ${
                                          remaining > 0 ? "text-amber-400" : "text-slate-400"
                                        }`}
                                      >
                                        {formatMoney(remaining, invCurrency)} {invCurrency}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PHASE 5.4: PAYMENT HISTORY TABLE */}
                  <div className="glass-panel p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Payment Settlement History ({OFFICIAL_CURRENCY})
                    </h3>

                    {payments.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                        NO PAYMENTS RECORDED FOR THIS TENANT
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-muted-foreground uppercase">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3">Reference</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {payments.map((p) => {
                              const matchedInv = invoices.find((i) => i.id === p.invoiceId);
                              const payCurrency = resolveRecordCurrency(matchedInv?.currency);
                              return (
                                <tr key={p.id} className="hover:bg-slate-950/50">
                                  <td className="py-2.5 px-3 text-slate-300">
                                    {new Date(p.paymentDate).toLocaleDateString()}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                                    {matchedInv ? matchedInv.invoiceNumber : `#${p.invoiceId}`}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">{p.paymentMethod}</td>
                                  <td className="py-2.5 px-3 text-muted-foreground">
                                    {p.transactionId || "—"}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`text-[9px] uppercase px-2 py-0.5 rounded-md ${getStatusBadgeClasses(
                                        p.status
                                      )}`}
                                    >
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400 tabular-nums">
                                    {formatMoney(p.amount, payCurrency)} {payCurrency}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RECORD PAYMENT DIALOG MODAL */}
                  {selectedInvoice && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-primary" />
                            RECORD CUSTOMER PAYMENT ({resolveRecordCurrency(selectedInvoice.currency)})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(null)}
                            className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer px-2"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice:</span>
                            <span className="text-slate-100 font-bold">
                              {selectedInvoice.invoiceNumber}
                            </span>
                          </div>
                          <div className="flex justify-between tabular-nums">
                            <span className="text-muted-foreground">Total Amount:</span>
                            <span className="text-slate-200">
                              {formatMoney(selectedInvoice.amount, selectedInvoice.currency)}{" "}
                              {resolveRecordCurrency(selectedInvoice.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between tabular-nums">
                            <span className="text-muted-foreground">Remaining Balance:</span>
                            <span className="text-amber-400 font-bold">
                              {formatMoney(
                                getInvoiceRemaining(selectedInvoice),
                                selectedInvoice.currency
                              )}{" "}
                              {resolveRecordCurrency(selectedInvoice.currency)}
                            </span>
                          </div>
                        </div>

                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Payment Amount ({resolveRecordCurrency(selectedInvoice.currency)}) — Full or Partial
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono tabular-nums"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Payment Method
                            </label>
                            <select
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="WireTransfer">Wire Transfer</option>
                              <option value="CreditCard">Credit Card</option>
                              <option value="Check">Check</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-mono text-muted-foreground">
                              Transaction ID / Reference
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="TXN-9988554"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(null)}
                              className="flex-1 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 text-xs font-mono cursor-pointer"
                            >
                              CANCEL
                            </button>
                            <button
                              type="submit"
                              disabled={paymentSubmitting}
                              className="flex-1 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-transform active:scale-[0.96] text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {paymentSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <DollarSign className="w-4 h-4" />
                              )}
                              RECORD PAYMENT
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* CONFIRM CONNECTION LIMIT UPDATE MODAL */}
                  {showConnectionConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-sm">
                          <Users className="w-4 h-4 text-primary" />
                          <span>CONFIRM CONNECTION LIMIT CHANGE</span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono leading-relaxed">
                          Update maximum concurrent connected users for{" "}
                          <b className="text-white">{selectedEnt.name}</b> from{" "}
                          <b>{effectiveMaxUsers}</b> to <b>{connectionLimitInput}</b>?
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Note: Existing authenticated sessions ({effectiveConnectedUsers} currently connected) will NOT be disconnected. The new limit applies immediately to subsequent login attempts.
                        </p>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowConnectionConfirmModal(false)}
                            className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono font-semibold hover:bg-slate-700 cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            disabled={connectionSubmitting}
                            onClick={handleConfirmUpdateConnectionLimit}
                            className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-mono font-semibold hover:bg-primary/95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {connectionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            CONFIRM LIMIT
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONFIRM MANUAL SUSPEND / REACTIVATE MODAL */}
                  {showAccessConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-sm">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>
                            {selectedEnt.isActive && selectedEnt.status !== "Suspended"
                              ? "CONFIRM MANUAL TENANT SUSPENSION"
                              : "CONFIRM TENANT REACTIVATION"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono leading-relaxed">
                          {selectedEnt.isActive && selectedEnt.status !== "Suspended"
                            ? `Are you sure you want to manually suspend connection access for '${selectedEnt.name}'? Users of this tenant will not be able to connect until an administrator reactivates the account.`
                            : `Are you sure you want to reactivate connection access for '${selectedEnt.name}'?`}
                        </p>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAccessConfirmModal(false)}
                            className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono font-semibold hover:bg-slate-700 cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            disabled={accessActionSubmitting}
                            onClick={handleConfirmToggleTenantAccess}
                            className={`flex-1 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                              selectedEnt.isActive && selectedEnt.status !== "Suspended"
                                ? "bg-red-600 text-white hover:bg-red-500"
                                : "bg-emerald-600 text-white hover:bg-emerald-500"
                            }`}
                          >
                            {accessActionSubmitting && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            CONFIRM
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
                  PLEASE REGISTER A TENANT ENTERPRISE IN THE REGISTRY TO CONFIGURE BILLING.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
