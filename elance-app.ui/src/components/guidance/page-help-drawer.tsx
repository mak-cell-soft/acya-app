'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  X,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  LifeBuoy,
  ChevronDown,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePageGuidance } from '@/hooks/use-page-guidance';
import { SupportDialog } from '@/components/shared/support-dialog';
import { cn } from '@/lib/utils';

export function PageHelpDrawer() {
  const router = useRouter();
  const {
    guidance,
    hasGuidance,
    isHelpDrawerOpen,
    setHelpDrawerOpen,
  } = usePageGuidance();

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpDrawerOpen && !isSupportOpen) {
        setHelpDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpDrawerOpen, isSupportOpen, setHelpDrawerOpen]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const page = guidance?.pageGuidance;

  return (
    <>
      <AnimatePresence>
        {isHelpDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setHelpDrawerOpen(false)}
              className="fixed inset-0 bg-corp-blue-950/40 backdrop-blur-xs cursor-pointer"
              aria-hidden="true"
            />

            {/* Sliding Drawer Container */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-screen max-w-md md:max-w-lg pointer-events-auto bg-background border-l border-border shadow-2xl flex flex-col h-full"
                role="dialog"
                aria-modal="true"
                aria-label="Tiroir d'aide contextuelle"
              >
                {/* Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-border bg-sand-50/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-corp-blue-50 border border-corp-blue-100 flex items-center justify-center shrink-0 text-corp-blue-600 shadow-2xs">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-corp-blue-950 truncate">
                          Centre d'Aide & Guide
                        </h2>
                        {guidance?.title && (
                          <Badge variant="outline" className="bg-white border-corp-blue-200 text-corp-blue-700 text-[10px] font-bold shrink-0">
                            {guidance.title}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-sand-500 font-medium truncate">
                        Assistance contextuelle pour cette page
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHelpDrawerOpen(false)}
                    className="h-8 w-8 rounded-full text-sand-400 hover:text-corp-blue-900 hover:bg-sand-100/80 shrink-0"
                    aria-label="Fermer le panneau d'aide"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
                  {hasGuidance && page ? (
                    <>
                      {/* Page Purpose Section */}
                      <div className="space-y-2 p-4 rounded-2xl bg-corp-blue-50/50 border border-corp-blue-100">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-corp-blue-600 shrink-0" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-corp-blue-900">
                            {page.title}
                          </h3>
                        </div>
                        <p className="text-xs text-sand-600 leading-relaxed font-normal">
                          {page.description}
                        </p>
                      </div>

                      {/* Workflow Steps Section */}
                      {page.workflowSteps && page.workflowSteps.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-corp-blue-950 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-corp-blue-600" />
                            Étapes du flux de travail
                          </h4>
                          <div className="space-y-2.5">
                            {page.workflowSteps.map((step) => (
                              <div
                                key={step.stepNumber}
                                className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1.5 transition-colors hover:border-corp-blue-200"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-corp-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {step.stepNumber}
                                  </span>
                                  <span className="text-xs font-bold text-corp-blue-900">
                                    {step.title}
                                  </span>
                                </div>
                                <p className="text-xs text-sand-600 pl-7 leading-relaxed font-normal">
                                  {step.description}
                                </p>
                                {step.tip && (
                                  <p className="text-[11px] text-corp-blue-700 bg-corp-blue-50/70 border border-corp-blue-100 rounded-lg p-2 ml-7 font-medium">
                                    Astuce : {step.tip}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Useful Tips Section */}
                      {page.tips && page.tips.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-corp-blue-950 flex items-center gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            Conseils utiles
                          </h4>
                          <div className="space-y-2">
                            {page.tips.map((tip, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-900 leading-relaxed font-normal"
                              >
                                <span className="font-bold text-amber-600 shrink-0">•</span>
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FAQs Section */}
                      {page.faq && page.faq.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-corp-blue-950 flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-corp-blue-600" />
                            Questions fréquentes (FAQ)
                          </h4>
                          <div className="space-y-2">
                            {page.faq.map((item, idx) => {
                              const isOpen = openFaqIndex === idx;
                              return (
                                <div
                                  key={idx}
                                  className="border border-border rounded-xl overflow-hidden bg-card transition-all"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleFaq(idx)}
                                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-corp-blue-900 hover:bg-sand-50/60 transition-colors"
                                  >
                                    <span className="pr-2">{item.question}</span>
                                    <ChevronDown
                                      className={cn(
                                        "w-4 h-4 text-sand-400 shrink-0 transition-transform duration-200",
                                        isOpen && "rotate-180 text-corp-blue-600"
                                      )}
                                    />
                                  </button>
                                  {isOpen && (
                                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-sand-600 leading-relaxed font-normal border-t border-sand-100 bg-sand-50/30">
                                      {item.answer}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Relevant Configuration Links */}
                      {guidance?.welcome?.quickLinks && guidance.welcome.quickLinks.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-corp-blue-50">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-sand-400">
                            Raccourcis de configuration
                          </h4>
                          <div className="flex flex-col gap-2">
                            {guidance.welcome.quickLinks.map((link, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setHelpDrawerOpen(false);
                                  router.push(link.href);
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-corp-blue-100 bg-white hover:bg-corp-blue-50/50 text-xs font-bold text-corp-blue-800 transition-colors cursor-pointer text-left"
                              >
                                <span>{link.label}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-corp-blue-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Fallback when route has no specific registry entry */
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sand-50 border border-sand-100 flex items-center justify-center mx-auto text-sand-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-corp-blue-900">
                          Pas de guide spécifique pour cette section
                        </h4>
                        <p className="text-xs text-sand-400 max-w-xs mx-auto">
                          Le guide pas-à-pas interactif est actuellement actif sur le module Articles & Produits.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Support Action Footer */}
                <div className="p-4 sm:p-5 bg-sand-50/80 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-corp-blue-950 block">
                        Besoin d'aide technique ?
                      </span>
                      <p className="text-[11px] text-sand-500">
                        Notre équipe de support ACYA est à votre disposition.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSupportOpen(true)}
                    className="w-full h-10 rounded-xl border-corp-blue-200 bg-white text-corp-blue-700 hover:bg-corp-blue-50 font-bold text-xs gap-2 shadow-2xs"
                  >
                    <LifeBuoy className="w-4 h-4 text-corp-blue-600" />
                    Ouvrir un ticket de support
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Existing Support Ticket Dialog Reused Directly */}
      {isSupportOpen && (
        <SupportDialog
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />
      )}
    </>
  );
}
