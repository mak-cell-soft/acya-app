'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingBordereaux, useRemoveInstrumentFromBordereau, useValidateBordereau } from '@/hooks/use-payment-instruments';
import { Landmark, Calendar, X, CheckCircle2, ChevronRight, Hash, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export function PendingBordereauxSection() {
  const { data: bordereaux, isLoading } = usePendingBordereaux();
  const { mutate: removeInstrument, isPending: isRemoving } = useRemoveInstrumentFromBordereau();
  const { mutate: validateBordereau, isPending: isValidating } = useValidateBordereau();

  if (isLoading) {
    return (
      <Card className="border-forest-100 rounded-[32px] bg-white shadow-xl shadow-forest-900/5 mb-8">
        <CardHeader className="p-8 pb-4">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg mt-2" />
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  if (!bordereaux || bordereaux.length === 0) {
    return null; // Don't show the section if there are no pending bordereaux
  }

  return (
    <Card className="border-forest-100 rounded-[32px] bg-white shadow-xl shadow-forest-900/5 mb-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Landmark className="w-48 h-48 text-forest-900" />
      </div>
      
      <CardHeader className="p-8 pb-6 relative z-10">
        <CardTitle className="font-heading text-2xl text-forest-900 flex items-center gap-3">
          <div className="p-2.5 bg-forest-50 text-forest-600 rounded-xl">
            <Landmark className="w-6 h-6" />
          </div>
          Validation des Remises en Banque
        </CardTitle>
        <CardDescription className="text-sand-500 font-medium text-base">
          Vérifiez et validez les bordereaux de remise générés avant leur encaissement définitif.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 pt-0 relative z-10">
        <Accordion className="space-y-4">
          {bordereaux.map((bordereau) => (
            <AccordionItem 
              key={bordereau.reference} 
              value={bordereau.reference}
              className="border border-forest-100 rounded-2xl px-6 bg-white data-[state=open]:bg-sand-50/30 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold font-mono text-forest-900 text-lg flex items-center gap-2">
                        <Hash className="w-4 h-4 text-forest-400" />
                        {bordereau.reference}
                      </span>
                      <span className="text-sm font-medium text-sand-500 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        {bordereau.bankName} • {bordereau.bankRib}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right flex flex-col">
                      <span className="text-xs font-bold text-sand-400 uppercase tracking-wider">Montant Net</span>
                      <span className="font-bold font-mono text-forest-700 text-xl">{formatCurrency(bordereau.totalNetAmount)}</span>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold px-3 py-1">
                      {bordereau.instrumentCount} Instrument(s)
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="pt-2 pb-6 border-t border-forest-50">
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-xl border border-forest-50 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-sand-50/50 text-sand-500 font-bold uppercase text-xs tracking-wider">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-xl">Instrument</th>
                          <th className="px-4 py-3">Émetteur</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">Échéance</th>
                          <th className="px-4 py-3 text-right rounded-tr-xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forest-50">
                        {bordereau.instruments.map((inst) => (
                          <tr key={inst.id} className="hover:bg-sand-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-forest-900">{inst.type}</span>
                                <span className="font-mono text-xs text-sand-500">{inst.instrumentNumber}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-forest-800">
                              {inst.owner || inst.customerName}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-forest-700">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="px-4 py-3 text-sand-600">
                              {inst.dueDate ? format(new Date(inst.dueDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isRemoving || isValidating}
                                onClick={() => removeInstrument({ reference: bordereau.reference, instrumentId: inst.id })}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-medium"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Retirer
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-center justify-between bg-forest-50/50 p-5 rounded-xl border border-forest-100 mt-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-forest-900">Total Frais (TTC) : <span className="font-mono text-rose-600">{formatCurrency(bordereau.totalFeeWithTax)}</span></span>
                      <span className="text-xs text-sand-500 mt-1">Montant Brut : {formatCurrency(bordereau.totalAmountHT)}</span>
                    </div>
                    <Button 
                      onClick={() => validateBordereau(bordereau.reference)}
                      disabled={isValidating || isRemoving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Valider la remise en banque
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
