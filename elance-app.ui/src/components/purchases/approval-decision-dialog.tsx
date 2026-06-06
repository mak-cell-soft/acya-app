'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Gavel,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { approvalService, ApprovalDecision, DocumentApproval } from '@/services/components/approval.service';

interface ApprovalDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  approval: DocumentApproval | null;
  currentUserId: number;
  onSuccess: () => void;
}

export function ApprovalDecisionDialog({
  isOpen,
  onClose,
  approval,
  currentUserId,
  onSuccess
}: ApprovalDecisionDialogProps) {
  const [decision, setDecision] = useState<ApprovalDecision>(ApprovalDecision.Approved);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const rejectionReasons = [
    'Prix trop élevé',
    'Client risqué / Limite de crédit atteinte',
    'Stock insuffisant / Rupture',
    'Erreur de saisie / Doublon',
    'Conditions de paiement non conformes',
    'Remise non autorisée'
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDecision(ApprovalDecision.Approved);
      setRejectionReason('');
    }
  }, [isOpen]);

  if (!isOpen || !approval) return null;

  const docNumber = approval.document?.docnumber || 'N/A';
  const counterpartName =
    approval.document?.counterpart?.name ||
    `${approval.document?.counterpart?.firstname || ''} ${approval.document?.counterpart?.lastname || ''}`.trim() ||
    'Fournisseur inconnu';
  const totalAmount = approval.document?.total_net_ttc || 0;

  const isValid = () => {
    if (decision === ApprovalDecision.Approved) return true;
    return !!rejectionReason;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setSubmitting(true);

    try {
      await approvalService.decide(
        approval.documentId,
        decision,
        currentUserId,
        decision === ApprovalDecision.Rejected ? rejectionReason : undefined
      );

      toast.success(
        decision === ApprovalDecision.Approved
          ? 'La commande a été approuvée avec succès.'
          : 'La commande a été rejetée.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save decision:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement de votre décision.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

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

        {/* Modal panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500 font-mono">
                Approbations
              </span>
              <h2 className="text-base font-bold text-amber-50 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-500" /> Actions d&apos;approbation
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:bg-slate-800 hover:text-white w-8 h-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 bg-[#fdfdfd]">
            {/* Context Document details */}
            <Card className="border-slate-150 bg-slate-50/50 rounded-2xl overflow-hidden shadow-xs">
              <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Document:</span>
                  <span className="font-bold text-slate-900">{docNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Fournisseur:</span>
                  <span className="font-bold text-slate-800">{counterpartName}</span>
                </div>
                <Separator className="bg-slate-200/60 my-1" />
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Montant TTC:</span>
                  <span className="font-mono font-bold text-amber-900 text-[13px]">{fmt(totalAmount)} TND</span>
                </div>
              </CardContent>
            </Card>

            {/* Decision Segment */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                Votre Décision *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecision(ApprovalDecision.Approved)}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    decision === ApprovalDecision.Approved
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${decision === ApprovalDecision.Approved ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Approuver
                </button>
                <button
                  type="button"
                  onClick={() => setDecision(ApprovalDecision.Rejected)}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    decision === ApprovalDecision.Rejected
                      ? 'border-rose-600 bg-rose-50/50 text-rose-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 ${decision === ApprovalDecision.Rejected ? 'text-rose-600' : 'text-slate-400'}`} />
                  Rejeter
                </button>
              </div>
            </div>

            {/* Rejection Reason Selector (Conditional) */}
            {decision === ApprovalDecision.Rejected && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-600" /> Motif de rejet *
                </label>
                <Select value={rejectionReason} onValueChange={(val) => setRejectionReason(val || '')}>
                  <SelectTrigger className="h-11 text-xs font-bold text-slate-900 w-full">
                    <SelectValue placeholder="Sélectionner un motif de rejet..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 font-bold text-xs">
                    {rejectionReasons.map((reason) => (
                      <SelectItem key={reason} value={reason} className="font-bold text-xs">
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={submitting || !isValid()}
              onClick={handleSubmit}
              className={`rounded-xl shadow-md px-6 h-10 font-bold text-xs gap-2 flex items-center text-white ${
                decision === ApprovalDecision.Approved
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmer
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


