'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: "Thomas Legrand",
    role: "Directeur Général, Bois & Menuiseries Pro",
    content: "Élancé a totalement transformé notre gestion de stock. Le suivi des M³ de bois en temps réel nous a permis de réduire nos pertes de 15% dès la première année. L'interface est d'une fluidité incroyable.",
    rating: 5,
    initials: "TL",
    color: "bg-corp-blue-100 text-corp-blue-700"
  },
  {
    name: "Sophie Martin",
    role: "Responsable Achats, BâtiMatériaux",
    content: "La gestion des chantiers couplée à la comptabilité nous fait gagner un temps précieux chaque fin de mois. Le support d'ACYA Consulting est toujours réactif et à l'écoute de nos besoins spécifiques.",
    rating: 5,
    initials: "SM",
    color: "bg-corp-cyan/20 text-corp-cyan"
  },
  {
    name: "Karim Ben Ali",
    role: "Gérant, Transports & Négoce",
    content: "Gérer notre flotte automobile et nos livraisons de matériaux depuis une seule et même plateforme a simplifié la vie de nos équipes. Élancé est devenu l'outil central de notre croissance.",
    rating: 5,
    initials: "KB",
    color: "bg-emerald-100 text-emerald-700"
  }
];

export function TestimonialSection() {
  return (
    <section id="testimonials" className="py-24 bg-slate-50 relative overflow-hidden font-sans">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.2]" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-700 uppercase tracking-widest mb-6"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Ils nous font confiance
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6"
          >
            Pensé pour les pros. <br className="hidden md:block" /> Approuvé par le terrain.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * (idx + 1) }}
              className="group relative bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 hover:shadow-[0_20px_50px_rgba(37,99,235,0.06)] hover:-translate-y-1 transition-all duration-500"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-slate-100 group-hover:text-corp-blue-50 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-600 font-medium leading-relaxed mb-8 relative z-10">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4 mt-auto border-t border-slate-50 pt-6">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg", testimonial.color)}>
                  {testimonial.initials}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{testimonial.name}</h4>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
