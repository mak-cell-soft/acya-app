'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllSupplierTraites } from '@/hooks/use-payments';
import { useSuppliers } from '@/hooks/use-suppliers';
import { Payment } from '@/types/payment';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AllTraitesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllTraitesDialog({ isOpen, onClose }: AllTraitesDialogProps) {
  // Queries
  const { data: rawPayments = [], isLoading: loadingPayments } = useAllSupplierTraites();
  const { data: suppliers = [] } = useSuppliers();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sorting
  const [sortField, setSortField] = useState<'dueDate' | 'amount'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Helper to map customerId to Supplier name
  const getSupplierName = (customerId: number) => {
    const s = suppliers.find((sup) => sup.id === customerId);
    if (!s) return `Fournisseur #${customerId}`;
    return s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || `Fournisseur #${customerId}`;
  };

  // Selected supplier name for display in Select trigger
  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === 'all') return 'Tous les fournisseurs';
    const supId = parseInt(selectedSupplierId);
    return getSupplierName(supId);
  }, [selectedSupplierId, suppliers]);

  // Check if a payment/traite is overdue
  const isOverdue = (payment: Payment) => {
    if (!payment.instrument?.dueDate || payment.instrument.isPaidAtBank) return false;
    const due = new Date(payment.instrument.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Filter & Sort payments client-side
  const filteredAndSortedPayments = useMemo(() => {
    let result = [...rawPayments];

    // Search query filter (checks instrument number, bank name, reference)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.instrument?.instrumentNumber?.toLowerCase().includes(q) ||
          p.instrument?.bank?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          getSupplierName(p.customerId).toLowerCase().includes(q)
      );
    }

    // Supplier filter
    if (selectedSupplierId !== 'all') {
      const supId = parseInt(selectedSupplierId);
      result = result.filter((p) => p.customerId === supId);
    }

    // Begin/Start Date filter (checks instrument due date)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((p) => {
        if (!p.instrument?.dueDate) return false;
        const due = new Date(p.instrument.dueDate);
        return due >= start;
      });
    }

    // End/Last Date filter
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((p) => {
        if (!p.instrument?.dueDate) return false;
        const due = new Date(p.instrument.dueDate);
        return due <= end;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else {
        valA = a.instrument?.dueDate ? new Date(a.instrument.dueDate).getTime() : 0;
        valB = b.instrument?.dueDate ? new Date(b.instrument.dueDate).getTime() : 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [rawPayments, searchQuery, selectedSupplierId, startDate, endDate, sortField, sortAsc, suppliers]);

  // Grouped results (if grouping is enabled)
  const groupedPayments = useMemo(() => {
    if (!groupBySupplier) return null;

    const groups: Record<number, { supplierName: string; payments: Payment[]; total: number }> = {};

    filteredAndSortedPayments.forEach((p) => {
      const sId = p.customerId;
      if (!groups[sId]) {
        groups[sId] = {
          supplierName: getSupplierName(sId),
          payments: [],
          total: 0,
        };
      }
      groups[sId].payments.push(p);
      groups[sId].total += p.amount || 0;
    });

    // Convert object to sorted array of groups by supplier name
    return Object.values(groups).sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  }, [filteredAndSortedPayments, groupBySupplier, suppliers]);

  // Totals calculations
  const totals = useMemo(() => {
    let countCheque = 0;
    let amountCheque = 0;
    let countTraite = 0;
    let amountTraite = 0;
    let countOverdue = 0;
    let amountOverdue = 0;

    filteredAndSortedPayments.forEach((p) => {
      if (p.paymentMethod === 'CHEQUE') {
        countCheque++;
        amountCheque += p.amount || 0;
      } else if (p.paymentMethod === 'TRAITE') {
        countTraite++;
        amountTraite += p.amount || 0;
      }

      if (isOverdue(p)) {
        countOverdue++;
        amountOverdue += p.amount || 0;
      }
    });

    return {
      countCheque,
      amountCheque,
      countTraite,
      amountTraite,
      countOverdue,
      amountOverdue,
      totalAmount: amountCheque + amountTraite,
      totalCount: filteredAndSortedPayments.length,
    };
  }, [filteredAndSortedPayments]);

  const handleSort = (field: 'dueDate' | 'amount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleGroupCollapse = (supplierName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [supplierName]: !prev[supplierName],
    }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSupplierId('all');
    setStartDate('');
    setEndDate('');
  };

  const handlePrintReport = () => {
    const supplierText = selectedSupplierId === 'all' ? 'Tous' : getSupplierName(parseInt(selectedSupplierId));
    const dateRangeText = (startDate || endDate) 
      ? `Du ${startDate || 'début'} au ${endDate || 'fin'}`
      : 'Tous';
    const searchQueryText = searchQuery ? `"${searchQuery}"` : 'Aucun';

    let tableRowsHtml = '';
    if (groupBySupplier && groupedPayments) {
      groupedPayments.forEach((group) => {
        tableRowsHtml += `
          <tr class="group-header">
            <td colspan="5" style="font-weight: 800; background-color: #fef3c7; color: #92400e;">
              ${group.supplierName} (${group.payments.length} ${group.payments.length > 1 ? 'effets' : 'effet'})
            </td>
            <td class="text-right" style="font-weight: 800; background-color: #fef3c7; color: #92400e;">
              Sous-total: ${group.total.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
            </td>
          </tr>
        `;
        group.payments.forEach((p) => {
          const isPast = isOverdue(p);
          const statusText = p.instrument?.isPaidAtBank 
            ? '<span class="badge badge-paid">Décaissé</span>' 
            : isPast 
              ? '<span class="badge badge-overdue">Dépassé</span>' 
              : '<span class="badge badge-pending">En cours</span>';

          tableRowsHtml += `
            <tr>
              <td>${p.paymentMethod}</td>
              <td>N° ${p.instrument?.instrumentNumber || '---'}</td>
              <td>${p.instrument?.bank || 'Sans banque'}</td>
              <td class="${isPast ? 'badge-overdue-text' : ''}">${p.instrument?.dueDate ? new Date(p.instrument.dueDate).toLocaleDateString('fr-FR') : '---'}</td>
              <td>${statusText}</td>
              <td class="text-right font-mono" style="font-weight: 700;">${p.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</td>
            </tr>
          `;
        });
      });
    } else {
      filteredAndSortedPayments.forEach((p) => {
        const isPast = isOverdue(p);
        const statusText = p.instrument?.isPaidAtBank 
          ? '<span class="badge badge-paid">Décaissé</span>' 
          : isPast 
            ? '<span class="badge badge-overdue">Dépassé</span>' 
            : '<span class="badge badge-pending">En cours</span>';

        tableRowsHtml += `
          <tr>
            <td style="font-weight: 600;">${getSupplierName(p.customerId)}</td>
            <td>${p.paymentMethod}</td>
            <td>N° ${p.instrument?.instrumentNumber || '---'} / ${p.instrument?.bank || 'Sans banque'}</td>
            <td class="${isPast ? 'badge-overdue-text' : ''}">${p.instrument?.dueDate ? new Date(p.instrument.dueDate).toLocaleDateString('fr-FR') : '---'}</td>
            <td>${statusText}</td>
            <td class="text-right font-mono" style="font-weight: 700;">${p.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</td>
          </tr>
        `;
      });
    }

    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport des Traites / Chèques Fournisseurs</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; font-size: 11px; }
            h1 { font-size: 16px; font-weight: 800; margin: 0 0 5px 0; color: #0f172a; }
            .subtitle { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 15px; }
            .filters { display: flex; flex-wrap: wrap; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 15px; }
            .filter-item { font-size: 10px; }
            .filter-label { font-weight: 700; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; padding: 6px 10px; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 9px; color: #475569; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .badge { display: inline-flex; align-items: center; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
            .badge-paid { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            .badge-overdue { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .badge-pending { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .badge-overdue-text { color: #991b1b; font-weight: bold; }
            .totals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; page-break-inside: avoid; }
            .total-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
            .total-card-cheque { background-color: #eff6ff; border-color: #bfdbfe; }
            .total-card-traite { background-color: #fffbeb; border-color: #fde68a; }
            .total-card-overdue { background-color: #fef2f2; border-color: #fca5a5; }
            .total-card-global { background-color: #ecfdf5; border-color: #a7f3d0; }
            .total-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .total-val { font-size: 12px; font-weight: 800; font-family: monospace; margin-top: 2px; }
            @media print {
              body { padding: 0; }
              @page { size: A4 landscape; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Rapport des Traites / Chèques Fournisseurs</h1>
          <div class="subtitle">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
          
          <div class="filters">
            <div class="filter-item"><span class="filter-label">Fournisseur :</span> ${supplierText}</div>
            <div class="filter-item"><span class="filter-label">Période :</span> ${dateRangeText}</div>
            <div class="filter-item"><span class="filter-label">Recherche :</span> ${searchQueryText}</div>
            <div class="filter-item"><span class="filter-label">Groupement :</span> ${groupBySupplier ? 'Par Fournisseur' : 'Aucun'}</div>
          </div>

          <table>
            <thead>
              <tr>
                ${!groupBySupplier ? '<th>Fournisseur</th>' : ''}
                <th>Mode</th>
                <th>Numéro d\'effet</th>
                <th>Banque</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="totals-grid">
            <div class="total-card total-card-cheque">
              <div class="total-label">Total Chèques (${totals.countCheque})</div>
              <div class="total-val">${totals.amountCheque.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</div>
            </div>
            <div class="total-card total-card-traite">
              <div class="total-label">Total Traites (${totals.countTraite})</div>
              <div class="total-val">${totals.amountTraite.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</div>
            </div>
            <div class="total-card total-card-overdue">
              <div class="total-label">Dépassés (${totals.countOverdue})</div>
              <div class="total-val" style="color: #991b1b;">${totals.amountOverdue.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</div>
            </div>
            <div class="total-card total-card-global">
              <div class="total-label">Montant Global (${totals.totalCount})</div>
              <div class="total-val" style="color: #047857;">${totals.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = window.document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    window.document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(docHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      }
      setTimeout(() => window.document.body.removeChild(iframe), 1000);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl w-full p-0 overflow-hidden rounded-[24px] border border-slate-150 bg-[#faf9f6] text-slate-800 shadow-2xl h-[90vh] flex flex-col">
        {/* Header toolbar */}
        <DialogHeader className="px-6 py-5 bg-white border-b border-slate-150 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                Rapport Global des Traites / Chèques Fournisseurs
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Vue d&apos;ensemble et projection de tous les effets en portefeuille
              </DialogDescription>
            </div>
          </div>
          <Button
            onClick={handlePrintReport}
            className="bg-corp-blue-50 text-corp-blue-700 hover:bg-corp-blue-100 font-bold text-xs gap-2 rounded-xl h-10 px-4 mr-8 border border-slate-200 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </DialogHeader>

        {/* Filters strip */}
        <div className="bg-white border-b border-slate-150 p-5 grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0 shadow-xs">
          {/* Supplier dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fournisseur</Label>
            <Select value={selectedSupplierId} onValueChange={(val) => setSelectedSupplierId(val || 'all')}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold focus:ring-corp-blue-500 shadow-xs">
                <SelectValue placeholder="Tous les fournisseurs">
                  {selectedSupplierName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                <SelectItem value="all" className="text-xs font-semibold text-slate-700">
                  Tous les fournisseurs
                </SelectItem>
                {suppliers.map((s) => {
                  const name = s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || `Fournisseur #${s.id}`;
                  return (
                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs font-semibold text-slate-700">
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Search query input */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rechercher</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="N° effet, banque, réf..."
                className="h-10 pl-9 rounded-xl border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:ring-corp-blue-500 shadow-xs"
              />
            </div>
          </div>

          {/* Start date */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date Début (échéance)</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-xl border-slate-200 text-xs font-semibold focus:ring-corp-blue-500 shadow-xs"
            />
          </div>

          {/* End date */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date Fin (échéance)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-xl border-slate-200 text-xs font-semibold focus:ring-corp-blue-500 shadow-xs"
            />
          </div>

          {/* Toggle + clear buttons */}
          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-5 md:pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" htmlFor="groupBySup">
                Grouper
              </Label>
              <Switch id="groupBySup" checked={groupBySupplier} onCheckedChange={setGroupBySupplier} />
            </div>
            
            {(searchQuery || selectedSupplierId !== 'all' || startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="text-[10px] font-black text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5 transition-all"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 bg-[#faf9f6]">
          {loadingPayments ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chargement des effets...</p>
            </div>
          ) : filteredAndSortedPayments.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {!groupBySupplier && <th className="py-3 px-5">Fournisseur</th>}
                    <th className="py-3 px-5">Mode</th>
                    <th className="py-3 px-4">Effet / Banque</th>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('dueDate')}>
                      <div className="flex items-center gap-1">
                        Échéance
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-5 text-right cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">
                        Montant
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                  </tr>
                </thead>

                {groupBySupplier && groupedPayments ? (
                  // Grouped display
                  <tbody className="divide-y divide-slate-150">
                    {groupedPayments.map((group) => {
                      const isCollapsed = collapsedGroups[group.supplierName];
                      return (
                        <React.Fragment key={group.supplierName}>
                          {/* Group Header Row */}
                          <tr
                            className="bg-amber-50/30 hover:bg-amber-50/50 cursor-pointer transition-colors"
                            onClick={() => toggleGroupCollapse(group.supplierName)}
                          >
                            <td colSpan={5} className="py-3.5 px-5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronDown className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 text-amber-600" />
                                  )}
                                  <span className="text-xs font-black text-slate-800">{group.supplierName}</span>
                                  <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 border-amber-500/20 text-[9px] font-black h-5 px-2">
                                    {group.payments.length} {group.payments.length > 1 ? 'effets' : 'effet'}
                                  </Badge>
                                </div>
                                <div className="text-right flex items-center gap-1.5 font-mono text-xs font-black text-slate-900">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sous-total :</span>
                                  {group.total.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Group Item Rows */}
                          {!isCollapsed &&
                            group.payments.map((p, idx) => {
                              const isPast = isOverdue(p);
                              return (
                                <tr key={`${p.id}-${idx}`} className={`hover:bg-slate-50/50 transition-colors ${isPast ? 'bg-rose-50/10' : ''}`}>
                                  <td className="py-3.5 px-5">
                                    <span
                                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                        p.paymentMethod === 'CHEQUE'
                                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                                          : 'bg-amber-50 text-amber-700 border-amber-100'
                                      }`}
                                    >
                                      {p.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                                    <div className="flex flex-col">
                                      <span className="font-mono font-bold">N° {p.instrument?.instrumentNumber || '---'}</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">{p.instrument?.bank || 'Sans banque'}</span>
                                    </div>
                                  </td>
                                  <td className={`py-3.5 px-4 text-xs font-bold font-mono ${isPast ? 'text-rose-600' : 'text-slate-550'}`}>
                                    {p.instrument?.dueDate ? new Date(p.instrument.dueDate).toLocaleDateString('fr-FR') : '---'}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {p.instrument?.isPaidAtBank ? (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-black hover:bg-emerald-50 px-2 py-0.5">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Décaissé
                                      </Badge>
                                    ) : isPast ? (
                                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] font-black hover:bg-rose-100 px-2 py-0.5">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Dépassé
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-sky-50 text-sky-700 border-sky-100 text-[9px] font-black hover:bg-sky-50 px-2 py-0.5">
                                        <Clock className="w-3 h-3 mr-1" /> En cours
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-mono font-black text-slate-800 text-xs">
                                    {p.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                ) : (
                  // Flat display
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedPayments.map((p, idx) => {
                      const isPast = isOverdue(p);
                      return (
                        <tr key={`${p.id}-${idx}`} className={`hover:bg-slate-50/50 transition-colors ${isPast ? 'bg-rose-50/10' : ''}`}>
                          <td className="py-3.5 px-5 text-xs font-bold text-slate-800">
                            {getSupplierName(p.customerId)}
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                p.paymentMethod === 'CHEQUE'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}
                            >
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold">N° {p.instrument?.instrumentNumber || '---'}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{p.instrument?.bank || 'Sans banque'}</span>
                            </div>
                          </td>
                          <td className={`py-3.5 px-4 text-xs font-bold font-mono ${isPast ? 'text-rose-600' : 'text-slate-550'}`}>
                            {p.instrument?.dueDate ? new Date(p.instrument.dueDate).toLocaleDateString('fr-FR') : '---'}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.instrument?.isPaidAtBank ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-black hover:bg-emerald-50 px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Décaissé
                              </Badge>
                            ) : isPast ? (
                              <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] font-black hover:bg-rose-100 px-2 py-0.5">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Dépassé
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-100 text-[9px] font-black hover:bg-sky-50 px-2 py-0.5">
                                <Clock className="w-3 h-3 mr-1" /> En cours
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-black text-slate-800 text-xs">
                            {p.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 p-8 shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-800">Aucun effet trouvé</p>
              <p className="text-[11px] text-slate-455 mt-1 max-w-sm text-center">
                Aucune traite ou chèque ne correspond aux critères de filtrage sélectionnés.
              </p>
            </div>
          )}
        </div>

        {/* Footer sticky bar */}
        <div className="bg-white border-t border-slate-150 px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 shadow-lg">
          {/* Card 1: Cheques Total */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Chèques ({totals.countCheque})</span>
              <span className="text-sm font-black font-mono text-slate-800">{totals.amountCheque.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</span>
            </div>
          </div>

          {/* Card 2: Traites Total */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Traites ({totals.countTraite})</span>
              <span className="text-sm font-black font-mono text-slate-800">{totals.amountTraite.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</span>
            </div>
          </div>

          {/* Card 3: Overdue Total */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-500 text-white rounded-lg flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-rose-500/80 uppercase tracking-wider block">Dépassés ({totals.countOverdue})</span>
              <span className="text-sm font-black font-mono text-rose-700">{totals.amountOverdue.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</span>
            </div>
          </div>

          {/* Card 4: Global Total */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Montant Global ({totals.totalCount})</span>
              <span className="text-sm font-black font-mono text-emerald-700">{totals.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
