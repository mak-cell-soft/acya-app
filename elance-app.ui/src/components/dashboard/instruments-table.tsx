'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TablePagination } from '@/components/shared/table-pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Loader2, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { usePaymentInstruments, useCreateBordereau } from '@/hooks/use-payment-instruments';
import { useBanks } from '@/hooks/use-banks';
import { useAuthStore } from '@/store/use-auth-store';
import { paymentService } from '@/services/components/payment.service';

export function InstrumentsTable() {
  const [tab, setTab] = React.useState<'pending' | 'versed'>('pending');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  
  const isVersedFilter = tab === 'versed' ? true : false;
  const { data: instruments = [], isLoading } = usePaymentInstruments(isVersedFilter);
  const { data: banks = [] } = useBanks();
  const createBordereauMutation = useCreateBordereau();
  const { user } = useAuthStore();
  
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [isBordereauModalOpen, setIsBordereauModalOpen] = React.useState(false);
  const [selectedBankId, setSelectedBankId] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');
  const [nextReference, setNextReference] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isBordereauModalOpen) {
      paymentService.getNextBordereauReference().then(res => setNextReference(res.reference)).catch(console.error);
    } else {
      setNextReference(null);
    }
  }, [isBordereauModalOpen]);

  // Reset selections on tab change
  React.useEffect(() => {
    setSelectedIds([]);
    setPage(1);
  }, [tab]);

  const paginatedInstruments = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return instruments.slice(start, start + pageSize);
  }, [instruments, page, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedInstruments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedInstruments.map(i => i.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateBordereau = async () => {
    if (!selectedBankId || selectedIds.length === 0) return;
    
    await createBordereauMutation.mutateAsync({
      bankId: parseInt(selectedBankId, 10),
      instrumentIds: selectedIds,
      depositDate: new Date().toISOString(),
      notes: notes || undefined,
      salesSiteId: user?.defaultSiteId ? Number(user.defaultSiteId) : undefined,
    });
    
    setIsBordereauModalOpen(false);
    setSelectedIds([]);
    setNotes('');
  };

  const selectedTotal = React.useMemo(() => {
    return instruments
      .filter(i => selectedIds.includes(i.id))
      .reduce((sum, i) => sum + i.amount, 0);
  }, [instruments, selectedIds]);

  return (
    <Card className="border-forest-100/50 bg-white shadow-none rounded-[24px] overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-xl font-heading font-bold text-forest-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-forest-600" />
            Portefeuille Instruments (Chèques / Traites)
          </CardTitle>
          <CardDescription className="text-sand-400 font-medium">
            Gérez vos instruments de paiement et créez vos bordereaux de remise en banque.
          </CardDescription>
        </div>
        
        {selectedIds.length > 0 && tab === 'pending' && (
          <Button 
            onClick={() => setIsBordereauModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-600/20"
          >
            Créer un bordereau ({selectedIds.length}) - {selectedTotal.toFixed(3)} TND
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="px-6 pb-2 border-b border-forest-50/50">
          <Tabs value={tab} onValueChange={(val) => setTab(val as any)} className="w-full">
            <TabsList className="bg-sand-50/50 p-1 rounded-xl">
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-forest-900 data-[state=active]:shadow-sm font-bold text-sm px-6">
                En portefeuille
              </TabsTrigger>
              <TabsTrigger value="versed" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-forest-900 data-[state=active]:shadow-sm font-bold text-sm px-6">
                Remis en banque
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="p-16 flex items-center justify-center text-sand-300">
            <Loader2 className="w-8 h-8 animate-spin text-forest-600 mr-2" />
            Chargement des instruments...
          </div>
        ) : instruments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-600 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-sand-400">Aucun instrument trouvé dans ce dossier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-forest-50/50 bg-forest-50/10">
                  {tab === 'pending' && (
                    <th className="px-6 py-4 w-12">
                      <Checkbox 
                        checked={selectedIds.length === paginatedInstruments.length && paginatedInstruments.length > 0} 
                        onCheckedChange={toggleSelectAll} 
                        className="rounded bg-white border-forest-200 data-[state=checked]:bg-forest-600 data-[state=checked]:border-forest-600"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Type / N°</th>
                  <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Client / Doc</th>
                  <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Date / Échéance</th>
                  <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider text-right">Montant</th>
                  {tab === 'versed' && (
                    <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Bordereau / Statut</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-50/20">
                {paginatedInstruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-forest-50/20 transition-all">
                    {tab === 'pending' && (
                      <td className="px-6 py-4">
                        <Checkbox 
                          checked={selectedIds.includes(inst.id)} 
                          onCheckedChange={() => toggleSelect(inst.id)}
                          className="rounded bg-white border-forest-200 data-[state=checked]:bg-forest-600 data-[state=checked]:border-forest-600"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit text-[0.65rem] font-bold uppercase mb-1 border-forest-100 text-forest-700 bg-forest-50/50">
                          {inst.type}
                        </Badge>
                        <span className="text-sm font-bold text-forest-900">{inst.instrumentNumber}</span>
                        <span className="text-xs font-medium text-sand-400">{inst.bank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-forest-900">{inst.customerName || 'N/A'}</span>
                        <span className="text-xs font-bold text-forest-600/70">{inst.documentNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-sand-500">
                          Reçu: {inst.issueDate ? format(new Date(inst.issueDate), 'dd/MM/yyyy') : '-'}
                        </span>
                        {inst.dueDate && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded w-fit">
                            Éch: {format(new Date(inst.dueDate), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-forest-950">
                        {inst.amount.toFixed(3)}
                      </span>
                      <span className="text-[0.65rem] font-bold text-sand-400 ml-1">TND</span>
                    </td>
                    {tab === 'versed' && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-forest-800 bg-forest-100 px-2 py-1 rounded w-fit border border-forest-200">
                            {inst.bordereauReference || '-'}
                          </span>
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-sand-400">
                            {inst.bankSettlementStatus || 'PENDING'}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-4 border-t border-forest-50">
              <TablePagination 
                currentPage={page}
                totalItems={instruments.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </CardContent>

      {/* Bordereau Creation Modal */}
      <Dialog open={isBordereauModalOpen} onOpenChange={setIsBordereauModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-forest-100 rounded-[24px]">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-heading font-bold text-forest-900">
              Créer un Bordereau
            </DialogTitle>
            <DialogDescription className="text-sand-400 font-medium">
              Remise en banque de {selectedIds.length} instrument(s) pour un total de <strong className="text-forest-700">{selectedTotal.toFixed(3)} TND</strong>.
            </DialogDescription>
            {nextReference && (
              <div className="mt-3 bg-forest-50/50 border border-forest-100 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-forest-800 uppercase tracking-wider">Référence Générée</span>
                <span className="text-sm font-black text-forest-950 bg-white px-2 py-1 rounded shadow-sm">{nextReference}</span>
              </div>
            )}
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-sand-500">
                Compte Bancaire Cible
              </Label>
              <Select value={selectedBankId} onValueChange={(val: string | null) => setSelectedBankId(val as string)}>
                <SelectTrigger className="h-12 rounded-xl border-forest-100 focus:ring-forest-600/20 focus:border-forest-600">
                  <SelectValue placeholder="Sélectionnez une banque">
                    {selectedBankId 
                      ? `${banks.find(b => b.id.toString() === selectedBankId)?.designation || ''} - ${banks.find(b => b.id.toString() === selectedBankId)?.rib || ''}` 
                      : "Sélectionnez une banque"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-forest-100">
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="font-medium rounded-lg">
                      {b.designation} - {b.rib}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-sand-500">
                Notes / Référence Externe
              </Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Bordereau apporté par Jean"
                className="h-12 rounded-xl border-forest-100 focus:ring-forest-600/20 focus:border-forest-600 placeholder:text-sand-300"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-sand-50/30 flex justify-end gap-3 border-t border-forest-50/50 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsBordereauModalOpen(false)}
              className="h-11 px-6 rounded-xl font-bold border-forest-100 text-forest-600 hover:bg-forest-50"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateBordereau}
              disabled={!selectedBankId || createBordereauMutation.isPending}
              className="h-11 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2 disabled:opacity-50"
            >
              {createBordereauMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Valider la remise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
