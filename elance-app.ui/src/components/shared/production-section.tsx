'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Factory, 
  Layers, 
  Warehouse, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Cpu,
  Workflow
} from 'lucide-react';
import Link from 'next/link';

// NOTE: Capabilities reflecting the actual Elancé Production implementation (Orders, Steps, Materials, Costs)
const productionCapabilities = [
  {
    icon: <Factory size={20} className="text-corp-cyan" />,
    title: 'Ordres de Fabrication (OF)',
    badge: 'Planification',
    desc: 'Création et ordonnancement des ordres de production par atelier. Suivi des statuts en direct (Planifié, En cours, Validé) et dates cibles vs réelles.'
  },
  {
    icon: <Warehouse size={20} className="text-corp-blue-400" />,
    title: 'Matières & Déstockage Direct',
    badge: 'Stock Temps Réel',
    desc: 'Liaison directe avec les articles en stock : consommation réelle de bois en M³ et quincaillerie déstockée automatiquement lors des fabrications.'
  },
  {
    icon: <Layers size={20} className="text-amber-400" />,
    title: 'Étapes d’Atelier Séquentielles',
    badge: 'Traçabilité',
    desc: 'Découpage du processus en étapes clés (débit, corroyage, rabotage, assemblage, finitions) avec validation progressive et affectation des équipes.'
  },
  {
    icon: <Scale size={20} className="text-emerald-400" />,
    title: 'Analyse des Coûts de Revient',
    badge: 'Marge & Rentabilité',
    desc: 'Calcul automatisé du coût matière, temps main-d’œuvre et frais machine pour chaque unité produite, assurant la maîtrise de vos marges nettes.'
  }
];

export function ProductionSection() {
  return (
    <section className="relative py-28 bg-[#080E1A] overflow-hidden px-6 md:px-10 border-t border-white/5" id="production">
      {/* ── Dynamic Glowing Neon Ambient Meshes ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-[70%] -translate-y-1/2 w-[55%] h-[55%] bg-[radial-gradient(ellipse,rgba(6,182,212,0.08)_0%,transparent_60%)] blur-[80px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[45%] h-[45%] bg-[radial-gradient(ellipse,rgba(37,99,235,0.08)_0%,transparent_50%)] blur-[80px]" />
        {/* Subtle grid mesh overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-40" />
      </div>

      <div className="max-w-[1250px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* ── Left Column: Value Proposition & Intent ── */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-5 text-center lg:text-left space-y-6"
        >
          {/* Section Pill Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-corp-cyan uppercase shadow-sm">
            <Factory size={13} className="text-corp-cyan animate-pulse" />
            Nouveau Module · Production & Atelier
          </div>

          <h2 className="text-[2.2rem] md:text-[3rem] text-white leading-[1.1] tracking-tight font-extrabold">
            De la matière brute au produit fini, maîtrisez votre fabrication
          </h2>

          <p className="text-[1rem] md:text-[1.08rem] leading-relaxed text-slate-400 max-w-[490px] mx-auto lg:mx-0 font-medium">
            Élancé connecte votre atelier au reste de l’entreprise. Lancez vos ordres de fabrication, suivez les consommations réelles de bois et valorisez vos produits finis sans rupture ni double saisie.
          </p>

          {/* Quick Ecosystem Trust Checks */}
          <div className="space-y-2.5 pt-2 text-left max-w-md mx-auto lg:mx-0">
            {[
              'Matières consommées déstockées en direct',
              'Transformation suivie étape par étape',
              'Coût de revient matière + main d’œuvre automatisé',
              'Produits finis réintégrés en stock ou livrés sur chantier'
            ].map((check) => (
              <div key={check} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-300">
                <CheckCircle2 size={15} className="text-corp-cyan shrink-0" />
                <span>{check}</span>
              </div>
            ))}
          </div>

          {/* CTA Link to Registration / Demo */}
          <div className="pt-4">
            <Button 
              asChild 
              variant="outline" 
              className="h-14 px-8 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-corp-cyan/50 hover:text-corp-cyan transition-all duration-300 text-[0.95rem] font-bold shadow-lg shadow-black/10 group cursor-pointer"
            >
              <Link href="/enterprise-registration" className="flex items-center gap-2">
                Découvrir le module Production
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* ── Right Column: 4 Real Capabilities Grid ── */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {productionCapabilities.map((cap, idx) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1, type: 'spring', stiffness: 90 }}
              className="group flex flex-col gap-5 p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-corp-cyan/30 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[1.2rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-corp-blue-500/10 group-hover:border-corp-cyan/30">
                  {cap.icon}
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {cap.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-[1.1rem] font-bold text-white tracking-tight group-hover:text-corp-cyan transition-colors duration-300">
                  {cap.title}
                </h3>
                <p className="text-[0.9rem] leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                  {cap.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* ── Bottom Connected Hub Strip ── */}
      <div className="max-w-[1250px] mx-auto mt-16 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <Workflow size={15} className="text-corp-cyan" />
          <span>Intégration écosystème : Stock multi-dépôts ➔ Production d'atelier ➔ Ventes & Facturation</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <span>✓ Calcul M³ automatique</span>
          <span>✓ Zéro ressaisie</span>
          <span>✓ Synchronisation Qwerty</span>
        </div>
      </div>
    </section>
  );
}
