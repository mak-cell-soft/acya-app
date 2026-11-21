'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Filter, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import { usePaymentDeepSearch } from '@/hooks/use-payment-deep-search';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TablePagination } from '@/components/shared/table-pagination';

export function PaymentDeepSearchCard() {
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [search, setSearch] = React.useState<string>('');
  const [counterpartType, setCounterpartType] = React.useState<string>('all');
  const [nature, setNature] = React.useState<string>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('all');
  
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const { data, isLoading, isError, refetch } = usePaymentDeepSearch({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    search: search.trim() || undefined,
    nature: nature !== 'all' ? nature : undefined,
    paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
    counterpartType: counterpartType !== 'all' ? counterpartType : undefined,
    pageNumber,
    pageSize,
  });

  const payments = (data as any)?.items || [];
  const totalCount = (data as any)?.totalCount || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNumber(1);
    refetch();
  };

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setSearch('');
    setCounterpartType('all');
    setNature('all');
    setPaymentMethod('all');
    setPageNumber(1);
  };

  const renderNatureBadge = (n: string | null | undefined, cpType?: string) => {
    if (n === 'RECOUVREMENT') {
      if (cpType === 'Supplier') {
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Avance</Badge>;
      }
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Recouvrement</Badge>;
    }
    if (n === 'PAIEMENT_DOC') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Paiement Doc</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inconnu</Badge>;
  };

  const renderCounterpartBadge = (cpType: string | null | undefined) => {
    if (cpType === 'Supplier') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">Fournisseur</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">Client</Badge>;
  };

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden bg-white/70 backdrop-blur-xl">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              Recherche Approfondie des Règlements
            </CardTitle>
            <CardDescription>Recherchez à travers tous les règlements clients et fournisseurs</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Réinitialiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 bg-gray-50/30 border-b border-gray-100">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Période du</label>
              <Input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setPageNumber(1);
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Au</label>
              <Input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setPageNumber(1);
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Tiers</label>
              <Select
                value={counterpartType}
                onValueChange={(val: string | null) => {
                  setCounterpartType(val || 'all');
                  setPageNumber(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les tiers">
                    {counterpartType === 'all' ? 'Tous les tiers' : counterpartType === 'Customer' ? 'Clients' : 'Fournisseurs'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les tiers</SelectItem>
                  <SelectItem value="Customer">Clients</SelectItem>
                  <SelectItem value="Supplier">Fournisseurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nature</label>
              <Select
                value={nature}
                onValueChange={(val: string | null) => {
                  setNature(val || 'all');
                  setPageNumber(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes natures">
                    {nature === 'all' ? 'Toutes natures' : nature === 'PAIEMENT_DOC' ? 'Paiement Doc' : 'Recouvrement / Avance'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes natures</SelectItem>
                  <SelectItem value="PAIEMENT_DOC">Paiement Doc</SelectItem>
                  <SelectItem value="RECOUVREMENT">Recouvrement / Avance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Méthode</label>
              <Select
                value={paymentMethod}
                onValueChange={(val: string | null) => {
                  setPaymentMethod(val || 'all');
                  setPageNumber(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes méthodes">
                    {paymentMethod === 'all' ? 'Toutes méthodes' : paymentMethod === 'ESPECE' ? 'Espèce' : paymentMethod === 'CHEQUE' ? 'Chèque' : paymentMethod === 'TRAITE' ? 'Traite' : paymentMethod === 'VIREMENT' ? 'Virement' : paymentMethod === 'CARTE' ? 'Carte Bancaire' : paymentMethod}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes méthodes</SelectItem>
                  <SelectItem value="ESPECE">Espèce</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="TRAITE">Traite</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte Bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Recherche</label>
              <Input 
                placeholder="Client, fournisseur, réf..." 
                value={search} 
                onChange={e => {
                  setSearch(e.target.value);
                  setPageNumber(1);
                }} 
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-transparent hidden md:block">Action</label>
              <Button type="submit" className="w-full h-9 bg-indigo-600 hover:bg-indigo-700">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          {isLoading && payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
              <p>Chargement des règlements...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 flex flex-col items-center justify-center">
              <AlertCircle className="w-6 h-6 mb-2" />
              <p>Une erreur est survenue lors du chargement des données.</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>Aucun règlement trouvé pour ces critères.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Tiers</th>
                  <th className="px-4 py-3 font-medium">Nature</th>
                  <th className="px-4 py-3 font-medium">Méthode</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment: any) => (
                  <tr key={payment.paymentId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {format(new Date(payment.paymentDate), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>{payment.documentNumber || payment.reference || '-'}</span>
                        {payment.documentNumber && payment.reference && (
                          <span className="text-xs text-gray-500 font-normal">{payment.reference}</span>
                        )}
                        {payment.instrument?.instrumentNumber && (
                          <span className="text-xs text-gray-500 font-normal">
                            N° {payment.instrument.instrumentNumber}{payment.instrument.bank ? ` (${payment.instrument.bank})` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2">
                        <span>{payment.customerName || '-'}</span>
                        {renderCounterpartBadge(payment.counterpartType)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {renderNatureBadge(payment.nature, payment.counterpartType)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-normal">
                        {payment.paymentMethod || 'Autre'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {payment.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {totalCount > 0 && (
          <div className="border-t border-gray-100 p-3 bg-gray-50">
            <TablePagination
              currentPage={pageNumber}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={setPageNumber}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageNumber(1);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
