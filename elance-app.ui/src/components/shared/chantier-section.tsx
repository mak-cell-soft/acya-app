'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { HardHat, Wrench, Coins, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: <HardHat size={20} className="text-corp-cyan" />, title: 'Suivi des ouvriers', desc: 'Affectation par chantier, pointage des présences, compétences et coût main d\'œuvre automatisé.' },
  { icon: <Wrench size={20} className="text-corp-blue-400" />, title: 'Suivi du matériel', desc: 'Inventaire des équipements, affectation et historique d\'utilisation par chantier.' },
  { icon: <Coins size={20} className="text-emerald-400" />, title: 'Contrôle des coûts', desc: 'Budget prévisionnel vs réel, alertes de dépassement et rentabilité par chantier en temps réel.' },
  { icon: <Calendar size={20} className="text-amber-400" />, title: 'Planning & avancement', desc: 'Gantt interactif, jalons, taux d\'avancement et reporting client automatique.' },
];

export function ChantierSection() {
  return (
    <section className="relative py-28 bg-[#080E1A] overflow-hidden px-6 md:px-10" id="chantiers">
      {/* Dynamic Glowing Neon Meshes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-[75%] -translate-y-1/2 w-[55%] h-[55%] bg-[radial-gradient(ellipse,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
        <div className="absolute bottom-[5%] left-[5%] w-[45%] h-[45%] bg-[radial-gradient(ellipse,rgba(37,99,235,0.08)_0%,transparent_50%)]" />
        {/* Subtle grid mesh overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-40" />
      </div>

      <div className="max-w-[1250px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left column info */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-5 text-center lg:text-left space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-corp-cyan uppercase shadow-sm">
            <CheckCircle2 size={13} className="text-corp-cyan animate-pulse" />
            Planification Temps Réel
          </div>
          <h2 className="font-heading text-[2.2rem] md:text-[3rem] text-white leading-[1.1] tracking-tight font-extrabold">
            Pilotez chaque chantier avec une précision millimétrée
          </h2>
          <p className="text-[1rem] md:text-[1.08rem] leading-relaxed text-slate-400 max-w-[480px] mx-auto lg:mx-0 font-medium">
            Du premier coup de pelle à la réception finale, Élancé centralise vos effectifs, équipements mobiles, livraisons de bois et marges chantiers.
          </p>
          <div className="pt-4">
            <Button asChild variant="outline" className="h-14 px-8 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-corp-cyan/50 hover:text-corp-cyan transition-all duration-300 text-[0.95rem] font-bold shadow-lg shadow-black/10 group cursor-pointer">
              <Link href="/register" className="flex items-center gap-2">
                Découvrir le module chantier
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Right column cards grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', stiffness: 90 }}
              className="group flex flex-col gap-5 p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-corp-cyan/30 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[1.2rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-corp-blue-500/10 group-hover:border-corp-cyan/30">
                {f.icon}
              </div>
              <div className="space-y-2">
                <h4 className="text-[1.1rem] font-bold text-white tracking-tight group-hover:text-corp-cyan transition-colors duration-300">
                  {f.title}
                </h4>
                <p className="text-[0.9rem] leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
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

