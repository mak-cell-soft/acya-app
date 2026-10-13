'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/use-auth-store';
import { useTenantStore } from '@/store/use-tenant-store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff, ArrowRight, Lock, Shield } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { CentralLoginView } from '@/components/auth/central-login-view';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';

/**
 * Validate that a redirect path is strictly an internal application path.
 * Prevents open redirects (e.g. //evil.com, https://evil.com, /\evil.com, protocol schemes).
 */
function getValidInternalRedirect(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.startsWith('/\\') &&
      !decoded.includes('://') &&
      !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
    ) {
      if (decoded === '/login' || decoded.startsWith('/login?')) {
        return null;
      }
      return decoded;
    }
  } catch {
    // Decoding failed
  }
  return null;
}

const emptySubscribe = () => () => {};

function checkIsMainDomain(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const hasTenantQuery = params.has('tenant');
  return (
    (hostname === 'acya.site' ||
      hostname === 'www.acya.site' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1') &&
    !hasTenantQuery
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPanel, setShowForgotPanel] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isForgotEmailSent, setIsForgotEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const isMainDomain = useSyncExternalStore(
    emptySubscribe,
    checkIsMainDomain,
    () => true
  );

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoUrl = useTenantStore((state) => state.logoUrl);
  const tenantStatus = useTenantStore((state) => state.status);
  const isTenantInactive = tenantStatus === 'Suspended' || tenantStatus === 'Expired';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        router.push(`/forgot-password?token=${token}`);
        return;
      }

      // Pre-capture redirect or returnUrl parameter if present
      const rawRedirect = params.get('redirect') || params.get('returnUrl');
      const validRedirect = getValidInternalRedirect(rawRedirect);
      if (validRedirect) {
        try {
          sessionStorage.setItem('acya_auth_redirect', validRedirect);
        } catch {}
      }
    }
  }, [router]);

  // If already authenticated, redirect immediately to intended destination
  useEffect(() => {
    if (isAuthenticated) {
      let redirectPath: string | null = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        redirectPath = getValidInternalRedirect(params.get('redirect') || params.get('returnUrl'));
        if (!redirectPath) {
          try {
            redirectPath = getValidInternalRedirect(sessionStorage.getItem('acya_auth_redirect'));
          } catch {}
        }
        try {
          sessionStorage.removeItem('acya_auth_redirect');
        } catch {}
      }
      if (redirectPath) {
        router.replace(redirectPath);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authService.login({ login: email, password });
      if (response.isSuccess) {
        toast.success(`Authentification avec succès à ${response.enterpriseName || ''}`);
        
        let redirectPath: string | null = null;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const rawRedirect = params.get('redirect') || params.get('returnUrl');
          redirectPath = getValidInternalRedirect(rawRedirect);

          if (!redirectPath) {
            try {
              const cached = sessionStorage.getItem('acya_auth_redirect');
              redirectPath = getValidInternalRedirect(cached);
            } catch {}
          }

          // Clean up stored redirect
          try {
            sessionStorage.removeItem('acya_auth_redirect');
          } catch {}
        }

        if (redirectPath) {
          router.replace(redirectPath);
        } else {
          router.replace('/dashboard');
        }
      } else {
        toast.warning(response.message || "Identifiants invalides");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.warning("Veuillez saisir un email valide.");
      return;
    }
    setIsForgotLoading(true);
    try {
      await authService.forgotPassword(forgotEmail);
      setIsForgotEmailSent(true);
      toast.success("Si un compte est associé à cette adresse e-mail, vous recevrez les instructions de réinitialisation.");
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 429) {
        toast.error(err.response?.data?.message || "Trop de tentatives de réinitialisation. Veuillez réessayer dans quelques minutes.");
      } else {
        toast.error("Une erreur est survenue lors de la demande de réinitialisation.");
      }
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Render central workspace login & discovery view when on the primary platform domain (or during SSR)
  if (isMainDomain !== false) {
    return <CentralLoginView />;
  }

  // Tenant-specific credentials login view
  return (
    <div className="flex min-h-screen bg-[#FAFBFD] flex-col lg:flex-row selection:bg-corp-blue-500/15">
      {/* ─── LEFT PANEL: Brand Experience with og-image.png ──────────────── */}
      <AuthBrandPanel />

      {/* ─── RIGHT PANEL: Tenant Login Form ──────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative min-h-screen overflow-y-auto">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[440px] sm:max-w-[450px] mx-auto my-auto relative z-10 py-6 sm:py-8"
        >
          {/* Logo */}
          <div className="mb-7 flex justify-center">
            <Link href="/" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-blue-500 rounded-xl p-1">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt="Logo Entreprise" className="h-12 object-contain" />
              ) : (
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform duration-200">
                  <div className="p-1.5 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="ten_lg1" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#93C5FD" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                        <linearGradient id="ten_lg2" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                        <linearGradient id="ten_lg3" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="#2563EB" />
                          <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                      </defs>
                      <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#ten_lg1)" />
                      <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#ten_lg2)" />
                      <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#ten_lg3)" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-xl tracking-tight leading-none">Élancé</div>
                    <div className="text-corp-blue-600 text-[10px] font-semibold tracking-wider uppercase">ERP Platform</div>
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion à votre espace</h1>
            <p className="text-sm text-slate-500 mt-1.5 font-normal">Saisissez vos identifiants pour continuer.</p>
          </div>

          {/* Inactive Tenant Warning */}
          {isTenantInactive && (
            <div role="alert" className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold text-center">
              Votre espace d&apos;entreprise est actuellement indisponible ou suspendu.
            </div>
          )}

          {/* Card Form */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.03)] p-6 sm:p-8 space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@entreprise.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isTenantInactive}
                  className="h-11.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Mot de passe
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPanel(!showForgotPanel)}
                    className="text-xs font-semibold text-corp-blue-600 hover:text-corp-blue-700 hover:underline transition-colors cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isTenantInactive}
                    className="h-11.5 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/10 transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Accordion Panel */}
              <AnimatePresence initial={false}>
                {showForgotPanel && (
                  <motion.div
                    key="forgot"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden pt-1"
                  >
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      {isForgotEmailSent ? (
                        <div className="text-center py-2 space-y-2">
                          <p className="text-xs font-bold text-emerald-600">Demande enregistrée</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Si un compte est associé à cette adresse e-mail, vous recevrez les instructions de réinitialisation.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsForgotEmailSent(false)}
                            className="text-[11px] text-corp-blue-600 hover:underline font-semibold block mx-auto pt-1 cursor-pointer"
                          >
                            Saisir une autre adresse
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Saisissez votre e-mail pour recevoir un lien de réinitialisation.
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="nom@entreprise.com"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="h-9.5 text-xs bg-white border-slate-300 rounded-lg focus-visible:border-corp-blue-600"
                            />
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              disabled={isForgotLoading}
                              className="h-9.5 px-3.5 bg-corp-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-corp-blue-700 transition-[background-color,transform] active:scale-[0.96] shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                            >
                              {isForgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Envoyer'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isTenantInactive}
                className="w-full h-11.5 bg-corp-blue-600 hover:bg-corp-blue-700 active:bg-corp-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow transition-[background-color,transform,box-shadow] duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tertiary Link: switch workspace */}
          <div className="text-center mt-6">
            <Link
              href="/login"
              className="text-xs font-semibold text-corp-blue-600 hover:text-corp-blue-700 hover:underline transition-colors"
            >
              ← Se connecter à un autre espace
            </Link>
          </div>
        </motion.div>

        {/* Compact Security & Trust Footer */}
        <footer className="w-full max-w-[440px] sm:max-w-[450px] mx-auto pt-6 border-t border-slate-200/70 text-center space-y-2.5 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-400 font-medium select-none">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Connexion sécurisée TLS
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-400" />
              Données isolées par espace
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-normal">
            <Link href="/mentions-legales" className="hover:text-slate-900 transition-colors">
              Mentions Légales
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Confidentialité
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-900 transition-colors">
              Contact
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
