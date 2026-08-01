'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBanks } from '@/hooks/use-banks';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { Landmark, Printer, Plus, Trash2, FileCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BordereauPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialInstruments?: any[];
  initialBankId?: number | null;
  initialType?: 'CHEQUE' | 'TRAITE';
  initialCounterpartType?: 'client' | 'supplier';
}

export function BordereauPrintDialog({
  isOpen,
  onClose,
  initialInstruments = [],
  initialBankId = null,
  initialType = 'CHEQUE',
  initialCounterpartType = 'client',
}: BordereauPrintDialogProps) {
  const { data: banksList = [] } = useBanks();

  const [bankId, setBankId] = useState<string>('');
  const [bordereauType, setBordereauType] = useState<'CHEQUE' | 'TRAITE'>('CHEQUE');
  const [counterpartType, setCounterpartType] = useState<'client' | 'supplier'>('client');
  const [refBordereau, setRefBordereau] = useState<string>('');

  const [instruments, setInstruments] = useState<any[]>([]);

  // Item form line state
  const [numInstrument, setNumInstrument] = useState('');
  const [banqueEmettrice, setBanqueEmettrice] = useState('');
  const [nomTiers, setNomTiers] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [montant, setMontant] = useState('');

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBordereauType(initialType);
      setCounterpartType(initialCounterpartType);
      setRefBordereau(`BV-${initialType.slice(0, 3)}-${Date.now().toString().slice(-6)}`);
      
      if (initialBankId) {
        setBankId(initialBankId.toString());
      } else if (banksList.length > 0) {
        setBankId(banksList[0].id.toString());
      }

      if (initialInstruments.length > 0) {
        setInstruments(initialInstruments);
      } else {
        setInstruments([
          {
            id: '1',
            number: '',
            bankName: 'STB',
            counterpartName: '',
            dueDate: '',
            amount: 0
          }
        ]);
      }
    }
  }, [isOpen, initialType, initialCounterpartType, initialBankId, initialInstruments, banksList]);

  const handleAddLine = () => {
    if (!numInstrument || !montant) {
      toast.error('Veuillez remplir au moins le numéro d\'instrument et le montant.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      number: numInstrument,
      bankName: banqueEmettrice || '---',
      counterpartName: nomTiers || '---',
      dueDate: dueDate || null,
      amount: parseFloat(montant) || 0
    };

    setInstruments((prev) => [...prev, newItem]);
    setNumInstrument('');
    setBanqueEmettrice('');
    setNomTiers('');
    setDueDate('');
    setMontant('');
  };

  const handleRemoveLine = (id: string) => {
    setInstruments((prev) => prev.filter((item) => item.id !== id));
  };

  const selectedBankObj = banksList.find((b: any) => b.id.toString() === bankId);

  const totalAmount = instruments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleTriggerPrint = () => {
    if (!bankId) {
      toast.error('Veuillez sélectionner la banque de l\'entreprise.');
      return;
    }
    const validInstruments = instruments.filter(i => i.number && i.amount > 0);
    if (validInstruments.length === 0) {
      toast.error('Veuillez ajouter au moins un instrument valide (numéro et montant).');
      return;
    }

    setIsPrintDialogOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-2.5 bg-corp-blue-50 dark:bg-corp-blue-950/20 text-corp-blue-900 rounded-xl">
                <Landmark className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Bordereau de Versement (Chèque / Traite)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Impression du bordereau dupliqué (2 exemplaires identiques sur une feuille A4).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Top Config Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Banque Entreprise *</Label>
                <Select value={bankId} onValueChange={(val) => setBankId(val || '')}>
                  <SelectTrigger className="h-10 text-xs font-bold bg-white">
                    <SelectValue placeholder="Sélectionner une banque" />
                  </SelectTrigger>
                  <SelectContent>
                    {banksList.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()} className="text-xs font-semibold">
                        {b.designation} (Code: {b.bankCode || b.reference})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Type d&apos;instrument *</Label>
                <Select value={bordereauType} onValueChange={(val: any) => setBordereauType(val)}>
                  <SelectTrigger className="h-10 text-xs font-bold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHEQUE" className="text-xs font-semibold">Chèques</SelectItem>
                    <SelectItem value="TRAITE" className="text-xs font-semibold">Traites</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Origine Tiers *</Label>
                <Select value={counterpartType} onValueChange={(val: any) => setCounterpartType(val)}>
                  <SelectTrigger className="h-10 text-xs font-bold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client" className="text-xs font-semibold">Client (Encaissement)</SelectItem>
                    <SelectItem value="supplier" className="text-xs font-semibold">Fournisseur (Décaissement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Add Line Form */}
            <div className="space-y-3 bg-corp-blue-50/50 p-4 rounded-2xl border border-corp-blue-100">
              <span className="text-xs font-bold text-corp-blue-900 block">Ajouter un instrument au bordereau :</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <Input
                  placeholder="N° Instrument *"
                  value={numInstrument}
                  onChange={(e) => setNumInstrument(e.target.value)}
                  className="h-9 text-xs bg-white font-mono"
                />
                <Input
                  placeholder="Banque émettrice"
                  value={banqueEmettrice}
                  onChange={(e) => setBanqueEmettrice(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
                <Input
                  placeholder="Nom Tiers"
                  value={nomTiers}
                  onChange={(e) => setNomTiers(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs bg-white font-mono"
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Montant TND *"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="h-9 text-xs bg-white font-mono font-bold"
                  />
                  <Button
                    type="button"
                    onClick={handleAddLine}
                    className="h-9 px-3 bg-corp-blue-900 hover:bg-corp-blue-950 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Instruments List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">N° Instrument</th>
                    <th className="p-3">Banque Émettrice</th>
                    <th className="p-3">Tiers</th>
                    <th className="p-3">Échéance</th>
                    <th className="p-3 text-right">Montant (TND)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {instruments.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {item.number || '---'}
                      </td>
                      <td className="p-3 font-medium text-slate-700">{item.bankName || '---'}</td>
                      <td className="p-3 font-medium text-slate-700">{item.counterpartName || '---'}</td>
                      <td className="p-3 font-mono text-slate-500">{item.dueDate || '---'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 text-right">
                        {(parseFloat(item.amount) || 0).toFixed(3)} TND
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveLine(item.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center font-mono font-bold">
                <span>TOTAL GENERAL ({instruments.length} instruments)</span>
                <span className="text-amber-400 text-base">{totalAmount.toFixed(3)} TND</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 gap-2">
            <Button variant="outline" onClick={onClose} className="h-11 px-5 text-xs font-bold">
              Annuler
            </Button>
            <Button
              onClick={handleTriggerPrint}
              className="h-11 px-6 bg-corp-blue-900 hover:bg-corp-blue-950 text-white font-bold text-xs gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Bordereau (2 copies / A4)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintVariantDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        docType="bordereau-versement"
        bordereauInstruments={instruments.filter(i => i.number && i.amount > 0)}
        bank={selectedBankObj}
        bordereauType={bordereauType}
        counterpartType={counterpartType}
        bordereauNumber={refBordereau}
        depositDate={new Date()}
      />
    </>
  );
}
