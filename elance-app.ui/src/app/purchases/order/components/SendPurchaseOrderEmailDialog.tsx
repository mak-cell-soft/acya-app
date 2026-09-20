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
  Paperclip
} from 'lucide-react';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useAuthStore } from '@/store/use-auth-store';
import { documentService } from '@/services/components/document.service';
import { Supplier, getCustomerDisplayName } from '@/types/customer';
import { toast } from 'sonner';

/**
 * Summary of a line item for display & PDF rendering
 */
export interface PurchaseOrderItemSummary {
  description: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
  tvaPercentage: number;
}

/**
 * Purchase order data passed to the email dialog
 */
export interface PurchaseOrderEmailData {
  id?: number;
  reference: string;
  date: string; // ISO date string or YYYY-MM-DD
  currency: string;
  supplier: Supplier | {
    id?: number;
    name?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  totals: {
    netHT: number;
    discount?: number;
    tva: number;
    ttc: number;
    baseTTC?: number;
  };
  items?: PurchaseOrderItemSummary[];
  notes?: string;
}

export interface SendPurchaseOrderEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: PurchaseOrderEmailData;
}

/**
 * Generates a valid standard PDF 1.4 binary stream on the client side
 * when the purchase order is in draft/unsaved state (id === 0).
 */
function generateClientSidePurchaseOrderPdf(
  order: PurchaseOrderEmailData,
  enterpriseName: string,
  enterpriseAddress?: string,
  enterprisePhone?: string
): Blob {
  const sanitize = (str: string) => (str || '').replace(/[()\\]/g, ' ');
  const ref = sanitize(order.reference || 'BC-PROVISOIRE');
  const supName = sanitize(getCustomerDisplayName(order.supplier) || 'Fournisseur');
  const supEmail = sanitize(order.supplier?.email || 'N/A');
  const dateStr = sanitize(order.date ? new Date(order.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'));
  const curr = sanitize(order.currency || 'TND');

  const contentStream = [
    'BT',
    // 1. Enterprise Header
    '/F1 16 Tf',
    '50 790 Td',
    `(${sanitize(enterpriseName)}) Tj`,
    '/F2 9 Tf',
    '0 -15 Td',
    `(${sanitize(enterpriseAddress || 'Tunisie')}) Tj`,
    '0 -12 Td',
    `(${sanitize(enterprisePhone ? `Tel: ${enterprisePhone}` : '')}) Tj`,

    // 2. Document Title Banner
    '/F1 15 Tf',
    '0 -35 Td',
    `(BON DE COMMANDE FOURNISSEUR) Tj`,
    '/F2 10 Tf',
    '0 -16 Td',
    `(Reference : ${ref}) Tj`,
    '0 -14 Td',
    `(Date d'emission : ${dateStr}) Tj`,

    // 3. Supplier Card
    '0 -28 Td',
    '/F1 11 Tf',
    `(DESTINATAIRE / FOURNISSEUR :) Tj`,
    '/F2 10 Tf',
    '0 -15 Td',
    `(${supName}) Tj`,
    '0 -13 Td',
    `(Email : ${supEmail}) Tj`,

    // 4. Articles Table Header
    '0 -30 Td',
    '/F1 10 Tf',
    '(----------------------------------------------------------------------------------------------------------------)',
    '0 -12 Td',
    '(Designation                                       Qte        P.U HT          Total HT   TVA)',
    '0 -10 Td',
    '(----------------------------------------------------------------------------------------------------------------)',
    '/F2 9 Tf',
  ];

  // Render items (up to first 12 for draft preview)
  const items = order.items && order.items.length > 0 ? order.items.slice(0, 12) : [];
  if (items.length > 0) {
    items.forEach((item) => {
      const desc = sanitize(item.description).padEnd(38, ' ').slice(0, 38);
      const qte = item.quantity.toFixed(2).padStart(8, ' ');
      const pu = item.unitPriceHT.toFixed(3).padStart(12, ' ');
      const tot = item.totalHT.toFixed(3).padStart(14, ' ');
      const tva = `${item.tvaPercentage}%`.padStart(6, ' ');
      contentStream.push('0 -14 Td', `(${desc} ${qte} ${pu} ${tot} ${tva}) Tj`);
    });
  } else {
    contentStream.push('0 -14 Td', `(Commande globale                                   1.00 ${order.totals.netHT.toFixed(3)} ${order.totals.netHT.toFixed(3)}   19%) Tj`);
  }

  // 5. Totals Box
  contentStream.push(
    '0 -14 Td',
    '(----------------------------------------------------------------------------------------------------------------)',
    '0 -22 Td',
    '/F1 10 Tf',
    `(Total Net HT : ${order.totals.netHT.toFixed(3)} ${curr}) Tj`,
    '0 -14 Td',
    `(Total TVA    : ${order.totals.tva.toFixed(3)} ${curr}) Tj`,
    '0 -16 Td',
    '/F1 12 Tf',
    `(TOTAL NET TTC : ${order.totals.ttc.toFixed(3)} ${curr}) Tj`,
    '0 -40 Td',
    '/F2 8 Tf',
    '(Document genere automatiquement - Bon de commande pour approbation et execution)',
    'ET'
  );

  const rawStream = contentStream.join('\n');
  const streamBytes = new TextEncoder().encode(rawStream);

  const objects: Array<{ num: number; content: string }> = [];
  function addObj(content: string) {
    const num = objects.length + 1;
    objects.push({ num, content });
    return num;
  }

  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>');
  addObj(`<< /Length ${streamBytes.length} >>\nstream\n${rawStream}\nendstream`);
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdfText = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdfText).length);
    pdfText += `${objects[i].num} 0 obj\n${objects[i].content}\nendobj\n`;
  }

  const xrefOffset = new TextEncoder().encode(pdfText).length;
  pdfText += `xref\n0 ${objects.length + 1}\n`;
  pdfText += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdfText += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfText += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Blob([pdfText], { type: 'application/pdf' });
}

export function SendPurchaseOrderEmailDialog({
  isOpen,
  onClose,
  orderData
}: SendPurchaseOrderEmailDialogProps) {
  const { user } = useAuthStore();
  const { data: enterprise } = useEnterprise();

  // Active Company name resolution
  const companyName = enterprise?.name || user?.enterpriseName || 'Notre Entreprise';

  // Form State
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // PDF Attachment State
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileSize, setPdfFileSize] = useState<string>('245 KB');
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Sending Lifecycle State: 'idle' | 'sending' | 'success' | 'error'
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean filename for attachment
  const pdfFileName = useMemo(() => {
    const rawRef = orderData.reference || `BC-${new Date().getFullYear()}-001`;
    const clean = rawRef.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `Bon_de_commande_${clean}.pdf`;
  }, [orderData.reference]);

  // Format Display Currency & Amounts
  const formattedTtc = useMemo(() => {
    return (orderData.totals?.ttc || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  }, [orderData.totals?.ttc]);

  const supplierDisplayName = useMemo(() => {
    return getCustomerDisplayName(orderData.supplier) || 'Fournisseur non spécifié';
  }, [orderData.supplier]);

  const formattedDate = useMemo(() => {
    if (!orderData.date) return new Date().toLocaleDateString('fr-FR');
    try {
      const d = new Date(orderData.date);
      return isNaN(d.getTime()) ? orderData.date : d.toLocaleDateString('fr-FR');
    } catch {
      return orderData.date;
    }
  }, [orderData.date]);

  // Initialize or re-populate fields whenever dialog opens or orderData changes
  useEffect(() => {
    if (!isOpen) return;

    // Reset sending states
    setSendState('idle');
    setErrorMessage(null);

    // 1. Initial Recipient from supplier
    const initialEmail = orderData.supplier?.email || '';
    setRecipient(initialEmail);

    // 2. Initial Subject
    const refLabel = orderData.reference ? `N° ${orderData.reference}` : 'N° BC-PROVISOIRE';
    const cleanSupplier = (orderData.supplier?.name || '').trim();
    const initialSubject = cleanSupplier 
      ? `Bon de commande ${refLabel} - ${cleanSupplier}` 
      : `Bon de commande ${refLabel}`;
    setSubject(initialSubject);

    // 3. Initial Message Body in French
    const initialMessage = [
      'Bonjour,',
      '',
      `Veuillez trouver ci-joint notre bon de commande ${orderData.reference || 'BC-PROVISOIRE'} d'un montant de ${formattedTtc} ${orderData.currency || 'TND'}.`,
      '',
      'Nous restons à votre entière disposition pour toute information complémentaire.',
      '',
      'Cordialement,',
      companyName
    ].join('\n');
    setMessage(initialMessage);

    // 4. Load or Generate Attachment PDF
    setIsLoadingPdf(true);
    let isCancelled = false;

    const preparePdf = async () => {
      try {
        let blob: Blob;

        // If order is already persisted in backend, fetch backend QuestPDF
        if (orderData.id && orderData.id > 0) {
          blob = await documentService.downloadPdf(orderData.id);
        } else {
          // Generate client-side draft PDF
          blob = generateClientSidePurchaseOrderPdf(
            orderData,
            companyName,
            enterprise?.siegeAddress,
            enterprise?.phone || enterprise?.mobileOne
          );
        }

        if (isCancelled) return;

        setPdfBlob(blob);
        const sizeKb = Math.max(1, Math.round(blob.size / 1024));
        setPdfFileSize(`${sizeKb} KB`);

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load/generate Purchase Order PDF:', err);
        // Fallback: create client-side draft PDF on error
        const fallbackBlob = generateClientSidePurchaseOrderPdf(orderData, companyName);
        setPdfBlob(fallbackBlob);
        setPdfFileSize(`${Math.max(1, Math.round(fallbackBlob.size / 1024))} KB`);
        setPdfUrl(URL.createObjectURL(fallbackBlob));
      } finally {
        if (!isCancelled) setIsLoadingPdf(false);
      }
    };

    preparePdf();

    return () => {
      isCancelled = true;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderData, companyName]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Email Validation (RFC 5322 compatible regex)
  const isValidEmail = useMemo(() => {
    if (!recipient.trim()) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(recipient.trim());
  }, [recipient]);

  const canSend = useMemo(() => {
    return (
      isValidEmail &&
      subject.trim().length > 0 &&
      message.trim().length > 0 &&
      !isLoadingPdf &&
      sendState === 'idle'
    );
  }, [isValidEmail, subject, message, isLoadingPdf, sendState]);

  // Handle Send action (Prepared for Phase 2 API integration)
  const handleSend = async () => {
    if (!canSend) return;

    setSendState('sending');
    setErrorMessage(null);

    try {
      // NOTE: [Backend Phase 2 Architecture Slot]
      // Replace this simulation block with the actual backend API call once implemented:
      // await purchaseOrderEmailService.sendEmail({
      //   documentId: orderData.id,
      //   recipient: recipient.trim(),
      //   subject: subject.trim(),
      //   body: message.trim(),
      //   pdfFileName: pdfFileName,
      // });
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setSendState('success');
      toast.success("Préparation de l'email terminée avec succès.");
    } catch (err: any) {
      console.error('Error in send email lifecycle:', err);
      setSendState('error');
      setErrorMessage(
        err?.message || "Une erreur est survenue lors de la préparation du message."
      );
    }
  };

  const handleDownloadAttachment = () => {
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
          
          {/* 1. Header Section */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Envoyer le bon de commande par email
                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200/80">
                    Phase 1 UI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                  Vérifiez les coordonnées et l&apos;aperçu de la pièce jointe avant expédition.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* 2. Dialog Body with State Machine Switching */}
          <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 custom-scrollbar">

            {/* A. SUCCESS STATE OVERLAY */}
            {sendState === 'success' ? (
              <div className="py-8 px-6 text-center space-y-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-extrabold text-emerald-950">
                    Email prêt à être envoyé
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Le bon de commande <span className="font-mono font-bold text-slate-900">{orderData.reference || 'BC-PROVISOIRE'}</span> sera envoyé à <span className="font-semibold underline text-slate-900">{recipient}</span>.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 font-medium shadow-2xs">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Pièce jointe : <strong className="font-mono">{pdfFileName}</strong></span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Note : L&apos;architecture UI est validée. Le déclenchement de l&apos;envoi réel sera branché sur l&apos;API backend dans la phase suivante.
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
            ) : sendState === 'error' ? (
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
                    onClick={handleSend}
                    className="h-9 px-4 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Réessayer
                  </Button>
                </div>
              </div>
            ) : (
              /* C. IDLE / EDITING / SENDING FORM */
              <>
                {/* 1. Compact Purchase Order Information Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Bon de commande
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs truncate block mt-0.5">
                      {orderData.reference || 'BC-PROVISOIRE'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Fournisseur
                    </span>
                    <span className="font-semibold text-slate-800 text-xs truncate block mt-0.5" title={supplierDisplayName}>
                      {supplierDisplayName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date
                    </span>
                    <span className="font-medium text-slate-700 text-xs block mt-0.5">
                      {formattedDate}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Montant TTC
                    </span>
                    <span className="font-mono font-bold text-amber-600 text-xs block mt-0.5">
                      {formattedTtc} {orderData.currency || 'TND'}
                    </span>
                  </div>
                </div>

                {/* 2. Recipient Email Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="po-email-recipient" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      Destinataire (À) <span className="text-rose-500">*</span>
                    </label>
                    {recipient && !isValidEmail && (
                      <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Adresse email invalide
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
                      id="po-email-recipient"
                      type="email"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="fournisseur@domaine.com"
                      disabled={sendState === 'sending'}
                      className={`h-10 pl-9 pr-3 text-sm rounded-xl font-medium transition-all ${
                        recipient && !isValidEmail
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-amber-500 focus:ring-amber-200'
                      }`}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* 3. Subject Field */}
                <div className="space-y-1.5">
                  <label htmlFor="po-email-subject" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Objet du message <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="po-email-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Objet de l'email..."
                    disabled={sendState === 'sending'}
                    className="h-10 text-sm rounded-xl font-medium border-slate-200 focus:border-amber-500 focus:ring-amber-200"
                  />
                </div>

                {/* 4. Message Body */}
                <div className="space-y-1.5">
                  <label htmlFor="po-email-body" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    id="po-email-body"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sendState === 'sending'}
                    placeholder="Rédigez votre message d'accompagnement..."
                    className="w-full text-sm rounded-xl font-normal p-3 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white resize-y custom-scrollbar"
                  />
                </div>

                {/* 5. PDF Attachment Card */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Pièce jointe
                  </span>

                  {isLoadingPdf ? (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Préparation du bon de commande... Génération du PDF...</span>
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
                              <CheckCircle2 className="w-3 h-3" /> Prêt pour envoi
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
                          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-white hover:text-amber-600 shadow-2xs gap-1.5"
                          title="Aperçu du PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Aperçu
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleDownloadAttachment}
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

          {/* 3. Dialog Footer */}
          {sendState !== 'success' && sendState !== 'error' && (
            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={sendState === 'sending'}
                className="h-10 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </Button>

              <Button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="h-10 px-6 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {sendState === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    Préparation de l&apos;envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-400" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Nested In-Page PDF Preview Dialog */}
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
                    Aperçu du Bon de Commande
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
                  onClick={handleDownloadAttachment}
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

            {/* Embedded Iframe Preview */}
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="Aperçu Bon de Commande PDF"
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
