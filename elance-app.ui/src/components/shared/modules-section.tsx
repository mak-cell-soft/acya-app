'use client';

import { motion } from 'framer-motion';
import { 
  TreePine, 
  UserCheck, 
  Factory, 
  ShoppingCart, 
  TrendingUp, 
  Truck, 
  Users, 
  BarChart3, 
  HardHat, 
  Layers, 
  Sparkles 
} from 'lucide-react';

const modules = [
  { icon: <TreePine size={22} />, title: 'Articles & Bois', desc: 'Gestion des articles avec calcul automatique du M³, des unités et des conversions spécifiques au secteur bois.', tag: 'Calcul M³ intégré' },
  { icon: <UserCheck size={22} />, title: 'Clients', desc: 'Fiche client complète, historique des commandes, conditions tarifaires et suivi de la relation commerciale.', tag: 'CRM intégré' },
  { icon: <Factory size={22} />, title: 'Fournisseurs', desc: 'Référentiel fournisseur, catalogue de prix, délais de livraison et évaluation des performances.', tag: 'Catalogue & prix' },
  { icon: <ShoppingCart size={22} />, title: 'Achats', desc: "Commandes d'achat, bons de réception, rapprochement factures et gestion des stocks en temps réel.", tag: 'Stock temps réel' },
  { icon: <TrendingUp size={22} />, title: 'Ventes', desc: 'Devis, bons de commande, facturation et suivi des livraisons. Tableau de bord commercial intégré.', tag: 'Devis → Facture' },
  { icon: <Truck size={22} />, title: 'Flotte Automobile', desc: 'Suivi des véhicules, planification des missions, entretien et coûts kilométriques par trajet.', tag: 'GPS & entretien' },
  { icon: <Users size={22} />, title: 'Équipe & RH', desc: 'Gestion des collaborateurs, pointage, planning des congés et suivi administratif du personnel.', tag: 'RH Centralisée' },
  { icon: <BarChart3 size={22} />, title: 'Pré-analyse Comptable', desc: 'Tableau de bord financier, rapprochement des flux, indicateurs de rentabilité avant export comptable.', tag: 'Rapports & KPI' },
  { icon: <HardHat size={22} className="text-corp-blue-600 animate-pulse" />, title: 'Gestion Chantiers', desc: "Suivi complet des chantiers : matériaux, ouvriers, coûts, planning et état d'avancement en temps réel.", tag: 'Module phare', highlighted: true },
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
            className="font-heading text-[2rem] md:text-[2.8rem] text-slate-900 leading-[1.1] mb-6 tracking-tight font-extrabold"
          >
            Une couverture fonctionnelle totale à 360°
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[1.02rem] leading-relaxed text-slate-600 max-w-[620px] font-medium"
          >
            De la gestion fine des mètres cubes de bois à la pré-analyse comptable, chaque module est façonné pour s'aligner sur vos réalités opérationnelles.
          </motion.p>
        </div>

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
              className={`group relative overflow-hidden rounded-[24px] border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(37,99,235,0.06)] cursor-default ${
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
