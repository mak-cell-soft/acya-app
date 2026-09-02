'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  Receipt, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  Check, 
  Lock,
  Layers,
  Sparkles,
  Database,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedBeam } from '@/components/ui/animated-beam';

const benefits = [
  {
    icon: Zap,
    title: 'Gain de temps',
    desc: 'Évitez la ressaisie manuelle des données comptables et gagnez plusieurs jours précieux chaque fin de mois.',
    accent: 'from-blue-500/20 to-cyan-500/20 text-corp-blue-600',
    border: 'border-corp-blue-200/60'
  },
  {
    icon: RefreshCw,
    title: 'Connexion directe',
    desc: 'Transmettez facilement les récapitulatifs de ventes et d\'achats à l\'espace comptable Qwerty de votre expert.',
    accent: 'from-cyan-500/20 to-teal-500/20 text-corp-cyan',
    border: 'border-cyan-200/60'
  },
  {
    icon: CheckCircle2,
    title: 'Moins d\'erreurs',
    desc: 'Réduisez drastiquement les risques liés aux omissions et aux coquilles de frappe lors de l\'import des écritures.',
    accent: 'from-emerald-500/20 to-green-500/20 text-emerald-600',
    border: 'border-emerald-200/60'
  },
  {
    icon: Briefcase,
    title: 'Collaboration simplifiée',
    desc: 'Fini les échanges laborieux de fichiers Excel par email. L\'expert récupère directement ses états de gestion.',
    accent: 'from-indigo-500/20 to-blue-500/20 text-indigo-600',
    border: 'border-indigo-200/60'
  }
];

export function QwertyIntegrationSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const acyaRef = useRef<HTMLDivElement>(null);
  const secureNodeRef = useRef<HTMLDivElement>(null);
  const qwertyRef = useRef<HTMLDivElement>(null);
  const accountantRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'ventes' | 'achats'>('ventes');
  const [isSimulating, setIsSimulating] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const handleSimulate = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSyncDone(false);
    setTimeout(() => {
      setIsSimulating(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 4000);
    }, 1800);
  };

  return (
    <section 
      id="integration-qwerty" 
      className="py-28 px-6 md:px-10 bg-gradient-to-b from-[#FAFBFD] via-[#F0F5FF] to-white relative overflow-hidden font-sans border-t border-corp-blue-100/40"
    >
      {/* Decorative ambient gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] pointer-events-none blur-3xl" />
      <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none blur-3xl" />

      <div className="max-w-[1250px] mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-corp-blue-600/10 border border-corp-blue-600/20 rounded-full px-4.5 py-1.5 text-xs font-extrabold tracking-wide text-corp-blue-700 uppercase shadow-sm"
          >
            <Sparkles size={14} className="text-corp-blue-600 animate-pulse" />
            Nouveau · Écosystème Comptable Connecté
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-[2.9rem] font-black text-slate-900 tracking-tight leading-[1.12]"
          >
            Simplifiez la collaboration avec votre{' '}
            <span className="bg-gradient-to-r from-corp-blue-600 to-corp-cyan bg-clip-text text-transparent">
              expert-comptable
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-slate-600 leading-relaxed font-medium"
          >
            Grâce à l'intégration <strong className="text-slate-800 font-bold">ACYA × Qwerty</strong>, vos récapitulatifs de ventes et d'achats peuvent être directement exploités par votre expert-comptable dans son environnement Qwerty — sans saisie manuelle ni perte de données.
          </motion.p>
        </div>

        {/* Interactive Architecture Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.08)] mb-16 overflow-hidden"
          ref={containerRef}
        >
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

          {/* Action pill bar on top of diagram */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 pb-8 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Flux de données :</span>
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setActiveTab('ventes')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'ventes'
                      ? 'bg-white text-corp-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Récapitulatif Ventes
                </button>
                <button
                  onClick={() => setActiveTab('achats')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'achats'
                      ? 'bg-white text-corp-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Récapitulatif Achats
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-corp-blue-600 to-corp-blue-700 text-white shadow-md shadow-corp-blue-600/20 hover:from-corp-blue-500 hover:to-corp-blue-600 transition-all active:scale-95 cursor-pointer disabled:opacity-70"
            >
              {isSimulating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Synchronisation vers Qwerty...
                </>
              ) : syncDone ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  Importé avec succès !
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Simuler l'import comptable
                </>
              )}
            </button>
          </div>

          {/* Interactive 4-Node Sequence */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8 items-center py-4">
            
            {/* NODE 1: Enterprise & ACYA */}
            <div 
              ref={acyaRef}
              className="relative flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-corp-blue-300 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-corp-blue-600 to-corp-blue-800 flex items-center justify-center text-white shadow-lg shadow-corp-blue-600/25 mb-3">
                <Building2 size={26} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-corp-blue-600 bg-corp-blue-50 px-2.5 py-0.5 rounded-full mb-1">
                Étape 1 · Votre Entreprise
              </span>
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">ACYA Plateforme</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeTab === 'ventes' ? 'Factures de vente & TVA' : 'Factures d\'achat & réceptions'}
              </p>

              {/* Document tag preview */}
              <div className="mt-4 w-full bg-slate-50 border border-slate-200/60 rounded-xl p-2 text-left space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Receipt size={12} className="text-corp-blue-600" />
                    {activeTab === 'ventes' ? 'Vente Août 2026' : 'Achat Août 2026'}
                  </span>
                  <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Prêt</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activeTab === 'ventes' ? 'HT: 48 500 DT · TVA: 19%' : 'HT: 32 100 DT · Timbre'}
                </div>
              </div>
            </div>

            {/* NODE 2: Secure Bridge & Token Auth */}
            <div 
              ref={secureNodeRef}
              className="relative flex flex-col items-center text-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 mb-3">
                <Lock size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2.5 py-0.5 rounded-full mb-1">
                Étape 2 · Passerelle
              </span>
              <h4 className="text-base font-extrabold text-white tracking-tight">Connexion Sécurisée</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Webservice API chiffré TLS avec jeton d'accès certifié
              </p>

              <div className="mt-4 w-full bg-white/5 border border-white/10 rounded-xl p-2 text-left">
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono">
                  <ShieldCheck size={12} />
                  <span>Bearer Token Validé</span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono truncate mt-0.5">
                  GET /api/qwerty-import
                </div>
              </div>
            </div>

            {/* NODE 3: Qwerty Accounting Workspace */}
            <div 
              ref={qwertyRef}
              className="relative flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-corp-cyan/60 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#D84315] flex items-center justify-center text-white shadow-lg shadow-[#FF6B35]/25 mb-3">
                <span className="font-black text-xl tracking-tighter">Q</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35] bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 rounded-full mb-1">
                Étape 3 · Logiciel
              </span>
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Qwerty Tunisie</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Importation en un clic dans le dossier comptable
              </p>

              <div className="mt-4 w-full bg-orange-50/50 border border-orange-200/50 rounded-xl p-2 text-left space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <Download size={12} className="text-[#FF6B35]" />
                    Import lié
                  </span>
                  <span className="text-[9px] text-orange-700 font-mono font-bold">Auto</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Création tiers + écriture débit/crédit
                </div>
              </div>
            </div>

            {/* NODE 4: Accountant */}
            <div 
              ref={accountantRef}
              className="relative flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-emerald-300 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-3">
                <ShieldCheck size={26} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1">
                Étape 4 · Bénéficiaire
              </span>
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Expert-Comptable</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Validation directe, états de gestion & bilans
              </p>

              <div className="mt-4 w-full bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-2 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>Zéro ressaisie Excel</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Déclarations fiscales prêtes à temps
                </div>
              </div>
            </div>

          </div>

          {/* Animated Beams connecting nodes on desktop */}
          <div className="hidden md:block">
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={acyaRef}
              toRef={secureNodeRef}
              pathColor="rgba(59, 130, 246, 0.2)"
              gradientStartColor="#3B82F6"
              gradientStopColor="#06B6D4"
              duration={3.5}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={secureNodeRef}
              toRef={qwertyRef}
              pathColor="rgba(6, 182, 212, 0.2)"
              gradientStartColor="#06B6D4"
              gradientStopColor="#FF6B35"
              duration={3.5}
              delay={0.6}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={qwertyRef}
              toRef={accountantRef}
              pathColor="rgba(255, 107, 53, 0.2)"
              gradientStartColor="#FF6B35"
              gradientStopColor="#10B981"
              duration={3.5}
              delay={1.2}
            />
          </div>

          {/* Bottom callout strip */}
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Conforme au standard technique de webservice QwertyTunisieProduction</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <FileSpreadsheet size={15} className="text-corp-blue-600" />
              <span>Fin des emails manuels d'exports de fin de mois</span>
            </div>
          </div>
        </motion.div>

        {/* 4 Benefit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative bg-white rounded-2xl border border-slate-200/80 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_45px_rgba(37,99,235,0.08)] hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${b.accent} flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5 tracking-tight group-hover:text-corp-blue-700 transition-colors">
                  {b.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {b.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Action Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-corp-blue-900 via-corp-blue-800 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl shadow-corp-blue-950/20 flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-corp-cyan uppercase tracking-wider">
              Disponibilité immédiate
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Votre comptable utilise déjà Qwerty ?
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
              Activez la passerelle sécurisée en moins de 5 minutes dans votre espace ACYA et gagnez un temps précieux dès la prochaine clôture mensuelle.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0">
            <Link
              href="/enterprise-registration"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl px-7 text-sm font-bold text-white bg-gradient-to-r from-corp-blue-500 to-corp-cyan hover:from-corp-blue-400 hover:to-corp-cyan/90 transition-all shadow-lg shadow-corp-blue-500/25 active:scale-95"
            >
              Simplifier ma comptabilité
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://qwerty.tn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 text-sm font-bold text-white hover:bg-white/10 transition-all"
            >
              En savoir plus sur Qwerty.tn
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
