'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const features = [
  { icon: '👷', title: 'Suivi des ouvriers', desc: 'Affectation par chantier, pointage des présences, compétences et coût main d\'œuvre automatisé.' },
  { icon: '🔧', title: 'Suivi du matériel', desc: 'Inventaire des équipements, affectation et historique d\'utilisation par chantier.' },
  { icon: '💰', title: 'Contrôle des coûts', desc: 'Budget prévisionnel vs réel, alertes de dépassement et rentabilité par chantier en temps réel.' },
  { icon: '📅', title: 'Planning & avancement', desc: 'Gantt interactif, jalons, taux d\'avancement et reporting client automatique.' },
];

export function ChantierSection() {
  return (
    <section className="relative py-24 bg-forest-900 overflow-hidden px-6 md:px-10" id="chantiers">
      {/* Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-[80%] -translate-y-1/2 w-[60%] h-[60%] bg-[radial-gradient(ellipse,var(--color-timber-100)/0.12_0%,transparent_60%)]" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(ellipse,var(--color-forest-600)/0.25_0%,transparent_50%)]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left"
        >
          <div className="text-[0.75rem] font-bold tracking-[0.15em] text-timber-100 uppercase mb-4">
            Module Chantiers
          </div>
          <h2 className="font-heading text-[2.2rem] md:text-[2.8rem] text-white leading-[1.1] mb-6 tracking-tight">
            Pilotez chaque chantier avec précision
          </h2>
          <p className="text-[1rem] md:text-[1.1rem] leading-relaxed text-white/60 max-w-[480px] mx-auto lg:mx-0 mb-10">
            Du premier coup de pioche à la livraison finale, Élancé vous donne une visibilité totale sur vos chantiers : ressources humaines, matériaux, coûts et planning.
          </p>
          <Button variant="outline" className="h-14 px-8 rounded-xl border-white/20 text-white hover:bg-white/10 hover:border-white transition-all duration-300 text-[1rem] font-bold">
            Voir la démo chantier →
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group flex flex-col sm:flex-row gap-5 p-6 rounded-[24px] border border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all duration-500"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-forest-100/20 bg-forest-600/20 text-[1.4rem] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                {f.icon}
              </div>
              <div>
                <h4 className="text-[1.05rem] font-bold text-white/95 mb-2 tracking-tight">
                  {f.title}
                </h4>
                <p className="text-[0.88rem] leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
