'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { usePendingTraitesToClear, useClearTraite } from '@/hooks/use-payment-instruments';
import { Loader2, Landmark, CalendarDays, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PendingTraiteToClearDto } from '@/types/payment';

export function PendingTraitesSection() {
  const { data: traites, isLoading, isError } = usePendingTraitesToClear();
  const { mutate: clearTraite, isPending: isClearing } = useClearTraite();

  // Sort by due date (oldest/closest first)
  const sortedTraites = useMemo(() => {
    if (!traites) return [];
    return [...traites].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [traites]);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 ring-1 ring-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            Chargement des traites...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="shadow-sm border-0 ring-1 ring-rose-200 bg-rose-50/50">
        <CardContent className="pt-6 flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium text-sm">Impossible de charger les traites en attente d'encaissement.</p>
        </CardContent>
      </Card>
    );
  }

  if (!sortedTraites.length) {
    return null; // Don't show anything if there are no traites
  }

  const getDueDateBadge = (dueDateStr: string | null) => {
    if (!dueDateStr) return <Badge variant="outline" className="text-slate-500">Non définie</Badge>;
    
    const dueDate = new Date(dueDateStr);
    if (isToday(dueDate)) {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Aujourd'hui</Badge>;
    }
    if (isPast(dueDate)) {
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">En retard</Badge>;
    }
    return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">À venir</Badge>;
  };

  return (
    <Card className="shadow-sm border-0 ring-1 ring-slate-200 mb-6 overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-br from-indigo-50/50 to-white border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
              <Landmark className="w-5 h-5 text-indigo-500" />
              Encaissement des Traites
              <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                {sortedTraites.length}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-slate-500">
              Traites versées en banque en attente d'encaissement définitif
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-medium">Référence</TableHead>
              <TableHead className="font-medium">Bénéficiaire / Client</TableHead>
              <TableHead className="font-medium">Banque & RIB</TableHead>
              <TableHead className="font-medium">Montant Net</TableHead>
              <TableHead className="font-medium">Date d'échéance</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTraites.map((traite) => (
              <TableRow key={traite.instrumentId} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{traite.instrumentNumber || 'N/A'}</span>
                    <span className="text-xs text-slate-500">Bord. {traite.reference}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-700">{traite.owner || 'Non spécifié'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{traite.bankName || 'Banque inconnue'}</span>
                    {traite.bankRib && <span className="text-xs text-slate-500 font-mono">{traite.bankRib}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{formatCurrency(traite.netAmount)}</span>
                    <span className="text-xs text-slate-500">Brut: {formatCurrency(traite.amount)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {traite.dueDate ? format(new Date(traite.dueDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </span>
                    {getDueDateBadge(traite.dueDate)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                    disabled={isClearing}
                    onClick={() => clearTraite(traite.instrumentId)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Encaisser
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

