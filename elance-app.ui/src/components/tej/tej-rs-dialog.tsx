'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  Percent,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Send,
  Building2,
  ArrowRight,
  ExternalLink,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { holdingTaxService } from '@/services/components/holding-tax.service';
import { tejService } from '@/services/tej/tej.service';
import { TejCertificateInput } from '@/types/tej/tej.types';
import { Document } from '@/types/document';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppVariables } from '@/hooks/use-app-variables';
import { cn } from '@/lib/utils';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface TejRsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: Document;
}

export function TejRsDialog({
  isOpen,
  onClose,
  onSuccess,
  document: doc
}: TejRsDialogProps) {
  // State for the wizard steps: 1=Password, 2=Config & Beneficiary, 3=Sync, 4=Success
  const [step, setStep] = useState<number>(1);

  // ── RS Existante mode ──────────────────────────────────────────────────────
  const [rsExistanteMode, setRsExistanteMode] = useState(false);
  const { data: rsRates, isLoading: loadingRates } = useAppVariables('RS');
  const [selectedRateId, setSelectedRateId] = useState<string>('Aucune RS');
  const [rsReference, setRsReference] = useState<string>('');
  const [rsIssigned, setRsIssigned] = useState<boolean>(false);
  const [checkingRsRef, setCheckingRsRef] = useState<boolean>(false);
  const [rsRefAlreadyExists, setRsRefAlreadyExists] = useState<boolean>(false);
  const [submittingRsExistante, setSubmittingRsExistante] = useState<boolean>(false);

  const totalTtc = doc.total_net_ttc || 0;
  const totalHt = doc.total_ht_net_doc || 0;
  const totalTva = doc.total_tva_doc || 0;
  const isValidUuid = UUID_REGEX.test(rsReference.trim());
  const activeRate = rsRates?.find((r) => r.id.toString() === selectedRateId);
  const percentage = activeRate ? Number(activeRate.value) || 0 : 0;
  // RS is calculated on TTC — matching TEJ portal (RS = TTC × rate%)
  const rsAmount = (totalTtc * percentage) / 100;
  const netPayable = Math.max(0, totalTtc - rsAmount);

  const isRsExistanteFormValid =
    selectedRateId !== 'Aucune RS' &&
    rsReference.trim().length > 0 &&
    isValidUuid &&
    !rsRefAlreadyExists &&
    !checkingRsRef &&
    rsIssigned;

  // Debounced uniqueness check for RS Existante reference
  useEffect(() => {
    if (!isOpen || !rsReference.trim() || !isValidUuid) {
      setRsRefAlreadyExists(false);
      setCheckingRsRef(false);
      return;
    }
    let cancelled = false;
    setCheckingRsRef(true);
    const timer = setTimeout(() => {
      holdingTaxService
        .checkReferenceExists(rsReference.trim(), doc.holdingtax?.id)
        .then((exists) => { if (!cancelled) setRsRefAlreadyExists(exists); })
        .catch(() => { if (!cancelled) setRsRefAlreadyExists(false); })
        .finally(() => { if (!cancelled) setCheckingRsRef(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, rsReference, isValidUuid, doc.holdingtax?.id]);

  const handleRsExistanteConfirm = async () => {
    if (selectedRateId === 'Aucune RS') {
      toast.warning('Veuillez sélectionner un taux de retenue à la source.');
      return;
    }
    if (!rsReference.trim()) {
      toast.warning('Veuillez saisir la référence UUID.');
      return;
    }
    if (!isValidUuid) {
      toast.warning('La référence doit être au format UUID valide (ex: 26a84266-e58c-4a11-a71b-c5356619316f).');
      return;
    }
    if (rsRefAlreadyExists) {
      toast.warning('Cette référence existe déjà dans la base de données.');
      return;
    }
    if (!rsIssigned) {
      toast.warning('Le document de la retenue doit être signé.');
      return;
    }

    setSubmittingRsExistante(true);
    try {
      const payload = {
        id: doc.holdingtax?.id,
        documentid: doc.id,
        description: activeRate?.name || 'Retenue à la source',
        taxpercentage: percentage,
        taxvalue: rsAmount,
        reference: rsReference.trim(),
        issigned: rsIssigned,
        newamountdocvalue: netPayable,
        updatedbyid: 1,
        isdeleted: false
      };
      await holdingTaxService.applyToDocument(doc.id, payload);
      toast.success('Retenue à la source (RS existante) appliquée avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to apply holding tax (RS existante):', err);
      if (err.response?.data?.message === 'Retenue existe déjà') {
        toast.warning('Cette retenue existe déjà pour ce document.');
      } else {
        toast.error("Erreur lors de l'application de la retenue à la source.");
      }
    } finally {
      setSubmittingRsExistante(false);
    }
  };

  // ── TEJ Wizard state ───────────────────────────────────────────────────────

  // Step 1: TEJ Auth
  const [tejUsername, setTejUsername] = useState('0040863P000');
  const [tejPassword, setTejPassword] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Step 2: Config
  const [montantHT, setMontantHT] = useState(doc.total_ht_net_doc || 0);
  const initialTva = doc.total_tva_doc && doc.total_ht_net_doc ? Math.round((doc.total_tva_doc / doc.total_ht_net_doc) * 100) : 19;
  const [tauxTVA, setTauxTVA] = useState<number>(initialTva);
  const [tauxRS, setTauxRS] = useState<number>(doc.holdingtax?.taxpercentage || 0);
  const [idTypeOperation, setIdTypeOperation] = useState<string>('RS7_000002');
  const [reference, setReference] = useState<string>((doc.supplierReference || (doc as any).supplierreference || doc.holdingtax?.reference || '').substring(0, 15));

  const [beneficiaryMf, setBeneficiaryMf] = useState(doc.counterpart?.taxregistrationnumber || '');
  const [beneficiaryEmail, setBeneficiaryEmail] = useState(doc.counterpart?.email || '');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState(doc.counterpart?.phonenumberone || '');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState(doc.counterpart?.address || '');
  const [beneficiaryActivity, setBeneficiaryActivity] = useState(doc.counterpart?.description || '');

  const [verifyingBeneficiary, setVerifyingBeneficiary] = useState(false);
  const [beneficiaryVerified, setBeneficiaryVerified] = useState(false);

  // Step 3: Sync
  const [syncing, setSyncing] = useState(false);
  const [tejError, setTejError] = useState<string | null>(null);
  const [tejReferenceId, setTejReferenceId] = useState<string>('');
  const [rawTejResponse, setRawTejResponse] = useState<string>('');

  // Handle specific TEJ input format for Montant HT
  const handleMontantHTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits, 10) || 0;
    setMontantHT(num / 1000);
  };

  // Calculations in millimes (to match exactly TEJ backend)
  const htMillimes = Math.round(montantHT * 1000);
  const tvaMillimes = Math.trunc((htMillimes * tauxTVA) / 100);
  const ttcMillimes = htMillimes + tvaMillimes;
  const rsMillimes = Math.trunc((ttcMillimes * tauxRS) / 100);
  const netMillimes = ttcMillimes - rsMillimes;

  const displayTVA = tvaMillimes / 1000;
  const displayTTC = ttcMillimes / 1000;
  const displayRS = rsMillimes / 1000;
  const displayNet = netMillimes / 1000;

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRsExistanteMode(false);
      setTejPassword('');
      setBeneficiaryVerified(false);
      setTejError(null);
      setTejReferenceId('');

      // RS Existante resets
      setSelectedRateId('Aucune RS');
      setRsReference('');
      setRsIssigned(false);
      setRsRefAlreadyExists(false);

      // Fetch default username
      tejService.getUsername().then(res => setTejUsername(res.username)).catch(() => setTejUsername(''));

      setMontantHT(doc.total_ht_net_doc || 0);
      setTauxTVA(initialTva);
      setTauxRS(doc.holdingtax?.taxpercentage || 0);
      setReference((doc.supplierReference || doc.holdingtax?.reference || '').substring(0, 15));
      setBeneficiaryMf(doc.counterpart?.taxregistrationnumber || '');
      setBeneficiaryEmail(doc.counterpart?.email || '');
      setBeneficiaryPhone(doc.counterpart?.phonenumberone || '');
      setBeneficiaryAddress(doc.counterpart?.address || '');
      setBeneficiaryActivity(doc.counterpart?.description || '');
    }
  }, [isOpen, doc, initialTva]);

  if (!isOpen) return null;

  const handleAuth = async () => {
    if (!tejUsername || !tejPassword) {
      toast.error('Veuillez saisir le nom d\'utilisateur et le mot de passe TEJ');
      return;
    }
    setAuthenticating(true);
    try {
      await tejService.verifyPassword({ username: tejUsername, password: tejPassword });
      toast.success('Authentification TEJ réussie');
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mot de passe TEJ incorrect');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleVerifyBeneficiary = async () => {
    if (!beneficiaryMf) {
      toast.error('Veuillez saisir le matricule fiscal.');
      return;
    }

    setVerifyingBeneficiary(true);
    try {
      const cleanMf = beneficiaryMf.trim().split(' ')[0];
      await tejService.verifyBeneficiary(cleanMf);
      setBeneficiaryVerified(true);
      toast.success('Bénéficiaire vérifié avec succès sur TEJ.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fournisseur introuvable sur TEJ');
      setBeneficiaryVerified(false);
    } finally {
      setVerifyingBeneficiary(false);
    }
  };

  const handleSubmit = async () => {
    if (!beneficiaryVerified) {
      return toast.warning('Veuillez vérifier le bénéficiaire sur TEJ d\'abord.');
    }

    if (!montantHT || montantHT <= 0) return toast.warning('Le montant HT est obligatoire.');
    if (tauxTVA === undefined || tauxTVA < 0) return toast.warning('Le taux TVA est obligatoire.');
    if (!tauxRS || tauxRS <= 0) return toast.warning('Le taux de retenue est obligatoire.');
    if (!reference.trim()) return toast.warning('La référence est obligatoire.');

    if (!beneficiaryEmail.trim()) return toast.warning('L\'email du bénéficiaire est obligatoire.');
    if (!beneficiaryPhone.trim()) return toast.warning('Le téléphone du bénéficiaire est obligatoire.');
    if (!beneficiaryAddress.trim()) return toast.warning('L\'adresse du bénéficiaire est obligatoire.');
    if (!beneficiaryActivity.trim()) return toast.warning('L\'activité du bénéficiaire est obligatoire.');

    // Move to Sync step
    setStep(3);
    startSync(beneficiaryMf.trim().split(' ')[0]);
  };

  const startSync = async (cleanMf: string) => {
    setSyncing(true);
    let guid = reference;

    try {
      // Build TEJ Certificate
      const certificate: TejCertificateInput = {
        action: 'ADD',
        beneficiaryIdentifiant: cleanMf,
        beneficiaryName: doc.counterpart?.name || 'Fournisseur Inconnu',
        beneficiaryAddress: beneficiaryAddress.trim(),
        beneficiaryActivity: beneficiaryActivity.trim(),
        beneficiaryEmail: beneficiaryEmail.trim(),
        beneficiaryPhone: beneficiaryPhone.trim(),
        refCertifChezDeclarant: reference.substring(0, 15),
        paymentDate: new Date().toISOString(),
        operations: [
          {
            idTypeOperation: idTypeOperation,
            anneeFacturation: new Date().getFullYear(),
            montantHT: htMillimes, // TEJ expects millimes
            tauxRS: tauxRS,
            tauxTVA: tauxTVA,
            montantTVA: tvaMillimes,
            montantTTC: ttcMillimes,
            montantRS: rsMillimes,
            cnpc: false,
            pCharge: false
          }
        ]
      };

      const result = await tejService.submitCertificate({
        username: tejUsername,
        password: tejPassword,
        certificate
      });

      // Extract GUID from TEJ response
      if (result && result.result && result.result.rawResponse) {
        setRawTejResponse(result.result.rawResponse);
        try {
          const parsed = JSON.parse(result.result.rawResponse);
          console.log('TEJ Raw Success Response:', parsed);

          // TEJ wraps the response in an "RS" array for declarations
          if (parsed.keycloakId) {
            guid = parsed.keycloakId;
          } else if (parsed.RS && Array.isArray(parsed.RS) && parsed.RS.length > 0 && parsed.RS[0].keycloakId) {
            guid = parsed.RS[0].keycloakId;
          } else if (parsed.RS && Array.isArray(parsed.RS) && parsed.RS.length > 0 && parsed.RS[0].id) {
            guid = parsed.RS[0].id;
          } else if (parsed.id) {
            guid = parsed.id;
          }
        } catch (e) {
          console.warn("Could not parse TEJ rawResponse to get GUID", e);
        }
      }

      setTejReferenceId(guid);

    } catch (error: any) {
      console.error('TEJ Sync Error:', error);
      let errorMsg = 'Erreur lors de la synchronisation avec TEJ.';

      if (error.response?.data?.result?.rawResponse) {
        try {
          const raw = JSON.parse(error.response.data.result.rawResponse);
          if (raw.RS && raw.RS.length > 0) {
            errorMsg = raw.RS.map((e: any) => e.message).join(' | ');
          } else if (raw.cause || raw.message) {
            errorMsg = `${raw.cause ? raw.cause + ': ' : ''}${raw.message || ''}`;
          } else {
            errorMsg = JSON.stringify(raw);
          }
        } catch(e) {
          errorMsg = error.response.data.result.rawResponse;
        }
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setTejError(errorMsg);
      setStep(2); // Go back to config on error
      setSyncing(false);
      return; // Stop execution
    }

    // TEJ call succeeded, save locally
    try {
      await saveToLocalDatabase(guid);
    } catch (error) {
      console.error('Local DB Save Error:', error);
      toast.error('Certificat généré sur TEJ avec succès, mais erreur d\'enregistrement local.');
    }

    setStep(4);
    setSyncing(false);
  };

  const saveToLocalDatabase = async (guid: string) => {
    const payload = {
      id: doc.holdingtax?.id,
      documentid: doc.id,
      description: 'Retenue à la source TEJ',
      taxpercentage: tauxRS,
      taxvalue: displayRS,
      reference: guid, // Use the TEJ GUID as reference
      issigned: true, // Auto sign since it's verified on TEJ
      newamountdocvalue: displayNet,
      updatedbyid: 1,
      isdeleted: false
    };

    await holdingTaxService.applyToDocument(doc.id, payload);
    toast.success('Retenue à la source enregistrée localement.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step !== 3 && !rsExistanteMode ? onClose : (rsExistanteMode ? onClose : undefined)}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white border border-slate-150 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden z-10"
      >
        {/* Header */}
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <img src="/logo-tej.png" alt="TEJ" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              <Landmark className="w-5 h-5 absolute opacity-20" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Intégration TEJ - Retenue à la Source
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Document : <span className="font-bold text-slate-700">{doc.docnumber}</span>
                {rsExistanteMode && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    RS Existante
                  </span>
                )}
              </p>
            </div>
          </div>
          {step !== 3 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">

            {/* ── RS EXISTANTE MODE ─────────────────────────────────────── */}
            {rsExistanteMode && (
              <motion.div
                key="rs-existante"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Info banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">RS déjà déclarée sur TEJ</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      La retenue a été saisie directement sur le portail TEJ. Collez l'UUID du certificat ci-dessous pour l'enregistrer dans Élancé.
                    </p>
                    <a
                      href="https://login-tej.finances.gov.tn/realms/seif/protocol/openid-connect/auth?client_id=seif-app&redirect_uri=https%3A%2F%2Ftej.finances.gov.tn%2F&state=0c5f438a-c250-423e-8331-35cee9aaeec6&response_mode=fragment&response_type=code&scope=openid&nonce=c0fac403-0b6b-4e01-be39-4ee0a4795e63"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 text-[11px] underline font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 w-fit"
                    >
                      Ouvrir le portail TEJ <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Document summary */}
                <Card className="border-slate-100 bg-slate-50/30">
                  <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Fournisseur</span>
                      <span className="font-bold text-slate-800 text-[13px]">{doc.counterpart?.name || '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Total TTC</span>
                      <span className="font-mono font-bold text-blue-700 text-[13px]">
                        {totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Rate selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Taux de Retenue à la Source
                  </label>
                  <Select
                    value={selectedRateId}
                    onValueChange={(val) => setSelectedRateId(val || 'Aucune RS')}
                    disabled={loadingRates}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 h-10 text-xs font-semibold">
                      <SelectValue placeholder="Sélectionner un taux">
                        {selectedRateId === 'Aucune RS'
                          ? 'Aucune RS'
                          : activeRate
                          ? `${activeRate.name} (${Number(activeRate.value)}%)`
                          : 'Sélectionner un taux'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100">
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

                {/* UUID Reference input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Référence UUID TEJ
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      value={rsReference}
                      onChange={(e) => setRsReference(e.target.value)}
                      placeholder="Ex: 26a84266-e58c-4a11-a71b-c5356619316f"
                      className={cn(
                        'rounded-xl border-slate-200 pr-10 text-xs font-mono font-semibold h-10',
                        rsReference.trim() && !isValidUuid && 'border-red-400 focus-visible:ring-red-400 bg-red-50/20',
                        rsReference.trim() && isValidUuid && rsRefAlreadyExists && 'border-amber-400 focus-visible:ring-amber-400 bg-amber-50/20',
                        rsReference.trim() && isValidUuid && !rsRefAlreadyExists && !checkingRsRef && 'border-emerald-500 focus-visible:ring-emerald-500'
                      )}
                    />
                    <div className="absolute right-3 flex items-center pointer-events-none">
                      {checkingRsRef && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      {!checkingRsRef && rsReference.trim() && isValidUuid && !rsRefAlreadyExists && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      {!checkingRsRef && rsReference.trim() && (!isValidUuid || rsRefAlreadyExists) && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {rsReference.trim() && !isValidUuid && (
                    <p className="text-[10px] text-red-500 font-semibold">
                      Format UUID obligatoire (ex: 26a84266-e58c-4a11-a71b-c5356619316f)
                    </p>
                  )}
                  {rsReference.trim() && isValidUuid && rsRefAlreadyExists && (
                    <p className="text-[10px] text-amber-600 font-semibold">
                      Cette référence existe déjà dans la base de données.
                    </p>
                  )}
                </div>

                {/* Signed checkbox */}
                <div className="flex items-center gap-2.5 py-1.5 px-3 bg-amber-50/40 border border-amber-100/60 rounded-xl">
                  <input
                    type="checkbox"
                    id="rs-existante-issigned"
                    checked={rsIssigned}
                    onChange={(e) => setRsIssigned(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="rs-existante-issigned"
                    className="text-xs text-slate-800 font-bold cursor-pointer select-none flex items-center gap-1.5"
                  >
                    Le document de la retenue est signé <span className="text-red-500 font-extrabold">*</span>
                  </label>
                </div>
                {!rsIssigned && (
                  <p className="text-[10px] text-amber-700 font-semibold italic pl-1">
                    Le document doit être obligatoirement signé pour enregistrer la RS.
                  </p>
                )}

                {/* Calculation preview */}
                {selectedRateId !== 'Aucune RS' && activeRate ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2 text-xs"
                  >
                    {/* Row: HT */}
                    <div className="flex justify-between text-slate-600 font-semibold">
                      <span>Montant HT</span>
                      <span className="font-mono">{totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                    {/* Row: TVA */}
                    <div className="flex justify-between text-slate-500">
                      <span>Montant TVA</span>
                      <span className="font-mono">{totalTva.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                    {/* Row: TTC */}
                    <div className="flex justify-between text-slate-700 font-bold border-t border-amber-100 pt-2">
                      <span>Montant TTC</span>
                      <span className="font-mono">{totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                    {/* Row: RS */}
                    <div className="flex justify-between text-amber-700 font-semibold">
                      <span>Montant de la RS <span className="text-[10px] font-normal">({percentage}% × TTC)</span></span>
                      <span className="font-mono">- {rsAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                    {/* Row: Net */}
                    <div className="flex justify-between font-bold text-[13px] text-slate-900 border-t border-amber-200/60 pt-2">
                      <span>Montant Net payé</span>
                      <span className="font-mono text-blue-800">{netPayable.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-2 text-xs text-slate-600">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>Aucune retenue à la source sélectionnée. Le montant reste identique au TTC.</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    onClick={() => setRsExistanteMode(false)}
                    className="text-slate-500 font-bold text-xs gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Retour au flux TEJ
                  </Button>
                  <Button
                    onClick={handleRsExistanteConfirm}
                    disabled={!isRsExistanteFormValid || submittingRsExistante}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2"
                  >
                    {submittingRsExistante ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Appliquer la RS
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── TEJ WIZARD ───────────────────────────────────────────── */}
            {!rsExistanteMode && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">Authentification TEJ requise</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Votre identifiant est automatiquement généré à partir de votre matricule fiscal. Veuillez vérifier et saisir votre mot de passe TEJ pour continuer.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Nom d'utilisateur TEJ</label>
                    <Input
                      type="text"
                      value={tejUsername}
                      onChange={(e) => setTejUsername(e.target.value)}
                      placeholder="Ex: 0040863P000"
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Mot de passe TEJ</label>
                    <Input
                      type="password"
                      value={tejPassword}
                      onChange={(e) => setTejPassword(e.target.value)}
                      placeholder="Saisissez votre mot de passe"
                      className="h-11"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onClose} className="font-bold">Annuler</Button>
                  <Button onClick={handleAuth} disabled={authenticating || !tejUsername || !tejPassword} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                    {authenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Connexion
                  </Button>
                </div>

                {/* Separator + RS Existante button */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">ou</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setRsExistanteMode(true)}
                    className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 font-bold text-xs h-10 px-5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    RS Existante (déjà déclarée sur TEJ)
                  </Button>
                </div>
              </motion.div>
            )}

            {!rsExistanteMode && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {tejError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{tejError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-slate-150 bg-slate-50/50">
                    <CardContent className="p-3 text-xs flex flex-col gap-2">
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Fournisseur (Bénéficiaire)</span>
                        <span className="font-bold text-slate-800 line-clamp-1">{doc.counterpart?.name || 'Inconnu'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={beneficiaryMf}
                          onChange={(e) => {
                            setBeneficiaryMf(e.target.value);
                            setBeneficiaryVerified(false); // Reset validation on change
                          }}
                          className="h-8 text-xs font-mono w-32"
                          placeholder="Ex: 1234567P"
                        />
                        {beneficiaryVerified ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-4 h-4" /> Vérifié
                          </span>
                        ) : (
                          <Button
                            onClick={handleVerifyBeneficiary}
                            disabled={verifyingBeneficiary || !beneficiaryMf}
                            size="sm"
                            variant="outline"
                            className="h-8 text-[10px] px-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            {verifyingBeneficiary ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Vérifier MF
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-150 bg-slate-50/50">
                    <CardContent className="p-3 text-xs text-right">
                      <span className="text-slate-500 font-semibold block mb-1">Montant HT</span>
                      <Input
                        type="text"
                        value={montantHT.toFixed(3)}
                        onChange={handleMontantHTChange}
                        className="h-8 text-right font-bold text-blue-700 text-sm mt-1 border-transparent hover:border-slate-200 focus:border-blue-500 transition-colors bg-transparent px-1"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Bénéficiaire</label>
                      <Input
                        type="email"
                        value={beneficiaryEmail}
                        onChange={(e) => setBeneficiaryEmail(e.target.value)}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                        placeholder="Ex: contact@fournisseur.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
                      <Input
                        value={beneficiaryPhone}
                        onChange={(e) => setBeneficiaryPhone(e.target.value)}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                        placeholder="Ex: 71000000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adresse</label>
                      <Input
                        value={beneficiaryAddress}
                        onChange={(e) => setBeneficiaryAddress(e.target.value)}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                        placeholder="Ex: 123 Rue de la République"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Activité</label>
                      <Input
                        value={beneficiaryActivity}
                        onChange={(e) => setBeneficiaryActivity(e.target.value)}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                        placeholder="Ex: Vente en gros"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" /> Taux TVA (%)
                      </label>
                      <Input
                        type="number"
                        value={tauxTVA}
                        onChange={(e) => setTauxTVA(Number(e.target.value))}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" /> Taux RS (%)
                      </label>
                      <Input
                        type="number"
                        value={tauxRS}
                        onChange={(e) => setTauxRS(Number(e.target.value))}
                        className="rounded-xl border-slate-200 h-10 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Type d'opération TEJ
                    </label>
                    <Input
                      value={idTypeOperation}
                      disabled
                      className="h-8 text-xs mt-1 border-slate-200 bg-slate-50 cursor-not-allowed font-semibold"
                    />
                    <p className="text-[10px] text-slate-400">Code opération nomenclature TEJ (ex: RS7_000001, RS7_000002)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Référence / N° Certificat
                    </label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ex: Facture Fournisseur"
                      className="rounded-xl border-slate-200 text-xs font-semibold h-10"
                      maxLength={15}
                    />
                    <p className="text-[10px] text-slate-400">Max 15 caractères (sera tronqué automatiquement par TEJ)</p>
                  </div>
                </div>

                {/* Totals Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">TVA</div>
                    <div className="text-sm font-mono font-bold text-blue-600">{displayTVA.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Montant TTC</div>
                    <div className="text-sm font-mono font-bold text-blue-600">{displayTTC.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</div>
                  </div>
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] text-indigo-500 uppercase font-bold tracking-wide">Montant RS</div>
                    <div className="text-sm font-mono font-bold text-indigo-700">{displayRS.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center shadow-sm">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wide">Net Servi</div>
                    <div className="text-sm font-mono font-bold text-emerald-700">{displayNet.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 font-bold text-xs">Retour</Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !beneficiaryVerified ||
                      !montantHT ||
                      tauxTVA < 0 ||
                      tauxRS <= 0 ||
                      !reference.trim() ||
                      !beneficiaryEmail.trim() ||
                      !beneficiaryPhone.trim() ||
                      !beneficiaryAddress.trim() ||
                      !beneficiaryActivity.trim()
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer à TEJ
                  </Button>
                </div>
              </motion.div>
            )}

            {!rsExistanteMode && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 space-y-8"
              >
                <div className="flex items-center gap-6">
                  {/* Elancé App Icon */}
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100 relative">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-blue-400"
                      animate={{ scale: [1, 1.1, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>

                  {/* Connecting Line */}
                  <div className="w-16 h-1 bg-slate-100 relative overflow-hidden rounded-full">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-blue-500 w-1/2"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* TEJ Icon */}
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-200">
                    <img src="/logo-tej.png" alt="TEJ" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-blue-800 font-black text-xl">TEJ</span>' }} />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    Synchronisation avec TEJ
                  </h3>
                  <p className="text-sm text-slate-500">
                    Transmission du certificat de retenue à la source...
                  </p>
                </div>
              </motion.div>
            )}

            {!rsExistanteMode && step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-6 text-center"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-black text-xl text-slate-900">Succès !</h3>
                  <p className="text-sm text-slate-600 max-w-sm">
                    Le certificat de retenue à la source a été généré, transmis à TEJ, et appliqué sur votre document Élancé.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 w-full flex flex-col gap-1 text-left">
                  <p className="text-xs text-slate-500 font-bold uppercase">Référence Élancé</p>
                  <p className="font-mono text-sm font-bold text-slate-800">{reference}</p>
                  <div className="h-px bg-slate-200 my-2" />
                  <p className="text-xs text-slate-500 font-bold uppercase">ID TEJ (GUID)</p>
                  <p className="font-mono text-xs font-bold text-blue-700 break-all">{tejReferenceId}</p>
                </div>

                {rawTejResponse && (
                  <div className="w-full text-left mt-2">
                    <details className="text-xs text-slate-500 border border-slate-200 rounded-lg overflow-hidden">
                      <summary className="cursor-pointer font-bold bg-slate-50 px-3 py-2 hover:bg-slate-100">
                        Voir la réponse technique (JSON TEJ)
                      </summary>
                      <pre className="bg-slate-900 text-green-400 p-3 overflow-x-auto text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {rawTejResponse}
                      </pre>
                    </details>
                  </div>
                )}

                <Button
                  onClick={() => { onSuccess(); onClose(); }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl"
                >
                  Terminer
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
