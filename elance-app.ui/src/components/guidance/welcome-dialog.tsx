'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePageGuidance } from '@/hooks/use-page-guidance';
import { Sparkles, ArrowRight, CheckCircle2, Package, Layers, ShoppingCart, TrendingUp } from 'lucide-react';

export function WelcomeDialog() {
  const router = useRouter();
  const {
    guidance,
    moduleKey,
    hasHydrated,
    isWelcomeDismissed,
    dismissWelcome,
  } = usePageGuidance();

  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const hasClosedThisVisit = React.useRef(false);

  // Auto-display on first visit when hydrated and not dismissed
  useEffect(() => {
    // Active on pilot modules: articles, purchases, and sales
    if (
      hasHydrated &&
      guidance?.welcome &&
      !isWelcomeDismissed &&
      !hasClosedThisVisit.current &&
      (moduleKey === 'articles' || moduleKey === 'purchases' || moduleKey === 'sales')
    ) {
      setIsOpen(true);
    }
  }, [hasHydrated, guidance, isWelcomeDismissed, moduleKey]);

  if (!guidance?.welcome || (moduleKey !== 'articles' && moduleKey !== 'purchases' && moduleKey !== 'sales')) {
    return null;
  }

  const welcome = guidance.welcome;

  const handleClose = () => {
    hasClosedThisVisit.current = true;
    if (dontShowAgain) {
      dismissWelcome();
    }
    setIsOpen(false);
  };

  const handleStart = () => {
    hasClosedThisVisit.current = true;
    dismissWelcome();
    setIsOpen(false);
  };

  const handleQuickLink = (href: string) => {
    hasClosedThisVisit.current = true;
    if (dontShowAgain) {
      dismissWelcome();
    }
    setIsOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent 
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl p-0 overflow-hidden border-corp-blue-100 shadow-2xl rounded-2xl bg-background"
        showCloseButton={true}
      >
        {/* Visual Header Banner */}
        <div className="relative bg-gradient-to-r from-corp-blue-900 via-corp-blue-800 to-corp-blue-900 p-6 sm:p-8 text-white overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            {moduleKey === 'sales' ? (
              <TrendingUp className="w-48 h-48" />
            ) : moduleKey === 'purchases' ? (
              <ShoppingCart className="w-48 h-48" />
            ) : (
              <Package className="w-48 h-48" />
            )}
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 text-sand-200" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider text-sand-200 mb-2">
                <Layers className="w-3 h-3" />
                Guide de Démarrage
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {welcome.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-sand-200 mt-1 font-medium leading-relaxed">
                {welcome.subtitle}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-sm text-sand-600 leading-relaxed font-normal">
            {welcome.summary}
          </p>

          {/* Highlights List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-corp-blue-900">
              {moduleKey === 'sales'
                ? 'Points clés des ventes'
                : moduleKey === 'purchases'
                ? 'Points clés des achats'
                : 'Points clés du catalogue'}
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {welcome.highlights.map((highlight, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-sand-50/60 border border-sand-100/80 transition-colors hover:bg-sand-50"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-corp-blue-100 text-corp-blue-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-corp-blue-950 block">
                      {highlight.title}
                    </span>
                    <p className="text-xs text-sand-500 leading-normal">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Setup Actions */}
          {welcome.quickLinks && welcome.quickLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-corp-blue-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sand-400 block">
                Configurations recommandées
              </span>
              <div className="flex flex-wrap gap-2">
                {welcome.quickLinks.map((link, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLink(link.href)}
                    className="text-xs font-bold rounded-xl border-corp-blue-100 text-corp-blue-700 hover:bg-corp-blue-50"
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with "Ne plus afficher" and "Commencer" */}
        <div className="p-4 sm:p-6 bg-sand-50/50 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-sand-600 font-medium">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
              className="rounded-md border-corp-blue-200 data-[state=checked]:bg-corp-blue-600"
            />
            <span>Ne plus afficher cette présentation</span>
          </label>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-xs font-bold text-sand-500 hover:bg-sand-100/70 rounded-xl px-4"
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={handleStart}
              className="text-xs font-bold bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-xl px-6 shadow-md shadow-corp-blue-600/20 gap-1.5"
            >
              <span>Commencer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
