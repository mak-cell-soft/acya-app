'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  Coins, 
  CheckCircle2, 
  HeartHandshake,
  Factory,
  HardHat,
  Layers,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

// NOTE: Standard Core ERP features included across all subscription plans
const coreFeatures = [
  'Gestion commerciale & facturation certifiée',
  'Catalogue unifié : Marchandises (stock & M³) et Services',
  'Facturation mixte : produits et prestations sur la même facture',
  'Ventes, devis clients & bons de commande',
  'Achats, fournisseurs & réceptions de marchandises',
  'Stock multi-dépôts en temps réel & alertes de seuil',
  'Flotte automobile & gestion des missions logistiques',
  'Passerelle directe avec la comptabilité Qwerty',
  'Multi-utilisateurs & contrôle fin des autorisations',
  'Sauvegarde continue & hébergement haute disponibilité'
];

// NOTE: Specialized feature sets for business modules
const productionFeatures = [
  'Ordres de fabrication (OF) & suivi d’atelier',
  'Fiches techniques & nomenclatures matières',
  'Suivi des consommations & traçabilité des lots',
  'Calcul automatisé des coûts de revient'
];

const chantierFeatures = [
  'Suivi d’exécution des chantiers & phases de travaux',
  'Affectation & pointage des équipes / ouvriers',
  'Consommations de matières & matériel par chantier',
  'Rentabilité analytique & budget prévisionnel'
];

type SingleModuleType = 'production' | 'chantiers';

export function PricingSection() {
  // NOTE: Interactive selection state:
  // - withProduction: whether the customer selects Production
  // - withChantiers: whether the customer selects Chantiers
  // - activeSingleTab: when viewing the 1-module card, toggles between Production or Chantiers view
  const [withProduction, setWithProduction] = useState<boolean>(true);
  const [withChantiers, setWithChantiers] = useState<boolean>(true);
  const [activeSingleTab, setActiveSingleTab] = useState<SingleModuleType>('production');

  // Derive the active module count and current calculated price
  const selectedModuleCount = (withProduction ? 1 : 0) + (withChantiers ? 1 : 0);
  
  // Pricing logic:
  // 0 modules -> 450 DT HT / an (existing base price preserved)
  // 1 module  -> 600 DT HT / an (Production OR Chantiers)
  // 2 modules -> 800 DT HT / an (Production + Chantiers)

  // Handler for quick presets in interactive configurator
  const handleSelectPreset = (plan: 'standard' | 'single-prod' | 'single-chantier' | 'all') => {
    if (plan === 'standard') {
      setWithProduction(false);
      setWithChantiers(false);
    } else if (plan === 'single-prod') {
      setWithProduction(true);
      setWithChantiers(false);
      setActiveSingleTab('production');
    } else if (plan === 'single-chantier') {
      setWithProduction(false);
      setWithChantiers(true);
      setActiveSingleTab('chantiers');
    } else if (plan === 'all') {
      setWithProduction(true);
      setWithChantiers(true);
    }
  };

  return (
    <section 
      id="tarifs" 
      className="py-24 sm:py-28 px-4 sm:px-6 md:px-10 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9] relative overflow-hidden font-sans border-t border-slate-200/60"
    >
      {/* Subtle ambient lighting gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(37,99,235,0.06)_0%,transparent_70%)] pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_60%)] pointer-events-none blur-3xl" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-corp-blue-600/10 border border-corp-blue-600/20 rounded-full px-4 py-1.5 text-xs font-extrabold tracking-wide text-corp-blue-700 uppercase shadow-sm"
          >
            <Coins size={14} className="text-corp-blue-600" />
            Tarification Claire & Transparente
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black text-slate-900 tracking-tight leading-[1.14] text-balance"
          >
            Une solution adaptée à votre métier.{' '}
            <span className="bg-gradient-to-r from-corp-blue-600 to-corp-cyan bg-clip-text text-transparent">
              Des tarifs clairs.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto"
          >
            Choisissez le socle standard de gestion ou activez nos modules métiers dédiés selon les besoins réels de votre entreprise.
          </motion.p>

          {/* Interactive Module Configurator Strip */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-slate-200/60 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectPreset('standard')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.96] ${
                  selectedModuleCount === 0
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Socle Standard
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('single-prod')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.96] ${
                  selectedModuleCount === 1
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Module Métier
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.96] ${
                  selectedModuleCount === 2
                    ? 'bg-corp-blue-600 text-white shadow-md shadow-corp-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous les modules
              </button>
            </div>

            {/* Quick interactive module toggle pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={withProduction}
                onClick={() => {
                  const next = !withProduction;
                  setWithProduction(next);
                  if (next && !withChantiers) setActiveSingleTab('production');
                  if (!next && withChantiers) setActiveSingleTab('chantiers');
                }}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-[0.96] ${
                  withProduction
                    ? 'bg-corp-blue-50 border-corp-blue-400 text-corp-blue-900 shadow-sm'
                    : 'bg-white/80 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Factory size={14} className={withProduction ? 'text-corp-blue-600' : 'text-slate-400'} />
                <span>Production</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  withProduction ? 'bg-corp-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {withProduction ? '✓' : '+'}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={withChantiers}
                onClick={() => {
                  const next = !withChantiers;
                  setWithChantiers(next);
                  if (next && !withProduction) setActiveSingleTab('chantiers');
                  if (!next && withProduction) setActiveSingleTab('production');
                }}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-[0.96] ${
                  withChantiers
                    ? 'bg-corp-blue-50 border-corp-blue-400 text-corp-blue-900 shadow-sm'
                    : 'bg-white/80 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <HardHat size={14} className={withChantiers ? 'text-corp-blue-600' : 'text-slate-400'} />
                <span>Chantiers</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  withChantiers ? 'bg-corp-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {withChantiers ? '✓' : '+'}
                </span>
              </button>
            </div>
          </motion.div>

          {/* Real-time calculated status banner */}
          <div className="text-xs font-semibold text-slate-500 pt-1">
            Formule active sélectionnée :{' '}
            <span className="font-extrabold text-slate-900">
              {selectedModuleCount === 0 && 'Socle Standard (450 DT HT / an)'}
              {selectedModuleCount === 1 && withProduction && '1 Module — Production uniquement (600 DT HT / an)'}
              {selectedModuleCount === 1 && withChantiers && '1 Module — Chantiers uniquement (600 DT HT / an)'}
              {selectedModuleCount === 2 && 'Tous les modules — Production + Chantiers (800 DT HT / an)'}
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* ============================================================ */}
          {/* CARD 1: SOCLE STANDARD (450 DT HT / an) — Preserved Existing Price */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`relative flex flex-col justify-between bg-white rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-xl ${
              selectedModuleCount === 0 
                ? 'border-corp-blue-600 ring-4 ring-corp-blue-600/10 shadow-lg' 
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="p-6 sm:p-8 space-y-6">
              {/* Badge & Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold tracking-wide">
                  <Layers size={13} className="text-slate-500" />
                  Socle Standard
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">ACYA Plateforme</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Idéal pour le négoce, la distribution et les structures commerciales sans atelier ni chantiers extérieurs.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 pb-1 border-y border-slate-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    450 DT
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-400">
                    HT / an
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  Soit seulement 1,23 DT par jour · Facturation annuelle
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Inclus dans le socle standard :
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  {coreFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card Footer CTA */}
            <div className="p-6 sm:p-8 pt-0 space-y-3 mt-auto">
              <Link
                href="/enterprise-registration"
                onClick={() => handleSelectPreset('standard')}
                className="group flex w-full h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.96] transition-all duration-200"
              >
                Choisir le Socle Standard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                Essai gratuit 14 jours · Sans engagement
              </div>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* CARD 2: 1 MODULE (600 DT HT / an) — Production OU Chantiers */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`relative flex flex-col justify-between bg-white rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-xl ${
              selectedModuleCount === 1 
                ? 'border-corp-blue-600 ring-4 ring-corp-blue-600/10 shadow-lg' 
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="p-6 sm:p-8 space-y-6">
              {/* Badge & Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold tracking-wide">
                  <Sparkles size={13} className="text-cyan-600" />
                  1 Module Métier au Choix
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">1 Module</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  L&apos;ensemble du socle standard + <strong className="text-slate-900">Production</strong> <span className="font-extrabold text-corp-blue-600">ou</span> <strong className="text-slate-900">Chantiers</strong>.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 pb-1 border-y border-slate-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    600 DT
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-400">
                    HT / an
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  Soit seulement 1,64 DT par jour · Facturation annuelle
                </p>
              </div>

              {/* Interactive Switcher: Production ou Chantiers */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Choisissez le module :</span>
                  <span className="text-[11px] lowercase text-corp-blue-600 font-bold">1 inclus</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSingleTab('production');
                      handleSelectPreset('single-prod');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.96] ${
                      activeSingleTab === 'production'
                        ? 'bg-white text-corp-blue-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Factory size={13} className={activeSingleTab === 'production' ? 'text-corp-blue-600' : 'text-slate-400'} />
                    Production
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSingleTab('chantiers');
                      handleSelectPreset('single-chantier');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.96] ${
                      activeSingleTab === 'chantiers'
                        ? 'bg-white text-corp-blue-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HardHat size={13} className={activeSingleTab === 'chantiers' ? 'text-corp-blue-600' : 'text-slate-400'} />
                    Chantiers
                  </button>
                </div>

                {/* Module-specific features display */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    {activeSingleTab === 'production' ? (
                      <>
                        <Factory size={13} className="text-corp-blue-600" />
                        <span>Fonctionnalités Production incluses :</span>
                      </>
                    ) : (
                      <>
                        <HardHat size={13} className="text-corp-blue-600" />
                        <span>Fonctionnalités Chantiers incluses :</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                    {(activeSingleTab === 'production' ? productionFeatures : chantierFeatures).map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-corp-blue-100 text-corp-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={9} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Inclusion note */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 pt-1">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Inclut l&apos;intégralité du socle standard (450 DT)</span>
                </div>
              </div>
            </div>

            {/* Card Footer CTA */}
            <div className="p-6 sm:p-8 pt-0 space-y-3 mt-auto">
              <Link
                href="/enterprise-registration"
                onClick={() => handleSelectPreset(activeSingleTab === 'production' ? 'single-prod' : 'single-chantier')}
                className="group flex w-full h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-corp-blue-700 hover:bg-corp-blue-800 active:scale-[0.96] shadow-md shadow-corp-blue-700/20 transition-all duration-200"
              >
                Choisir 1 Module ({activeSingleTab === 'production' ? 'Production' : 'Chantiers'})
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                Essai gratuit 14 jours · Sans engagement
              </div>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* CARD 3: TOUS LES MODULES (800 DT HT / an) — Production + Chantiers */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`relative flex flex-col justify-between bg-white rounded-3xl border-2 transition-all duration-300 shadow-md hover:shadow-2xl overflow-hidden ${
              selectedModuleCount === 2 
                ? 'border-corp-blue-600 ring-4 ring-corp-blue-600/15 shadow-xl' 
                : 'border-corp-blue-200 hover:border-corp-blue-400'
            }`}
          >
            {/* Top gradient ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-corp-blue-600 via-corp-cyan to-corp-blue-700" />

            <div className="p-6 sm:p-8 space-y-6">
              {/* Badge & Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-corp-blue-50 border border-corp-blue-200 text-corp-blue-700 text-xs font-bold tracking-wide">
                  <Sparkles size={13} className="text-corp-blue-600" />
                  Recommandé · Pack Intégral
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tous les modules</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  La solution complète sans compromis incluant <strong className="text-slate-900">Production</strong> <span className="font-extrabold text-corp-blue-600">+</span> <strong className="text-slate-900">Chantiers</strong>.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 pb-1 border-y border-slate-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    800 DT
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-400">
                    HT / an
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                  Soit seulement 2,19 DT par jour · Facturation annuelle
                </p>
              </div>

              {/* Inclusions summary */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Les 2 modules métiers inclus :
                </div>

                {/* Visual module chips showing both are included */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-corp-blue-50/80 border border-corp-blue-200/80 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-corp-blue-900">
                      <Factory size={13} className="text-corp-blue-600" />
                      Production
                    </div>
                    <p className="text-[11px] text-corp-blue-700/80 font-medium mt-0.5 leading-tight">
                      Atelier, OF & coûts
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-50/80 border border-cyan-200/80 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-950">
                      <HardHat size={13} className="text-cyan-700" />
                      Chantiers
                    </div>
                    <p className="text-[11px] text-cyan-800/80 font-medium mt-0.5 leading-tight">
                      Suivi BTP & ouvriers
                    </p>
                  </div>
                </div>

                {/* Full package highlights */}
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium pt-1">
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug"><strong>Module Production d&apos;atelier</strong> complet</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug"><strong>Module Gestion Chantiers BTP</strong> complet</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">L&apos;intégralité du <strong>Socle Standard</strong> inclus</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">Interconnexion directe atelier, chantiers & stocks</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">Support prioritaire ACYA Consulting</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card Footer CTA */}
            <div className="p-6 sm:p-8 pt-0 space-y-3 mt-auto">
              <Link
                href="/enterprise-registration"
                onClick={() => handleSelectPreset('all')}
                className="group flex w-full h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-corp-blue-600 via-corp-blue-700 to-corp-cyan hover:from-corp-blue-500 hover:to-corp-cyan active:scale-[0.96] shadow-lg shadow-corp-blue-600/25 transition-all duration-200"
              >
                Choisir Tous les modules (800 DT)
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                Essai gratuit 14 jours · Sans engagement
              </div>
            </div>
          </motion.div>

        </div>

        {/* Custom Quote & Contact Banner */}
        <div className="mt-8 p-4 rounded-2xl bg-white/70 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600 shadow-sm max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-corp-blue-600 shrink-0" />
            <span>Vous avez des besoins spécifiques, multi-sociétés ou des volumes particuliers ?</span>
          </div>
          <Link 
            href="/contact" 
            className="text-corp-blue-600 font-extrabold hover:underline whitespace-nowrap active:scale-[0.96] transition-transform"
          >
            Demander un devis sur-mesure →
          </Link>
        </div>

        {/* Satisfaction / Guarantee Ribbon */}
        <div className="mt-8 max-w-4xl mx-auto rounded-2xl bg-slate-900 text-white px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium shadow-md">
          <div className="flex items-center gap-2 text-slate-300">
            <HeartHandshake size={16} className="text-corp-cyan shrink-0" />
            <span>Accompagnement, formation et paramétrage assurés par ACYA Consulting</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
            Facturation annuelle claire · De 450 à 800 DT HT / an
          </div>
        </div>

        {/* Reassurance Grid below pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-10 text-center">
          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Mise en place rapide</h5>
            <p className="text-xs text-slate-500 mt-1">Espace prêt en quelques clics avec import de vos données.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Support humain & local</h5>
            <p className="text-xs text-slate-500 mt-1">Équipe d&apos;ingénieurs et consultants basée en Tunisie.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Évolutions incluses</h5>
            <p className="text-xs text-slate-500 mt-1">Bénéficiez continuellement des nouvelles fonctionnalités.</p>
          </div>
        </div>

      </div>
    </section>
  );
}

