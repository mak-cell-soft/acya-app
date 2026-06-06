'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  ArrowLeft, 
  Search, 
  ShoppingBag, 
  Users, 
  FileText, 
  Calendar,
  X,
  BookOpen,
  ArrowUpDown,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCustomers } from '@/hooks/use-customers';
import { useArticles } from '@/hooks/use-articles';
import { 
  useCustomerPurchases, 
  useMerchandiseBuyers, 
  useUnpaidDocuments 
} from '@/hooks/use-deep-search';
import { CustomerStatementCard } from '@/components/sales/customer-statement-card';
import { TablePagination } from '@/components/shared/table-pagination';
import { Customer } from '@/types/customer';
import { Article } from '@/types/article';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MONTHS = [
  { val: 0, label: 'Tous les mois' },
  { val: 1, label: 'Janvier' },
  { val: 2, label: 'Février' },
  { val: 3, label: 'Mars' },
  { val: 4, label: 'Avril' },
  { val: 5, label: 'Mai' },
  { val: 6, label: 'Juin' },
  { val: 7, label: 'Juillet' },
  { val: 8, label: 'Août' },
  { val: 9, label: 'Septembre' },
  { val: 10, label: 'Octobre' },
  { val: 11, label: 'Novembre' },
  { val: 12, label: 'Décembre' }
];

const YEARS = [
  0, // All
  new Date().getFullYear(),
  new Date().getFullYear() - 1,
  new Date().getFullYear() - 2,
  new Date().getFullYear() - 3
];

export default function DeepSearchPage() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'buyers' | 'unpaid'>('purchases');
  
  // Shared period state
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = all
  const [selectedYear, setSelectedYear] = useState<number>(0);   // 0 = all

  // --- Sub-Tab 1: Purchases by Customer State ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // --- Sub-Tab 2: Buyers by Article State ---
  const [articleSearch, setArticleSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('');

  // --- Sub-Tab 3: Unpaid Documents State ---
  const [unpaidSearchTerm, setUnpaidSearchTerm] = useState('');
  const [unpaidCustomerFilter, setUnpaidCustomerFilter] = useState<number>(0); // 0 = all
  // State for filtering by payment status: 'all' displays everything, 'unpaid' for 'Non Payé', 'partial' for 'Payement Partiel'
  const [unpaidPaymentStatusFilter, setUnpaidPaymentStatusFilter] = useState<'all' | 'unpaid' | 'partial'>('all');
  
  // State for client-side pagination of unpaid documents
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [unpaidPageSize, setUnpaidPageSize] = useState(10);

  // State for filtering by document type: 'all' for both, 'invoice' for Factures, 'delivery' for Bons de livraison
  const [unpaidDocTypeFilter, setUnpaidDocTypeFilter] = useState<'all' | 'invoice' | 'delivery'>('all');

  // --- Data Queries ---
  const { data: allCustomers = [] } = useCustomers('Customer');
  const { data: allArticles = [] } = useArticles();

  // NOTE: Helper to open the customer ledger statement modal by customer ID
  // It retrieves the full client details from our loaded clients list and opens the ledger view.
  const openStatementForCustomerId = (id: number) => {
    const cust = allCustomers.find(c => c.id === id);
    if (cust) {
      setSelectedCustomer(cust);
      setIsStatementOpen(true);
    } else {
      toast.error("Impossible de trouver les informations de ce client.");
    }
  };

  // Purchases list
  const { data: purchases = [], isLoading: isPurchasesLoading } = useCustomerPurchases(
    selectedCustomer?.id || 0,
    selectedMonth,
    selectedYear,
    activeSubTab === 'purchases' && !!selectedCustomer
  );

  // Buyers list
  const { data: buyers = [], isLoading: isBuyersLoading } = useMerchandiseBuyers(
    selectedArticle?.id || 0,
    selectedPackage,
    selectedMonth,
    selectedYear,
    activeSubTab === 'buyers' && !!selectedArticle
  );

  // Unpaid documents list
  const { data: unpaidDocs = [], isLoading: isUnpaidLoading } = useUnpaidDocuments(
    unpaidCustomerFilter,
    selectedMonth,
    selectedYear,
    unpaidSearchTerm,
    // Active only when on the unpaid tab
  );

  // NOTE: Client-side filtering is implemented here to avoid changing the C#/API backend contract.
  // NOTE: Client-side filtering is implemented here to avoid changing the C#/API backend contract.
  // We filter the local list based on unpaidPaymentStatusFilter and unpaidDocTypeFilter.
  const filteredUnpaidDocs = useMemo(() => {
    return unpaidDocs.filter(doc => {
      // Payment status filter
      if (unpaidPaymentStatusFilter === 'unpaid') {
        // 'Non Payé' maps to documents that are not PartiallyBilled (i.e. NotBilled / Unbilled)
        if (doc.billingStatus === 'PartiallyBilled') return false;
      }
      if (unpaidPaymentStatusFilter === 'partial') {
        // 'Payement Partiel' maps to PartiallyBilled documents
        if (doc.billingStatus !== 'PartiallyBilled') return false;
      }

      // Document type filter
      if (unpaidDocTypeFilter === 'invoice') {
        if (!doc.type.toLowerCase().includes('invoice')) return false;
      }
      if (unpaidDocTypeFilter === 'delivery') {
        if (!doc.type.toLowerCase().includes('delivery')) return false;
      }

      return true;
    });
  }, [unpaidDocs, unpaidPaymentStatusFilter, unpaidDocTypeFilter]);

  // Reset pagination to page 1 whenever any search term, customer filter, payment status toggle, or document type filter changes
  useEffect(() => {
    setUnpaidPage(1);
  }, [unpaidSearchTerm, unpaidCustomerFilter, unpaidPaymentStatusFilter, unpaidDocTypeFilter, selectedMonth, selectedYear]);

  // Compute the paginated slice of unpaid documents to display on the current page
  const paginatedUnpaidDocs = useMemo(() => {
    const start = (unpaidPage - 1) * unpaidPageSize;
    return filteredUnpaidDocs.slice(start, start + unpaidPageSize);
  }, [filteredUnpaidDocs, unpaidPage, unpaidPageSize]);

  // --- Helper Selectors ---
  // Search and filter customers for Tab 1 Combobox
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return allCustomers.slice(0, 10);
    const search = customerSearch.toLowerCase();
    return allCustomers.filter(c => 
      `${c.firstname} ${c.lastname}`.toLowerCase().includes(search) ||
      (c.name && c.name.toLowerCase().includes(search))
    ).slice(0, 10);
  }, [allCustomers, customerSearch]);

  // Search and filter articles for Tab 2 Combobox
  const filteredArticles = useMemo(() => {
    if (!articleSearch) return allArticles.slice(0, 10);
    const search = articleSearch.toLowerCase();
    return allArticles.filter(a => 
      a.reference.toLowerCase().includes(search) ||
      a.description.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [allArticles, articleSearch]);

  // Helper formatting currencies
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-TN', { style: 'decimal', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val) + ' TND';
  };

  const getDocBadgeColor = (type: string) => {
    if (type.toLowerCase().includes('invoice')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (type.toLowerCase().includes('delivery')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getDocTypeLabel = (type: string) => {
    if (type.toLowerCase().includes('invoice')) return 'Facture';
    if (type.toLowerCase().includes('delivery')) return 'Bon de Livraison';
    return type;
  };

  // Extract customer purchases table content into a clean memoized variable to prevent nested JSX ternaries
  const purchasesContent = useMemo(() => {
    if (!selectedCustomer) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 animate-in fade-in duration-300">
          <Users className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Veuillez sélectionner un client</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Entrez le nom d'un client ci-dessus pour charger sa fiche d'achats détaillée et son état de compte.
          </p>
        </div>
      );
    }

    if (isPurchasesLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-in fade-in duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600"></div>
          <p className="text-sm font-bold text-slate-800/60 animate-pulse">Extraction de l'historique d'achat...</p>
        </div>
      );
    }

    if (purchases.length > 0) {
      return (
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white animate-in fade-in duration-300">
          <CardHeader className="p-6 border-b border-slate-100">
            <CardTitle className="text-xl text-slate-900">Marchandises Achetées</CardTitle>
            <CardDescription>
              Historique des marchandises et colis vendus à ce client sur la période sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100">
                    <th className="px-6 py-4 text-sm font-medium">Référence Article</th>
                    <th className="px-6 py-4 text-sm font-medium">Description</th>
                    <th className="px-6 py-4 text-sm font-medium">Référence Colis / Pkg</th>
                    <th className="px-6 py-4 text-sm font-medium text-right">Quantité Totale</th>
                    <th className="px-6 py-4 text-sm font-medium text-right">Prix Moyen HT</th>
                    <th className="px-6 py-4 text-sm font-medium">Documents Liés</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{p.articleReference}</td>
                      <td className="px-6 py-4 text-slate-700 max-w-[200px] truncate" title={p.articleDescription}>
                        {p.articleDescription}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          p.packageReference === 'Standard'
                            ? "bg-corp-blue-50 text-slate-700 border border-slate-200"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        )}>
                          {p.packageReference}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {p.totalQuantity} <span className="text-xs font-normal text-slate-400 ml-1">{p.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(p.averagePriceHT)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.relatedDocuments.map((doc, dIdx) => (
                            <span 
                              key={dIdx} 
                              className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200"
                            >
                              {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 animate-in fade-in duration-300">
        <ShoppingBag className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
        <h3 className="text-sm font-bold text-slate-900">Aucun achat trouvé</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Ce client n'a pas effectué d'achat sur la période spécifiée.
        </p>
      </div>
    );
  }, [selectedCustomer, isPurchasesLoading, purchases]);

  // Extract buyers table content into a clean memoized variable to prevent nested JSX ternaries
  const buyersContent = useMemo(() => {
    if (!selectedArticle) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 animate-in fade-in duration-300">
          <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Veuillez sélectionner un article</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Recherchez et sélectionnez un article ci-dessus pour afficher la liste complète des clients qui l'ont acheté.
          </p>
        </div>
      );
    }

    if (isBuyersLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-in fade-in duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600"></div>
          <p className="text-sm font-bold text-slate-800/60 animate-pulse">Extraction de l'historique acheteurs...</p>
        </div>
      );
    }

    if (buyers.length > 0) {
      return (
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white animate-in fade-in duration-300">
          <CardHeader className="p-6 border-b border-slate-100">
            <CardTitle className="text-xl text-slate-900">Acheteurs de cet Article</CardTitle>
            <CardDescription>
              {selectedPackage 
                ? `Liste des clients ayant acheté cet article (${selectedPackage}) sur la période.`
                : "Liste des clients ayant acheté cet article sur la période."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100">
                    <th className="px-6 py-4 text-sm font-medium">Code Client</th>
                    <th className="px-6 py-4 text-sm font-medium">Client / Nom</th>
                    <th className="px-6 py-4 text-sm font-medium">Société / Entreprise</th>
                    <th className="px-6 py-4 text-sm font-medium text-right">Quantité Achetée</th>
                    <th className="px-6 py-4 text-sm font-medium text-right">Total Facturé HT</th>
                    <th className="px-6 py-4 text-sm font-medium">Documents</th>
                    <th className="px-6 py-4 text-sm font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">{b.customerCode || '-'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{b.customerName}</td>
                      <td className="px-6 py-4 text-slate-700">{b.customerCompany || '-'}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{b.totalQuantity} {selectedArticle.unit}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(b.totalCostHT)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {b.relatedDocuments.map((doc, dIdx) => (
                            <span 
                              key={dIdx} 
                              className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200"
                            >
                              {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* NOTE: Shortcut button to open the client account statement from buyers list */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openStatementForCustomerId(b.customerId)}
                          className="h-8 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg"
                          title="État de compte client"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> État
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 animate-in fade-in duration-300">
        <Users className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
        <h3 className="text-sm font-bold text-slate-900">Aucun acheteur trouvé</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {selectedPackage 
            ? `Aucun client n'a acheté cet article (${selectedPackage}) sur la période spécifiée.`
            : "Aucun client n'a acheté cet article sur la période spécifiée."}
        </p>
      </div>
    );
  }, [selectedArticle, isBuyersLoading, buyers, selectedPackage, allCustomers]);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700 font-sans">
        
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/sales')}
              className="h-11 w-11 rounded-lg border-slate-200 text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Recherche Approfondie
              </h1>
              <p className="text-slate-400 font-medium mt-1">
                Explorez l'historique complet de vos transactions, acheteurs par article et créances impayées.
              </p>
            </div>
          </div>
        </div>

        {/* Global Period Filters */}
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full max-w-2xl">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">Mois de Recherche</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-corp-blue-600"
                >
                  {MONTHS.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">Année de Recherche</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-corp-blue-600"
                >
                  <option value={0}>Toutes les années</option>
                  {YEARS.filter(y => y > 0).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedMonth !== 0 || selectedYear !== 0) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMonth(0);
                  setSelectedYear(0);
                }}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold h-11 rounded-lg"
              >
                Réinitialiser la période
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Custom Tab Navigation */}
        <div className="flex border-b border-slate-200/50">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={cn(
              "px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
              activeSubTab === 'purchases'
                ? "border-corp-blue-600 text-slate-900 bg-corp-blue-50/50"
                : "border-transparent text-slate-400 hover:text-slate-900"
            )}
          >
            <ShoppingBag className="w-4 h-4" /> Achats par Client
          </button>
          <button
            onClick={() => setActiveSubTab('buyers')}
            className={cn(
              "px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
              activeSubTab === 'buyers'
                ? "border-corp-blue-600 text-slate-900 bg-corp-blue-50/50"
                : "border-transparent text-slate-400 hover:text-slate-900"
            )}
          >
            <Users className="w-4 h-4" /> Acheteurs par Article
          </button>
          <button
            onClick={() => setActiveSubTab('unpaid')}
            className={cn(
              "px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
              activeSubTab === 'unpaid'
                ? "border-corp-blue-600 text-slate-900 bg-corp-blue-50/50"
                : "border-transparent text-slate-400 hover:text-slate-900"
            )}
          >
            <FileText className="w-4 h-4" /> Factures/BL Impayés
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          
          {/* TAB 1: PURCHASES BY CUSTOMER */}
          {activeSubTab === 'purchases' && (
            <div className="space-y-6">
              
              {/* Customer Selector Card */}
              <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-visible">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    
                    {/* Search Combobox Input */}
                    <div className="relative flex-1 w-full">
                      <label className="text-sm font-medium text-slate-800 block mb-1">
                        Sélectionner un Client
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Rechercher par nom ou prénom..."
                          value={selectedCustomer ? `${selectedCustomer.firstname} ${selectedCustomer.lastname}` : customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            if (selectedCustomer) setSelectedCustomer(null);
                            setIsCustomerDropdownOpen(true);
                          }}
                          onFocus={() => setIsCustomerDropdownOpen(true)}
                          className="h-11 pl-10 pr-10 border-slate-200 rounded-lg focus:border-corp-blue-600 focus:ring-corp-blue-600 text-slate-900 font-bold"
                        />
                        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
                        
                        {(customerSearch || selectedCustomer) && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerSearch('');
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Items list */}
                      {isCustomerDropdownOpen && filteredCustomers.length > 0 && !selectedCustomer && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-100">
                          {filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomer(c);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50/80 text-sm font-bold text-slate-900 border-b border-slate-100/50 flex flex-col"
                            >
                              <span>{c.firstname} {c.lastname}</span>
                              {c.name && <span className="text-xs font-medium text-slate-400 mt-0.5">{c.name}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* View Statement Action */}
                    {selectedCustomer && (
                      <div className="flex gap-2 w-full md:w-auto self-end">
                        <Button
                          onClick={() => setIsStatementOpen(true)}
                          className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold h-11 px-6 rounded-lg flex-1 md:flex-none shadow-lg shadow-corp-blue-500/20"
                        >
                          <BookOpen className="w-4 h-4 mr-2" /> État de Compte Client
                        </Button>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>

              {/* Purchased Items List */}
              {purchasesContent}

            </div>
          )}

          {/* TAB 2: BUYERS BY ARTICLE */}
          {activeSubTab === 'buyers' && (
            <div className="space-y-6">
              
              {/* Article Selector Card */}
              <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-visible">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Article Search Input */}
                    <div className="relative w-full">
                      <label className="text-sm font-medium text-slate-800 block mb-1">
                        Sélectionner un Article
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Rechercher par référence ou description..."
                          value={selectedArticle ? `${selectedArticle.reference} - ${selectedArticle.description}` : articleSearch}
                          onChange={(e) => {
                            setArticleSearch(e.target.value);
                            if (selectedArticle) setSelectedArticle(null);
                            setIsArticleDropdownOpen(true);
                          }}
                          onFocus={() => setIsArticleDropdownOpen(true)}
                          className="h-11 pl-10 pr-10 border-slate-200 rounded-lg focus:border-corp-blue-600 focus:ring-corp-blue-600 text-slate-900 font-bold"
                        />
                        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
                        
                        {(articleSearch || selectedArticle) && (
                          <button
                            onClick={() => {
                              setSelectedArticle(null);
                              setArticleSearch('');
                              setIsArticleDropdownOpen(false);
                            }}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Items list */}
                      {isArticleDropdownOpen && filteredArticles.length > 0 && !selectedArticle && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-100">
                          {filteredArticles.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => {
                                setSelectedArticle(a);
                                setIsArticleDropdownOpen(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50/80 text-sm font-bold text-slate-900 border-b border-slate-100/50 flex flex-col"
                            >
                              <span className="">{a.reference}</span>
                              <span className="text-xs font-medium text-slate-400 mt-0.5">{a.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Package Selector */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800 block">
                        Type / Référence Colis
                      </label>
                      <Input
                        placeholder="Recherche par colis (ex: Standard ou BR-154-20)"
                        value={selectedPackage}
                        onChange={(e) => setSelectedPackage(e.target.value)}
                        className="h-11 border-slate-200 rounded-lg focus:border-corp-blue-600 focus:ring-corp-blue-600 text-slate-900 font-bold"
                      />
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Buyers Table Content */}
              {buyersContent}

            </div>
          )}

          {/* TAB 3: UNPAID DOCUMENTS */}
          {activeSubTab === 'unpaid' && (
            <div className="space-y-6">
              
              {/* Unpaid Filters Card */}
              <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    
                    {/* Search Field */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800 block">
                        Recherche
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="N° Doc ou Nom Client..."
                          value={unpaidSearchTerm}
                          onChange={(e) => setUnpaidSearchTerm(e.target.value)}
                          className="h-11 pl-9 border-slate-200 rounded-lg focus:border-corp-blue-600 focus:ring-corp-blue-600 text-slate-900 font-bold"
                        />
                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                      </div>
                    </div>

                    {/* Customer Filter */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800 block">
                        Filtrer par Client
                      </label>
                      <select
                        value={unpaidCustomerFilter}
                        onChange={(e) => setUnpaidCustomerFilter(Number(e.target.value))}
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-corp-blue-600"
                      >
                        <option value={0}>Tous les clients</option>
                        {allCustomers.map(c => (
                          <option key={c.id} value={c.id}>{c.firstname} {c.lastname}</option>
                        ))}
                      </select>
                    </div>

                    {/* Document Type Filter */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800 block">
                        Type de Document
                      </label>
                      <select
                        value={unpaidDocTypeFilter}
                        onChange={(e) => setUnpaidDocTypeFilter(e.target.value as 'all' | 'invoice' | 'delivery')}
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-corp-blue-600"
                      >
                        <option value="all">Tous les types</option>
                        <option value="invoice">Facture uniquement</option>
                        <option value="delivery">Bon de Livraison uniquement</option>
                      </select>
                    </div>

                    {/* Payment Status Toggle */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800 block">
                        Statut de Paiement
                      </label>
                      <div className="flex items-center h-11 px-4 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-slate-200 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                          <Switch
                            id="only-unpaid"
                            checked={unpaidPaymentStatusFilter === 'unpaid'}
                            onCheckedChange={(checked) => {
                              setUnpaidPaymentStatusFilter(checked ? 'unpaid' : 'all');
                            }}
                            className="data-checked:bg-corp-blue-600 transition-colors duration-200"
                          />
                          <Label 
                            htmlFor="only-unpaid" 
                            className="text-sm font-medium text-slate-800 cursor-pointer select-none"
                          >
                            Non Payé uniquement
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Total Outstanding Summary */}
                    <div className="bg-rose-50/30 border border-rose-200/50 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Créances en attente</p>
                        <p className="text-lg font-black text-rose-700">
                          {/* NOTE: Dynamically updates summary net total based on the filtered document list */}
                          {formatCurrency(filteredUnpaidDocs.reduce((acc, curr) => acc + curr.remainingBalance, 0))}
                        </p>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Unpaid Documents Table */}
              {isUnpaidLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600"></div>
                  <p className="text-sm font-bold text-slate-800/60 animate-pulse">Extraction des impayés...</p>
                </div>
              ) : unpaidDocs.length > 0 ? (
                filteredUnpaidDocs.length > 0 ? (
                  <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
                    <CardHeader className="p-6 border-b border-slate-100">
                      <CardTitle className="text-xl text-slate-900">Bons & Factures non payés</CardTitle>
                      <CardDescription>
                        Détail de toutes les pièces commerciales présentant un solde restant dû.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100">
                              <th className="px-6 py-4 text-sm font-medium">N° Document</th>
                              <th className="px-6 py-4 text-sm font-medium">Type</th>
                              <th className="px-6 py-4 text-sm font-medium">Date</th>
                              <th className="px-6 py-4 text-sm font-medium">Client</th>
                              <th className="px-6 py-4 text-sm font-medium text-right">Net TTC</th>
                              <th className="px-6 py-4 text-sm font-medium text-right">Total Payé</th>
                              <th className="px-6 py-4 text-sm font-medium text-right">Solde Restant</th>
                              {/* NOTE: Updated column header from 'Statut Facturation' to 'Statut Payment' */}
                              <th className="px-6 py-4 text-sm font-medium">Statut Payment</th>
                              <th className="px-6 py-4 text-sm font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedUnpaidDocs.map((doc) => (
                              <tr key={doc.documentId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{doc.docNumber}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border",
                                    getDocBadgeColor(doc.type)
                                  )}>
                                    {getDocTypeLabel(doc.type)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                  {new Date(doc.creationDate).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{doc.counterPartName}</div>
                                  {doc.counterPartCompany && (
                                    <div className="text-[10px] text-slate-400 font-medium">{doc.counterPartCompany}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(doc.totalNetTTC)}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(doc.totalPaid)}</td>
                                <td className="px-6 py-4 text-right font-black text-rose-600 bg-rose-50/10">{formatCurrency(doc.remainingBalance)}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                                    doc.billingStatus === 'PartiallyBilled' 
                                      ? "bg-amber-100 text-amber-800" 
                                      : "bg-rose-100 text-rose-800"
                                  )}>
                                    {/* NOTE: Updated value labels: 'Facturé Partiel' to 'Payement Partiel' and 'Non Facturé' to 'Non Payé' */}
                                    {doc.billingStatus === 'PartiallyBilled' ? 'Payement Partiel' : 'Non Payé'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {/* NOTE: Shortcut button to open the client account statement from unpaid documents list */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => openStatementForCustomerId(doc.counterPartId)}
                                    className="h-8 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg"
                                    title="État de compte client"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 mr-1" /> État
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Beautiful client-side table pagination controls aligned with dashboard aesthetic */}
                      <TablePagination
                        currentPage={unpaidPage}
                        totalItems={filteredUnpaidDocs.length}
                        pageSize={unpaidPageSize}
                        onPageChange={setUnpaidPage}
                        onPageSizeChange={(size) => {
                          setUnpaidPageSize(size);
                          setUnpaidPage(1);
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  /* Custom empty state when documents exist but none match the payment status filter */
                  <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <Filter className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">Aucun résultat</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Aucun document ne correspond au statut de paiement sélectionné.
                    </p>
                  </div>
                )
              ) : (
                /* Standard empty state when there are no unpaid documents at all */
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mb-3 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Aucun document impayé</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Toutes vos créances clients sur la période spécifiée ont été entièrement régularisées !
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* NOTE: Global Customer Account Statement Dialog accessible across all tabs */}
        {selectedCustomer && (
          <CustomerStatementCard
            customer={selectedCustomer}
            isOpen={isStatementOpen}
            onClose={() => setIsStatementOpen(false)}
          />
        )}

      </div>
    </DashboardLayout>
  );
}



