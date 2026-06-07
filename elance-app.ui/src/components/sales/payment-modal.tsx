'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  FileText,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Ticket,
  FileSignature,
  Landmark,
  MessageSquare,
  Layers,
  ListTodo,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { paymentService } from '@/services/components/payment.service';
import { bankService } from '@/services/configuration/bank.service';
import { exchangeRateService } from '@/services/components/exchange-rate.service';
import { toast } from 'sonner';
import { DEVISES } from '@/lib/constants/settings';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


const TUNISIAN_BANKS = [
  "Al Baraka Bank",
  "Amen Bank",
  "ATB",
  "Attijari Bank",
  "Banque de l'Habitat (BH)",
  "BFPME",
  "BIAT",
  "BNA",
  "BT",
  "BTE",
  "BTL",
  "BTS",
  "Citibank",
  "QNB",
  "STB",
  "TSB",
  "UBCI",
  "UIB",
  "Wifak Bank",
  "Zitouna Bank"
];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: {
    documentId: number;
    documentNumber: string;
    totalAmount: number;
    totalNetPayable?: number;
    withholdingtax?: boolean;
    holdingtax?: any;
    totalCreditNotes?: number;
    remainingAmount?: number;
    customerId: number;
    customerName: string;
    isEditMode?: boolean;
    paymentId?: number;
    prefillAmount?: number;
    prefillDate?: string | Date;
    prefillMethod?: 'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE';
    prefillReference?: string;
    prefillNotes?: string;
    prefillInstrument?: any;
  };
}

export function PaymentModal({ isOpen, onClose, onSuccess, data }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE'>('ESPECE');
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState<string>('0.000');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [currency, setCurrency] = useState<string>('TND');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);

  // Instrument Details (for Cheque / Traite)
  const [instrumentNumber, setInstrumentNumber] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [porter, setPorter] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [banks, setBanks] = useState<any[]>([]);
  const [existingEcheance, setExistingEcheance] = useState<{totalAmount: number, instrumentCount: number} | null>(null);

  useEffect(() => {
    bankService.getAll()
      .then((res) => {
        const enterpriseBanks = res.items || res;
        const bankNames = new Set(enterpriseBanks.map((b: any) => b.designation?.trim().toUpperCase()));
        const merged = [...enterpriseBanks];
        
        TUNISIAN_BANKS.forEach(name => {
          if (!bankNames.has(name.toUpperCase())) {
            merged.push({ id: `static-${name}`, designation: name });
            bankNames.add(name.toUpperCase());
          }
        });
        
        // Sort alphabetically
        merged.sort((a, b) => a.designation.localeCompare(b.designation));
        setBanks(merged);
      })
      .catch((err) => console.error('Failed to load banks:', err));
  }, []);

  useEffect(() => {
    if (selectedMethod === 'TRAITE' && dueDate) {
      const timeoutId = setTimeout(() => {
        const d = new Date(dueDate);
        paymentService.getEcheances(d, d)
          .then((res) => {
            const items = res.items || res;
            if (items && items.length > 0) {
              setExistingEcheance(items[0]);
            } else {
              setExistingEcheance(null);
            }
          })
          .catch(() => setExistingEcheance(null));
      }, 400);
      return () => clearTimeout(timeoutId);
    } else {
      setExistingEcheance(null);
    }
  }, [selectedMethod, dueDate]);

  // Load existing payments to calculate remaining amount or fill prefilled details
  useEffect(() => {
    if (isOpen && data.documentId) {
      if (data.isEditMode) {
        setSelectedMethod(data.prefillMethod || 'ESPECE');
        setAmount((data.prefillAmount || 0).toFixed(3));
        const initialDate = data.prefillDate ? new Date(data.prefillDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        setPaymentDate(initialDate);
        setReference(data.prefillReference || '');
        setNotes(data.prefillNotes || '');
        setRemainingAmount(data.prefillAmount || 0);
        setOwner(data.customerName || '');

        if (data.prefillInstrument) {
          setInstrumentNumber(data.prefillInstrument.instrumentNumber || '');
          setBank(data.prefillInstrument.bank || '');
          setOwner(data.prefillInstrument.owner || data.customerName || '');
          setPorter(data.prefillInstrument.porter || '');
          const initialDueDate = data.prefillInstrument.dueDate ? new Date(data.prefillInstrument.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          setDueDate(initialDueDate);
        }
        setLoading(false);
      } else {
        if (data.remainingAmount !== undefined) {
          setRemainingAmount(data.remainingAmount);
          setAmount(data.remainingAmount.toFixed(3));
          setOwner(data.customerName || '');
        } else {
          setLoading(true);
          paymentService
            .getByDocumentId(data.documentId)
            .then((payments) => {
              const totalPaid = (payments || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
              const targetTotal = (data.withholdingtax && data.totalNetPayable)
                ? data.totalNetPayable
                : data.totalAmount;
              
              const remaining = Math.max(0, targetTotal - totalPaid - (data.totalCreditNotes || 0));
              setRemainingAmount(remaining);
              setAmount(remaining.toFixed(3));
              setOwner(data.customerName || '');
            })
            .catch((err) => {
              console.error('Failed to compute remaining balance:', err);
              toast.error('Erreur lors du calcul du solde restant.');
            })
            .finally(() => {
              setLoading(false);
            });
        }
      }
    }
  }, [isOpen, data]);

  // Monitor currency exchange rates
  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    if (newCurrency === 'TND') {
      setExchangeRate(1.0);
    } else {
      exchangeRateService
        .getExchangeRate(newCurrency, 'TND')
        .then((rate) => {
          setExchangeRate(rate || 1.0);
        })
        .catch(() => {
          setExchangeRate(1.0);
        });
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning('Veuillez saisir un montant de paiement valide.');
      return;
    }

    if (!data.isEditMode && parsedAmount > remainingAmount + 0.005) {
      toast.warning(`Le montant dépasse le solde restant à payer (${remainingAmount.toFixed(3)} DT).`);
      return;
    }

    if (selectedMethod === 'CHEQUE' || selectedMethod === 'TRAITE') {
      if (!bank) {
        toast.warning('Veuillez sélectionner la banque émettrice.');
        return;
      }
      if (!instrumentNumber || instrumentNumber.trim() === '') {
        toast.warning('Veuillez saisir le numéro de l\'instrument.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (data.isEditMode && data.paymentId) {
        const updatePayload: any = {
          paymentId: data.paymentId,
          amount: parsedAmount,
          paymentDate: new Date(paymentDate).toISOString(),
          paymentMethod: selectedMethod,
          reference: reference || null,
          notes: notes || null,
          instrumentDetails: selectedMethod === 'CHEQUE' || selectedMethod === 'TRAITE' ? {
            instrumentNumber: instrumentNumber,
            bank: bank,
            owner: owner,
            porter: porter || null,
            issueDate: new Date(paymentDate).toISOString(),
            dueDate: new Date(dueDate).toISOString(),
            expirationDate: new Date(dueDate).toISOString()
          } : null
        };
        await paymentService.update(data.paymentId, updatePayload);
        toast.success('Paiement modifié avec succès.');
      } else {
        // Build CreatePaymentDto
        const payload: any = {
          documentId: data.documentId,
          customerId: data.customerId,
          updatedbyid: 1, // Connected auditor user id default
          paymentDate: new Date(paymentDate).toISOString(),
          amount: parsedAmount,
          currency: currency,
          exchangeRate: exchangeRate,
          paymentMethod: selectedMethod,
          reference: reference || null,
          notes: notes || null,
        };

        // Add instrument if Cheque or Traite
        if (selectedMethod === 'CHEQUE' || selectedMethod === 'TRAITE') {
          payload.instrumentDetails = {
            type: selectedMethod,
            instrumentNumber: instrumentNumber,
            bank: bank,
            owner: owner,
            porter: porter || null,
            dueDate: new Date(dueDate).toISOString(),
            issueDate: new Date(paymentDate).toISOString(),
            isPaidAtBank: false
          };
        }

        await paymentService.add(payload);
        toast.success('Paiement enregistré avec succès.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save payment:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-sand-100 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Enregistrer un paiement
                </h2>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fcfbfa]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corp-blue-600"></div>
                <p className="text-xs text-sand-400 font-bold uppercase tracking-widest">
                  Calcul du solde restant...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Financial Overview Cards (4 columns side-by-side matching second image) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: DOCUMENT */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-sm">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Document
                    </span>
                    <span className="text-sm font-bold text-slate-800 font-mono block">
                      {data.documentNumber}
                    </span>
                  </div>

                  {/* Card 2: PROPRIÉTAIRE */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-sm">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Propriétaire
                    </span>
                    <span className="text-sm font-bold text-slate-800 truncate block" title={data.customerName}>
                      {data.customerName}
                    </span>
                  </div>

                  {/* Card 3: TOTAL TTC */}
                  <div className="bg-sky-50/20 border border-sky-100 rounded-xl p-3.5 shadow-sm">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Total TTC
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-sky-700 font-mono">
                        {data.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                    </div>
                  </div>

                  {/* Card 4: RESTE À PAYER */}
                  <div className="bg-rose-50/20 border border-rose-100 rounded-xl p-3.5 shadow-sm">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                      Reste à payer
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-rose-700 font-mono">
                        {remainingAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">TND</span>
                    </div>
                  </div>
                </div>

                {/* Banner for RS and Avoir */}
                {(data.withholdingtax || (data.totalCreditNotes && data.totalCreditNotes > 0)) ? (
                  <div className="flex flex-wrap items-center gap-2 -mt-2">
                    {data.withholdingtax && (
                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        RS Appliqué {data.holdingtax ? `(${data.holdingtax.taxpercentage}%)` : ''} : Net {(data.totalNetPayable || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                      </Badge>
                    )}
                    {data.totalCreditNotes && data.totalCreditNotes > 0 ? (
                      <Badge className="bg-pink-50 text-pink-800 border border-pink-200/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Avoir déduit : {data.totalCreditNotes.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                {/* Selection of payment methods */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Méthode de paiement
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {(['ESPECE', 'CHEQUE', 'TRAITE', 'VIREMENT', 'CARTE'] as const).map((method) => {
                      const active = selectedMethod === method;
                      const labels = {
                        ESPECE: 'Espèce',
                        CHEQUE: 'Chèque',
                        TRAITE: 'Traite',
                        VIREMENT: 'Virement',
                        CARTE: 'Carte'
                      };

                      const getIcon = () => {
                        switch (method) {
                          case 'ESPECE': return <Banknote className={cn("w-5 h-5 transition-colors", active ? "text-sky-500" : "text-slate-400")} />;
                          case 'CHEQUE': return <Ticket className={cn("w-5 h-5 transition-colors", active ? "text-sky-500" : "text-slate-400")} />;
                          case 'TRAITE': return <FileSignature className={cn("w-5 h-5 transition-colors", active ? "text-sky-500" : "text-slate-400")} />;
                          case 'VIREMENT': return <Landmark className={cn("w-5 h-5 transition-colors", active ? "text-sky-500" : "text-slate-400")} />;
                          case 'CARTE': return <CreditCard className={cn("w-5 h-5 transition-colors", active ? "text-sky-500" : "text-slate-400")} />;
                        }
                      };

                      return (
                        <button
                          type="button"
                          key={method}
                          onClick={() => setSelectedMethod(method)}
                          className={cn(
                            'p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 focus:outline-none h-20 shadow-sm',
                            active
                              ? 'bg-sky-50/30 text-sky-900 border-sky-500 ring-1 ring-sky-500/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50/50 hover:border-slate-300'
                          )}
                        >
                          {getIcon()}
                          <span className={cn("text-[11px] font-semibold tracking-wide", active ? "text-sky-850 font-bold" : "text-slate-500")}>
                            {labels[method]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Details Section Title */}
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 pt-2">
                  <ListTodo className="w-3.5 h-3.5 text-slate-400" /> Détails du versement
                </h3>

                {/* Common fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Montant*</label>
                    <div className="relative flex items-center">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3" />
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={remainingAmount}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="font-mono pl-9 pr-12 border-slate-200 rounded-xl h-11 text-xs font-semibold focus-visible:ring-sky-500 focus-visible:border-sky-500"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase absolute right-3">TND</span>
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date de paiement*</label>
                    <div className="relative flex items-center">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3" />
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="pl-9 pr-4 border-slate-200 rounded-xl h-11 text-xs font-semibold focus-visible:ring-sky-500 focus-visible:border-sky-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-currency overrides */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/40 rounded-xl border border-slate-100/80">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Devise*</label>
                    <Select value={currency} onValueChange={(val) => handleCurrencyChange(val || 'TND')}>
                      <SelectTrigger className="bg-white border-slate-200 rounded-xl h-11 text-xs font-semibold focus:ring-sky-500">
                        <SelectValue placeholder="Devise">
                          {currency ? DEVISES.find(d => d.key === currency)?.value : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100">
                        {DEVISES.map(d => (
                          <SelectItem key={d.key} value={d.key} className="text-xs font-semibold">{d.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux de change (par rapport au TND)</label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                      disabled={currency === 'TND'}
                      className="bg-white font-mono border-slate-200 rounded-xl h-11 text-xs font-semibold focus-visible:ring-sky-500 focus-visible:border-sky-500"
                    />
                  </div>
                </div>

                {/* Sub-forms per payment method */}
                {(selectedMethod === 'CHEQUE' || selectedMethod === 'TRAITE') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 border border-slate-150 bg-white rounded-2xl space-y-4"
                  >
                    <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-slate-400" />
                      Détails de l&apos;instrument ({selectedMethod})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bank Select */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Banque émettrice</label>
                        <Select value={bank} onValueChange={(val) => setBank(val || '')} required>
                          <SelectTrigger className={cn("border-slate-200 rounded-xl h-10 text-xs font-semibold focus:ring-sky-500", !bank && "border-rose-300 ring-1 ring-rose-100")}>
                            <SelectValue placeholder="Choisir une banque" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 max-h-60 overflow-y-auto">
                            {banks.map((b) => (
                              <SelectItem key={b.id || b.designation} value={b.designation} className="text-xs font-semibold">
                                {b.designation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!bank && <p className="text-[10px] text-rose-500 font-semibold mt-1">Requis</p>}
                      </div>

                      {/* Cheque/Traite number */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Numéro de l&apos;instrument</label>
                        <Input
                          value={instrumentNumber}
                          onChange={(e) => setInstrumentNumber(e.target.value)}
                          className={cn("border-slate-200 rounded-xl h-10 text-xs font-semibold focus-visible:ring-sky-500", (!instrumentNumber || instrumentNumber.trim() === '') && "border-rose-300 ring-1 ring-rose-100")}
                          placeholder="Ex: 874620"
                          required
                        />
                        {(!instrumentNumber || instrumentNumber.trim() === '') && <p className="text-[10px] text-rose-500 font-semibold mt-1">Requis</p>}
                      </div>

                      {/* Due date (Echeance) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date d&apos;échéance</label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="border-slate-200 rounded-xl h-10 text-xs font-semibold focus-visible:ring-sky-500"
                          required
                        />
                      </div>

                      {/* Owner */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tireur / Propriétaire</label>
                        <Input
                          value={owner}
                          onChange={(e) => setOwner(e.target.value)}
                          className="border-slate-200 rounded-xl h-10 text-xs font-semibold focus-visible:ring-sky-500"
                          required
                        />
                      </div>

                      {/* Porter */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Porteur (remis par)</label>
                        <Input
                          value={porter}
                          onChange={(e) => setPorter(e.target.value)}
                          className="border-slate-200 rounded-xl h-10 text-xs font-semibold focus-visible:ring-sky-500"
                          placeholder="Nom de la personne ayant livré l'instrument"
                        />
                      </div>
                    </div>

                    {/* Conflict Warning */}
                    <AnimatePresence>
                      {selectedMethod === 'TRAITE' && existingEcheance && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start"
                        >
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-amber-800">Échéances existantes ce jour</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Vous avez déjà <span className="font-bold">{existingEcheance.instrumentCount}</span> effet(s) pour un total de <span className="font-bold">{(existingEcheance.totalAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</span> à cette date.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Additional reference / generic notes */}
                <div className="grid grid-cols-1 gap-4">
                  {(selectedMethod === 'VIREMENT' || selectedMethod === 'CARTE') && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Référence transaction</label>
                      <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="border-slate-200 rounded-xl h-10 text-xs font-semibold focus-visible:ring-sky-500"
                        placeholder="Identifiant de transaction, virement, ou carte"
                      />
                    </div>
                  )}
                  {/* Notes & Observations Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notes & Observations</label>
                    <div className="relative flex items-start">
                      <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:border-sky-500 placeholder-slate-400 bg-white"
                        placeholder="Renseigner des détails additionnels sur ce versement..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-[24px]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="border border-slate-200 font-bold text-xs hover:bg-slate-100 text-slate-600 h-10 px-5"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || loading}
              onClick={handleConfirm}
              className="bg-sky-500 hover:bg-sky-600 text-white shadow-md min-w-[170px] h-10 font-bold text-xs gap-2 flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

