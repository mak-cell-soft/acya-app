'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  Percent,
  Tag,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle
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
import { useAppVariables } from '@/hooks/use-app-variables';
import { holdingTaxService } from '@/services/components/holding-tax.service';
import { Document } from '@/types/document';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface WithholdingTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: Document;
}

export function WithholdingTaxModal({
  isOpen,
  onClose,
  onSuccess,
  document: doc
}: WithholdingTaxModalProps) {
  const { data: rsRates, isLoading: loadingRates } = useAppVariables('RS');
  const [selectedRateId, setSelectedRateId] = useState<string>('Aucune RS');
  const [reference, setReference] = useState<string>('');
  const [issigned, setIssigned] = useState<boolean>(false);
  
  const [checkingRef, setCheckingRef] = useState<boolean>(false);
  const [refAlreadyExists, setRefAlreadyExists] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const totalTtc = doc.total_net_ttc || 0;

  // Initialize from document holding tax if already present
  useEffect(() => {
    if (isOpen && doc.holdingtax) {
      setReference(doc.holdingtax.reference || '');
      setIssigned(doc.holdingtax.issigned || false);
    } else if (isOpen) {
      setReference('');
      setIssigned(false);
      setSelectedRateId('Aucune RS');
    }
  }, [isOpen, doc]);

  // Match selected rate when rates load
  useEffect(() => {
    if (isOpen && rsRates && doc.holdingtax && doc.holdingtax.taxpercentage) {
      const match = rsRates.find(
        (r) => Number(r.value) === doc.holdingtax?.taxpercentage
      );
      if (match) {
        setSelectedRateId(match.id.toString());
      }
    }
  }, [isOpen, rsRates, doc]);

  const isValidUuid = UUID_REGEX.test(reference.trim());

  // Check reference uniqueness with debouncing
  useEffect(() => {
    if (!isOpen || !reference.trim() || !isValidUuid) {
      setRefAlreadyExists(false);
      setCheckingRef(false);
      return;
    }
    let cancelled = false;
    setCheckingRef(true);
    const timer = setTimeout(() => {
      holdingTaxService.checkReferenceExists(reference.trim(), doc.holdingtax?.id)
        .then((exists) => {
          if (!cancelled) setRefAlreadyExists(exists);
        })
        .catch(() => {
          if (!cancelled) setRefAlreadyExists(false);
        })
        .finally(() => {
          if (!cancelled) setCheckingRef(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, reference, isValidUuid, doc.holdingtax?.id]);

  if (!isOpen) return null;

  const activeRate = rsRates?.find((r) => r.id.toString() === selectedRateId);
  const percentage = activeRate ? Number(activeRate.value) || 0 : 0;
  const rsAmount = (totalTtc * percentage) / 100;
  const netPayable = Math.max(0, totalTtc - rsAmount);

  const handleConfirm = async () => {
    if (selectedRateId === 'Aucune RS') {
      toast.warning('Veuillez sélectionner un taux de retenue à la source.');
      return;
    }
    if (!reference.trim()) {
      toast.warning('Veuillez saisir une référence de retenue.');
      return;
    }
    if (!isValidUuid) {
      toast.warning('La référence doit être au format UUID valide (ex: 26a84266-e58c-4a11-a71b-c5356619316f).');
      return;
    }
    if (refAlreadyExists) {
      toast.warning('Cette référence existe déjà dans la base de données.');
      return;
    }
    if (!issigned) {
      toast.warning('Le document de la retenue doit être signé (veuillez cocher la case).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: doc.holdingtax?.id,
        documentid: doc.id,
        description: activeRate?.name || 'Retenue à la source',
        taxpercentage: percentage,
        taxvalue: rsAmount,
        reference: reference.trim(),
        issigned: issigned,
        newamountdocvalue: netPayable,
        updatedbyid: 1,
        isdeleted: false
      };

      await holdingTaxService.applyToDocument(doc.id, payload);
      toast.success('Retenue à la source appliquée avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to apply holding tax:', err);
      if (err.response?.data?.message === 'Retenue existe déjà') {
        toast.warning('Cette retenue existe déjà pour ce document.');
      } else {
        toast.error("Erreur lors de l'application de la retenue à la source.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    selectedRateId !== 'Aucune RS' &&
    reference.trim().length > 0 &&
    isValidUuid &&
    !refAlreadyExists &&
    !checkingRef &&
    issigned;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-sand-950/40 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white border border-sand-150 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden z-10"
      >
        {/* Header */}
        <div className="bg-sand-50/50 px-6 py-4 border-b border-sand-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-corp-blue-950">
                Gestion de la Retenue à la Source (RS)
              </h3>
              <p className="text-xs text-sand-500 font-medium">
                Document : <span className="font-bold text-sand-700">{doc.docnumber}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-sand-400 hover:text-sand-750 hover:bg-sand-100/50 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Document Summary Card */}
          <Card className="border-sand-100 bg-sand-50/30 overflow-hidden">
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-sand-400 font-semibold uppercase tracking-wider block mb-0.5">
                  Client
                </span>
                <span className="font-bold text-sand-800 text-[13px]">
                  {doc.counterpart?.name || `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`.trim()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sand-400 font-semibold uppercase tracking-wider block mb-0.5">
                  Total TTC Original
                </span>
                <span className="font-mono font-bold text-corp-blue-800 text-[13px]">
                  {totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Rates Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-sand-450 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-sand-400" /> Taux de Retenue à la Source
              </label>
              <Select
                value={selectedRateId}
                onValueChange={(val) => setSelectedRateId(val || 'Aucune RS')}
                disabled={loadingRates}
              >
                <SelectTrigger className="rounded-xl border-sand-200 h-10 text-xs font-semibold focus:ring-corp-blue-600">
                  <SelectValue placeholder="Sélectionner un taux">
                    {selectedRateId === 'Aucune RS'
                      ? 'Aucune RS'
                      : activeRate
                      ? `${activeRate.name} (${Number(activeRate.value)}%)`
                      : 'Sélectionner un taux'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-sand-100">
                  <SelectItem value="Aucune RS" label="Aucune RS" className="text-xs font-semibold">Aucune RS</SelectItem>
                  {rsRates?.map((rate) => (
                    <SelectItem
                      key={rate.id}
                      value={rate.id.toString()}
                      label={`${rate.name} (${Number(rate.value)}%)`}
                      className="text-xs font-semibold"
                    >
                      {rate.name} ({Number(rate.value)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-sand-450 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sand-400" /> Référence / N° Avis de débit (Format UUID)
              </label>
              <div className="relative flex items-center">
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: 26a84266-e58c-4a11-a71b-c5356619316f"
                  className={cn(
                    "rounded-xl border-sand-200 pr-10 text-xs font-mono font-semibold focus-visible:ring-corp-blue-600 h-10",
                    reference.trim() && !isValidUuid && "border-red-400 focus-visible:ring-red-400 bg-red-50/20",
                    reference.trim() && isValidUuid && refAlreadyExists && "border-amber-400 focus-visible:ring-amber-400 bg-amber-50/20",
                    reference.trim() && isValidUuid && !refAlreadyExists && !checkingRef && "border-emerald-500 focus-visible:ring-emerald-500"
                  )}
                  required
                />
                <div className="absolute right-3 flex items-center pointer-events-none">
                  {checkingRef && <Loader2 className="w-4 h-4 animate-spin text-sand-400" />}
                  {!checkingRef && reference.trim() && isValidUuid && !refAlreadyExists && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  {!checkingRef && reference.trim() && (!isValidUuid || refAlreadyExists) && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Reference validation message */}
              {reference.trim() && !isValidUuid && (
                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                  Format UUID obligatoire (ex: 26a84266-e58c-4a11-a71b-c5356619316f)
                </p>
              )}
              {reference.trim() && isValidUuid && refAlreadyExists && (
                <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  Cette référence existe déjà dans la base de données.
                </p>
              )}
            </div>

            {/* Link to TEJ finances portal */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-800">
              <ExternalLink className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Déclaration de Retenue (TEJ)</span>
                <a
                  href="https://login-tej.finances.gov.tn/realms/seif/protocol/openid-connect/auth?client_id=seif-app&redirect_uri=https%3A%2F%2Ftej.finances.gov.tn%2F&state=0c5f438a-c250-423e-8331-35cee9aaeec6&response_mode=fragment&response_type=code&scope=openid&nonce=c0fac403-0b6b-4e01-be39-4ee0a4795e63"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-blue-900 font-bold flex items-center gap-1"
                >
                  Créer le certificat sur TEJ (Portail Finances)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Checkbox: Signed status (Required) */}
            <div className="flex items-center gap-2.5 py-1.5 px-3 bg-amber-50/40 border border-amber-100/60 rounded-xl">
              <input
                type="checkbox"
                id="issigned"
                checked={issigned}
                onChange={(e) => setIssigned(e.target.checked)}
                className="w-4 h-4 rounded border-sand-300 text-corp-blue-600 focus:ring-corp-blue-600 cursor-pointer"
              />
              <label
                htmlFor="issigned"
                className="text-xs text-sand-800 font-bold cursor-pointer select-none flex items-center gap-1.5"
              >
                Le document de la retenue est signé <span className="text-red-500 font-extrabold">*</span>
              </label>
            </div>
            {!issigned && (
              <p className="text-[10px] text-amber-700 font-semibold italic pl-1">
                Le document doit être obligatoirement signé pour enregistrer la RS.
              </p>
            )}
          </div>

          {/* Dynamic calculations preview or warning */}
          {selectedRateId !== 'Aucune RS' && activeRate ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2.5 text-xs text-amber-900"
            >
              <div className="flex justify-between font-semibold">
                <span>Total TTC</span>
                <span className="font-mono">{totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Retenue ({percentage}%)</span>
                <span className="font-mono">- {rsAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
              </div>
              <div className="border-t border-amber-200/50 pt-2.5 flex justify-between font-bold text-[13px] text-corp-blue-950">
                <span>Nouveau Net à Payer</span>
                <span className="font-mono text-corp-blue-900">{netPayable.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
              </div>
            </motion.div>
          ) : (
            <div className="bg-sand-50 border border-sand-100 rounded-xl p-4 flex items-start gap-2 text-xs text-sand-600">
              <AlertCircle className="w-4 h-4 text-sand-400 shrink-0 mt-0.5" />
              <span>
                Aucune retenue à la source sélectionnée. Le montant reste identique au TTC.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-sand-50/50 px-6 py-4 border-t border-sand-100 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="border border-sand-200 font-bold text-xs hover:bg-sand-100"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid || submitting}
            className="bg-corp-blue-900 hover:bg-corp-blue-950 text-white px-5 h-10 font-bold text-xs gap-2 flex items-center disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Appliquer la RS
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
