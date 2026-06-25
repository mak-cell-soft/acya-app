"use client";

import { useEffect, useState } from "react";
import { CreditCard, PlusCircle, History, Receipt, DollarSign, Loader2, ArrowRight } from "lucide-react";

interface Enterprise {
  id: number;
  slug: string;
  name: string;
  plan: string;
  status: string;
  isActive: boolean;
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

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  billingDate: string;
  dueDate: string;
}

export default function BillingPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnt, setSelectedEnt] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Subscriptions & Invoices data
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Forms state
  const [newPlan, setNewPlan] = useState("Starter");
  const [planPrice, setPlanPrice] = useState("29.00");
  const [durationDays, setDurationDays] = useState("30");
  const [planSubmitting, setPlanSubmitting] = useState(false);

  const [invoiceAmount, setInvoiceAmount] = useState("100.00");
  const [invoiceCurrency, setInvoiceCurrency] = useState("EUR");
  const [invoiceDueDays, setInvoiceDueDays] = useState("30");
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("WireTransfer");
  const [transactionId, setTransactionId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
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
        if (data.length > 0) {
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
      // Fetch subs
      const subsRes = await fetch(`${apiBase}admin/billing/subscriptions/${entId}`, {
        headers: getHeaders(),
      });
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubs(subsData);
      }

      // Fetch invoices
      const invRes = await fetch(`${apiBase}admin/billing/invoices/${entId}`, {
        headers: getHeaders(),
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, []);

  useEffect(() => {
    if (selectedEnt) {
      fetchDetails(selectedEnt.id);
    }
  }, [selectedEnt]);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnt) return;

    setPlanSubmitting(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/subscriptions/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          plan: newPlan,
          price: parseFloat(planPrice),
          durationDays: parseInt(durationDays)
        }),
      });

      if (!res.ok) throw new Error("Plan upgrade failed.");
      
      // Update local state plan
      setEnterprises(enterprises.map(e => e.id === selectedEnt.id ? { ...e, plan: newPlan, isActive: true, status: 'Active' } : e));
      setSelectedEnt({ ...selectedEnt, plan: newPlan, isActive: true, status: 'Active' });

      fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Plan update failed.");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnt) return;

    setInvoiceSubmitting(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/invoices/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount: parseFloat(invoiceAmount),
          currency: invoiceCurrency,
          dueDays: parseInt(invoiceDueDays)
        }),
      });

      if (!res.ok) throw new Error("Invoice creation failed.");
      
      setInvoiceAmount("100.00");
      fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Invoice generation failed.");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setPaymentSubmitting(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/billing/payments/${selectedInvoice.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount: parseFloat(paymentAmount || selectedInvoice.amount.toString()),
          paymentMethod,
          transactionId
        }),
      });

      if (!res.ok) throw new Error("Payment record failed.");

      setSelectedInvoice(null);
      setPaymentAmount("");
      setTransactionId("");

      if (selectedEnt) fetchDetails(selectedEnt.id);
    } catch (err: any) {
      setError(err.message || "Registering payment failed.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">SaaS Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage plan packages, manual invoices, and record tenant payments.</p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          LOADING SYSTEM BILLING MODULES...
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Enterprises Selector */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-muted-foreground">Select Tenant</h3>
            <div className="glass-panel p-2 rounded-xl bg-card/25 border border-border/50 space-y-1">
              {enterprises.map(ent => (
                <button
                  key={ent.id}
                  onClick={() => setSelectedEnt(ent)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedEnt?.id === ent.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-slate-300 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div>{ent.name}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${selectedEnt?.id === ent.id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{ent.slug}</div>
                  </div>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                    selectedEnt?.id === ent.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
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
                {/* Overview Header */}
                <div className="glass-panel p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">{selectedEnt.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Active Package: <span className="text-primary font-mono font-bold uppercase">{selectedEnt.plan}</span> ({selectedEnt.isActive ? "Active" : "Deactivated"})</p>
                  </div>
                  
                  {/* Plan Price Presets */}
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Trial Status</div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedEnt.status}</div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Upgrade / Change Plan Form */}
                  <div className="glass-panel p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      UPGRADE / CHANGE SUBSCRIPTION
                    </h3>
                    
                    <form onSubmit={handleUpdatePlan} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground">Select Package</label>
                        <select
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-primary"
                          value={newPlan}
                          onChange={(e) => {
                            setNewPlan(e.target.value);
                            // Set suggested price
                            if (e.target.value === "Starter") setPlanPrice("29.00");
                            else if (e.target.value === "Pro") setPlanPrice("99.00");
                            else if (e.target.value === "Enterprise") setPlanPrice("299.00");
                            else setPlanPrice("0.00");
                          }}
                        >
                          <option value="Trial">Trial (Free)</option>
                          <option value="Starter">Starter (29€/mo)</option>
                          <option value="Pro">Pro (99€/mo)</option>
                          <option value="Enterprise">Enterprise (299€/mo)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Price (€)</label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                            value={planPrice}
                            onChange={(e) => setPlanPrice(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Duration (Days)</label>
                          <input
                            type="number"
                            required
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={planSubmitting}
                        className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {planSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        EXECUTE PLAN TRANSITION
                      </button>
                    </form>
                  </div>

                  {/* Generate Invoice Form */}
                  <div className="glass-panel p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-primary" />
                      GENERATE MANUAL INVOICE
                    </h3>

                    <form onSubmit={handleCreateInvoice} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground">Invoice Amount</label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Currency</label>
                          <input
                            type="text"
                            required
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                            value={invoiceCurrency}
                            onChange={(e) => setInvoiceCurrency(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Due Period (Days)</label>
                          <input
                            type="number"
                            required
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                            value={invoiceDueDays}
                            onChange={(e) => setInvoiceDueDays(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={invoiceSubmitting}
                        className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {invoiceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                        GENERATE & EXPORT INVOICE
                      </button>
                    </form>
                  </div>
                </div>

                {/* Subscriptions & Invoices Lists */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Subscription History Logs */}
                  <div className="glass-panel p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <History className="w-5 h-5 text-muted-foreground" />
                      Subscription Package History
                    </h3>

                    {detailLoading ? (
                      <div className="text-center py-6 text-xs text-muted-foreground font-mono">LOADING SUBS...</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {subs.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground font-mono">NO SUBSCRIPTION RECORDS</div>
                        ) : (
                          subs.map(s => (
                            <div key={s.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs flex justify-between items-center font-mono">
                              <div>
                                <div className="font-bold text-slate-200 uppercase">{s.plan}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-primary">{s.price.toFixed(2)} EUR</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{s.status}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Invoices List */}
                  <div className="glass-panel p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                      Invoices & Billing Statements
                    </h3>

                    {detailLoading ? (
                      <div className="text-center py-6 text-xs text-muted-foreground font-mono">LOADING INVOICES...</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {invoices.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground font-mono">NO INVOICES ISSUED</div>
                        ) : (
                          invoices.map(inv => (
                            <div key={inv.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs flex justify-between items-center font-mono">
                              <div>
                                <div className="font-bold text-slate-200">{inv.invoiceNumber}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <div className="font-semibold text-slate-100">{inv.amount.toFixed(2)} {inv.currency}</div>
                                  <span className={`inline-block text-[9px] uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                                    inv.status === "Paid" ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400"
                                  }`}>
                                    {inv.status}
                                  </span>
                                </div>
                                {inv.status !== "Paid" && (
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setPaymentAmount(inv.amount.toString());
                                      setTransactionId("");
                                    }}
                                    className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-all cursor-pointer"
                                    title="Collect Payment"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RECORD PAYMENT DIALOG MODAL */}
                {selectedInvoice && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-primary" />
                          RECORD CUSTOMER PAYMENT
                        </h3>
                        <button 
                          onClick={() => setSelectedInvoice(null)}
                          className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground font-mono">
                        Register manual payment for <b>{selectedInvoice.invoiceNumber}</b>.
                      </p>

                      <form onSubmit={handleRegisterPayment} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Payment Amount ({selectedInvoice.currency})</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-mono text-muted-foreground">Payment Method</label>
                          <select
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
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
                          <label className="text-xs font-mono text-muted-foreground">Transaction ID / Reference (Opt)</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="TXN-9988554"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={paymentSubmitting}
                          className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all text-xs font-mono cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {paymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                          RECORD PAYMENT SETTLEMENT
                        </button>
                      </form>
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
      )}
    </div>
  );
}
