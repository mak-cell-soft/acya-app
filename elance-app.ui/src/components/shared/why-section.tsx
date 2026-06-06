'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Star, Sparkles, ShieldCheck } from 'lucide-react';

const reasons = [
  { 
    num: '01', 
    title: 'Spécialisé secteur bois', 
    desc: 'Contrairement aux ERP génériques, Élancé intègre nativement le calcul en M³, les essences, les qualités et les particularités du négoce bois.',
    icon: <Sparkles className="text-corp-blue-600" size={24} />
  },
  { 
    num: '02', 
    title: 'Vision 360° de l\'entreprise', 
    desc: 'Du devis au chantier, en passant par la flotte et la comptabilité — tout est connecté dans une interface unifiée, sans ressaisie.',
    icon: <Star className="text-corp-cyan" size={24} />
  },
  { 
    num: '03', 
    title: 'Déploiement accompagné', 
    desc: 'ACYA Consulting assure le paramétrage, la formation et le support. Vous n\'êtes jamais seul face à votre logiciel.',
    icon: <ShieldCheck className="text-emerald-500" size={24} />
  },
];

export function WhySection() {
  return (
    <section className="py-28 bg-gradient-to-b from-white to-[#F4F7FC] px-6 md:px-10 relative overflow-hidden" id="pourquoi">
      {/* Dynamic blurred meshes */}
      <div className="absolute top-1/2 left-[-10%] w-[30vw] h-[30vw] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.03)_0%,transparent_60%)] pointer-events-none blur-[40px]" />
      
      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="text-center lg:text-left mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-corp-blue-500/10 border border-corp-blue-500/20 rounded-full px-4.5 py-1.5 text-xs font-bold tracking-wide text-corp-blue-700 uppercase mb-4 shadow-sm"
          >
            <HelpCircle size={14} className="text-corp-blue-600" />
            Pourquoi Élancé ?
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-[2.2rem] md:text-[2.8rem] text-slate-900 leading-[1.1] tracking-tight font-extrabold"
          >
            L'ERP pensé exclusivement pour votre métier
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {reasons.map((r, i) => (
            <motion.div
              key={r.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.15, type: 'spring', stiffness: 80 }}
              className="group bg-white rounded-xl border border-slate-200/80 p-8 md:p-10 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.06)] transition-all duration-500 hover:-translate-y-2 hover:border-corp-blue-200 relative overflow-hidden"
            >
              {/* Glassmorphic Background Hover Glow */}
              <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-corp-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-xl" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-slate-50 group-hover:bg-corp-blue-50 transition-colors duration-500">
                  {r.icon}
                </div>
                <div className="font-heading text-[2.8rem] font-black text-slate-100 leading-none group-hover:text-corp-blue-100/50 transition-colors duration-500">
                  {r.num}
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-slate-900 mb-3.5 tracking-tight group-hover:text-corp-blue-800 transition-colors duration-300">
                {r.title}
              </h3>
              <p className="text-[0.94rem] leading-relaxed text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                {r.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

