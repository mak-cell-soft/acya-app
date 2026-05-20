'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useCustomerStatement } from '@/hooks/use-customer-account';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface CustomerStatementCardProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

const DOC_TYPES_FR: Record<string, string> = {
  supplierOrder: "Bon de Commande Fournisseur",
  supplierReceipt: "Bon de Réception",
  supplierInvoice: "Facture Achat",
  customerOrder: "Bon de Commande Client",
  customerDeliveryNote: "Bon de Livraison",
  customerInvoice: "Facture Vente",
  stockTransfer: "Transfert de Stock",
  inventory: "Inventaire",
  customerQuote: "Devis Client",
  customerInvoiceReturn: "Avoir Client",
  supplierInvoiceReturn: "Avoir Fournisseur",
  payment: "Paiement"
};

export function CustomerStatementCard({ customer, isOpen, onClose }: CustomerStatementCardProps) {
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const [startDate, setStartDate] = useState<Date | undefined>(oneMonthAgo);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch statement data
  const { data: statement, isLoading, refetch } = useCustomerStatement(
    customer.id,
    startDate || oneMonthAgo,
    endDate || today,
    isOpen
  );

  if (!isOpen) return null;

  const getDocTypeLabel = (type: string): string => {
    const label = DOC_TYPES_FR[type];
    if (label) return label;
    // Try camel case variations
    const normalized = type.charAt(0).toLowerCase() + type.slice(1);
    return DOC_TYPES_FR[normalized] || type;
  };

  const transactions = statement?.transactions || [];
  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedTransactions = transactions.slice(startIndex, startIndex + pageSize);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-TN', { style: 'decimal', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val) + ' TND';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative bg-background border border-forest-800/20 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-6 border-b border-forest-100 flex items-center justify-between bg-forest-900 text-white">
          <div>
            <span className="text-xs font-bold tracking-widest text-timber-400 uppercase">État de Compte Client</span>
            <h2 className="text-2xl font-bold font-heading mt-0.5">{customer.firstname} {customer.lastname}</h2>
            {customer.name && <p className="text-sm text-white/60 mt-0.5">{customer.name}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Current Balance */}
            <Card className="border border-forest-100 bg-sand-50/50 shadow-sm relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
                <Scale className="w-16 h-16 text-forest-900" />
              </div>
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-forest-600/70">Solde Actuel</p>
                <p className={cn(
                  "text-2xl font-black mt-2 font-heading tracking-tight",
                  (statement?.closingBalance ?? 0) < 0 ? "text-rose-600" : "text-forest-900"
                )}>
                  {formatCurrency(statement?.closingBalance ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Period Debit */}
            <Card className="border border-forest-100 bg-sand-50/50 shadow-sm relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight className="w-16 h-16 text-emerald-600" />
              </div>
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-forest-600/70">Débit Période</p>
                <p className="text-2xl font-black mt-2 text-emerald-700 font-heading tracking-tight">
                  {formatCurrency(statement?.totalDebit ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Period Credit */}
            <Card className="border border-forest-100 bg-sand-50/50 shadow-sm relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
                <ArrowDownLeft className="w-16 h-16 text-blue-600" />
              </div>
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-forest-600/70">Crédit Période</p>
                <p className="text-2xl font-black mt-2 text-blue-700 font-heading tracking-tight">
                  {formatCurrency(statement?.totalCredit ?? 0)}
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Period Filters */}
          <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-forest-50/20 border border-forest-100/50 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
              <div className="space-y-1">
                <label className="text-xs font-bold text-forest-800">Date Début</label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-forest-800">Date Fin</label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => refetch()}
                className="bg-forest-600 hover:bg-forest-700 text-white font-bold h-11 px-6 rounded-xl flex-1 sm:flex-none shadow-md shadow-forest-900/10"
              >
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setStartDate(oneMonthAgo);
                  setEndDate(today);
                  setTimeout(() => refetch(), 0);
                }}
                className="border-forest-200 text-forest-700 hover:bg-forest-50 h-11 w-11 rounded-xl"
                title="Réinitialiser les dates"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Transactions Ledger */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-600"></div>
              <p className="text-sm font-bold text-forest-800/60 animate-pulse">Chargement de l'état de compte...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              <div className="border border-forest-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-forest-900">
                    <TableRow className="hover:bg-forest-900 border-forest-800">
                      <TableHead className="text-white font-bold w-[120px]">Date</TableHead>
                      <TableHead className="text-white font-bold w-[200px]">Type</TableHead>
                      <TableHead className="text-white font-bold">Description</TableHead>
                      <TableHead className="text-white font-bold text-right w-[150px]">Débit</TableHead>
                      <TableHead className="text-white font-bold text-right w-[150px]">Crédit</TableHead>
                      <TableHead className="text-white font-bold text-right w-[150px]">Solde Progressif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    
                    {/* Solde Avant Période Row */}
                    {currentPage === 1 && (
                      <TableRow className="bg-sand-50/55 hover:bg-sand-50/70 border-b border-forest-100/50">
                        <TableCell colSpan={5} className="font-bold text-forest-800 italic">
                          Solde avant période
                        </TableCell>
                        <TableCell className="text-right font-black text-forest-900">
                          {formatCurrency(statement?.balanceBeforePeriod ?? 0)}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Transaction Rows */}
                    {pagedTransactions.map((entry) => {
                      const isUnpaid = !entry.isPaid && (
                        entry.type === 'customerInvoice' || 
                        entry.type === 'customerDeliveryNote' || 
                        entry.type === 'CustomerInvoice'
                      );

                      return (
                        <TableRow 
                          key={entry.id} 
                          className={cn(
                            "border-b border-forest-50 hover:bg-forest-50/20 transition-colors",
                            isUnpaid && "bg-rose-50/30 hover:bg-rose-50/50"
                          )}
                        >
                          <TableCell className="font-medium text-forest-900">
                            {format(new Date(entry.transactionDate), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide uppercase",
                              entry.type === 'payment' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              entry.type.toLowerCase().includes('invoice') ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {getDocTypeLabel(entry.type)}
                            </span>
                            {entry.relatedDeliveryNoteRefs && entry.relatedDeliveryNoteRefs.length > 0 && (
                              <div className="text-[10px] text-forest-500 font-medium mt-1">
                                <span className="font-bold">BL:</span> {entry.relatedDeliveryNoteRefs.join(', ')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-forest-700 max-w-[250px] truncate" title={entry.description}>
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                          </TableCell>
                          <TableCell className="text-right font-black text-forest-900">
                            {formatCurrency(entry.runningBalance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-sand-50/55 rounded-2xl border border-forest-100">
                  <span className="text-xs font-bold text-forest-800">
                    Page {currentPage} sur {totalPages} ({transactions.length} transactions)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-lg border-forest-200 text-forest-700 disabled:opacity-50"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-lg border-forest-200 text-forest-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 rounded-lg border-forest-200 text-forest-700 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 rounded-lg border-forest-200 text-forest-700 disabled:opacity-50"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-forest-200 rounded-2xl bg-sand-50/20">
              <Receipt className="w-12 h-12 text-forest-300 mb-3" />
              <h3 className="text-sm font-bold text-forest-900">Aucun mouvement trouvé</h3>
              <p className="text-xs text-forest-500 mt-1 max-w-sm">
                Il n'y a aucune écriture comptable pour ce client sur la période sélectionnée.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-forest-100 flex justify-end bg-sand-50/30">
          <Button 
            onClick={onClose}
            className="bg-forest-900 hover:bg-forest-950 text-white font-bold h-11 px-8 rounded-xl shadow-md shadow-forest-950/15"
          >
            Fermer
          </Button>
        </div>

      </div>
    </div>
  );
}
