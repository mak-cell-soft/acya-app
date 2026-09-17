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
  ArrowRight
} from 'lucide-react';

// NOTE: Master list of all 12 interconnected Elancé modules.
// Preserves all original 9 modules and elevates Production and Stock as first-class business capabilities.
const modules = [
  { 
    icon: <TreePine size={22} />, 
    title: 'Articles & Bois', 
    desc: 'Gestion des articles avec calcul automatique du M³, des unités et des conversions spécifiques au secteur bois.', 
    tag: 'Calcul M³ intégré' 
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
    title: 'Ventes', 
    desc: 'Devis, bons de commande, facturation et suivi des livraisons. Tableau de bord commercial intégré.', 
    tag: 'Devis → Facture' 
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
    title: 'Ventes & Chantiers',
    subtitle: 'Expédition & Pose',
    detail: 'Livraison au client ou affectation directe des produits finis sur chantier BTP.',
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
            className="text-[1.02rem] leading-relaxed text-slate-600 max-w-[680px] font-medium"
          >
            De l’approvisionnement des grumes à la transformation en atelier, du stock multi-dépôts aux chantiers et à la pré-analyse comptable, chaque module est connecté en temps réel sans rupture d’information.
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
