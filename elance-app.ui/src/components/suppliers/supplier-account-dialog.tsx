'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  X, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download,
  Filter,
  Search,
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  FileText,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Supplier } from "@/types/customer";
import { useSupplierStatement } from "@/hooks/use-supplier-account";
import { cn } from "@/lib/utils";
import { PrintVariantDialog } from "@/components/print/print-trigger-button";

interface SupplierAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierAccountDialog({
  isOpen,
  onClose,
  supplier
}: SupplierAccountDialogProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { data: statement, isLoading } = useSupplierStatement(
    supplier?.id || 0,
    dateRange.from,
    dateRange.to,
    isOpen && !!supplier
  );

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        NOTE: We use 'w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-7xl' here to explicitly override 
        the default 'sm:max-w-md' defined in the base DialogContent component (components/ui/dialog.tsx).
        Without specifying these responsive breakpoint overrides, Tailwind specificity would keep the 
        dialog restricted to md width even on desktop/tablet viewports.
      */}
      <DialogContent showCloseButton={false} className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-7xl p-0 overflow-hidden border-slate-200 shadow-2xl rounded-2xl bg-white max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-8 relative flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 text-emerald-600">
                <CreditCard className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-bold tracking-tight">
                  État de Compte Fournisseur
                </DialogTitle>
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                  {supplier.prefix} {supplier.name} — <span className="text-emerald-600">{supplier.taxregistrationnumber}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 border-slate-200 bg-slate-50 text-foreground hover:bg-slate-100 hover:text-slate-900 font-bold px-5">
                    <CalendarIcon className="w-4 h-4 mr-2 text-emerald-600" />
                    {format(dateRange.from, "dd MMM", { locale: fr })} - {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-xl" align="end">
                  <Calendar
                    autoFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                variant="outline" 
                className="h-12 border-slate-200 bg-slate-50 text-foreground hover:bg-corp-blue-700 hover:text-foreground font-bold px-5"
                onClick={() => setIsPrintOpen(true)}
              >
                <Printer className="w-4 h-4 mr-2 text-emerald-600" /> Imprimer
              </Button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-shrink-0">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Solde Avant Période</div>
              <div className="text-xl font-bold text-slate-900">
                {statement?.balanceBeforePeriod.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-xs font-bold text-slate-500">TND</span>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-2">
              <div className="text-[0.65rem] font-bold text-emerald-600 uppercase tracking-widest">Total Achats (Débit)</div>
              <div className="text-xl font-bold text-emerald-700">
                {statement?.totalDebit.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-xs font-bold text-emerald-400">TND</span>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 space-y-2">
              <div className="text-[0.65rem] font-bold text-rose-600 uppercase tracking-widest">Total Règlements (Crédit)</div>
              <div className="text-xl font-bold text-rose-700">
                {statement?.totalCredit.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-xs font-bold text-rose-400">TND</span>
              </div>
            </div>
            <div className="p-6 rounded-[28px] bg-corp-blue-50 border border-corp-blue-200 space-y-2 shadow-xl shadow-corp-blue-900/5">
              <div className="text-[0.65rem] font-bold text-corp-blue-600 uppercase tracking-widest">Solde Final Actuel</div>
              <div className="text-xl font-bold text-corp-blue-900">
                {statement?.closingBalance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-xs font-bold text-corp-blue-600">TND</span>
              </div>
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Rechercher une opération..." 
                className="border-slate-100 bg-slate-50/50 pl-10 text-sm "
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-[1px] bg-corp-blue-100" />
              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-tighter">Afficher</span>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-900 font-bold px-3 py-1 rounded-lg">
                  Toutes les transactions
                </Badge>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 overflow-hidden border border-slate-100 rounded-3xl bg-white shadow-sm flex flex-col">
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-corp-blue-100 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-100">
                  <tr>
                    <th className="p-5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="p-5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Type / Libellé</th>
                    <th className="p-5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Débit (Achat)</th>
                    <th className="p-5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Crédit (Paiement)</th>
                    <th className="p-5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Solde Progressif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-blue-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 border-4 border-slate-200 border-t-corp-blue-600 rounded-full animate-spin" />
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Chargement du relevé...</p>
                        </div>
                      </td>
                    </tr>
                  ) : statement?.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <p className="text-sm font-bold text-slate-500">Aucune transaction sur cette période</p>
                      </td>
                    </tr>
                  ) : (
                    statement?.transactions.map((tx, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <div className="text-sm font-bold text-slate-900">
                            {format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: fr })}
                          </div>
                          <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-tighter">
                            {format(new Date(tx.transactionDate), "HH:mm")}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              tx.debit > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {tx.debit > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{tx.type}</div>
                              <div className="text-xs text-slate-500 font-medium max-w-xs truncate">
                                {tx.description || `Opération n°${tx.id}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-right font-mono font-bold text-slate-900">
                          {tx.debit > 0 ? tx.debit.toLocaleString('fr-TN', { minimumFractionDigits: 3 }) : "-"}
                        </td>
                        <td className="p-5 text-right font-mono font-bold text-slate-900">
                          {tx.credit > 0 ? tx.credit.toLocaleString('fr-TN', { minimumFractionDigits: 3 }) : "-"}
                        </td>
                        <td className="p-5 text-right">
                          <Badge variant="outline" className={cn(
                            "font-mono font-black border-transparent text-sm",
                            tx.runningBalance < 0 ? "text-rose-600 bg-rose-50/50" : "text-emerald-600 bg-emerald-50/50"
                          )}>
                            {tx.runningBalance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer Summary */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest">
                {statement?.transactions.length || 0} Transactions affichées
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-[0.6rem] font-bold text-slate-500 uppercase">Cumul Débit</div>
                  <div className="text-sm font-bold text-emerald-700">{statement?.totalDebit.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</div>
                </div>
                <div className="text-right">
                  <div className="text-[0.6rem] font-bold text-slate-500 uppercase">Cumul Crédit</div>
                  <div className="text-sm font-bold text-rose-700">{statement?.totalCredit.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <PrintVariantDialog
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        docType="supplier-statement"
        statement={statement}
        counterpart={supplier}
        periodStart={dateRange.from}
        periodEnd={dateRange.to}
        statementType="supplier"
      />
    </Dialog>
  );
}


