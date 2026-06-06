'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, ShoppingBag, Receipt, History, Info, ChevronRight, TrendingDown, ArrowUpRight, Banknote, CalendarDays, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSupplierDashboard } from '@/hooks/use-supplier-dashboard';
import { useSupplierPayments } from '@/hooks/use-supplier-payments';
import { TablePagination } from '@/components/shared/table-pagination';
import { DocumentTypes, DocTypes_FR, DocStatus, DocStatus_FR } from '@/types/document';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SupplierDashboardPage({ params }: PageProps) {
  // Unwrap Next.js 15+ promise-based params using React.use
  const { id } = React.use(params);
  const supplierId = parseInt(id, 10);
  const router = useRouter();

  // Load dashboard data via react-query
  const { data, isLoading, error } = useSupplierDashboard(supplierId);

  // Load payments via react-query
  const { data: payments, isLoading: paymentsLoading } = useSupplierPayments(supplierId);

  // Pagination state for payments tab
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Paginated payments logic
  const totalPayments = payments?.length || 0;
  const paginatedPayments = React.useMemo(() => {
    if (!payments) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return payments.slice(startIndex, startIndex + pageSize);
  }, [payments, currentPage, pageSize]);

  const totalPages = Math.ceil(totalPayments / pageSize);
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPayments, pageSize, currentPage, totalPages]);

  // Formatting helpers
  const formatTnd = (num: number) => {
    return num.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Convert Document Type Enum to French text
  const getDocTypeLabel = (type: number) => {
    const typeKey = DocumentTypes[type] as keyof typeof DocTypes_FR;
    return DocTypes_FR[typeKey] || type.toString();
  };

  // Convert Document Status Enum to French text
  const getDocStatusLabel = (status: number) => {
    const statusKey = DocStatus[status] as keyof typeof DocStatus_FR;
    return DocStatus_FR[statusKey] || status.toString();
  };

  // Extract payment method from descriptions like "Paiement (Chèque) - ..."
  const getPaymentMethod = (description: string | undefined): string | null => {
    if (!description) return null;
    const match = description.match(/Paiement \((.*?)\)/);
    return match ? match[1] : null;
  };

  // Clean the description to strip out technical prefix
  const getCleanDescription = (description: string | undefined): string => {
    if (!description) return '';
    return description.replace(/Paiement \(.*?\)\s*-\s*/, '');
  };

  // Convert Transaction type label to French text (matches string type and numeric enums)
  const getTransactionTypeLabel = (type: string) => {
    if (!type) return '—';
    if (type in DocTypes_FR) {
      return DocTypes_FR[type as keyof typeof DocTypes_FR];
    }
    const num = parseInt(type, 10);
    if (!isNaN(num)) {
      const typeKey = DocumentTypes[num] as keyof typeof DocTypes_FR;
      return DocTypes_FR[typeKey] || type;
    }
    return type;
  };

  // Color code doc status chips
  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case DocStatus.Completed:
      case DocStatus.Approved:
      case DocStatus.Validated:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case DocStatus.Pending:
      case DocStatus.Created:
      case DocStatus.Sent:
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case DocStatus.Rejected:
      case DocStatus.Abandoned:
      case DocStatus.Deleted:
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-sand-50 text-sand-700 border-sand-100';
    }
  };

  // Color code payment method badges
  const getPaymentMethodBadgeClass = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'CHEQUE':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'TRAITE':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'VIREMENT':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'ESPECE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CARTE':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-sand-50 text-sand-700 border-sand-100';
    }
  };

  // Helper to check if an instrument is overdue
  const isInstrumentOverdue = (instrument: any) => {
    if (!instrument || instrument.isPaidAtBank) return false;
    if (!instrument.dueDate) return false;
    const dueDate = new Date(instrument.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Go back to suppliers page
  const handleBack = () => {
    router.push('/suppliers');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-6 py-6 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-forest-50 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sand-100 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-sand-100 rounded" />
                <div className="h-4 w-32 bg-sand-100 rounded" />
              </div>
            </div>
            <div className="h-16 w-64 bg-sand-100 rounded-[20px]" />
          </div>

          {/* KPIs Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 bg-sand-50 rounded-[24px] border border-sand-100" />
            ))}
          </div>

          {/* Tables & Timeline Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-96 bg-sand-50 rounded-[32px] border border-sand-100" />
            <div className="lg:col-span-5 h-96 bg-sand-50 rounded-[32px] border border-sand-100" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 border border-rose-100">
            <Info className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-forest-900">Erreur de chargement</h2>
          <p className="text-sand-400 font-medium text-center max-w-md">
            Impossible de récupérer les statistiques du tableau de bord. Veuillez vérifier l&apos;existence du fournisseur.
          </p>
          <Button onClick={handleBack} variant="outline" className="mt-2 border-forest-100 text-forest-600 hover:bg-forest-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste des fournisseurs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isDette = data.currentBalance > 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-forest-50 pb-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleBack} 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 rounded-2xl border-forest-100 text-forest-600 hover:bg-forest-50 hover:text-forest-900 transition-all shadow-sm"
              title="Retour aux fournisseurs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="text-[0.7rem] font-black text-sand-400 uppercase tracking-widest">Tableau de bord complet</div>
              <h1 className="text-3xl font-heading font-black text-forest-900 tracking-tight mt-0.5">
                {data.supplierName}
              </h1>
            </div>
          </div>

          {/* Account Balance Chip */}
          <div className={cn(
            "flex flex-col px-8 py-5 rounded-[24px] border transition-all shadow-sm w-full md:w-80 md:min-w-[300px]",
            isDette 
              ? "bg-rose-50/50 border-rose-100 text-rose-950" 
              : "bg-emerald-50/50 border-emerald-100 text-emerald-950"
          )}>
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest leading-none">Solde en cours</span>
            <span className={cn(
              "text-2xl font-mono font-black tracking-tight mt-1",
              isDette ? "text-rose-600" : "text-emerald-600"
            )}>
              {formatTnd(Math.abs(data.currentBalance))} <span className="text-xs font-bold text-sand-400">TND</span>
            </span>
            <small className="text-[0.7rem] font-bold text-sand-400 mt-1 uppercase tracking-tighter">
              {isDette ? "Vous devez ce montant" : "Crédit en votre faveur"}
            </small>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
            <Card className="border-forest-100/50 shadow-md shadow-forest-900/[0.02] rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Paiements effectués</div>
                  <div className="text-xl font-heading font-black text-forest-900 tracking-tight mt-0.5">
                    {formatTnd(data.totalPaid)} <span className="text-xs font-bold text-sand-400">TND</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card className="border-forest-100/50 shadow-md shadow-forest-900/[0.02] rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Commandes en cours</div>
                  <div className="text-xl font-heading font-black text-forest-900 tracking-tight mt-0.5">
                    {data.pendingOrders.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <Card className="border-forest-100/50 shadow-md shadow-forest-900/[0.02] rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">Réceptions à facturer</div>
                  <div className="text-xl font-heading font-black text-forest-900 tracking-tight mt-0.5">
                    {data.pendingReceipts.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Grid: Left Documents, Right Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Documents Section */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-forest-100/50 shadow-xl shadow-forest-900/[0.03] rounded-[32px] overflow-hidden bg-white">
              <Tabs defaultValue="orders" className="w-full">
                <div className="px-6 bg-sand-50/50 border-b border-forest-50">
                  <TabsList className="h-16 bg-transparent gap-6">
                    <TabsTrigger 
                      value="orders" 
                      className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-bold text-sand-400 data-[state=active]:text-forest-900 text-sm transition-all"
                    >
                      Commandes en cours (BC-F)
                    </TabsTrigger>
                    <TabsTrigger 
                      value="receipts" 
                      className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-bold text-sand-400 data-[state=active]:text-forest-900 text-sm transition-all"
                    >
                      Réceptions en attente (BR)
                    </TabsTrigger>
                    <TabsTrigger 
                      value="payments" 
                      className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-forest-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 font-bold text-sand-400 data-[state=active]:text-forest-900 text-sm transition-all"
                    >
                      Paiements
                    </TabsTrigger>
                  </TabsList>
                </div>

                <CardContent className="p-0">
                  {/* Tab 1: Orders */}
                  <TabsContent value="orders" className="m-0 focus-visible:outline-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-sand-50/10 border-b border-forest-50">
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">N° Document</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Type</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Date</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider text-right">Total TTC</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forest-50">
                          {data.pendingOrders.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-16 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 bg-sand-50 rounded-2xl flex items-center justify-center text-sand-300">
                                    <Info className="w-5 h-5" />
                                  </div>
                                  <p className="text-sm font-bold text-sand-400">Aucune commande fournisseur en cours.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            data.pendingOrders.map((doc) => (
                              <tr key={doc.id} className="hover:bg-forest-50/20 transition-colors">
                                <td className="p-5 font-black text-forest-900">{doc.docnumber}</td>
                                <td className="p-5 text-sm font-medium text-sand-600">{getDocTypeLabel(doc.type)}</td>
                                <td className="p-5 text-sm text-sand-500 font-bold">{formatDate(doc.creationdate)}</td>
                                <td className="p-5 text-right font-mono font-black text-forest-900">{formatTnd(doc.total_net_ttc)}</td>
                                <td className="p-5 text-center">
                                  <Badge variant="outline" className={cn("rounded-xl px-2.5 py-1 font-bold text-xs border uppercase", getStatusBadgeClass(doc.docstatus))}>
                                    {getDocStatusLabel(doc.docstatus)}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Receipts */}
                  <TabsContent value="receipts" className="m-0 focus-visible:outline-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-sand-50/10 border-b border-forest-50">
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">N° Document</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Type</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Date</th>
                            <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider text-right">Total TTC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forest-50">
                          {data.pendingReceipts.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-16 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 bg-sand-50 rounded-2xl flex items-center justify-center text-sand-300">
                                    <Info className="w-5 h-5" />
                                  </div>
                                  <p className="text-sm font-bold text-sand-400">Toutes les réceptions sont facturées.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            data.pendingReceipts.map((doc) => (
                              <tr key={doc.id} className="hover:bg-forest-50/20 transition-colors">
                                <td className="p-5 font-black text-forest-900">{doc.docnumber}</td>
                                <td className="p-5 text-sm font-medium text-sand-600">{getDocTypeLabel(doc.type)}</td>
                                <td className="p-5 text-sm text-sand-500 font-bold">{formatDate(doc.creationdate)}</td>
                                <td className="p-5 text-right font-mono font-black text-forest-900">{formatTnd(doc.total_net_ttc)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Payments */}
                  <TabsContent value="payments" className="m-0 focus-visible:outline-none">
                    {paymentsLoading ? (
                      <div className="p-8 space-y-4 animate-pulse">
                        <div className="h-8 bg-sand-100 rounded-[12px] w-full" />
                        <div className="h-8 bg-sand-100 rounded-[12px] w-full" />
                        <div className="h-8 bg-sand-100 rounded-[12px] w-full" />
                      </div>
                    ) : !payments || payments.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-sand-50 rounded-2xl flex items-center justify-center text-sand-300">
                            <Banknote className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-sand-400">Aucun paiement enregistré pour ce fournisseur.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-sand-50/10 border-b border-forest-50">
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Date</th>
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Méthode</th>
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Référence / Notes</th>
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Détails Instrument</th>
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider">Échéance</th>
                                <th className="p-5 text-[0.65rem] font-black text-sand-400 uppercase tracking-wider text-right">Montant</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-forest-50">
                              {paginatedPayments.map((payment) => {
                                const isOverdue = isInstrumentOverdue(payment.instrument);
                                return (
                                  <tr 
                                    key={payment.id || payment.paymentId} 
                                    className={cn(
                                      "hover:bg-forest-50/20 transition-colors",
                                      isOverdue && "bg-rose-50/20 hover:bg-rose-50/30"
                                    )}
                                  >
                                    <td className="p-5 text-sm text-sand-500 font-bold">
                                      {formatDate(payment.paymentDate)}
                                    </td>
                                    <td className="p-5">
                                      <Badge 
                                        variant="outline" 
                                        className={cn("rounded-xl px-2.5 py-1 font-bold text-xs border uppercase", getPaymentMethodBadgeClass(payment.paymentMethod))}
                                      >
                                        {payment.paymentMethod}
                                      </Badge>
                                    </td>
                                    <td className="p-5 text-sm font-medium text-forest-900 max-w-[200px] truncate">
                                      <div className="flex flex-col">
                                        <span className="font-mono text-xs">{payment.reference || '—'}</span>
                                        {payment.notes && (
                                          <span className="text-xs text-sand-400 italic mt-0.5 truncate">{payment.notes}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-5 text-sm text-sand-600">
                                      {payment.instrument ? (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-bold text-xs text-forest-950">
                                            N° {payment.instrument.instrumentNumber || '—'}
                                          </span>
                                          <span className="text-[0.7rem] text-sand-400 uppercase tracking-wider">
                                            {payment.instrument.bank || '—'}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sand-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-5 text-sm">
                                      {payment.instrument?.dueDate ? (
                                        <div className="flex flex-col gap-1">
                                          <span className={cn(
                                            "font-bold",
                                            isOverdue ? "text-rose-600 font-black flex items-center gap-1" : "text-sand-600"
                                          )}>
                                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                                            {formatDate(payment.instrument.dueDate)}
                                          </span>
                                          {isOverdue && (
                                            <Badge variant="outline" className="w-fit rounded-lg bg-rose-50 text-rose-700 border-rose-200 text-[0.6rem] font-bold px-1.5 py-0">
                                              En retard
                                            </Badge>
                                          )}
                                          {!isOverdue && payment.instrument.isPaidAtBank && (
                                            <Badge variant="outline" className="w-fit rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.6rem] font-bold px-1.5 py-0">
                                              Encaissé
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-sand-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-5 text-right font-mono font-black text-emerald-600">
                                      {formatTnd(payment.amount)} <span className="text-[0.7rem] font-bold text-sand-400">TND</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <TablePagination
                          currentPage={currentPage}
                          totalItems={totalPayments}
                          pageSize={pageSize}
                          onPageChange={setCurrentPage}
                          onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                          }}
                        />
                      </>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column - Financial History Timeline */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-forest-100/50 shadow-xl shadow-forest-900/[0.03] rounded-[32px] overflow-hidden bg-white">
              <CardHeader className="bg-sand-50/50 border-b border-forest-50 px-6 py-5 flex flex-row items-center justify-between">
                <CardTitle className="font-heading font-black text-lg text-forest-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-forest-600" />
                  Flux Financier (30j)
                </CardTitle>
                <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest bg-white border border-forest-50 px-3 py-1.5 rounded-xl">
                  Activité récente
                </div>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Timeline Grid */}
                <div className="relative pl-6 border-l-2 border-forest-100/50 space-y-8 py-2">
                  {data.recentTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm font-bold text-sand-300 italic">Aucune transaction récente sur les 30 derniers jours.</p>
                    </div>
                  ) : (
                    data.recentTransactions.map((item, index) => {
                      const isPayment = item.type.toLowerCase().includes('payment');
                      
                      return (
                        <div key={index} className="relative group">
                          
                          {/* Marker Dot */}
                          <div className={cn(
                            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white transition-all group-hover:scale-125 shadow-sm",
                            isPayment ? "bg-emerald-500" : "bg-forest-900"
                          )} />

                          <div className="flex flex-col gap-2">
                            {/* Header row */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-forest-950 uppercase tracking-wide">
                                  {getTransactionTypeLabel(item.type)}
                                </span>
                                {getPaymentMethod(item.description) && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[0.6rem] font-black uppercase rounded-lg px-2 py-0">
                                    {getPaymentMethod(item.description)}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[0.7rem] text-sand-400 font-bold uppercase">
                                {formatDate(item.transactionDate)}
                              </span>
                            </div>

                            {/* Clean Description */}
                            <div className="text-sm text-sand-600 font-medium leading-relaxed">
                              {getCleanDescription(item.description) || "Opération de compte fournisseur"}
                            </div>

                            {/* Debit/Credit amounts */}
                            <div className="flex items-center gap-3 font-mono text-sm font-black mt-1">
                              {item.debit > 0 && (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100/50">
                                  -{formatTnd(item.debit)}
                                </span>
                              )}
                              {item.credit > 0 && (
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50">
                                  +{formatTnd(item.credit)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
