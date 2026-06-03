'use client';

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Customer } from "@/types/customer";
import { 
  X, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar as CalendarIcon,
  Filter,
  Download,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerStatement } from "@/hooks/use-customer-account";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { PrintVariantDialog } from "@/components/print/print-trigger-button";

interface CustomerAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerAccountDialog({
  isOpen,
  onClose,
  customer
}: CustomerAccountDialogProps) {
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const pageSize = 8;

  const { data: statement, isLoading, isFetching } = useCustomerStatement(
    customer?.id || 0,
    startDate,
    endDate,
    isOpen
  );

  if (!customer) return null;

  const transactions = statement?.transactions || [];
  const totalPages = Math.ceil(transactions.length / pageSize);
  const paginatedTransactions = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getDocTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'Invoice': 'Facture',
      'DeliveryNote': 'Bon de Livraison',
      'Payment': 'Paiement',
      'CreditNote': 'Avoir',
      'OpeningBalance': 'Solde Initial'
    };
    return types[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        NOTE: We use 'w-full max-w-full sm:max-w-xl md:max-w-5xl lg:max-w-7xl' here to explicitly override 
        the default 'sm:max-w-md' defined in the base DialogContent component (components/ui/dialog.tsx).
        Without specifying these responsive breakpoint overrides, Tailwind specificity would keep the 
        dialog restricted to md width even on desktop viewports.
      */}
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-5xl lg:max-w-7xl h-[90vh] p-0 overflow-hidden border-forest-100 shadow-2xl rounded-[32px] bg-white flex flex-col">
        <DialogHeader className="p-8 bg-forest-900 text-white relative flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-forest-800 flex items-center justify-center border border-forest-700 text-emerald-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                  État de Compte
                </DialogTitle>
                <p className="text-forest-300 text-sm font-medium mt-1">
                  Situation financière de {customer.firstname} {customer.lastname}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-forest-800/50 p-1.5 rounded-2xl border border-forest-700">
                <DatePicker 
                  date={startDate} 
                  setDate={(d) => d && setStartDate(d)} 
                  className="h-9 w-40 bg-transparent border-none text-white hover:bg-forest-700" 
                />
                <span className="text-forest-500 font-bold px-1">au</span>
                <DatePicker 
                  date={endDate} 
                  setDate={(d) => d && setEndDate(d)} 
                  className="h-9 w-40 bg-transparent border-none text-white hover:bg-forest-700" 
                />
              </div>
              <Button 
                variant="outline" 
                className="h-11 rounded-xl bg-forest-800 border-forest-700 text-white hover:bg-forest-700"
                onClick={() => setIsPrintOpen(true)}
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimer
              </Button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-8 bg-sand-50/20">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-[28px] bg-white border border-forest-50 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center text-forest-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <Badge className="bg-sand-100 text-sand-500 border-none font-bold">Initial</Badge>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Solde d'Ouverture</p>
                <p className="text-xl font-bold text-forest-900">
                  {statement?.openingBalance?.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[28px] bg-white border border-forest-50 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <Badge className="bg-rose-100 text-rose-600 border-none font-bold">Débit</Badge>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Total Débit</p>
                <p className="text-xl font-bold text-rose-600">
                  {statement?.totalDebit?.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[28px] bg-white border border-forest-50 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold">Crédit</Badge>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Total Crédit</p>
                <p className="text-xl font-bold text-emerald-600">
                  {statement?.totalCredit?.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-forest-900 text-white shadow-xl space-y-3 relative overflow-hidden group">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
                <CreditCard className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-400/20 text-emerald-400 border-none font-bold">Solde Final</Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[0.65rem] font-bold text-forest-300 uppercase tracking-widest">Solde Clôture</p>
                <p className="text-2xl font-bold text-white">
                  {statement?.closingBalance?.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                  <span className="text-xs ml-2 text-forest-400 font-medium">TND</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 bg-white rounded-[32px] border border-forest-50 shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-sand-50 border-b border-forest-50">
                    <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Date</th>
                    <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Document / Type</th>
                    <th className="p-5 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Description</th>
                    <th className="p-5 text-[0.65rem] font-bold text-rose-600 uppercase tracking-widest text-right">Débit</th>
                    <th className="p-5 text-[0.65rem] font-bold text-emerald-600 uppercase tracking-widest text-right">Crédit</th>
                    <th className="p-5 text-[0.65rem] font-bold text-forest-900 uppercase tracking-widest text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {isLoading || isFetching ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-forest-100 border-t-forest-600 rounded-full animate-spin" />
                          <p className="text-sand-400 font-bold text-sm">Chargement du grand livre...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-sand-50/50 transition-colors group">
                        <td className="p-5">
                          <span className="text-sm font-bold text-forest-900">
                            {format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              tx.debit > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {tx.debit > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-forest-900">{getDocTypeLabel(tx.type)}</div>
                              <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-tighter">REF: {tx.relatedId || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <p className="text-xs text-sand-500 font-medium max-w-xs truncate">{tx.description || "—"}</p>
                          {tx.relatedDeliveryNoteRefs && tx.relatedDeliveryNoteRefs.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {tx.relatedDeliveryNoteRefs.map(ref => (
                                <Badge key={ref} variant="outline" className="text-[0.55rem] px-1 py-0 border-forest-100 text-sand-400">{ref}</Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-5 text-right font-bold text-rose-600">
                          {tx.debit > 0 ? tx.debit.toLocaleString('fr-TN', { minimumFractionDigits: 3 }) : "—"}
                        </td>
                        <td className="p-5 text-right font-bold text-emerald-600">
                          {tx.credit > 0 ? tx.credit.toLocaleString('fr-TN', { minimumFractionDigits: 3 }) : "—"}
                        </td>
                        <td className="p-5 text-right">
                          <span className={cn(
                            "text-sm font-bold px-3 py-1 rounded-lg",
                            tx.runningBalance < 0 ? "bg-rose-50 text-rose-700" : "bg-forest-50 text-forest-900"
                          )}>
                            {tx.runningBalance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <FileText className="w-12 h-12" />
                          <p className="text-sand-400 font-bold">Aucune transaction trouvée sur cette période</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-forest-50 flex items-center justify-between bg-white">
                <p className="text-sm text-sand-400 font-medium">
                  Page {currentPage} sur {totalPages} ({transactions.length} écritures)
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 font-bold border-forest-50"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Précédent
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 font-bold border-forest-50"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <PrintVariantDialog
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        docType="customer-statement"
        statement={statement}
        counterpart={customer}
        periodStart={startDate}
        periodEnd={endDate}
        statementType="customer"
      />
    </Dialog>
  );
}
