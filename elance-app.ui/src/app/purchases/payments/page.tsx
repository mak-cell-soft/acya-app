'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Building2,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Edit2,
  DollarSign,
  Ticket,
  Calendar,
  Landmark,
  Ban,
  ArrowRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useEnterprise } from '@/hooks/use-enterprise';
import {
  useSupplierInvoices,
  useSupplierTraites,
  useEcheances,
  useMarkTraiteAsPaid
} from '@/hooks/use-payments';
import { PaymentModal } from '@/components/sales/payment-modal';
import { EcheanceDetailsModal } from '@/components/purchases/echeance-details-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function SupplierPaymentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Supplier Selection State
  const initialSupplierId = searchParams.get('supplierId') ? parseInt(searchParams.get('supplierId')!) : null;
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(initialSupplierId);

  // Filter States
  const [showSettledInvoices, setShowSettledInvoices] = useState(false);
  const [projectionDays, setProjectionDays] = useState<60 | 90 | 120>(120);

  // Modals States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<any>(null);
  
  const [isEcheanceModalOpen, setIsEcheanceModalOpen] = useState(false);
  const [selectedEcheanceData, setSelectedEcheanceData] = useState<any>(null);

  // Queries
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { data: enterprise } = useEnterprise();
  
  const { data: rawInvoices = [], isLoading: loadingInvoices, refetch: refetchInvoices } = useSupplierInvoices(selectedSupplierId);
  const { data: traites = [], isLoading: loadingTraites, refetch: refetchTraites } = useSupplierTraites(selectedSupplierId);
  const { data: echeances = [], isLoading: loadingEcheances, refetch: refetchEcheances } = useEcheances(projectionDays);

  const markTraiteAsPaidMutation = useMarkTraiteAsPaid();

  // Sync state with query parameters
  useEffect(() => {
    const qId = searchParams.get('supplierId');
    if (qId) {
      setSelectedSupplierId(parseInt(qId));
    }
  }, [searchParams]);

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Handle supplier select and sync with URL
  const handleSupplierSelect = (idStr: string | null) => {
    if (!idStr) return;
    const id = parseInt(idStr);
    setSelectedSupplierId(id);
    router.push(`/purchases/payments?supplierId=${id}`, { scroll: false });
  };

  // Filter invoices client-side based on showSettledInvoices toggle
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv: any) => {
      const remaining = inv.remaining_balance || 0;
      return showSettledInvoices || remaining > 0.005;
    });
  }, [rawInvoices, showSettledInvoices]);

  // Recalculate KPIs on demand
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const remaining = rawInvoices.reduce((acc: number, curr: any) => acc + (curr.remaining_balance || 0), 0);
    const totalCreditNotes = rawInvoices.reduce((acc: number, curr: any) => acc + (curr.total_credit_notes || 0), 0);
    
    const pendingTraites = traites
      .filter((t) => !t.instrument?.isPaidAtBank)
      .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    const overdue = traites
      .filter((t) => {
        if (!t.instrument?.dueDate || t.instrument.isPaidAtBank) return false;
        const due = new Date(t.instrument.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      })
      .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    const paidInBank = traites
      .filter((t) => t.instrument?.isPaidAtBank)
      .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    return {
      remaining,
      pendingTraites,
      overdue,
      paidInBank,
      totalCreditNotes
    };
  }, [rawInvoices, traites]);

  // Process data for the Recharts Area Chart
  const chartData = useMemo(() => {
    return echeances.map((item) => {
      const d = new Date(item.dueDate);
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      return {
        name: label,
        amount: item.totalAmount,
        originalData: item
      };
    });
  }, [echeances]);

  // Trigger confirmation dialog for bank settlement
  const handleMarkAsPaid = async (traite: any) => {
    if (!traite.instrument) return;

    const confirmed = window.confirm(
      `Confirmer que l'effet N° ${traite.instrument.instrumentNumber} est bien payé en banque ?`
    );
    if (!confirmed) return;

    try {
      await markTraiteAsPaidMutation.mutateAsync({
        instrumentId: traite.instrument.id,
        paidAtBankDate: new Date(),
        notes: 'Confirmé via tableau de bord des paiements React'
      });
      refetchTraites();
      refetchInvoices();
      refetchEcheances();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to determine if due date is passed
  const isOverdue = (traite: any) => {
    if (!traite.instrument?.dueDate || traite.instrument.isPaidAtBank) return false;
    const due = new Date(traite.instrument.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Open Payment modal in CREATE mode
  const triggerCreatePayment = (invoice: any) => {
    setPaymentModalData({
      documentId: invoice.id,
      documentNumber: invoice.docnumber,
      totalAmount: invoice.total_net_ttc,
      remainingAmount: invoice.remaining_balance,
      totalCreditNotes: invoice.total_credit_notes || 0,
      customerId: selectedSupplierId!,
      customerName: selectedSupplier?.name || `${selectedSupplier?.firstname || ''} ${selectedSupplier?.lastname || ''}`.trim(),
      withholdingtax: invoice.holdingtax,
      totalNetPayable: invoice.total_net_payable
    });
    setIsPaymentModalOpen(true);
  };

  // Open Payment modal in EDIT mode
  const triggerEditPayment = (payment: any) => {
    setPaymentModalData({
      isEditMode: true,
      paymentId: payment.paymentId || payment.id,
      documentId: payment.documentId,
      documentNumber: payment.reference || '',
      totalAmount: payment.amount || 0,
      remainingAmount: payment.amount || 0,
      customerId: selectedSupplierId!,
      customerName: selectedSupplier?.name || `${selectedSupplier?.firstname || ''} ${selectedSupplier?.lastname || ''}`.trim(),
      prefillAmount: payment.amount,
      prefillDate: payment.paymentDate,
      prefillMethod: payment.paymentMethod,
      prefillReference: payment.reference,
      prefillNotes: payment.notes,
      prefillInstrument: payment.instrument
    });
    setIsPaymentModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetchInvoices();
    refetchTraites();
    refetchEcheances();
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 pb-12">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 text-white shadow-xl border-b border-slate-800 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/purchases')}
            variant="ghost"
            className="text-slate-400 hover:text-white rounded-full p-2 h-10 w-10 hover:bg-slate-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Gestion des Paiements Fournisseurs
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Workspace Comptable & Trésorerie • {enterprise?.name || 'Élancé'}
            </p>
          </div>
        </div>

        {/* Supplier Selector */}
        <div className="w-full md:w-80">
          <Select
            value={selectedSupplierId?.toString() || ''}
            onValueChange={handleSupplierSelect}
            disabled={loadingSuppliers}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl h-11 text-xs font-semibold focus:ring-amber-500">
              <Building2 className="w-4 h-4 text-slate-400 mr-2" />
              <SelectValue placeholder="Sélectionner un fournisseur..." />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-150 rounded-xl shadow-lg">
              {suppliers.map((sup: any) => (
                <SelectItem
                  key={sup.id}
                  value={sup.id.toString()}
                  className="text-xs font-semibold text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer"
                >
                  {sup.name || `${sup.firstname} ${sup.lastname}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* 1. Projection Chart - Always Displayed */}
        <Card className="rounded-[28px] border-slate-150 shadow-sm overflow-hidden bg-white">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 gap-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-450" />
              <CardTitle className="text-sm font-black text-slate-800">
                Projection des Échéances ({projectionDays} Jours)
              </CardTitle>
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-xl self-end sm:self-auto">
              {([60, 90, 120] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setProjectionDays(days)}
                  className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all ${
                    projectionDays === days
                      ? 'bg-white text-slate-850 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {days} jours
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              {loadingEcheances ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    className="cursor-pointer"
                    onClick={(props: any) => {
                      let data = props?.activePayload?.[0]?.payload?.originalData;
                      
                      if (!data && typeof props?.activeTooltipIndex === 'number') {
                        const index = props.activeTooltipIndex;
                        if (chartData[index]?.originalData) {
                          data = chartData[index].originalData;
                        }
                      }

                      if (data) {
                        setSelectedEcheanceData(data);
                        setIsEcheanceModalOpen(true);
                      }
                    }}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Date: {payload[0].payload.originalData.dueDate ? new Date(payload[0].payload.originalData.dueDate).toLocaleDateString('fr-FR') : ''}
                              </span>
                              <span className="text-xs font-black text-amber-400 font-mono mt-1">
                                {payload[0].value?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium italic mt-1">
                                Cliquer pour voir les détails
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAmount)"
                      activeDot={{ r: 6, fill: '#f59e0b' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-semibold">Aucune projection disponible.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedSupplierId ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Reste à Payer */}
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Reste à Payer
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black font-mono text-slate-850 tracking-tight">
                      {kpis.remaining.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Traites en cours */}
              <div className="bg-sky-50/30 border border-sky-100/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Traites en Cours
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black font-mono text-slate-850 tracking-tight">
                      {kpis.pendingTraites.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Échéances Dépassées */}
              <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Échéances Dépassées
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black font-mono text-rose-800 tracking-tight">
                      {kpis.overdue.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Payé en Banque */}
              <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Payé en Banque
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black font-mono text-emerald-800 tracking-tight">
                      {kpis.paidInBank.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Total Avoirs */}
              <div className="bg-pink-50/30 border border-pink-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-md">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Total Avoirs
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black font-mono text-pink-800 tracking-tight">
                      {kpis.totalCreditNotes.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Invoices */}
              <Card className="rounded-[28px] border-slate-150 shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-800">
                      Factures d&apos;achats
                    </CardTitle>
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 rounded-md px-1.5 py-0.5 mt-1 inline-block uppercase">
                      {selectedSupplier?.name || 'Fournisseur'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">Afficher réglées</span>
                    <Switch
                      checked={showSettledInvoices}
                      onCheckedChange={(checked) => setShowSettledInvoices(checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingInvoices ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-800 mx-auto" />
                    </div>
                  ) : filteredInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-3 px-5">N° Facture</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4 text-right">Total TTC</th>
                            <th className="py-3 px-4 text-right">Reste</th>
                            <th className="py-3 px-5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredInvoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="py-3.5 px-5 text-xs font-bold text-slate-800 font-mono">
                                {inv.docnumber}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                                {new Date(inv.updatedate).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-bold text-slate-650 text-right font-mono">
                                {inv.total_net_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-black text-slate-900 text-right font-mono group-hover:text-amber-600 transition-colors">
                                {inv.remaining_balance.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <Button
                                  onClick={() => triggerCreatePayment(inv)}
                                  size="sm"
                                  className="h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] gap-1 px-3.5 shadow-sm"
                                  disabled={inv.remaining_balance <= 0.005}
                                >
                                  <Plus className="w-3.5 h-3.5" /> Payer
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400 bg-slate-50/50">
                      <p className="text-xs font-semibold">Aucune facture enregistrée pour ce fournisseur.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Traites / Chèques */}
              <Card className="rounded-[28px] border-slate-150 shadow-sm overflow-hidden bg-white border-l-2 border-l-amber-500/50">
                <CardHeader className="px-6 py-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-black text-slate-800">
                    Suivi des Traites / Chèques
                  </CardTitle>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 mt-1 inline-block uppercase">
                    Portefeuille d&apos;effets engagés
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingTraites ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-800 mx-auto" />
                    </div>
                  ) : traites.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-3 px-5">Mode</th>
                            <th className="py-3 px-4">Effet / Banque</th>
                            <th className="py-3 px-4">Échéance</th>
                            <th className="py-3 px-4 text-right">Montant</th>
                            <th className="py-3 px-5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {traites.map((traite: any, idx: number) => {
                            const isPast = isOverdue(traite);
                            return (
                              <tr
                                key={traite.id ? `${traite.id}-${idx}` : idx}
                                className={`hover:bg-slate-50/50 transition-colors group ${
                                  isPast ? 'bg-rose-50/15' : ''
                                }`}
                              >
                                <td className="py-3.5 px-5">
                                  <span
                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                      traite.paymentMethod === 'CHEQUE'
                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}
                                  >
                                    {traite.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                                  <div className="flex flex-col">
                                    <span className="font-mono font-bold">N° {traite.instrument?.instrumentNumber || '---'}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{traite.instrument?.bank || 'Sans banque'}</span>
                                  </div>
                                </td>
                                <td
                                  className={`py-3.5 px-4 text-xs font-bold font-mono ${
                                    isPast ? 'text-rose-600' : 'text-slate-550'
                                  }`}
                                >
                                  {traite.instrument?.dueDate
                                    ? new Date(traite.instrument.dueDate).toLocaleDateString('fr-FR')
                                    : '---'}
                                  {isPast && (
                                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[8px] font-black h-4 px-1.5 ml-1.5 uppercase hover:bg-rose-100">
                                      Dépassé
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-xs font-black text-slate-850 text-right font-mono">
                                  {traite.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                </td>
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {traite.instrument?.isPaidAtBank ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Payé
                                      </span>
                                    ) : (
                                      <>
                                        <Button
                                          onClick={() => triggerEditPayment(traite)}
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 rounded-full text-slate-550 hover:bg-slate-100 hover:text-slate-800"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>

                                        <Button
                                          onClick={() => handleMarkAsPaid(traite)}
                                          size="sm"
                                          className="h-8 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-400 font-bold text-[10px] gap-1 px-3 shadow-xs border border-slate-850"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Banque
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400 bg-slate-50/50">
                      <p className="text-xs font-semibold">Aucun instrument à échéance enregistré.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-150 rounded-[32px] p-8 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100/80 flex items-center justify-center text-slate-450 mb-4">
              <Building2 className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              Aucun fournisseur sélectionné
            </h2>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1 font-medium leading-relaxed">
              Veuillez sélectionner un fournisseur dans le menu de sélection en haut à droite pour consulter la situation de ses factures d&apos;achats et effectuer de nouveaux règlements.
            </p>
            <div className="flex items-center gap-1.5 text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-6">
              <span>Choisir un fournisseur</span>
              <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* 5. Modals */}
      {isPaymentModalOpen && paymentModalData && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentModalData(null);
          }}
          onSuccess={handleModalSuccess}
          data={paymentModalData}
        />
      )}

      {isEcheanceModalOpen && selectedEcheanceData && (
        <EcheanceDetailsModal
          isOpen={isEcheanceModalOpen}
          onClose={() => {
            setIsEcheanceModalOpen(false);
            setSelectedEcheanceData(null);
          }}
          data={selectedEcheanceData}
          suppliers={suppliers}
          onSelectSupplier={(id) => {
            setSelectedSupplierId(id);
            router.push(`/purchases/payments?supplierId=${id}`, { scroll: false });
          }}
        />
      )}
    </div>
  );
}

export default function SupplierPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase font-mono">Chargement des paiements...</p>
        </div>
      </div>
    }>
      <SupplierPaymentsPageContent />
    </Suspense>
  );
}
