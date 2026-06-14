'use client';

import * as React from 'react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { usePaymentDeepSearch } from '@/hooks/use-payment-deep-search';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TablePagination } from '@/components/shared/table-pagination';

export function PaymentDeepSearchCard() {
  const [fromDate, setFromDate] = React.useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = React.useState<string>('');
  const [nature, setNature] = React.useState<string>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('all');
  
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const { data, isLoading, isError, refetch } = usePaymentDeepSearch({
    fromDate,
    toDate,
    search: search || undefined,
    nature: nature !== 'all' ? nature : undefined,
    paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
    counterpartType: 'Customer',
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

  const renderNatureBadge = (n: string | null | undefined) => {
    if (n === 'RECOUVREMENT') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Recouvrement</Badge>;
    }
    if (n === 'PAIEMENT_DOC') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Paiement Doc</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inconnu</Badge>;
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
            <CardDescription>Recherchez à travers tous les règlements et recouvrements</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 bg-gray-50/30 border-b border-gray-100">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Période du</label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Au</label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nature</label>
              <Select value={nature} onValueChange={(val: string | null) => setNature(val || 'all')}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes natures">
                    {nature === 'all' ? 'Toutes natures' : nature === 'PAIEMENT_DOC' ? 'Paiement Doc' : 'Recouvrement'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes natures</SelectItem>
                  <SelectItem value="PAIEMENT_DOC">Paiement Doc</SelectItem>
                  <SelectItem value="RECOUVREMENT">Recouvrement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Méthode</label>
              <Select value={paymentMethod} onValueChange={(val: string | null) => setPaymentMethod(val || 'all')}>
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
                placeholder="Client, référence..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
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
                  <th className="px-4 py-3 font-medium">Client</th>
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
                      {payment.documentNumber ? (
                        <div className="flex flex-col">
                          <span>{payment.documentNumber}</span>
                          {payment.reference && <span className="text-xs text-gray-500 font-normal">{payment.reference}</span>}
                        </div>
                      ) : (
                        payment.reference || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {payment.customerName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {renderNatureBadge(payment.nature)}
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
