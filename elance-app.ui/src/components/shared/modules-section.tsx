'use client';

import { motion } from 'framer-motion';

const modules = [
  { icon: '🪵', title: 'Articles & Bois', desc: 'Gestion des articles avec calcul automatique du M³, des unités et des conversions spécifiques au secteur bois.', tag: 'Calcul M³ intégré' },
  { icon: '👥', title: 'Clients', desc: 'Fiche client complète, historique des commandes, conditions tarifaires et suivi de la relation commerciale.', tag: 'CRM intégré' },
  { icon: '🏭', title: 'Fournisseurs', desc: 'Référentiel fournisseur, catalogue de prix, délais de livraison et évaluation des performances.', tag: 'Catalogue & prix' },
  { icon: '🛒', title: 'Achats', desc: "Commandes d'achat, bons de réception, rapprochement factures et gestion des stocks en temps réel.", tag: 'Stock temps réel' },
  { icon: '💼', title: 'Ventes', desc: 'Devis, bons de commande, facturation et suivi des livraisons. Tableau de bord commercial intégré.', tag: 'Devis → Facture' },
  { icon: '🚛', title: 'Flotte Automobile', desc: 'Suivi des véhicules, planification des missions, entretien et coûts kilométriques par trajet.', tag: 'GPS & entretien' },
  { icon: '👥', title: 'Équipe & RH', desc: 'Gestion des collaborateurs, pointage, planning des congés et suivi administratif du personnel.', tag: 'RH Centralisée' },
  { icon: '📊', title: 'Pré-analyse Comptable', desc: 'Tableau de bord financier, rapprochement des flux, indicateurs de rentabilité avant export comptable.', tag: 'Rapports & KPI' },
  { icon: '🏗️', title: 'Gestion Chantiers', desc: "Suivi complet des chantiers : matériaux, ouvriers, coûts, planning et état d'avancement en temps réel.", tag: 'Module phare', highlighted: true },
];

export function ModulesSection() {
  return (
    <section className="py-24 bg-[#FAFAF7] px-6 md:px-10" id="modules">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-left mb-16 md:mb-20">
          <div className="text-[0.75rem] font-bold tracking-[0.15em] text-timber-400 uppercase mb-4">
            Modules ERP
          </div>
          <h2 className="font-heading text-[2rem] md:text-[2.8rem] text-forest-900 leading-[1.1] mb-6 tracking-tight">
            Tout ce dont votre entreprise a besoin
          </h2>
          <p className="text-[1rem] md:text-[1.1rem] leading-relaxed text-sand-400 max-w-[600px]">
            De la gestion des articles bois à la pré-analyse comptable, chaque module est conçu pour les réalités du terrain.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-[24px] border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(11,59,36,0.1)] ${
                m.highlighted 
                  ? 'border-timber-400 bg-white shadow-lg shadow-timber-400/5' 
                  : 'border-forest-100 bg-white hover:border-forest-600'
              }`}
            >
              {/* Animated top bar */}
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-forest-600 to-timber-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border text-[1.4rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                m.highlighted 
                  ? 'bg-timber-100/20 border-timber-400/30 text-timber-600' 
                  : 'bg-forest-50 border-forest-100 text-forest-600'
              }`}>
                {m.icon}
              </div>
              
              <h3 className="mb-3 text-[1.05rem] font-bold text-forest-800 tracking-tight">
                {m.title}
              </h3>
              <p className="text-[0.88rem] leading-relaxed text-sand-400 opacity-80 group-hover:opacity-100 transition-opacity">
                {m.desc}
              </p>
              
              <div className={`mt-6 inline-block rounded-lg px-3 py-1 text-[0.7rem] font-bold tracking-wider uppercase ${
                m.highlighted 
                  ? 'bg-timber-400/10 text-timber-600' 
                  : 'bg-forest-50 text-forest-600'
              }`}>
                {m.tag}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
