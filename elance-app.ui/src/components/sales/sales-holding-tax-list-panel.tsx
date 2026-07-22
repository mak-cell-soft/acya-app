'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Landmark,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { holdingTaxService, HoldingTaxSummary } from '@/services/components/holding-tax.service';
import { toast } from 'sonner';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

interface SalesHoldingTaxListPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesHoldingTaxListPanel({ isOpen, onClose }: SalesHoldingTaxListPanelProps) {
  const today = new Date();
  const [periodDate, setPeriodDate] = useState<Date>(today);
  const month = periodDate.getMonth();
  const year  = periodDate.getFullYear();

  const [items, setItems]     = useState<HoldingTaxSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchDoc, setSearchDoc]           = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    holdingTaxService
      .getAllCustomer(month + 1, year)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) toast.error('Impossible de charger les retenues client.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isOpen, month, year]);

  const goToPrevMonth = () =>
    setPeriodDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });

  const goToNextMonth = () =>
    setPeriodDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });

  const filtered = useMemo(() => {
    const docTerm      = searchDoc.trim().toLowerCase();
    const customerTerm = searchCustomer.trim().toLowerCase();
    return items.filter((rs) => {
      const matchDoc      = !docTerm      || (rs.docNumber      ?? '').toLowerCase().includes(docTerm);
      const matchCustomer = !customerTerm || (rs.counterPartName ?? '').toLowerCase().includes(customerTerm);
      return matchDoc && matchCustomer;
    });
  }, [items, searchDoc, searchCustomer]);

  const kpi = useMemo(() => ({
    total:        filtered.reduce((s, r) => s + (r.taxValue ?? 0), 0),
    signed:       filtered.filter((r) => r.isSigned).reduce((s, r) => s + (r.taxValue ?? 0), 0),
    pending:      filtered.filter((r) => !r.isSigned).reduce((s, r) => s + (r.taxValue ?? 0), 0),
    countSigned:  filtered.filter((r) =>  r.isSigned).length,
    countPending: filtered.filter((r) => !r.isSigned).length,
  }), [filtered]);

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="sales-rs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.div
            key="sales-rs-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white shadow-2xl border-l border-slate-100 font-sans"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-amber-50/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center">
                  <Landmark className="w-4.5 h-4.5 text-amber-800" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                    Retenues à la Source (RS)
                  </h2>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest font-mono">
                    Factures Client
                  </p>
                </div>
                {!loading && (
                  <span className="ml-1 h-5 px-2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center">
                    {filtered.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Period Navigator */}
            <div className="flex items-center justify-between px-6 py-3 bg-corp-blue-950 border-b border-corp-blue-900">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevMonth}
                className="h-8 w-8 text-corp-blue-300 hover:bg-corp-blue-900 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm font-extrabold text-white tracking-tight">
                  {MONTHS_FR[month]} {year}
                </p>
                <p className="text-[9px] font-bold text-corp-blue-400 uppercase tracking-widest font-mono">
                  Période comptable
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8 text-corp-blue-300 hover:bg-corp-blue-900 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40">
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">
                  Total RS Client
                </p>
                <p className="font-mono font-extrabold text-sm text-corp-blue-950">{fmt(kpi.total)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-mono mb-0.5 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Signé ({kpi.countSigned})
                </p>
                <p className="font-mono font-extrabold text-sm text-emerald-700">{fmt(kpi.signed)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest font-mono mb-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> En attente ({kpi.countPending})
                </p>
                <p className="font-mono font-extrabold text-sm text-amber-800">{fmt(kpi.pending)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
            </div>

            {/* Search Filters */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="N° Facture…"
                  className="pl-8 h-9 text-xs font-semibold border-slate-200 rounded-xl focus:border-corp-blue-400 focus:ring-corp-blue-200"
                />
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  placeholder="Client…"
                  className="pl-8 h-9 text-xs font-semibold border-slate-200 rounded-xl focus:border-corp-blue-400 focus:ring-corp-blue-200"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[72px] rounded-2xl bg-slate-100 animate-pulse"
                  />
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-sm">Aucune retenue client trouvée</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Aucune RS enregistrée pour {MONTHS_FR[month]} {year}.
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map((rs) => (
                  <div
                    key={rs.id}
                    className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 hover:border-amber-200 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Left: document + customer info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {rs.docNumber ?? '—'}
                        </span>
                        <Badge
                          className={cn(
                            'rounded-full px-2 py-0 text-[9px] font-bold uppercase tracking-wide border',
                            rs.isSigned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {rs.isSigned ? '✓ Signé TEJ' : 'En attente'}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[220px]">
                        {rs.counterPartName ?? '—'}
                      </p>
                      {rs.reference && (
                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]">
                          Réf: {rs.reference}
                        </p>
                      )}
                    </div>

                    {/* Right: amounts + date */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="font-mono font-extrabold text-sm text-corp-blue-950">
                        {fmt(rs.taxValue ?? 0)} DT
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        RS {rs.taxPercentage}%
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {rs.creationDate
                          ? new Date(rs.creationDate).toLocaleDateString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
