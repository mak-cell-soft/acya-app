'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  Check, 
  Copy, 
  ShieldCheck, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Send, 
  Info, 
  Lock,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentMobileRelease } from '@/hooks/use-mobile-release';
import { useAuthStore } from '@/store/use-auth-store';
import { useTenantStore } from '@/store/use-tenant-store';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { PermissionActionKey } from '@/types/permissions';
import { mobileReleaseService } from '@/services/components/mobile-release.service';
import { MobileTenantUser } from '@/types/mobile';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

/**
 * Format raw byte size into human readable megabytes.
 */
function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '~56 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function MobileAppPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { name: tenantNameFromStore, logoUrl, primaryColor } = useTenantStore();
  const { hasPermission } = usePermissionGuard();

  const [mounted, setMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Admin "Send Mobile App" modal state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<MobileTenantUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unauthenticated users through tenant login with returnUrl
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login?redirect=/mobile-app');
    }
  }, [mounted, isAuthenticated, router]);

  const { 
    data: release, 
    isLoading, 
    isError, 
    refetch, 
    isFetching 
  } = useCurrentMobileRelease();

  // Permission checks
  const isAdmin = 
    user?.role === 'Admin' || 
    user?.role === 'SuperAdmin' || 
    user?.role === '20' || 
    user?.role === '10';

  const canView = 
    isAdmin || 
    hasPermission('mobileApp', 'canView' as unknown as PermissionActionKey) ||
    hasPermission('mobileApp', 'canRead');

  const canDownload = 
    isAdmin || 
    hasPermission('mobileApp', 'canDownload' as unknown as PermissionActionKey);

  const canManage = 
    isAdmin || 
    hasPermission('mobileApp', 'canManage' as unknown as PermissionActionKey);

  const tenantDisplayName = 
    user?.enterpriseName || 
    (tenantNameFromStore && tenantNameFromStore !== 'Élancé' ? tenantNameFromStore : null) || 
    release?.tenantId?.toUpperCase() || 
    'ACYA';

  const handleCopyPortalLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setHasCopiedLink(true);
      toast.success('Lien du portail copié', {
        description: 'Vous pouvez coller ce lien sur votre smartphone Android.',
      });
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleDownload = async () => {
    if (!release || isDownloading) return;

    if (!canDownload) {
      toast.error('Accès refusé', {
        description: "Vous n'avez pas l'autorisation de télécharger l'application mobile.",
      });
      return;
    }

    setIsDownloading(true);

    try {
      const downloadInfo = await mobileReleaseService.requestDownload(release.id);
      
      let downloadHref = downloadInfo.downloadUrl;
      try {
        const parsed = new URL(downloadInfo.downloadUrl, window.location.origin);
        downloadHref = `${parsed.pathname}${parsed.search}`;
      } catch {
        // Fallback to returned URL
      }

      const link = document.createElement('a');
      link.href = downloadHref;
      if (downloadInfo.fileName) {
        link.setAttribute('download', downloadInfo.fileName);
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Téléchargement en cours...', {
        description: `Téléchargement de ${downloadInfo.fileName || 'l\'application mobile'}.`,
      });
    } catch (err: unknown) {
      console.error('Download error:', err);
      if (err instanceof AxiosError && err.response?.status === 403) {
        toast.error('Accès refusé', {
          description: "Vous n'avez pas la permission de télécharger cette version mobile.",
        });
      } else {
        toast.error('Échec du téléchargement', {
          description: 'Impossible de télécharger l\'application mobile. Veuillez réessayer.',
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenSendModal = async () => {
    setIsSendModalOpen(true);
    setIsLoadingUsers(true);
    setTenantUsers([]);
    setSelectedUserId(null);

    try {
      const users = await mobileReleaseService.getTenantUsers();
      setTenantUsers(users);
      if (users.length > 0) {
        setSelectedUserId(users[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load users:', err);
      toast.error('Impossible de charger les utilisateurs de votre entreprise.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedUserId) return;
    setIsSendingInvitation(true);

    try {
      const result = await mobileReleaseService.sendMobileApp(selectedUserId);
      if (result.success) {
        toast.success('Invitation envoyée !', {
          description: `L'application mobile a été transmise par email à ${result.recipientName || 'l\'utilisateur'}.`,
        });
        setIsSendModalOpen(false);
      } else {
        toast.error(result.message || 'Impossible d\'envoyer l\'email.');
      }
    } catch (err: unknown) {
      console.error('Send error:', err);
      toast.error('Une erreur est survenue lors de l\'envoi de l\'invitation.');
    } finally {
      setIsSendingInvitation(false);
    }
  };

  // Auth loading screen
  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-corp-blue-600/20 border border-corp-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-corp-blue-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400">Vérification de la session sécurisée...</p>
      </div>
    );
  }

  // Permission Guard
  if (!canView) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Accès restreint</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Vous n'avez pas l'autorisation d'accéder au portail de téléchargement mobile de votre organisation.
          </p>
          <Link href="/dashboard">
            <Button className="w-full bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold rounded-xl h-11">
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-corp-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-corp-blue-600/15 via-corp-blue-900/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Bar: Minimal Header ── */}
      <header className="relative z-10 w-full border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Tenant Identity */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={tenantDisplayName} 
                className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1 border border-white/10" 
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-corp-blue-600 to-corp-blue-700 flex items-center justify-center font-black text-white text-xs shadow-sm">
                {tenantDisplayName.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider uppercase text-white truncate max-w-[160px] sm:max-w-[240px]">
                {tenantDisplayName}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Portail Mobile Officiel
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {canManage && release && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSendModal}
                className="h-9 px-3 rounded-xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1.5 active:scale-[0.96] transition-transform"
              >
                <Send className="w-3.5 h-3.5 text-corp-blue-400" />
                <span className="hidden sm:inline">Envoyer à un collègue</span>
                <span className="sm:hidden">Envoyer</span>
              </Button>
            )}

            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold gap-1.5 active:scale-[0.96] transition-transform"
              >
                <span>ERP Élancé</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container: Centered Mobile-First Experience ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg space-y-5">
          
          {/* ── State 1: Loading ── */}
          {isLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-14 h-14 rounded-2xl bg-corp-blue-600/10 border border-corp-blue-500/20 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-corp-blue-400 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Recherche de votre application...
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Vérification de la dernière version disponible pour {tenantDisplayName}.
              </p>
            </div>
          ) : isError ? (
            /* ── State 2: Error ── */
            <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-xl shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Connexion impossible
                </h3>
                <p className="text-xs text-slate-400">
                  Impossible de récupérer les informations de version. Veuillez vérifier votre connexion.
                </p>
              </div>
              <Button
                onClick={() => refetch()}
                className="rounded-xl font-bold text-xs px-5 bg-corp-blue-600 hover:bg-corp-blue-700 text-white active:scale-[0.96] transition-transform"
              >
                Réessayer
              </Button>
            </div>
          ) : !release ? (
            /* ── State 3: No Release Available ── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-10 text-center backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                  Bientôt disponible
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white pt-1">
                  Votre application mobile n'est pas encore disponible
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Aucune version mobile n'a été publiée pour <strong className="text-slate-200">{tenantDisplayName}</strong> pour le moment. Dès qu'elle sera prête, vous recevrez une invitation.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="rounded-xl text-xs font-semibold border-slate-700 hover:bg-slate-800 text-slate-300 gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-corp-blue-400' : ''}`} />
                  <span>Vérifier à nouveau</span>
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ── State 4: Active Release — Dedicated Installation Card ── */
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Primary Installation Card */}
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 space-y-6 text-center relative overflow-hidden">
                
                {/* Subdued top ambient halo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-corp-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Tenant Branding & App Mark */}
                <div className="flex flex-col items-center space-y-3 relative z-10">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-corp-blue-600 via-corp-blue-700 to-corp-navy p-0.5 shadow-xl shadow-corp-blue-600/20 flex items-center justify-center">
                    <div className="w-full h-full rounded-[22px] bg-slate-950/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt={tenantDisplayName} 
                          className="w-12 h-12 object-contain filter drop-shadow-md" 
                        />
                      ) : (
                        <Smartphone className="w-10 h-10 text-white" />
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black tracking-widest uppercase text-corp-blue-400">
                      {tenantDisplayName}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                      Élancé Mobile App
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                      Votre application mobile officielle
                    </p>
                  </div>
                </div>

                {/* Release Version Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-slate-200 tabular-nums shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Version {release.version}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Build #{release.buildNumber}</span>
                </div>

                {/* Primary CTA: DOWNLOAD BUTTON */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading || !canDownload}
                    style={primaryColor ? { backgroundColor: primaryColor } : undefined}
                    className="w-full h-14 sm:h-16 px-6 rounded-2xl bg-gradient-to-r from-corp-blue-600 to-corp-blue-700 hover:from-corp-blue-500 hover:to-corp-blue-600 active:scale-[0.96] text-white font-extrabold text-base sm:text-lg tracking-wide shadow-xl shadow-corp-blue-600/30 transition-[transform,background-color,box-shadow] duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Téléchargement en cours...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 shrink-0 stroke-[2.5]" />
                        <span>TÉLÉCHARGER MON APPLICATION</span>
                      </>
                    )}
                  </button>

                  {/* Subtitle / File Metadata */}
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 pt-1">
                    <span>APK Android</span>
                    <span>•</span>
                    <span className="tabular-nums">{formatFileSize(release.artifactSize)}</span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Signé numériquement
                    </span>
                  </div>
                </div>

              </div>

              {/* ── Section: Installation Guide ── */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-corp-blue-400" />
                    Comment installer l'application
                  </span>
                  {showInstructions ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {showInstructions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-3 pt-1 text-left"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        
                        {/* Step 1 */}
                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-corp-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mb-0.5">Télécharger</h4>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              Appuyez sur le bouton vert/bleu ci-dessus pour lancer le téléchargement du fichier APK.
                            </p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-corp-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mb-0.5">Ouvrir le fichier</h4>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              Ouvrez la notification de téléchargement ou votre dossier Téléchargements.
                            </p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-corp-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            3
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mb-0.5">Autoriser si demandé</h4>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              Si Android affiche un message, activez l'autorisation d'installer des sources inconnues.
                            </p>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            4
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mb-0.5">Installer</h4>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              Appuyez sur « Installer » puis connectez-vous avec vos identifiants habituels.
                            </p>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Section: Desktop UX notice ── */}
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4 text-corp-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Vous êtes sur un ordinateur ?</h5>
                    <p className="text-[11px] text-slate-400">
                      Ouvrez ce lien sur votre téléphone Android pour une installation directe.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPortalLink}
                  className="w-full sm:w-auto h-8 px-3 rounded-xl border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold gap-1.5 active:scale-[0.96] transition-transform shrink-0"
                >
                  {hasCopiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Lien copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le lien</span>
                    </>
                  )}
                </Button>
              </div>

            </motion.div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full py-4 text-center text-slate-500 text-[11px] font-medium border-t border-slate-900">
        <span>Élancé • ACYA Mobile Distribution Secure Portal</span>
      </footer>

      {/* ── Admin "Send Mobile App" Dialog ── */}
      {isSendModalOpen && release && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 text-slate-100">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-corp-blue-500/10 border border-corp-blue-500/20 text-corp-blue-400 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Envoyer l'application</h3>
                  <p className="text-xs text-slate-400">Transmettre le lien par email à un utilisateur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Application Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Application:</span>
                <span className="font-bold text-white">{tenantDisplayName} Mobile App</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  v{release.version} (Build #{release.buildNumber})
                </span>
              </div>
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Destinataire autorisé :
              </label>

              {isLoadingUsers ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-corp-blue-400" />
                  <span>Chargement des collaborateurs...</span>
                </div>
              ) : tenantUsers.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  Aucun autre utilisateur trouvé pour {tenantDisplayName}.
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-corp-blue-500 cursor-pointer"
                  >
                    {tenantUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.userName} ({u.email || u.userName})
                      </option>
                    ))}
                  </select>

                  {/* Selected User Info */}
                  {(() => {
                    const sel = tenantUsers.find((u) => u.id === selectedUserId);
                    if (!sel) return null;
                    return (
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nom :</span>
                          <span className="font-medium text-white">{sel.fullName || sel.userName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email :</span>
                          <span className="font-medium text-corp-blue-400">{sel.email || 'Aucun email'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSendModalOpen(false)}
                disabled={isSendingInvitation}
                className="h-10 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSendInvitation}
                disabled={isSendingInvitation || isLoadingUsers || !selectedUserId || tenantUsers.length === 0}
                className="h-10 px-5 rounded-xl bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold text-xs gap-2 shadow-lg shadow-corp-blue-600/25 active:scale-[0.96] transition-transform"
              >
                {isSendingInvitation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer l'invitation</span>
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
