'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, Mail, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import api from '@/lib/axios';

const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'dev',
  'staging',
  'mail',
  'preprod',
  'test',
  'demo',
];

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function CentralLoginView() {
  // Workspace slug form state
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Workspace recovery form state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  /**
   * Normalize and validate workspace slug
   */
  const validateSlug = (raw: string): { isValid: boolean; slug: string; error?: string } => {
    const slug = raw.trim().toLowerCase();
    if (!slug) {
      return { isValid: false, slug: '', error: 'Veuillez renseigner le nom de votre espace.' };
    }
    if (slug.length < 2 || slug.length > 63) {
      return { isValid: false, slug, error: "Le nom d'espace doit contenir entre 2 et 63 caractères." };
    }
    if (!SLUG_REGEX.test(slug)) {
      return {
        isValid: false,
        slug,
        error: "Le nom d'espace ne peut contenir que des lettres minuscules, chiffres et tirets.",
      };
    }
    if (RESERVED_SUBDOMAINS.includes(slug)) {
      return { isValid: false, slug, error: "Ce nom d'espace est réservé ou non disponible." };
    }
    return { isValid: true, slug };
  };

  /**
   * Handle Continue to Workspace
   */
  const handleContinueWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError(null);

    const validation = validateSlug(workspaceSlug);
    if (!validation.isValid) {
      setSlugError(validation.error || 'Nom de workspace invalide.');
      return;
    }

    const cleanSlug = validation.slug;
    setIsCheckingSlug(true);

    try {
      // Safely verify existence and status via public config endpoint
      const response = await api.get('/Enterprise/config', {
        headers: {
          'X-Tenant-Slug': cleanSlug,
        },
      });

      const config = response.data;
      if (config?.status === 'Suspended' || config?.status === 'Expired' || config?.status === 'Disabled') {
        setSlugError("Cet espace est temporairement indisponible. Veuillez contacter votre administrateur.");
        setIsCheckingSlug(false);
        return;
      }

      // Safe canonical destination redirect
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        const isLocal = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.endsWith('.localhost');

        if (isLocal) {
          // In local development, maintain port and append tenant query parameter
          const port = window.location.port ? `:${window.location.port}` : '';
          window.location.href = `${window.location.protocol}//${currentHost}${port}/login?tenant=${cleanSlug}`;
        } else {
          // Production: Strictly redirect over HTTPS to canonical tenant hostname
          window.location.href = `https://${cleanSlug}.acya.site/login`;
        }
      }
    } catch (err: any) {
      setIsCheckingSlug(false);
      const httpStatus = err?.response?.status;
      if (httpStatus === 404) {
        setSlugError("Aucun espace ne correspond à ce nom. Vérifiez l'orthographe ou utilisez la récupération par e-mail ci-dessous.");
      } else if (httpStatus === 403) {
        setSlugError("Cet espace est temporairement désactivé ou suspendu.");
      } else {
        setSlugError("Impossible de vérifier l'espace pour le moment. Veuillez réessayer.");
      }
    }
  };

  /**
   * Handle Workspace Recovery via Email
   */
  const handleRecoverWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccessMessage(null);

    const email = recoveryEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setRecoveryError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    setIsRecoveryLoading(true);

    try {
      const response = await api.post('/public/workspace-recovery', { email });
      const message = response?.data?.message || 'Si un compte correspond à cette adresse, vous recevrez les instructions nécessaires pour retrouver votre espace ACYA.';
      setRecoverySuccessMessage(message);
      setRecoveryEmail('');
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setRecoveryError(err.response?.data?.message || 'Trop de tentatives de récupération. Veuillez réessayer dans quelques minutes.');
      } else {
        setRecoveryError('Une erreur est survenue lors de la demande. Veuillez réessayer.');
      }
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col justify-between py-10 px-4 sm:px-6 relative selection:bg-corp-blue-500/15">
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-corp-blue-400/10 via-cyan-400/5 to-transparent blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main Centered Container */}
      <div className="w-full max-w-[440px] mx-auto my-auto relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02]">
            <div className="p-1 rounded-xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <svg className="w-8 h-8 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cent_grad_1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#93C5FD" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <linearGradient id="cent_grad_2" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <linearGradient id="cent_grad_3" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
                <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#cent_grad_1)" />
                <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#cent_grad_2)" />
                <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#cent_grad_3)" />
              </svg>
            </div>
            <span className="text-2xl font-black font-heading tracking-tight text-slate-900">
              Élancé <span className="text-corp-blue-600 font-semibold">ERP</span>
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-6">
            Connexion à votre espace
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Accédez à votre espace professionnel ACYA.
          </p>
        </div>

        {/* Central Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8">
          {/* ─── ACTION 1: Access via Slug ─────────────────────────── */}
          <form onSubmit={handleContinueWorkspace} className="space-y-4">
            <div>
              <label htmlFor="workspace-slug" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Nom de votre espace
              </label>

              {/* Input group with fixed suffix */}
              <div className="relative flex rounded-xl border border-slate-300 focus-within:border-corp-blue-600 focus-within:ring-2 focus-within:ring-corp-blue-500/20 transition-all bg-white overflow-hidden shadow-xs">
                <div className="flex items-center pl-3.5 pr-2 pointer-events-none text-slate-400">
                  <Building2 size={17} />
                </div>
                <input
                  id="workspace-slug"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="monentreprise"
                  value={workspaceSlug}
                  onChange={(e) => {
                    setWorkspaceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    if (slugError) setSlugError(null);
                  }}
                  disabled={isCheckingSlug}
                  className="flex-1 min-w-0 py-2.5 px-1 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none bg-transparent"
                />
                <span className="inline-flex items-center px-3.5 bg-slate-50 text-slate-500 text-xs sm:text-sm font-mono font-semibold border-l border-slate-200 select-none">
                  .acya.site
                </span>
              </div>

              {slugError && (
                <div className="flex items-start gap-1.5 mt-2 text-xs font-medium text-rose-600">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{slugError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCheckingSlug || !workspaceSlug.trim()}
              className="w-full h-11 bg-gradient-to-r from-corp-blue-600 to-corp-blue-700 hover:from-corp-blue-500 hover:to-corp-blue-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isCheckingSlug ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <span>Continuer</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* ─── DIVIDER ───────────────────────────────────────────── */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-wider">
                OU
              </span>
            </div>
          </div>

          {/* ─── ACTION 2: Email-based Recovery ────────────────────── */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Vous avez oublié le nom de votre espace ?
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Retrouvez votre espace professionnel à partir de votre adresse e-mail.
              </p>
            </div>

            {recoverySuccessMessage ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2 text-emerald-800">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                  <p className="text-xs font-medium leading-relaxed">
                    {recoverySuccessMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoverySuccessMessage(null)}
                  className="text-[11px] font-semibold text-corp-blue-600 hover:underline pt-1 block"
                >
                  Envoyer à une autre adresse e-mail
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverWorkspace} className="space-y-3">
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-corp-blue-600 focus-within:ring-2 focus-within:ring-corp-blue-500/20 transition-all bg-white overflow-hidden shadow-xs">
                  <div className="flex items-center pl-3.5 pr-2 pointer-events-none text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="Adresse e-mail professionnelle"
                    value={recoveryEmail}
                    onChange={(e) => {
                      setRecoveryEmail(e.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    disabled={isRecoveryLoading}
                    className="flex-1 min-w-0 py-2.5 px-1 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>

                {recoveryError && (
                  <div className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRecoveryLoading || !recoveryEmail.trim()}
                  className="w-full h-10 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200/80 transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isRecoveryLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>Retrouver mon espace</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── ACTION 3: Registration Link ───────────────────────── */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-600 font-medium">
            Vous n'avez pas encore de compte ?{' '}
            <Link
              href="/enterprise-registration"
              className="font-bold text-corp-blue-600 hover:text-corp-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
            >
              Créer votre espace professionnel &rarr;
            </Link>
          </p>
        </div>

        {/* Security & Legal Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200/70 text-center space-y-3">
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium">
            <span>🔒 Connexion sécurisée TLS</span>
            <span>•</span>
            <span>🛡️ Données isolées par espace</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
            <Link href="/mentions-legales" className="hover:text-slate-800 transition-colors">
              Mentions Légales
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-800 transition-colors">
              Confidentialité
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-800 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
