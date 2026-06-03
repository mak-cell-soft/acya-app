'use client';

import { useState } from 'react';
import { useCustomerRecouvrement, useCreateRecouvrement } from '@/hooks/use-recouvrement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, DollarSign, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/services/components/payment.service';

const formatCurrency = (val: number) => val.toLocaleString('fr-TN', { minimumFractionDigits: 3 });

interface CustomerRecouvrementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
}

export function CustomerRecouvrementDialog({ open, onOpenChange, customerId }: CustomerRecouvrementDialogProps) {
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

  // Instrument Details (for Cheque / Traite)
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [bank, setBank] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState<string>('');

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Nouveau Recouvrement (Encaissement)
          </DialogTitle>
          <DialogDescription>
            {recouvrementData?.customerName ? `Client: ${recouvrementData.customerName}` : 'Enregistrez un paiement pour ce client'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Solde Actuel</p>
                  <p className={`text-2xl font-bold ${recouvrementData?.currentBalance && recouvrementData.currentBalance > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
                    {formatCurrency(recouvrementData?.currentBalance || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Impayé (Factures)</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(recouvrementData?.totalUnpaid || 0)}
                  </p>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-3">
                <Label className="text-base">Type d'affectation</Label>
                <div className="flex gap-4" role="radiogroup">
                  <label className="flex items-center space-x-2 cursor-pointer border rounded-lg p-3 flex-1 hover:bg-forest-50 transition-colors">
                    <input
                      type="radio"
                      className="text-forest-600 focus:ring-forest-500 w-4 h-4"
                      checked={paymentType === 'general'}
                      onChange={() => handlePaymentTypeChange('general')}
                    />
                    <span className="font-medium text-sm">Acompte Global</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer border rounded-lg p-3 flex-1 hover:bg-forest-50 transition-colors">
                    <input
                      type="radio"
                      className="text-forest-600 focus:ring-forest-500 w-4 h-4"
                      checked={paymentType === 'document'}
                      onChange={() => handlePaymentTypeChange('document')}
                    />
                    <span className="font-medium text-sm">Affecté à une Facture</span>
                  </label>
                </div>
              </div>

              {/* Document Selection (If applicable) */}
              {paymentType === 'document' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label>Facture / BL impayé</Label>
                  <Select value={selectedDocumentId} onValueChange={handleDocumentSelect}>
                    <SelectTrigger className="w-full">
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
                    <SelectContent>
                      <SelectItem value="none">Ne pas lier</SelectItem>
                      {recouvrementData?.unpaidInvoices?.map(doc => (
                        <SelectItem key={doc.documentId} value={doc.documentId.toString()}>
                          {doc.documentNumber} ({format(new Date(doc.creationDate), 'dd/MM/yyyy')}) - Reste: {formatCurrency(doc.remaining)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {recouvrementData?.unpaidInvoices?.length === 0 && (
                    <div className="text-center py-8 text-forest-500 text-sm">
                      Aucune facture impayée trouvée.
                    </div>
                  )}
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date du paiement</Label>
                  <Input 
                    type="date" 
                    value={paymentDate} 
                    onChange={(e) => setPaymentDate(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Méthode de paiement</Label>
                  <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECE">Espèce</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="TRAITE">Traite</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CARTE">Carte Bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Montant</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.001" 
                    min="0"
                    placeholder="0.000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="text-lg font-bold pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">DT</span>
                </div>
              </div>

              {/* Instrument Details */}
              {(paymentMethod === 'CHEQUE' || paymentMethod === 'TRAITE') && (
                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Détails du {paymentMethod.toLowerCase()}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Numéro</Label>
                      <Input value={instrumentNumber} onChange={(e) => setInstrumentNumber(e.target.value)} placeholder="N°..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Banque</Label>
                      <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BIAT, Attijari..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Titulaire</Label>
                      <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Propriétaire..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Date d'échéance</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Référence / N° reçu</Label>
                  <div className="relative flex items-center">
                    <Input 
                      value={reference} 
                      onChange={(e) => setReference(e.target.value)} 
                      placeholder="N° reçu, etc." 
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleGenerateReference}
                      disabled={loadingRef}
                      className="absolute right-1 w-8 h-8 rounded-md text-forest-600 hover:text-forest-700 hover:bg-forest-50"
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
                <div className="space-y-2">
                  <Label>Notes additionnelles</Label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Observations..." 
                    rows={2}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={createMutation.isPending || isLoading}
            className="min-w-[120px]"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
