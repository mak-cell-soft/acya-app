'use client';

import { motion } from 'framer-motion';

const reasons = [
  { num: '01', title: 'Spécialisé secteur bois', desc: 'Contrairement aux ERP génériques, Élancé intègre nativement le calcul en M³, les essences, les qualités et les particularités du négoce bois.' },
  { num: '02', title: 'Vision 360° de l\'entreprise', desc: 'Du devis au chantier, en passant par la flotte et la comptabilité — tout est connecté dans une interface unifiée, sans ressaisie.' },
  { num: '03', title: 'Déploiement accompagné', desc: 'ACYA Consulting assure le paramétrage, la formation et le support. Vous n\'êtes jamais seul face à votre logiciel.' },
];

export function WhySection() {
  return (
    <section className="py-24 bg-sand-50 px-6 md:px-10" id="pourquoi">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center lg:text-left mb-16 md:mb-20">
          <div className="text-[0.75rem] font-bold tracking-[0.15em] text-timber-400 uppercase mb-4">
            Pourquoi Élancé
          </div>
          <h2 className="font-heading text-[2.2rem] md:text-[2.8rem] text-forest-900 leading-[1.1] tracking-tight">
            L'ERP pensé pour votre métier
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {reasons.map((r, i) => (
            <motion.div
              key={r.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-white rounded-[24px] border border-forest-100 p-8 md:p-10 shadow-[0_10px_30px_rgba(11,59,36,0.03)] hover:shadow-[0_20px_50px_rgba(11,59,36,0.08)] transition-all duration-500 hover:-translate-y-1 hover:border-forest-600/30"
            >
              <div className="font-heading text-[2.8rem] md:text-[3.2rem] font-bold text-timber-100 leading-none mb-6 group-hover:text-timber-400 transition-colors duration-500">
                {r.num}
              </div>
              <h3 className="text-[1.1rem] font-bold text-forest-800 mb-3 tracking-tight">
                {r.title}
              </h3>
              <p className="text-[0.92rem] leading-relaxed text-sand-400 opacity-80 group-hover:opacity-100 transition-opacity">
                {r.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
