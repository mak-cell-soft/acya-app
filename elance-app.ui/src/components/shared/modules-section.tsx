'use client';

import { motion } from 'framer-motion';
import { 
  TreePine, 
  UserCheck, 
  Building2, 
  ShoppingCart, 
  TrendingUp, 
  Truck, 
  Users, 
  BarChart3, 
  HardHat, 
  Layers, 
  Sparkles,
  Factory,
  Warehouse,
  ArrowRight,
  Package,
  CheckCircle2,
  Receipt
} from 'lucide-react';

// NOTE: Master list of all 12 interconnected Elancé modules.
// Elevates Products & Services and Production as first-class business capabilities.
const modules = [
  { 
    icon: <Package size={22} className="text-corp-blue-600" />, 
    title: 'Produits & Services', 
    desc: 'Catalogue unifié pour vos marchandises physiques (bois, découpes, quincaillerie) et vos prestations de services (pose, transport, usinage).', 
    tag: 'Marchandises & Services',
    highlighted: true
  },
  { 
    icon: <Building2 size={22} />, 
    title: 'Fournisseurs', 
    desc: 'Référentiel fournisseur, catalogue de prix, délais de livraison et évaluation des performances.', 
    tag: 'Catalogue & prix' 
  },
  { 
    icon: <ShoppingCart size={22} />, 
    title: 'Achats', 
    desc: "Commandes d'achat, bons de réception, rapprochement factures et gestion des stocks en temps réel.", 
    tag: 'Stock temps réel' 
  },
  { 
    icon: <Warehouse size={22} />, 
    title: 'Stock & Dépôts', 
    desc: 'Traçabilité multi-dépôts, inventaires tournants, mouvements automatisés et alertes de seuil critique.', 
    tag: 'Multi-dépôts' 
  },
  { 
    icon: <Factory size={22} className="text-corp-blue-600 animate-pulse" />, 
    title: 'Production', 
    desc: 'Planifiez, suivez et maîtrisez votre production. Consommation matières, ordres de fabrication, étapes d’atelier et calcul des coûts de revient.', 
    tag: 'Nouveau · Fabrication', 
    highlighted: true 
  },
  { 
    icon: <TrendingUp size={22} />, 
    title: 'Ventes & Facturation', 
    desc: 'Devis, bons de commande, facturation mixte et bons de livraison. Combinez articles du stock et prestations de service sur la même facture.', 
    tag: 'Devis → Facture mixte' 
  },
  { 
    icon: <UserCheck size={22} />, 
    title: 'Clients', 
    desc: 'Fiche client complète, historique des commandes, conditions tarifaires et suivi de la relation commerciale.', 
    tag: 'CRM intégré' 
  },
  { 
    icon: <HardHat size={22} className="text-corp-blue-600 animate-pulse" />, 
    title: 'Gestion Chantiers', 
    desc: "Suivi complet des chantiers : matériaux, ouvriers, coûts, planning et état d'avancement en temps réel.", 
    tag: 'Module phare', 
    highlighted: true 
  },
  { 
    icon: <Truck size={22} />, 
    title: 'Flotte Automobile', 
    desc: 'Suivi des véhicules, planification des missions, entretien et coûts kilométriques par trajet.', 
    tag: 'GPS & entretien' 
  },
  { 
    icon: <Users size={22} />, 
    title: 'Équipe & RH', 
    desc: 'Gestion des collaborateurs, pointage, planning des congés et suivi administratif du personnel.', 
    tag: 'RH Centralisée' 
  },
  { 
    icon: <BarChart3 size={22} />, 
    title: 'Pré-analyse Comptable', 
    desc: 'Tableau de bord financier, rapprochement des flux, indicateurs de rentabilité avant export comptable.', 
    tag: 'Rapports & KPI' 
  },
  { 
    icon: <Sparkles size={22} className="text-corp-blue-600" />, 
    title: 'Connexion Qwerty', 
    desc: 'Passerelle sécurisée directe vers le logiciel comptable de votre expert. Zéro double saisie des écritures.', 
    tag: 'Comptabilité TN' 
  },
];

// NOTE: Connected Business Ecosystem sequence showcasing seamless data flow across the enterprise.
const ecosystemSteps = [
  {
    step: '01',
    title: 'Achats',
    subtitle: 'Matières & Fournisseurs',
    detail: 'Bons de réception, valorisation au M³ et entrée en stock immédiate.',
    icon: ShoppingCart,
  },
  {
    step: '02',
    title: 'Stock',
    subtitle: 'Multi-dépôts & Matières',
    detail: 'Réservation automatique du bois et consommables pour l’atelier.',
    icon: Warehouse,
  },
  {
    step: '03',
    title: 'Production',
    subtitle: 'Transformation & Atelier',
    detail: 'Ordres de fabrication, étapes de découpe/assemblage et calcul du coût de revient.',
    icon: Factory,
    isCore: true,
  },
  {
    step: '04',
    title: 'Ventes & Facturation',
    subtitle: 'Produits & Services',
    detail: 'Facturation unifiée combinant articles en stock et prestations de services (pose, transport).',
    icon: TrendingUp,
  },
  {
    step: '05',
    title: 'Comptabilité',
    subtitle: 'Intégration Qwerty',
    detail: 'Rapprochement des marges réelles et transfert certifié vers votre expert.',
    icon: BarChart3,
  },
];

export function ModulesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <section className="py-28 bg-[#FAFBFD] px-6 md:px-10 relative overflow-hidden" id="modules">
      {/* Decorative vector shape in the background */}
      <div className="absolute top-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.03)_0%,transparent_60%)] pointer-events-none blur-[40px]" />
      
      <div className="max-w-[1250px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center lg:text-left mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-corp-blue-500/10 border border-corp-blue-500/20 rounded-full px-4.5 py-1.5 text-xs font-bold tracking-wide text-corp-blue-700 uppercase mb-4 shadow-sm"
          >
            <Layers size={14} className="text-corp-blue-600" />
            Modules Élancé
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[2rem] md:text-[2.8rem] text-slate-900 leading-[1.1] mb-6 tracking-tight font-extrabold"
          >
            Une couverture fonctionnelle totale à 360°
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[1.02rem] leading-relaxed text-slate-600 max-w-[680px] font-medium [text-wrap:pretty]"
          >
            De l’approvisionnement des grumes à la transformation en atelier, du catalogue unifié produits & services aux chantiers et à la pré-analyse comptable, chaque module est connecté en temps réel sans rupture d’information.
          </motion.p>
        </div>

        {/* ── Visual Connected Ecosystem Pipeline: Achats → Stock → Production → Ventes/Chantiers → Comptabilité ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-[0_10px_30px_rgba(37,99,235,0.04)] overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-corp-cyan opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-corp-cyan" />
                </span>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                  Écosystème Entreprise Connecté
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                La Production au cœur des opérations : du débit de matière à la comptabilité sans double saisie.
              </p>
            </div>
            <span className="text-[11px] font-bold text-corp-blue-700 bg-corp-blue-50 border border-corp-blue-200/60 px-3 py-1 rounded-full w-fit">
              Flux continu & traçabilité totale
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {ecosystemSteps.map((s, idx) => {
              const StepIcon = s.icon;
              return (
                <div 
                  key={s.step} 
                  className={`relative flex flex-col p-4 rounded-xl border transition-all duration-300 ${
                    s.isCore
                      ? 'bg-gradient-to-br from-white to-corp-blue-50/40 border-corp-blue-300 shadow-md shadow-corp-blue-500/5 ring-1 ring-corp-blue-200/50'
                      : 'bg-slate-50/60 border-slate-200/70 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      s.isCore 
                        ? 'bg-corp-blue-600 text-white shadow-sm' 
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      <StepIcon size={16} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      s.isCore
                        ? 'bg-corp-blue-500/15 text-corp-blue-700 font-black'
                        : 'bg-slate-200/60 text-slate-500'
                    }`}>
                      {s.step}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    {s.title}
                    {s.isCore && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 border border-cyan-400/30">
                        Nouveau
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] font-semibold text-corp-blue-600 mb-1.5">
                    {s.subtitle}
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {s.detail}
                  </p>

                  {/* Flow Arrow indicator between nodes on large screens */}
                  {idx < ecosystemSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-300">
                      <ArrowRight size={14} className="stroke-[2.5]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Spotlight Feature Showcase: Catalogue Unifié Marchandises & Services + Facture Mixte ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-white p-6 sm:p-8 lg:p-10 shadow-[0_15px_35px_rgba(37,99,235,0.04)] overflow-hidden relative"
        >
          {/* Subtle ambient lighting meshes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(37,99,235,0.05)_0%,transparent_70%)] pointer-events-none blur-2xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)] pointer-events-none blur-2xl" />

          {/* Section Header inside the Showcase */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-slate-200/80 mb-8 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-corp-blue-500/10 border border-corp-blue-500/20 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide text-corp-blue-700 uppercase">
                <Sparkles size={13} className="text-corp-blue-600" />
                Catalogue Unifié & Facturation Mixte
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
                Gérez vos produits et vos services au même endroit.
              </h3>
              <p className="text-sm sm:text-[0.95rem] text-slate-600 font-medium leading-relaxed [text-wrap:pretty]">
                Centralisez vos articles, qu&apos;il s&apos;agisse de marchandises physiques ou de prestations. Établissez des factures complètes réunissant produits du stock et services réalisés — sans gestion de stock superflue pour vos services.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3.5 py-1.5 rounded-full shadow-xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Une seule facture · Deux univers
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            {/* Left Column: Visual distinction between MERCHANDISE and SERVICE (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* MERCHANDISE CARD */}
              <div className="group rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-corp-blue-300 transition-all duration-300">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-corp-blue-50 border border-corp-blue-100 flex items-center justify-center text-corp-blue-600 group-hover:scale-105 transition-transform duration-200">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Typologie</div>
                      <div className="text-base font-extrabold text-slate-900 tracking-tight">Marchandise</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 border border-blue-400/25 tracking-wide">
                    Produit physique
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
                  Produits physiques avec suivi complet : approvisionnements fournisseurs, valorisation au M³ et inventaires multi-dépôts.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-corp-blue-600 shrink-0" />
                    <span>Stock & dépôts M³</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-corp-blue-600 shrink-0" />
                    <span>Achats fournisseurs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-corp-blue-600 shrink-0" />
                    <span>Inventaires tournants</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-corp-blue-600 shrink-0" />
                    <span>Vente & expédition</span>
                  </div>
                </div>
              </div>

              {/* SERVICE CARD */}
              <div className="group rounded-xl border border-cyan-200/90 bg-gradient-to-br from-white to-cyan-50/30 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-cyan-400 transition-all duration-300">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200/80 flex items-center justify-center text-cyan-600 group-hover:scale-105 transition-transform duration-200">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700">Typologie</div>
                      <div className="text-base font-extrabold text-slate-900 tracking-tight">Service</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-800 border border-cyan-400/30 tracking-wide">
                    Prestation directe
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
                  Prestations vendues directement : pose sur chantier, transport, sciage, usinage. Vos services ne passent pas par l&apos;inventaire.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 pt-1 border-t border-cyan-100/60">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                    <span>Sans stock requis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                    <span>Prix & TVA dédiés</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                    <span>Pose, transport, usinage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                    <span>Vente & facturation</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Realistic Mixed Invoice Mockup (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
              
              {/* Invoice Window Topbar */}
              <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-corp-blue-600/40 border border-corp-blue-400/30 flex items-center justify-center text-white shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white tracking-wide">Facture FAC-2026-0842</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Validée
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Client : Société Menuiserie Moderne & Chantiers</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Date d&apos;émission</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">23 Septembre 2026</span>
                </div>
              </div>

              {/* Invoice Sub-banner highlighting the feature value */}
              <div className="bg-corp-blue-50/80 border-b border-corp-blue-100 px-5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-corp-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-corp-blue-600 animate-pulse" />
                  Facture mixte : Marchandises du stock + Prestations de services
                </span>
                <span className="text-[11px] font-mono font-bold text-corp-blue-700 bg-white px-2 py-0.5 rounded border border-corp-blue-200/80">
                  4 Lignes combinées
                </span>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-5">Désignation article</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Qté</th>
                      <th className="py-2.5 px-3 text-right">Prix Unit. HT</th>
                      <th className="py-2.5 px-5 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    
                    {/* Item 1: Merchandise - Wooden Door */}
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        Porte Isoplane Massif (Chêne)
                        <span className="block text-[10px] text-slate-400 font-normal">Réf : ART-BOIS-042 · Stock Dépôt Principal</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          <Package size={10} />
                          Marchandise
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">1 U</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">800,000 DT</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 tabular-nums">800,000 DT</td>
                    </tr>

                    {/* Item 2: Service - Installation */}
                    <tr className="bg-cyan-50/25 hover:bg-cyan-50/45 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        Pose & Installation sur site
                        <span className="block text-[10px] text-cyan-700 font-normal">Prestation réalisée · Aucune sortie de stock</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-100/70 text-cyan-800 border border-cyan-300">
                          <Sparkles size={10} />
                          Service
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">1 Forfait</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">150,000 DT</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 tabular-nums">150,000 DT</td>
                    </tr>

                    {/* Item 3: Merchandise - Handle */}
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        Poignée Design Inox brossé
                        <span className="block text-[10px] text-slate-400 font-normal">Réf : QUI-POIG-08 · Stock Quincaillerie</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          <Package size={10} />
                          Marchandise
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">1 U</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">50,000 DT</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 tabular-nums">50,000 DT</td>
                    </tr>

                    {/* Item 4: Service - Transport */}
                    <tr className="bg-cyan-50/25 hover:bg-cyan-50/45 transition-colors">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        Transport & Livraison Express
                        <span className="block text-[10px] text-cyan-700 font-normal">Prestation logistique · Facturation directe</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-100/70 text-cyan-800 border border-cyan-300">
                          <Sparkles size={10} />
                          Service
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">1 Course</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">50,000 DT</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 tabular-nums">50,000 DT</td>
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* Invoice Totals & Explanatory Summary */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-auto">
                <div className="text-xs text-slate-500 font-medium max-w-sm">
                  <p className="font-bold text-slate-700 mb-0.5">Rapprochement automatique :</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Seules les marchandises ont décrémenté l&apos;inventaire. Les services sont immédiatement comptabilisés sans mouvement de stock inutile.
                  </p>
                </div>
                <div className="w-full sm:w-auto bg-white border border-slate-200/90 rounded-lg p-3 min-w-[220px] space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-xs text-slate-500 font-mono">
                    <span>Total Marchandises :</span>
                    <span className="font-bold text-slate-700 tabular-nums">850,000 DT</span>
                  </div>
                  <div className="flex justify-between text-xs text-cyan-700 font-mono">
                    <span>Total Services :</span>
                    <span className="font-bold tabular-nums">200,000 DT</span>
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 flex justify-between text-sm font-bold text-slate-900 font-mono">
                    <span>Total Facture HT :</span>
                    <span className="text-corp-blue-700 font-black tabular-nums">1 050,000 DT</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* ── 12 Module Cards Grid ── */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {modules.map((m) => (
            <motion.div
              key={m.title}
              variants={cardVariants}
              className={`group relative overflow-hidden rounded-xl border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(37,99,235,0.06)] cursor-default ${
                m.highlighted 
                  ? 'border-corp-cyan/50 bg-gradient-to-br from-white to-corp-blue-50/10 shadow-lg shadow-corp-blue-500/5' 
                  : 'border-slate-200/80 bg-white hover:border-corp-blue-300'
              }`}
            >
              {/* Dynamic hover color slider top bar */}
              <div className={`absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-corp-blue-600 to-corp-cyan opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              
              <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border text-[1.2rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                m.highlighted 
                  ? 'bg-corp-blue-500/10 border-corp-cyan/20 text-corp-blue-700' 
                  : 'bg-slate-50 border-slate-100 text-slate-600 group-hover:bg-corp-blue-50 group-hover:text-corp-blue-600'
              }`}>
                {m.icon}
              </div>
              
              <h3 className="mb-3 text-[1.1rem] font-bold text-slate-800 tracking-tight group-hover:text-corp-blue-800 transition-colors duration-300 flex items-center gap-2">
                {m.title}
                {m.highlighted && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-corp-cyan animate-ping" />
                )}
              </h3>
              <p className="text-[0.92rem] leading-relaxed text-slate-500 group-hover:text-slate-600 transition-colors duration-300">
                {m.desc}
              </p>
              
              <div className={`mt-6 inline-block rounded-lg px-3 py-1 text-[0.7rem] font-bold tracking-wider uppercase ${
                m.highlighted 
                  ? 'bg-corp-cyan/10 text-corp-blue-800 border border-corp-cyan/20' 
                  : 'bg-slate-50 text-slate-500 group-hover:bg-corp-blue-50 group-hover:text-corp-blue-600 transition-all'
              }`}>
                {m.tag}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
