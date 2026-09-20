'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail,
  FileText,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Coins,
  Download,
  Printer,
  RefreshCw,
  X,
  Calculator,
  UserCheck
} from 'lucide-react';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppVariables } from '@/hooks/use-app-variables';
import { appVariableService } from '@/services/configuration/app-variable.service';
import { documentService } from '@/services/components/document.service';
import { Document, DocStatus } from '@/types/document';
import { toast } from 'sonner';

export interface AccountantEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  initialInvoice?: Document;
  invoiceNumber?: string;
  customerName?: string;
  invoiceDate?: string;
  totalAmount?: number;
  currency?: string;
  status?: DocStatus | number;
  onEmailConfirmed?: (emailData: {
    recipient: string;
    subject: string;
    message: string;
    pdfFileName: string;
  }) => void;
}

export function AccountantEmailDialog({
  isOpen,
  onClose,
  invoiceId,
  initialInvoice,
  invoiceNumber: initialInvoiceNumber,
  customerName: initialCustomerName,
  invoiceDate: initialInvoiceDate,
  totalAmount: initialTotalAmount,
  currency: initialCurrency = 'TND',
  status: initialStatus,
  onEmailConfirmed
}: AccountantEmailDialogProps) {
  const { user } = useAuthStore();
  const { data: enterprise } = useEnterprise();
  const companyName = enterprise?.name || user?.enterpriseName || 'Notre Entreprise';

  // 1. AppVariables for Accountant Config
  const { data: accountantConfigs = [], refetch: refetchAccountantConfig } = useAppVariables('AccountantConfig');

  // 2. Fresh Document State (Reload latest invoice data to avoid stale notification data)
  const [freshInvoice, setFreshInvoice] = useState<Document | null>(initialInvoice || null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);
  const [invoiceLoadError, setInvoiceLoadError] = useState<boolean>(false);

  // 3. Form State
  const [accountantEmail, setAccountantEmail] = useState<string>('');
  const [saveEmailForFuture, setSaveEmailForFuture] = useState<boolean>(true);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // 4. PDF Attachment State
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileSize, setPdfFileSize] = useState<string>('— KB');
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // 5. Confirmation / Sending Lifecycle: 'idle' | 'sending' | 'success' | 'error'
  const [lifecycleState, setLifecycleState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived effective invoice fields
  const effectiveInvoiceNumber = useMemo(() => {
    return freshInvoice?.docnumber || initialInvoiceNumber || `FAC-#${invoiceId}`;
  }, [freshInvoice?.docnumber, initialInvoiceNumber, invoiceId]);

  const effectiveCustomerName = useMemo(() => {
    if (freshInvoice?.counterpart) {
      const cp = freshInvoice.counterpart;
      return (cp.name || `${cp.firstname || ''} ${cp.lastname || ''}`).trim() || 'Client';
    }
    return initialCustomerName || 'Client';
  }, [freshInvoice?.counterpart, initialCustomerName]);

  const effectiveDate = useMemo(() => {
    const raw = freshInvoice?.creationdate || initialInvoiceDate;
    if (!raw) return new Date().toLocaleDateString('fr-FR');
    try {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('fr-FR');
    } catch {
      return String(raw);
    }
  }, [freshInvoice?.creationdate, initialInvoiceDate]);

  const effectiveTotalAmount = useMemo(() => {
    const amt = freshInvoice?.total_net_ttc ?? freshInvoice?.total_net_payable ?? initialTotalAmount ?? 0;
    return Number(amt).toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  }, [freshInvoice, initialTotalAmount]);

  const effectiveCurrency = useMemo(() => {
    return freshInvoice?.currency || initialCurrency || 'TND';
  }, [freshInvoice?.currency, initialCurrency]);

  const effectiveStatus = useMemo(() => {
    const s = freshInvoice?.docstatus ?? initialStatus;
    if (s === DocStatus.Validated) return 'Validé';
    if (s === DocStatus.Abandoned || s === DocStatus.Deleted) return 'Annulé';
    return 'Brouillon';
  }, [freshInvoice?.docstatus, initialStatus]);

  const pdfFileName = useMemo(() => {
    const cleanRef = effectiveInvoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${cleanRef}.pdf`;
  }, [effectiveInvoiceNumber]);

  // Load fresh invoice and initial configuration when dialog opens
  useEffect(() => {
    if (!isOpen || !invoiceId || invoiceId <= 0) return;

    setLifecycleState('idle');
    setErrorMessage(null);
    setInvoiceLoadError(false);

    // 1. Resolve prefilled accountant email:
    // Priority 1: AppVariable 'AccountantEmail' under 'AccountantConfig'
    // Priority 2: localStorage 'acya_accountant_email'
    const storedAppVar = accountantConfigs.find(
      (v) => v.name.toLowerCase() === 'accountantemail' && v.isactive
    );
    const cachedLocalEmail = typeof window !== 'undefined' ? localStorage.getItem('acya_accountant_email') : null;
    const initialEmail = storedAppVar?.value || cachedLocalEmail || '';
    setAccountantEmail(initialEmail);

    // 2. Initial Subject
    setSubject(`Facture de vente ${effectiveInvoiceNumber}`);

    // 3. Initial Body Message
    const defaultBody = [
      'Bonjour,',
      '',
      `Veuillez trouver ci-joint la facture de vente N° ${effectiveInvoiceNumber}.`,
      '',
      'La facture a été mise à jour dans Élancé.',
      '',
      'Vous trouverez le document correspondant en pièce jointe.',
      '',
      'Cordialement,',
      companyName
    ].join('\n');
    setMessage(defaultBody);

    // 4. Fetch fresh invoice data from API (ensuring we don't rely on stale notification data)
    let isCancelled = false;
    setIsLoadingInvoice(true);

    documentService.getById(invoiceId)
      .then((doc) => {
        if (!isCancelled && doc) {
          setFreshInvoice(doc);
        }
      })
      .catch((err) => {
        console.error('Failed to reload latest invoice data:', err);
        if (!isCancelled) setInvoiceLoadError(true);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingInvoice(false);
      });

    // 5. Load Invoice PDF attachment from backend QuestPDF engine
    setIsLoadingPdf(true);
    documentService.downloadPdf(invoiceId)
      .then((blob: Blob) => {
        if (!isCancelled) {
          setPdfBlob(blob);
          const sizeKb = Math.max(1, Math.round(blob.size / 1024));
          setPdfFileSize(`${sizeKb} KB`);
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load invoice PDF:', err);
          setPdfFileSize('Erreur PDF');
          toast.error("Impossible de préparer la pièce jointe PDF.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingPdf(false);
      });

    return () => {
      isCancelled = true;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoiceId]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Email Validation (RFC 5322 compatible regex)
  const isValidEmail = useMemo(() => {
    if (!accountantEmail.trim()) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(accountantEmail.trim());
  }, [accountantEmail]);

  const canConfirm = useMemo(() => {
    return (
      isValidEmail &&
      subject.trim().length > 0 &&
      message.trim().length > 0 &&
      !isLoadingPdf &&
      !isLoadingInvoice &&
      lifecycleState === 'idle'
    );
  }, [isValidEmail, subject, message, isLoadingPdf, isLoadingInvoice, lifecycleState]);

  // Handle Confirmation
  const handleConfirm = async () => {
    if (!canConfirm) return;

    setLifecycleState('sending');
    setErrorMessage(null);

    const cleanEmail = accountantEmail.trim();

    try {
      // 1. Client-side local persistence if requested
      if (saveEmailForFuture && typeof window !== 'undefined') {
        localStorage.setItem('acya_accountant_email', cleanEmail);
      }

      // 2. Dispatch email via Phase 3 backend endpoint
      const response = await documentService.sendToAccountant(invoiceId, {
        accountantEmail: cleanEmail,
        subject: subject.trim(),
        message: message.trim(),
        saveAsDefault: saveEmailForFuture
      });

      if (saveEmailForFuture) {
        refetchAccountantConfig();
      }

      setLifecycleState('success');
      toast.success(response?.message || "Facture envoyée avec succès au comptable.");

      if (onEmailConfirmed) {
        onEmailConfirmed({
          recipient: cleanEmail,
          subject: subject.trim(),
          message: message.trim(),
          pdfFileName
        });
      }
    } catch (err: any) {
      console.error('Error sending accountant email:', err);
      setLifecycleState('error');
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Une erreur est survenue lors de l'envoi de l'email."
      );
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.info(`Téléchargement de ${pdfFileName} démarré.`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl rounded-3xl border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl p-0 overflow-hidden text-slate-800">
          
          {/* Header Section */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Email au comptable
                  <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200/80">
                    Facture de Vente
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                  Vérifiez les données et confirmez l&apos;adresse email de l&apos;expert-comptable.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Dialog Body */}
          <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 custom-scrollbar">

            {/* A. SUCCESS STATE OVERLAY */}
            {lifecycleState === 'success' ? (
              <div className="py-8 px-6 text-center space-y-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-extrabold text-emerald-950">
                    ✓ Facture transmise au comptable
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    La facture de vente et sa pièce jointe PDF ont été envoyées avec succès.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-white/90 border border-emerald-200 rounded-xl p-3.5 text-left space-y-2.5 text-xs shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Destinataire :
                    </span>
                    <span className="font-semibold text-slate-900 block mt-0.5">{accountantEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Pièce jointe transmise :
                    </span>
                    <span className="font-mono font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      {pdfFileName}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  L&apos;email et le PDF généré ont été transmis avec succès via le service SMTP de l&apos;entreprise.
                </p>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-6 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            ) : lifecycleState === 'error' ? (
              /* B. ERROR STATE OVERLAY */
              <div className="py-8 px-6 text-center space-y-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-extrabold text-rose-950">
                    Impossible de préparer l&apos;envoi
                  </h3>
                  <p className="text-xs text-rose-800">
                    {errorMessage || "Une erreur est survenue lors de la préparation du message."}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="h-9 px-4 rounded-xl font-bold border-slate-200 text-slate-600"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="h-9 px-4 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Réessayer
                  </Button>
                </div>
              </div>
            ) : (
              /* C. FORM VIEW */
              <>
                {/* Invoice Load Error Warning */}
                {invoiceLoadError && !freshInvoice && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Impossible de charger la facture.</strong>
                      <p className="mt-0.5 text-amber-800 font-medium">La facture n&apos;est peut-être plus disponible.</p>
                    </div>
                  </div>
                )}

                {/* 1. Compact Invoice Information Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Facture N°
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs truncate block mt-0.5">
                      {effectiveInvoiceNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Client
                    </span>
                    <span className="font-semibold text-slate-800 text-xs truncate block mt-0.5" title={effectiveCustomerName}>
                      {effectiveCustomerName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date
                    </span>
                    <span className="font-medium text-slate-700 text-xs block mt-0.5">
                      {effectiveDate}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Montant TTC
                    </span>
                    <span className="font-mono font-bold text-indigo-600 text-xs block mt-0.5">
                      {effectiveTotalAmount} {effectiveCurrency}
                    </span>
                  </div>
                </div>

                {/* 2. Accountant Email Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="accountant-email-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      Email du comptable <span className="text-rose-500">*</span>
                    </label>
                    {accountantEmail && !isValidEmail && (
                      <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Veuillez saisir une adresse email valide.
                      </span>
                    )}
                    {isValidEmail && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Email valide
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="accountant-email-input"
                      type="email"
                      value={accountantEmail}
                      onChange={(e) => setAccountantEmail(e.target.value)}
                      placeholder="comptabilite@cabinet-expert.tn"
                      disabled={lifecycleState === 'sending'}
                      className={`h-10 pl-9 pr-3 text-sm rounded-xl font-medium transition-all ${
                        accountantEmail && !isValidEmail
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200'
                      }`}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {!accountantEmail.trim() && (
                    <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> L&apos;adresse email du comptable est requise.
                    </p>
                  )}
                </div>

                {/* 3. Checkbox: Persist Accountant Email */}
                <div className="flex items-center space-x-2.5 pt-1">
                  <Checkbox
                    id="save-accountant-email"
                    checked={saveEmailForFuture}
                    onCheckedChange={(checked) => setSaveEmailForFuture(!!checked)}
                    className="rounded-md border-slate-300 data-[state=checked]:bg-indigo-600"
                  />
                  <label
                    htmlFor="save-accountant-email"
                    className="text-xs font-medium text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Enregistrer cet email pour les prochains envois comptables
                  </label>
                </div>

                {/* 4. Subject Field */}
                <div className="space-y-1.5">
                  <label htmlFor="accountant-email-subject" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Objet
                  </label>
                  <Input
                    id="accountant-email-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Facture de vente..."
                    disabled={lifecycleState === 'sending'}
                    className="h-10 text-sm rounded-xl font-medium border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
                  />
                </div>

                {/* 5. Message Body */}
                <div className="space-y-1.5">
                  <label htmlFor="accountant-email-body" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    id="accountant-email-body"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={lifecycleState === 'sending'}
                    placeholder="Message d'accompagnement..."
                    className="w-full text-sm rounded-xl font-normal p-3 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white resize-y custom-scrollbar"
                  />
                </div>

                {/* 6. Invoice PDF Attachment */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Pièce jointe
                  </span>

                  {isLoadingPdf ? (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Génération de la facture en PDF...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate font-mono" title={pdfFileName}>
                            {pdfFileName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-500 uppercase">PDF</span>
                            <span>•</span>
                            <span>{pdfFileSize}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pièce jointe certifiée
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPreviewOpen(true)}
                          disabled={!pdfUrl}
                          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-white hover:text-indigo-600 shadow-2xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Aperçu
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleDownloadPdf}
                          disabled={!pdfBlob}
                          className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900"
                          title="Télécharger le fichier"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {lifecycleState !== 'success' && lifecycleState !== 'error' && (
            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={lifecycleState === 'sending'}
                className="h-10 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </Button>

              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {lifecycleState === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-indigo-200" />
                    Envoyer au comptable
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested In-Page Invoice PDF Preview Dialog */}
      {isPreviewOpen && (
        <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && setIsPreviewOpen(false)}>
          <DialogContent className="w-[96vw] sm:max-w-4xl max-w-5xl rounded-3xl border-slate-200 bg-white p-0 shadow-2xl overflow-hidden flex flex-col h-[88vh] z-[110]">
            <DialogHeader className="px-6 py-3.5 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-slate-900">
                    Aperçu de la Facture
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono">
                    {pdfFileName}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewOpen(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Fermer</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="Aperçu Facture PDF"
                  className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Chargement du document PDF...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
