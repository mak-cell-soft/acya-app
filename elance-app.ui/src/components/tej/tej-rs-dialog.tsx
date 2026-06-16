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
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { holdingTaxService } from '@/services/components/holding-tax.service';
import { tejService } from '@/services/tej/tej.service';
import { TejCertificateInput } from '@/types/tej/tej.types';
import { Document } from '@/types/document';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [reference, setReference] = useState<string>((doc.supplierReference || doc.holdingtax?.reference || '').substring(0, 15));
  
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

  // Calculations in millimes (to match exactly TEJ backend)
  const htMillimes = Math.round(montantHT * 1000);
  const tvaMillimes = Math.round((htMillimes * tauxTVA) / 100);
  const ttcMillimes = htMillimes + tvaMillimes;
  const rsMillimes = Math.round((ttcMillimes * tauxRS) / 100);
  const netMillimes = ttcMillimes - rsMillimes;

  const displayTVA = tvaMillimes / 1000;
  const displayTTC = ttcMillimes / 1000;
  const displayRS = rsMillimes / 1000;
  const displayNet = netMillimes / 1000;

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTejPassword('');
      setBeneficiaryVerified(false);
      setTejError(null);
      setTejReferenceId('');
      
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
        try {
          const parsed = JSON.parse(result.result.rawResponse);
          console.log('TEJ Raw Success Response:', parsed);
          
          // TEJ wraps the response in an "RS" array for declarations
          if (parsed.RS && Array.isArray(parsed.RS) && parsed.RS.length > 0 && parsed.RS[0].id) {
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
        onClick={step !== 3 ? onClose : undefined}
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

        {/* Content Wizard */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
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
              </motion.div>
            )}

            {step === 2 && (
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
                        type="number"
                        value={montantHT}
                        onChange={(e) => setMontantHT(Number(e.target.value))}
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
                      onChange={(e) => setIdTypeOperation(e.target.value)}
                      placeholder="Ex: RS7_000002"
                      className="rounded-xl border-slate-200 text-xs font-semibold h-10"
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

            {step === 3 && (
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

            {step === 4 && (
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
