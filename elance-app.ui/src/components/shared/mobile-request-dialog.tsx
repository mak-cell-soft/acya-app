'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Smartphone, 
  Mail, 
  User, 
  Building, 
  Phone, 
  CheckCircle2, 
  Send, 
  Loader2, 
  X, 
  Apple, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

interface MobileRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileRequestDialog({ isOpen, onClose }: MobileRequestDialogProps) {
  const [fullname, setFullname] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState<'both' | 'ios' | 'android'>('both');
  const [teamSize, setTeamSize] = useState('1-5');
  const [notes, setNotes] = useState('');

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullname.trim()) newErrors.fullname = 'Votre nom est requis';
    if (!enterprise.trim()) newErrors.enterprise = "Le nom de l'entreprise est requis";
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Un email valide est requis';
    if (!phone.trim()) newErrors.phone = 'Le numéro de téléphone est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsPending(true);

    // Simulate mobile deployment request submission
    setTimeout(() => {
      setIsPending(false);
      setIsSuccess(true);
      toast.success("Demande transmise avec succès ! Notre équipe technique vous contactera sous peu.");
    }, 1200);
  };

  const handleResetAndClose = () => {
    onClose();
    setTimeout(() => {
      setIsSuccess(false);
      setFullname('');
      setEnterprise('');
      setEmail('');
      setPhone('');
      setNotes('');
      setErrors({});
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent 
        showCloseButton={false} 
        className="w-full max-w-full sm:max-w-xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-2xl bg-white font-sans text-slate-900"
      >
        {/* Header with deep corporate blue gradient */}
        <DialogHeader className="bg-gradient-to-r from-[#0E1F42] via-[#142B5B] to-[#0A1835] text-white p-7 relative">
          <div className="flex items-start gap-4 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-500/20 border border-corp-blue-400/30 flex items-center justify-center shrink-0 text-corp-cyan shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-corp-cyan/15 border border-corp-cyan/30 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Accès Exclusif sur Demande
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Demander l'application mobile
              </DialogTitle>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                Obtenez un accès personnalisé pour vos équipes sur iOS et Android.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleResetAndClose}
            className="absolute rounded-full right-5 top-5 w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {isSuccess ? (
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Demande bien reçue !
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Merci <span className="font-bold text-slate-900">{fullname}</span>. Un conseiller technique ACYA va prendre contact avec vous sous 24h pour préparer l'environnement mobile sécurisé de <span className="font-bold text-slate-900">{enterprise}</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-corp-blue-600" />
                Configuration personnalisée garantie :
              </div>
              <p>
                Vos identifiants entreprise, permissions des collaborateurs et synchronisation en direct avec votre base de données ACYA seront configurés sur mesure.
              </p>
            </div>

            <Button 
              onClick={handleResetAndClose}
              className="w-full h-12 bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold rounded-xl"
            >
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nom complet */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-corp-blue-600" />
                  Nom & Prénom *
                </Label>
                <Input
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="Ex: Mohamed Ben Salem"
                  className={`h-11 rounded-xl bg-slate-50 border ${errors.fullname ? 'border-red-500 bg-red-50/20' : 'border-slate-200'}`}
                />
                {errors.fullname && <p className="text-[11px] text-red-500 font-semibold">{errors.fullname}</p>}
              </div>

              {/* Entreprise */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-corp-blue-600" />
                  Entreprise *
                </Label>
                <Input
                  value={enterprise}
                  onChange={(e) => setEnterprise(e.target.value)}
                  placeholder="Ex: Bois du Sud SARL"
                  className={`h-11 rounded-xl bg-slate-50 border ${errors.enterprise ? 'border-red-500 bg-red-50/20' : 'border-slate-200'}`}
                />
                {errors.enterprise && <p className="text-[11px] text-red-500 font-semibold">{errors.enterprise}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-corp-blue-600" />
                  Email Professionnel *
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="direction@entreprise.tn"
                  className={`h-11 rounded-xl bg-slate-50 border ${errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200'}`}
                />
                {errors.email && <p className="text-[11px] text-red-500 font-semibold">{errors.email}</p>}
              </div>

              {/* Téléphone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-corp-blue-600" />
                  Téléphone / WhatsApp *
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 99 000 000"
                  className={`h-11 rounded-xl bg-slate-50 border ${errors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-200'}`}
                />
                {errors.phone && <p className="text-[11px] text-red-500 font-semibold">{errors.phone}</p>}
              </div>
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                Plateformes mobiles ciblées
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both', label: 'iOS & Android' },
                  { id: 'ios', label: 'iPhone / iPad' },
                  { id: 'android', label: 'Android' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlatform(item.id as any)}
                    className={`h-10 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      platform === item.id 
                        ? 'bg-corp-blue-50 border-corp-blue-600 text-corp-blue-700 shadow-sm' 
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Size */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                Nombre estimé d'utilisateurs mobiles (commerciaux, chauffeurs, chefs de chantier)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1-5', label: '1 à 5 mobiles' },
                  { id: '6-20', label: '6 à 20 mobiles' },
                  { id: '20+', label: 'Plus de 20' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTeamSize(item.id)}
                    className={`h-9 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      teamSize === item.id 
                        ? 'bg-corp-blue-50 border-corp-blue-600 text-corp-blue-700 shadow-sm' 
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Besoins spécifiques (Optionnel)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Suivi des livraisons de bois sur le terrain, consultation des stocks en direct..."
                rows={2}
                className="rounded-xl bg-slate-50 border-slate-200 text-xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:flex-1 h-12 bg-gradient-to-r from-corp-blue-600 to-corp-blue-800 hover:from-corp-blue-500 hover:to-corp-blue-700 text-white font-bold rounded-xl shadow-lg shadow-corp-blue-900/10 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi de votre demande...
                  </>
                ) : (
                  <>
                    Envoyer ma demande d'accès
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetAndClose}
                className="w-full sm:w-auto h-12 text-slate-500 hover:text-slate-800 rounded-xl"
              >
                Annuler
              </Button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              🔒 Vos données sont confidentielles et ne seront jamais partagées.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
