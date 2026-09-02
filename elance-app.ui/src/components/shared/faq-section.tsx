'use client';

import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: "Comment fonctionne l'intégration avec Qwerty et mon expert-comptable ?",
    answer: "ACYA expose un webservice sécurisé chiffré TLS avec jeton d'authentification certifié. Votre expert-comptable peut récupérer directement et en un clic les récapitulatifs périodiques de vos ventes et de vos achats depuis son propre environnement Qwerty (QwertyTunisieProduction), éliminant ainsi toute ressaisie manuelle ou envoi de fichiers Excel."
  },
  {
    question: "Que comprend exactement l'offre à 450 DT / an ?",
    answer: "L'offre annuelle de 450 DT (soit seulement 1,23 DT par jour) inclut l'accès illimité à l'intégralité des modules ACYA : gestion commerciale, facturation, ventes, achats, gestion des stocks multi-dépôts (avec calculs M³), module chantiers BTP, flotte logistique, sauvegardes automatiques et l'accès à la passerelle comptable Qwerty."
  },
  {
    question: "Comment Élancé s'intègre-t-il avec mon système de facturation existant ?",
    answer: "Élancé propose une transition en douceur. Notre module comptable est compatible avec les formats standards (Factur-X) et permet des exports compatibles avec la majorité des logiciels comptables du marché (Sage, Cegid, EBP, Qwerty)."
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer: "Absolument. Vos données sont hébergées sur des serveurs sécurisés haute disponibilité. Nous utilisons un chiffrement de bout en bout et effectuons des sauvegardes automatiques pour garantir la pérennité et la confidentialité de vos informations."
  },
  {
    question: "Peut-on personnaliser les modules selon notre secteur d'activité ?",
    answer: "Oui, ACYA est conçu de manière modulaire. Que vous soyez dans le négoce de bois, la construction, ou la gestion de flotte, nous activons et configurons uniquement les modules dont vous avez besoin."
  },
  {
    question: "Combien de temps faut-il pour déployer Élancé dans mon entreprise ?",
    answer: "Grâce à notre architecture Cloud SaaS, la mise en route technique est instantanée. L'accompagnement, la reprise de données et la formation de vos collaborateurs prennent généralement entre quelques jours et 2 semaines."
  },
  {
    question: "Proposez-vous un accompagnement pour la prise en main ?",
    answer: "Oui, le succès de votre transition est notre priorité. L'équipe d'ACYA Consulting vous accompagne de bout en bout : paramétrage personnalisé, formation des utilisateurs, et support client réactif basé en Tunisie."
  }
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 bg-white relative overflow-hidden font-sans border-t border-slate-100">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-corp-blue-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-corp-cyan/5 blur-[100px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-corp-blue-50 border border-corp-blue-100 text-sm font-bold text-corp-blue-700 uppercase tracking-widest mb-6"
          >
            <HelpCircle className="w-4 h-4" />
            Questions Fréquentes
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6"
          >
            Tout ce que vous devez savoir.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Découvrez comment Élancé simplifie la gestion de votre activité au quotidien.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
        >
          <Accordion className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-slate-100 py-2">
                <AccordionTrigger className="text-left text-base md:text-lg font-bold text-slate-800 hover:text-corp-blue-600 hover:no-underline transition-colors data-[state=open]:text-corp-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-base font-medium leading-relaxed pb-6 pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
        
        {/* Support Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-500 font-medium text-sm">
            Vous avez d'autres questions ? <a href="/contact" className="text-corp-blue-600 font-bold hover:underline hover:text-corp-blue-700 transition-colors">Contactez notre équipe de support</a>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
