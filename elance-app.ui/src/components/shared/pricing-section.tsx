'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Coins, 
  Zap, 
  Clock, 
  Layers, 
  HeartHandshake, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';
import Link from 'next/link';

const includedFeatures = [
  'Gestion commerciale & facturation certifiée',
  'Gestion complète des ventes, devis & bons de commande',
  'Gestion des achats, réceptions & catalogue fournisseurs',
  'Gestion du stock en temps réel & multi-dépôts (calcul M³ intégré)',
  'Module spécialisé Gestion de Chantiers BTP & suivi ouvriers',
  'Gestion de flotte automobile & missions logistiques',
  'Intégration directe avec l\'écosystème comptable Qwerty',
  'Accès sécurisé multi-utilisateurs & gestion des rôles',
  'Sauvegarde continue des données & hébergement sécurisé (99.9%)',
  'Mises à jour logicielles continues & support dédié ACYA Consulting'
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section 
      id="tarifs" 
      className="py-28 px-6 md:px-10 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9] relative overflow-hidden font-sans border-t border-slate-200/60"
    >
      {/* Glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[radial-gradient(circle,rgba(37,99,235,0.07)_0%,transparent_65%)] pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_60%)] pointer-events-none blur-3xl" />

      <div className="max-w-[1250px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-corp-blue-600/10 border border-corp-blue-600/20 rounded-full px-4.5 py-1.5 text-xs font-extrabold tracking-wide text-corp-blue-700 uppercase shadow-sm"
          >
            <Coins size={14} className="text-corp-blue-600" />
            Tarification Claire & Transparente
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-[2.9rem] font-black text-slate-900 tracking-tight leading-[1.12]"
          >
            Une solution complète.{' '}
            <span className="bg-gradient-to-r from-corp-blue-600 to-corp-cyan bg-clip-text text-transparent">
              Un prix simple.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-slate-600 leading-relaxed font-medium"
          >
            Tout ce dont vous avez besoin pour piloter votre activité, sans formules compliquées ni coûts cachés.
          </motion.p>
        </div>

        {/* Pricing Card Container */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative bg-white rounded-3xl border-2 border-corp-blue-500/30 shadow-[0_25px_70px_-15px_rgba(37,99,235,0.15)] overflow-hidden"
          >
            {/* Top glowing gradient border highlight */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-corp-blue-600 via-corp-cyan to-corp-blue-700" />

            <div className="p-8 sm:p-12 lg:p-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                
                {/* Left side: Commercial Price Highlight */}
                <div className="lg:col-span-6 space-y-6 text-center lg:text-left border-b lg:border-b-0 lg:border-r border-slate-100 pb-8 lg:pb-0 lg:pr-10">
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold tracking-wide">
                    <Sparkles size={13} className="text-emerald-600" />
                    Formule Annuelle Tout Compris
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">ACYA Plateforme</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      Accès complet à l'ensemble des modules opérationnels & intégration comptable.
                    </p>
                  </div>

                  {/* Big Price Display */}
                  <div className="py-3">
                    <div className="flex items-baseline justify-center lg:justify-start gap-2">
                      <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                        450 DT
                      </span>
                      <span className="text-lg font-bold text-slate-400">
                        / an (HT)
                      </span>
                    </div>

                    {/* Psychological highlight badge */}
                    <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-corp-blue-50 to-cyan-50 border border-corp-blue-200/60 shadow-sm text-corp-blue-900 font-extrabold text-sm sm:text-base">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-corp-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-corp-blue-600" />
                      </span>
                      ✨ Seulement 1,23 DT par jour
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    💡 <strong>Investissez moins de 1,25 DT par jour</strong> — pour le coût d'une dépense quotidienne minime, votre entreprise bénéficie d'une solution de gestion intégrale et connectée.
                  </p>

                  <div className="space-y-3 pt-2">
                    <Link
                      href="/enterprise-registration"
                      className="group flex w-full h-14 items-center justify-center gap-2 rounded-xl text-base font-bold text-white bg-gradient-to-r from-corp-blue-600 via-corp-blue-700 to-corp-cyan hover:from-corp-blue-500 hover:to-corp-cyan shadow-xl shadow-corp-blue-600/25 hover:shadow-corp-blue-600/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Commencer maintenant
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    
                    <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500" /> Essai gratuit 14 jours
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={13} className="text-emerald-500" /> Sans engagement
                      </span>
                    </div>
                  </div>

                </div>

                {/* Right side: Detailed Feature Breakdown */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    Ce qui est inclus dans votre licence :
                  </div>

                  <ul className="space-y-3">
                    {includedFeatures.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Besoin d'un devis sur-mesure ?</span>
                    <Link href="/contact" className="text-corp-blue-600 font-bold hover:underline">
                      Contacter l'équipe commerciale →
                    </Link>
                  </div>
                </div>

              </div>
            </div>

            {/* Satisfaction / Guarantee Ribbon */}
            <div className="bg-slate-900 text-white px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
              <div className="flex items-center gap-2 text-slate-300">
                <HeartHandshake size={16} className="text-corp-cyan" />
                <span>Accompagnement, formation et paramétrage assurés par ACYA Consulting</span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                Facturation annuelle claire · 450 TND HT
              </div>
            </div>

          </motion.div>
        </div>

        {/* Reassurance Grid below pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12 text-center">
          <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Mise en place rapide</h5>
            <p className="text-xs text-slate-500 mt-1">Espace prêt en quelques clics avec import de vos données.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Support humain & local</h5>
            <p className="text-xs text-slate-500 mt-1">Équipe d'ingénieurs et consultants basée en Tunisie.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60 shadow-sm">
            <h5 className="text-sm font-extrabold text-slate-800">Évolutions incluses</h5>
            <p className="text-xs text-slate-500 mt-1">Bénéficiez continuellement des nouvelles fonctionnalités.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
