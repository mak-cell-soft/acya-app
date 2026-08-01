'use client';

import React, { useState, useEffect } from 'react';
import { useCustomerRecouvrement, useCreateRecouvrement } from '@/hooks/use-recouvrement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/services/components/payment.service';
import { BANKS_TN } from '@/constants/banks';
import { cn } from '@/lib/utils';


const formatCurrency = (val: number) => val.toLocaleString('fr-TN', { minimumFractionDigits: 3 });

interface CustomerRecouvrementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  paymentToEdit?: any;
  onSuccess?: () => void;
}

export function CustomerRecouvrementDialog({ open, onOpenChange, customerId, paymentToEdit, onSuccess }: CustomerRecouvrementDialogProps) {
  const { data: recouvrementData, isLoading } = useCustomerRecouvrement(customerId, open);
  const createMutation = useCreateRecouvrement();

  const [paymentType, setPaymentType] = useState<'general' | 'document'>('general');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE'>('ESPECE');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loadingRef, setLoadingRef] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Instrument Details (for Cheque / Traite)
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [bank, setBank] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState<string>('');

  React.useEffect(() => {
    if (paymentToEdit && open) {
      setPaymentType(paymentToEdit.documentId ? 'document' : 'general');
      setSelectedDocumentId(paymentToEdit.documentId ? paymentToEdit.documentId.toString() : '');
      setAmount(paymentToEdit.amount !== undefined ? paymentToEdit.amount.toString() : '');
      setPaymentDate(paymentToEdit.paymentDate ? format(new Date(paymentToEdit.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod(paymentToEdit.paymentMethod || 'ESPECE');
      setReference(paymentToEdit.reference || '');
      setNotes(paymentToEdit.notes || '');
      setInstrumentNumber(paymentToEdit.instrument?.instrumentNumber || paymentToEdit.instrumentNumber || '');
      setBank(paymentToEdit.instrument?.bank || paymentToEdit.bank || '');
      setOwner(paymentToEdit.instrument?.owner || paymentToEdit.owner || '');
      setDueDate(paymentToEdit.instrument?.dueDate ? format(new Date(paymentToEdit.instrument.dueDate), 'yyyy-MM-dd') : '');
    }
  }, [paymentToEdit, open]);

  const handleDocumentSelect = (docId: string | null) => {
    if (!docId) {
      setSelectedDocumentId('');
      setAmount('');
      return;
    }
    setSelectedDocumentId(docId);
    if (docId !== 'none') {
      const doc = recouvrementData?.unpaidInvoices?.find(d => d.documentId.toString() === docId);
      if (doc) {
        setAmount(doc.remaining.toString());
      }
    } else {
      setAmount('');
    }
  };

  const handlePaymentTypeChange = (val: 'general' | 'document') => {
    setPaymentType(val);
    if (val === 'general') {
      setSelectedDocumentId('');
      setAmount('');
    }
  };

  const handleGenerateReference = async () => {
    setLoadingRef(true);
    try {
      const res = await paymentService.generateReference();
      setReference(res.reference || '');
      toast.success('Référence générée avec succès !');
    } catch (err) {
      console.error('Failed to generate reference:', err);
      toast.error('Erreur lors de la génération de la référence.');
    } finally {
      setLoadingRef(false);
    }
  };

  const onSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }

    if (paymentType === 'document' && (!selectedDocumentId || selectedDocumentId === 'none')) {
      toast.error('Veuillez sélectionner un document ou choisir "Paiement global"');
      return;
    }

    if ((paymentMethod === 'CHEQUE' || paymentMethod === 'TRAITE') && (!instrumentNumber || !bank)) {
      toast.error(`Veuillez saisir le numéro et la banque pour ce ${paymentMethod.toLowerCase()}`);
      return;
    }

    if (paymentToEdit) {
      setIsUpdating(true);
      paymentService.update(paymentToEdit.paymentId || paymentToEdit.id, {
        paymentId: paymentToEdit.paymentId || paymentToEdit.id,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        reference,
        notes,
        documentId: paymentType === 'document' && selectedDocumentId !== 'none' ? Number(selectedDocumentId) : undefined,
        instrumentDetails: (paymentMethod === 'CHEQUE' || paymentMethod === 'TRAITE') ? {
          instrumentNumber,
          bank,
          owner,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        } : undefined
      }).then(() => {
        toast.success('Paiement modifié avec succès');
        resetForm();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }).catch((err: any) => {
        toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Erreur lors de la modification');
      }).finally(() => {
        setIsUpdating(false);
      });
      return;
    }

    createMutation.mutate(
      {
        customerId,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        reference,
        notes,
        documentId: paymentType === 'document' && selectedDocumentId !== 'none' ? Number(selectedDocumentId) : undefined,
        instrumentDetails: (paymentMethod === 'CHEQUE' || paymentMethod === 'TRAITE') ? {
          instrumentNumber,
          bank,
          owner,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        } : undefined
      },
      {
        onSuccess: () => {
          toast.success('Paiement enregistré avec succès');
          resetForm();
          onOpenChange(false);
          if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Erreur lors de l\'enregistrement');
        }
      }
    );
  };

  const resetForm = () => {
    setPaymentType('general');
    setSelectedDocumentId('');
    setAmount('');
    setPaymentMethod('ESPECE');
    setReference('');
    setNotes('');
    setInstrumentNumber('');
    setBank('');
    setOwner('');
    setDueDate('');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="w-full max-w-full sm:max-w-2xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-none sm:rounded-2xl bg-white max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-6 sm:p-8 relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-100 text-emerald-600 shrink-0 animate-pulse">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Nouveau Recouvrement (Encaissement)
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm font-medium mt-1">
                {recouvrementData?.customerName ? `Client : ${recouvrementData.customerName}` : 'Enregistrez un paiement pour ce client'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                  <p className="text-xs font-bold text-sand-500 uppercase tracking-wider mb-1">Solde Actuel</p>
                  <p className={cn("text-2xl font-black", recouvrementData?.currentBalance && recouvrementData.currentBalance > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                    {formatCurrency(recouvrementData?.currentBalance || 0)} <span className="text-sm font-bold text-muted-foreground">DT</span>
                  </p>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-corp-blue-50/80 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
                  <p className="text-xs font-bold text-sand-500 uppercase tracking-wider mb-1">Total Impayé (Factures)</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                    {formatCurrency(recouvrementData?.totalUnpaid || 0)} <span className="text-sm font-bold text-muted-foreground">DT</span>
                  </p>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Type d'affectation</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup">
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('general')}
                    className={cn(
                      "flex items-center gap-3 cursor-pointer border rounded-xl p-4 text-left transition-all duration-200 outline-none focus:ring-2 focus:ring-corp-blue-500/20",
                      paymentType === 'general'
                        ? "border-corp-blue-500 bg-corp-blue-50/40 text-corp-blue-900 shadow-sm"
                        : "border-border hover:bg-slate-50 text-muted-foreground hover:text-foreground bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                      paymentType === 'general' ? "border-corp-blue-600 bg-corp-blue-600" : "border-muted-foreground"
                    )}>
                      {paymentType === 'general' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm block">Acompte Global</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Paiement non lié à un document</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('document')}
                    className={cn(
                      "flex items-center gap-3 cursor-pointer border rounded-xl p-4 text-left transition-all duration-200 outline-none focus:ring-2 focus:ring-corp-blue-500/20",
                      paymentType === 'document'
                        ? "border-corp-blue-500 bg-corp-blue-50/40 text-corp-blue-900 shadow-sm"
                        : "border-border hover:bg-slate-50 text-muted-foreground hover:text-foreground bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                      paymentType === 'document' ? "border-corp-blue-600 bg-corp-blue-600" : "border-muted-foreground"
                    )}>
                      {paymentType === 'document' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm block">Affecté à une Facture</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Lier le paiement à un BL ou facture</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Document Selection (If applicable) */}
              {paymentType === 'document' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Facture / BL impayé</Label>
                  <Select value={selectedDocumentId} onValueChange={handleDocumentSelect}>
                    <SelectTrigger className="w-full h-11 border-corp-blue-50 bg-white font-semibold text-corp-blue-900 shadow-sm">
                      {selectedDocumentId && selectedDocumentId !== 'none' ? (
                        <span>
                          {(() => {
                            const doc = recouvrementData?.unpaidInvoices?.find(d => d.documentId.toString() === selectedDocumentId);
                            return doc ? `${doc.documentNumber} (${format(new Date(doc.creationDate), 'dd/MM/yyyy')}) - Reste: ${formatCurrency(doc.remaining)}` : "Sélectionnez un document";
                          })()}
                        </span>
                      ) : selectedDocumentId === 'none' ? (
                        <span>Ne pas lier</span>
                      ) : (
                        <SelectValue placeholder="Sélectionnez un document" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-corp-blue-100">
                      <SelectItem value="none">Ne pas lier</SelectItem>
                      {recouvrementData?.unpaidInvoices?.map(doc => (
                        <SelectItem key={doc.documentId} value={doc.documentId.toString()}>
                          {doc.documentNumber} ({format(new Date(doc.creationDate), 'dd/MM/yyyy')}) - Reste: {formatCurrency(doc.remaining)} DT
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {recouvrementData?.unpaidInvoices?.length === 0 && (
                    <div className="text-center py-6 text-corp-blue-500 text-sm font-semibold bg-slate-50/50 rounded-xl border border-dashed border-border mt-2">
                      Aucune facture impayée trouvée.
                    </div>
                  )}
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Date du paiement</Label>
                  <Input 
                    type="date" 
                    value={paymentDate} 
                    onChange={(e) => setPaymentDate(e.target.value)} 
                    className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-semibold text-corp-blue-900 shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Méthode de paiement</Label>
                  <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                    <SelectTrigger className="w-full h-11 border-corp-blue-50 bg-white font-semibold text-corp-blue-900 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-corp-blue-100">
                      <SelectItem value="ESPECE">Espèce</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="TRAITE">Traite</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CARTE">Carte Bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Montant</Label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-muted-foreground font-black text-sm">DT</span>
                  </div>
                  <Input 
                    type="number" 
                    step="0.001" 
                    min="0"
                    placeholder="0.000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-black text-lg pl-10 pr-4 text-corp-blue-900"
                  />
                </div>
              </div>

              {/* Instrument Details */}
              {(paymentMethod === 'CHEQUE' || paymentMethod === 'TRAITE') && (
                <div className="p-5 border border-corp-blue-50/80 rounded-2xl bg-sand-50/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h4 className="font-bold text-xs text-corp-blue-900 uppercase tracking-wider">
                    Détails du {paymentMethod.toLowerCase()}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Numéro</Label>
                      <Input 
                        value={instrumentNumber} 
                        onChange={(e) => setInstrumentNumber(e.target.value)} 
                        placeholder="N°..." 
                        className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-semibold text-corp-blue-900 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Banque</Label>
                      <Select value={bank} onValueChange={(val) => setBank(val || '')}>
                        <SelectTrigger className="w-full h-11 border-corp-blue-50 bg-white font-semibold text-corp-blue-900 shadow-sm">
                          <SelectValue placeholder="Choisir la banque" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-corp-blue-100 max-h-60 overflow-y-auto">
                          {BANKS_TN.map((b) => (
                            <SelectItem key={b.key} value={b.value}>
                              {b.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Titulaire</Label>
                      <Input 
                        value={owner} 
                        onChange={(e) => setOwner(e.target.value)} 
                        placeholder="Propriétaire..." 
                        className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-semibold text-corp-blue-900 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Date d'échéance</Label>
                      <Input 
                        type="date" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                        className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-semibold text-corp-blue-900 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Référence / N° reçu</Label>
                  <div className="relative flex items-center">
                    <Input 
                      value={reference} 
                      onChange={(e) => setReference(e.target.value)} 
                      placeholder="N° reçu, etc." 
                      className="h-11 bg-white border-corp-blue-50 focus:ring-1 font-semibold text-corp-blue-900 pr-12 shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleGenerateReference}
                      disabled={loadingRef}
                      className="absolute right-1 w-9 h-9 text-corp-blue-600 hover:text-corp-blue-700 hover:bg-corp-blue-50 rounded-lg"
                      title="Générer un numéro"
                    >
                      {loadingRef ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Notes additionnelles</Label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Observations..." 
                  rows={2}
                  className="flex min-h-[90px] w-full rounded-xl border border-corp-blue-50 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-corp-blue-600 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-semibold text-corp-blue-900"
                />
              </div>

            </div>
          )}
        </div>

        <DialogFooter className="pt-6 border-t border-corp-blue-50 p-6 sm:p-8 shrink-0 flex gap-3 flex-col sm:flex-row justify-end items-stretch sm:items-center">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 font-bold text-slate-500 hover:bg-slate-50 border-slate-200 rounded-xl"
          >
            Annuler
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={createMutation.isPending || isLoading}
            className="h-11 px-8 bg-corp-blue-600 text-white font-bold hover:bg-corp-blue-800 shadow-lg shadow-corp-blue-600/20 rounded-xl"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



