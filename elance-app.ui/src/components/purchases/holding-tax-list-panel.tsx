'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
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

// Month labels (French) — 0-indexed to match Date.getMonth()
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface HoldingTaxListPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HoldingTaxListPanel({ isOpen, onClose }: HoldingTaxListPanelProps) {
  // Period navigation state (defaults to current month)
  const today = new Date();
  const [periodDate, setPeriodDate] = useState<Date>(today);
  const month = periodDate.getMonth();     // 0-indexed
  const year  = periodDate.getFullYear();

  // Raw data from API + loading flag
  const [items, setItems]       = useState<HoldingTaxSummary[]>([]);
  const [loading, setLoading]   = useState(false);

  // Client-side search filters
  const [searchDoc,      setSearchDoc]      = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');

  // ── Fetch on period change (or when panel opens) ─────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    holdingTaxService
      .getAll(month + 1, year)   // API expects 1-indexed month
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) toast.error('Impossible de charger les retenues.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isOpen, month, year]);

  // ── Period navigation helpers ─────────────────────────────────────────────
  const goToPrevMonth = () =>
    setPeriodDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });

  const goToNextMonth = () =>
    setPeriodDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const docTerm      = searchDoc.trim().toLowerCase();
    const supplierTerm = searchSupplier.trim().toLowerCase();
    return items.filter((rs) => {
      const matchDoc      = !docTerm      || (rs.docNumber      ?? '').toLowerCase().includes(docTerm);
      const matchSupplier = !supplierTerm || (rs.counterPartName ?? '').toLowerCase().includes(supplierTerm);
      return matchDoc && matchSupplier;
    });
  }, [items, searchDoc, searchSupplier]);

  // ── KPI aggregates from filtered list ────────────────────────────────────
  const kpi = useMemo(() => ({
    total:    filtered.reduce((s, r) => s + (r.taxValue ?? 0), 0),
    signed:   filtered.filter((r) => r.isSigned).reduce((s, r) => s + (r.taxValue ?? 0), 0),
    pending:  filtered.filter((r) => !r.isSigned).reduce((s, r) => s + (r.taxValue ?? 0), 0),
    countSigned:  filtered.filter((r) =>  r.isSigned).length,
    countPending: filtered.filter((r) => !r.isSigned).length,
  }), [filtered]);

  // ── Number formatter (Tunisian accounting style) ──────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Overlay ───────────────────────────────────────────────────── */}
          <motion.div
            key="rs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
          />

          {/* ── Slide-over panel ──────────────────────────────────────────── */}
          <motion.div
            key="rs-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white shadow-2xl border-l border-slate-100"
          >
            {/* ── Panel Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Landmark className="w-4.5 h-4.5 text-indigo-700" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                    Retenues à la Source
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Factures Fournisseurs
                  </p>
                </div>
                {/* Live count badge */}
                {!loading && (
                  <span className="ml-1 h-5 px-2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center">
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

            {/* ── Period Navigator ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 bg-indigo-950 border-b border-indigo-900">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevMonth}
                className="h-8 w-8 text-indigo-300 hover:bg-indigo-900 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm font-extrabold text-white tracking-tight">
                  {MONTHS_FR[month]} {year}
                </p>
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                  Période comptable
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8 text-indigo-300 hover:bg-indigo-900 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* ── KPI Strip ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40">
              {/* Total RS */}
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">
                  Total RS
                </p>
                <p className="font-mono font-extrabold text-sm text-indigo-900">{fmt(kpi.total)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
              {/* Signé TEJ */}
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-mono mb-0.5 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Signé TEJ ({kpi.countSigned})
                </p>
                <p className="font-mono font-extrabold text-sm text-emerald-700">{fmt(kpi.signed)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
              {/* En attente */}
              <div className="px-5 py-3 text-center">
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest font-mono mb-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> En attente ({kpi.countPending})
                </p>
                <p className="font-mono font-extrabold text-sm text-amber-800">{fmt(kpi.pending)}</p>
                <p className="text-[9px] text-slate-400 font-mono">DT</p>
              </div>
            </div>

            {/* ── Search Filters ──────────────────────────────────────────── */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-slate-100 bg-white">
              {/* Filter by document number */}
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="N° Facture…"
                  className="pl-8 h-9 text-xs font-semibold border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-200"
                />
              </div>
              {/* Filter by supplier name */}
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchSupplier}
                  onChange={(e) => setSearchSupplier(e.target.value)}
                  placeholder="Fournisseur…"
                  className="pl-8 h-9 text-xs font-semibold border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* ── List ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading ? (
                /* Loading skeleton */
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[72px] rounded-2xl bg-slate-100 animate-pulse"
                  />
                ))
              ) : filtered.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-600 text-sm">Aucune retenue trouvée</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Aucune RS enregistrée pour {MONTHS_FR[month]} {year}.
                    </p>
                  </div>
                </div>
              ) : (
                /* RS rows */
                filtered.map((rs) => (
                  <div
                    key={rs.id}
                    className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Left: document + supplier info */}
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
                      <p className="text-[11px] font-semibold text-slate-500 truncate max-w-[220px]">
                        {rs.counterPartName ?? '—'}
                      </p>
                      {rs.reference && (
                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-[220px]">
                          Réf: {rs.reference}
                        </p>
                      )}
                    </div>

                    {/* Right: amounts + date */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="font-mono font-extrabold text-sm text-indigo-900">
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
