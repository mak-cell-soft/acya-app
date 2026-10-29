"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  FileText,
  Upload,
  UserCheck,
  StickyNote,
  Palette,
  ExternalLink,
  Mail,
  Phone,
  Coins,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

export interface ProvisionEnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  provisioningLoading: boolean;
  creationSuccessData: {
    name: string;
    slug: string;
    adminUsername: string;
    adminEmail: string;
    adminPassword: string;
    url: string;
  } | null;
  existingId: number | null;
  isEditingActive: boolean;
  error?: string;

  // Section 1: Enterprise Info
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  plan: string;
  handlePlanChange: (v: string) => void;
  planPrice: number;
  setPlanPrice: (v: number) => void;

  // Section 2: Registration Details
  matriculeFiscal?: string;
  devise?: string;
  siegeAddress?: string;
  commercialRegister?: string;
  capital?: string;
  nameResponsable?: string;
  surnameResponsable?: string;
  positionResponsable?: string;
  sites?: Array<{ gov?: string; address: string; isForSale?: boolean }>;

  // Section 3: RNE Document
  rneDocumentUrl?: string;
  onOpenRneUpload?: () => void;

  // Section 4: Admin Credentials
  adminUsername: string;
  setAdminUsername: (v: string) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  hasCustomerPassword?: boolean;

  // Section 5: Branding & Regional
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  faviconUrl: string;
  setFaviconUrl: (v: string) => void;
  primaryColor: string;
  setPrimaryColor: (v: string) => void;
  secondaryColor: string;
  setSecondaryColor: (v: string) => void;
  customDomain: string;
  setCustomDomain: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;

  // Optional Modules
  isSalingWood: boolean;
  setIsSalingWood: (v: boolean) => void;
  isManagingConstructions: boolean;
  setIsManagingConstructions: (v: boolean) => void;
  isManagingProduction: boolean;
  setIsManagingProduction: (v: boolean) => void;

  // Section 6: Notes
  notes: string;
  setNotes: (v: string) => void;
}

export function ProvisionEnterpriseModal({
  isOpen,
  onClose,
  onSubmit,
  provisioningLoading,
  creationSuccessData,
  existingId,
  isEditingActive,
  error,

  name,
  setName,
  slug,
  setSlug,
  email,
  setEmail,
  phone,
  setPhone,
  plan,
  handlePlanChange,
  planPrice,
  setPlanPrice,

  matriculeFiscal,
  devise,
  siegeAddress,
  commercialRegister,
  capital,
  nameResponsable,
  surnameResponsable,
  positionResponsable,
  sites,

  rneDocumentUrl,
  onOpenRneUpload,

  adminUsername,
  setAdminUsername,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
  hasCustomerPassword = false,

  logoUrl,
  setLogoUrl,
  faviconUrl,
  setFaviconUrl,
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  customDomain,
  setCustomDomain,
  language,
  setLanguage,
  currency,
  setCurrency,

  isSalingWood,
  setIsSalingWood,
  isManagingConstructions,
  setIsManagingConstructions,
  isManagingProduction,
  setIsManagingProduction,

  notes,
  setNotes,
}: ProvisionEnterpriseModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordOverride, setShowPasswordOverride] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("sec-enterprise");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape when not loading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !provisioningLoading) {
        setShowPasswordOverride(false);
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, provisioningLoading, onClose]);

  // Track active section during scroll
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !isOpen) return;

    const handleScroll = () => {
      const sectionIds = [
        "sec-enterprise",
        "sec-registration",
        "sec-admin",
        "sec-options",
        "sec-notes",
      ];
      const containerTop = container.getBoundingClientRect().top;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 120 && rect.bottom - containerTop > 40) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  if (!isOpen) return null;

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const targetEl = document.getElementById(sectionId);
    if (targetEl && contentRef.current) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasRegistrationDetails = Boolean(
    matriculeFiscal ||
      siegeAddress ||
      commercialRegister ||
      capital ||
      nameResponsable ||
      surnameResponsable ||
      (sites && sites.length > 0) ||
      rneDocumentUrl
  );

  // Validate form readiness
  const isNameValid = name.trim().length > 0;
  const isAdminValid =
    isEditingActive || (adminUsername.trim().length > 0 && adminEmail.trim().length > 0);
  const isPriceValid = planPrice >= 0;
  const isFormValid = isNameValid && isAdminValid && isPriceValid;

  // Title & Subtitle
  const modalTitle = isEditingActive
    ? "Modifier l'Entreprise"
    : existingId
    ? "Provisionner l'Entreprise"
    : "Créer & Provisionner un Locataire";

  const modalSubtitle = isEditingActive
    ? "Mettez à jour les paramètres de configuration et d'abonnements"
    : existingId
    ? "Vérifiez les données d'inscription et activez le schéma locataire"
    : "Renseignez les informations requises pour créer le schéma et initialiser la base";

  const statusBadge = isEditingActive ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
      ACTIVE
    </span>
  ) : existingId ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      PENDING REGISTRATION
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      NOUVEAU
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provision-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !provisioningLoading) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl xl:max-w-5xl max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-32px)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* A. FIXED HEADER                                         */}
        {/* ======================================================== */}
        <header className="shrink-0 px-5 sm:px-6 py-4 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="provision-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight truncate"
                >
                  {modalTitle}
                </h2>
                {statusBadge}
              </div>
              <p className="text-xs text-muted-foreground truncate">{modalSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={provisioningLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            aria-label="Fermer la boîte de dialogue"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ======================================================== */}
        {/* SUCCESS VIEW (When Provisioning Succeeded)              */}
        {/* ======================================================== */}
        {creationSuccessData ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-slate-100 font-mono">
              Provisionnement Réussi !
            </h3>
            <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
              Le locataire <b className="text-slate-200">{creationSuccessData.name}</b> a été créé
              et son schéma de base de données PostgreSQL a été provisionné avec succès.
            </p>

            {/* Credentials Card */}
            <div className="w-full max-w-lg bg-slate-950 border border-slate-800/90 rounded-xl p-5 text-left font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Identifiants du Tenant
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Actif
                </span>
              </div>

              {/* URL */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">URL :</span>
                <div className="flex items-center gap-2 min-w-0">
                  <a
                    href={creationSuccessData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate inline-flex items-center gap-1 font-semibold"
                  >
                    {creationSuccessData.url}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(creationSuccessData.url, "url")}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                    title="Copier l'URL"
                  >
                    {copiedField === "url" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Admin Username */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Identifiant Admin :</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold">
                    {creationSuccessData.adminUsername}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(creationSuccessData.adminUsername, "user")}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                    title="Copier le nom d'utilisateur"
                  >
                    {copiedField === "user" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Admin Email */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Email Admin :</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-200 truncate">{creationSuccessData.adminEmail}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(creationSuccessData.adminEmail, "email")}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 shrink-0"
                    title="Copier l'email"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Admin Password */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Mot de passe :</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold px-2 py-0.5 rounded border text-xs ${
                    creationSuccessData.adminPassword.startsWith("[")
                      ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/80"
                      : "text-slate-200 bg-slate-900 border-slate-800"
                  }`}>
                    {creationSuccessData.adminPassword}
                  </span>
                  {!creationSuccessData.adminPassword.startsWith("[") && (
                    <button
                      type="button"
                      onClick={() => handleCopy(creationSuccessData.adminPassword, "pwd")}
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                      title="Copier le mot de passe"
                    >
                      {copiedField === "pwd" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm cursor-pointer shadow-sm"
              >
                Fermer le Panel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
            {/* ======================================================== */}
            {/* B. COMPACT SECTION NAVIGATION                            */}
            {/* ======================================================== */}
            <nav className="shrink-0 px-4 sm:px-6 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs font-mono scrollbar-none">
              <button
                type="button"
                onClick={() => scrollToSection("sec-enterprise")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === "sec-enterprise"
                    ? "bg-primary/15 text-primary font-bold border border-primary/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>1. Entreprise</span>
              </button>

              {hasRegistrationDetails && (
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-registration")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    activeSection === "sec-registration"
                      ? "bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>2. Inscription & RNE</span>
                </button>
              )}

              {!isEditingActive && (
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-admin")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    activeSection === "sec-admin"
                      ? "bg-primary/15 text-primary font-bold border border-primary/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>3. Administrateur</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => scrollToSection("sec-options")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === "sec-options"
                    ? "bg-primary/15 text-primary font-bold border border-primary/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4. Options & Modules</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("sec-notes")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === "sec-notes"
                    ? "bg-primary/15 text-primary font-bold border border-primary/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>5. Notes</span>
              </button>
            </nav>

            {/* Error Banner */}
            {error && (
              <div className="shrink-0 mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* C. SCROLLABLE FORM CONTENT                               */}
            {/* ======================================================== */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 text-sm scroll-smooth"
            >
              {/* ---------------------------------------------------- */}
              {/* SECTION 1: ENTERPRISE INFORMATION                    */}
              {/* ---------------------------------------------------- */}
              <section id="sec-enterprise" className="space-y-3.5 scroll-mt-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    1. Informations Locataire & Abonnement
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    * Champs obligatoires
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-enterprise-name"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between"
                    >
                      <span>
                        Nom de l&apos;Entreprise <span className="text-primary">*</span>
                      </span>
                    </label>
                    <input
                      id="prov-enterprise-name"
                      type="text"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Wellness Medical"
                      disabled={provisioningLoading}
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-subdomain-slug"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between"
                    >
                      <span>Sous-Domaine Slug (Optionnel)</span>
                      <span className="text-[10px] text-slate-500 lowercase">auto si vide</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="prov-subdomain-slug"
                        type="text"
                        className="w-full pl-3.5 pr-24 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="wellness-med"
                        disabled={provisioningLoading}
                      />
                      <span className="absolute right-2.5 text-xs font-mono text-slate-500 pointer-events-none select-none">
                        .acya.site
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email, Phone, Plan, Monthly Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Email */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-enterprise-email"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>Email Contact</span>
                    </label>
                    <input
                      id="prov-enterprise-email"
                      type="email"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@wellness.com"
                      disabled={provisioningLoading}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-enterprise-phone"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>Téléphone</span>
                    </label>
                    <input
                      id="prov-enterprise-phone"
                      type="text"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+216 71 123 456"
                      disabled={provisioningLoading}
                    />
                  </div>

                  {/* Plan */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-plan-select"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1"
                    >
                      <Package className="w-3 h-3 text-slate-500" />
                      <span>Offre / Plan</span>
                    </label>
                    <select
                      id="prov-plan-select"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                      value={plan}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      disabled={provisioningLoading}
                    >
                      <option value="Trial">Trial (30 Jours)</option>
                      <option value="Starter">Starter (5 Utilisateurs)</option>
                      <option value="Pro">Pro (25 Utilisateurs)</option>
                      <option value="Enterprise">Enterprise (Illimité)</option>
                    </select>
                  </div>

                  {/* Monthly Price */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-plan-price"
                      className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1"
                    >
                      <Coins className="w-3 h-3 text-slate-500" />
                      <span>Prix Mensuel ({currency})</span>
                    </label>
                    <input
                      id="prov-plan-price"
                      type="number"
                      min="0"
                      step="any"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(Number(e.target.value))}
                      disabled={provisioningLoading}
                    />
                  </div>
                </div>
              </section>

              {/* ---------------------------------------------------- */}
              {/* SECTION 2 & 3: SAVED REGISTRATION DETAILS & RNE DOC  */}
              {/* ---------------------------------------------------- */}
              {hasRegistrationDetails && (
                <section id="sec-registration" className="space-y-3.5 scroll-mt-4">
                  <div className="p-4 bg-slate-950/70 border border-amber-500/25 rounded-xl space-y-3 shadow-inner">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                      <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        2. Données d&apos;Inscription Enregistrées (Conservées à la Validation)
                      </h4>
                      <span className="text-[10px] font-mono uppercase text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Données RNE / Statutaires
                      </span>
                    </div>

                    {/* Compact Grid of Registration Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      {matriculeFiscal && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Matricule Fiscal
                          </span>
                          <span className="font-mono text-slate-200 font-bold text-xs select-all">
                            {matriculeFiscal}
                          </span>
                        </div>
                      )}

                      {siegeAddress && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Adresse Siège
                          </span>
                          <span className="text-slate-200 truncate block" title={siegeAddress}>
                            {siegeAddress}
                          </span>
                        </div>
                      )}

                      {devise && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Devise
                          </span>
                          <span className="font-mono text-slate-200 font-semibold">{devise}</span>
                        </div>
                      )}

                      {commercialRegister && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Registre Commerce
                          </span>
                          <span className="font-mono text-slate-200 font-semibold">
                            {commercialRegister}
                          </span>
                        </div>
                      )}

                      {capital && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Capital
                          </span>
                          <span className="font-mono text-slate-200 font-semibold">{capital}</span>
                        </div>
                      )}

                      {(nameResponsable || surnameResponsable) && (
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px] font-mono uppercase">
                            Responsable Légal
                          </span>
                          <span className="text-slate-200 font-medium">
                            {surnameResponsable} {nameResponsable}{" "}
                            {positionResponsable ? `(${positionResponsable})` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sales Sites */}
                    {sites && sites.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-400 font-mono text-[11px] block mb-1.5">
                          Sites de Vente & Dépôts Enregistrés ({sites.length}) :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sites.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                            >
                              {s.gov ? `${s.gov} - ` : ""}
                              {s.address}
                              {s.isForSale ? " (Point de Vente)" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: RNE Document Integrated */}
                    <div className="pt-2.5 border-t border-slate-800/80">
                      {rneDocumentUrl ? (
                        <div className="p-3 bg-slate-900/90 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0">
                              <img
                                src="/images/rne-logo.png"
                                alt="Logo RNE"
                                className="h-5 w-auto object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100">
                                  Document PDF RNE
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                  Document Téléversé
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                Registre National des Entreprises rattaché
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.write(
                                    `<iframe src="${rneDocumentUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Consulter PDF</span>
                            </button>
                            {onOpenRneUpload && (
                              <button
                                type="button"
                                onClick={onOpenRneUpload}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                                title="Remplacer le document RNE"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-400" />
                                <span>Remplacer</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src="/images/rne-logo.png"
                              alt="Logo RNE"
                              className="h-5 w-auto object-contain opacity-70 shrink-0"
                            />
                            <span className="text-xs text-amber-400 font-medium">
                              Aucun document PDF RNE n&apos;a été rattaché à cette entreprise.
                            </span>
                          </div>
                          {onOpenRneUpload && (
                            <button
                              type="button"
                              onClick={onOpenRneUpload}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Uploader RNE</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ---------------------------------------------------- */}
              {/* SECTION 4: TENANT ADMINISTRATOR                      */}
              {/* ---------------------------------------------------- */}
              {!isEditingActive && (
                <section id="sec-admin" className="space-y-3.5 scroll-mt-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      3. Identifiants Administrateur du Tenant
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Compte principal généré
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Admin Username */}
                    <div className="space-y-1">
                      <label
                        htmlFor="prov-admin-username"
                        className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between"
                      >
                        <span>
                          Nom d&apos;Utilisateur <span className="text-primary">*</span>
                        </span>
                      </label>
                      <input
                        id="prov-admin-username"
                        type="text"
                        required
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        disabled={provisioningLoading}
                      />
                    </div>

                    {/* Admin Email */}
                    <div className="space-y-1">
                      <label
                        htmlFor="prov-admin-email"
                        className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between"
                      >
                        <span>
                          Email Admin <span className="text-primary">*</span>
                        </span>
                      </label>
                      <input
                        id="prov-admin-email"
                        type="email"
                        required
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@wellness.com"
                        disabled={provisioningLoading}
                      />
                    </div>

                    {/* Admin Password */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <label
                        htmlFor="prov-admin-password"
                        className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between"
                      >
                        <span>Mot de Passe Administrateur</span>
                        {hasCustomerPassword && !showPasswordOverride ? (
                          <span className="text-[10px] text-emerald-400 font-sans font-medium">protégé</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 lowercase">auto si vide</span>
                        )}
                      </label>
                      {hasCustomerPassword && !showPasswordOverride ? (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border border-emerald-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-emerald-300">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Défini à l&apos;inscription (Chiffré)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordOverride(true);
                              setAdminPassword("");
                            }}
                            className="text-[11px] text-primary hover:underline font-mono"
                          >
                            Remplacer
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="relative flex items-center">
                            <input
                              id="prov-admin-password"
                              type={showPassword ? "text" : "password"}
                              className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder={hasCustomerPassword ? "Nouveau mot de passe de remplacement" : "Auto-généré si vide"}
                              disabled={provisioningLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                              title={showPassword ? "Masquer" : "Afficher"}
                              aria-label={
                                showPassword
                                  ? "Masquer le mot de passe"
                                  : "Afficher le mot de passe"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {hasCustomerPassword && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPasswordOverride(false);
                                  setAdminPassword("");
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-300 underline"
                              >
                                Conserver le mot de passe client
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ---------------------------------------------------- */}
              {/* SECTION 5: PERSONALIZATION & OPTIONS                 */}
              {/* ---------------------------------------------------- */}
              <section id="sec-options" className="space-y-4 scroll-mt-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    4. Personnalisation & Paramètres Régionaux
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Branding & Modules
                  </span>
                </div>

                {/* Branding URLs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-logo-url"
                      className="text-xs font-mono uppercase text-muted-foreground"
                    >
                      Logo URL
                    </label>
                    <input
                      id="prov-logo-url"
                      type="text"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://cdn.mon-serveur.com/logo.png"
                      disabled={provisioningLoading}
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="prov-favicon-url"
                      className="text-xs font-mono uppercase text-muted-foreground"
                    >
                      Favicon URL
                    </label>
                    <input
                      id="prov-favicon-url"
                      type="text"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="https://cdn.mon-serveur.com/favicon.ico"
                      disabled={provisioningLoading}
                    />
                  </div>
                </div>

                {/* Colors, Custom Domain, Language & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Primary Color */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-primary-color"
                      className="text-xs font-mono uppercase text-muted-foreground"
                    >
                      Couleur Primaire
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="h-9 w-10 p-0.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer shrink-0"
                        value={primaryColor || "#3B82F6"}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={provisioningLoading}
                      />
                      <input
                        id="prov-primary-color"
                        type="text"
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-primary"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-secondary-color"
                      className="text-xs font-mono uppercase text-muted-foreground"
                    >
                      Couleur Secondaire
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="h-9 w-10 p-0.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer shrink-0"
                        value={secondaryColor || "#EBF1FA"}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={provisioningLoading}
                      />
                      <input
                        id="prov-secondary-color"
                        type="text"
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-primary"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>

                  {/* Custom Domain */}
                  <div className="space-y-1">
                    <label
                      htmlFor="prov-custom-domain"
                      className="text-xs font-mono uppercase text-muted-foreground"
                    >
                      Domaine Personnalisé
                    </label>
                    <input
                      id="prov-custom-domain"
                      type="text"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="erp.client.com"
                      disabled={provisioningLoading}
                    />
                  </div>

                  {/* Language / Currency */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-muted-foreground">
                      Langue / Devise
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        aria-label="Langue"
                        className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-primary cursor-pointer"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={provisioningLoading}
                      >
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                        <option value="ar">AR</option>
                      </select>
                      <select
                        aria-label="Devise"
                        className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-primary cursor-pointer"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={provisioningLoading}
                      >
                        <option value="TND">TND</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Optional Modules - Clean Compact Cards */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono uppercase text-muted-foreground block">
                    Souscriptions aux Modules Métier
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Module 1: Natural Wood */}
                    <label
                      htmlFor="isSalingWood"
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none ${
                        isSalingWood
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-850"
                      }`}
                    >
                      <input
                        type="checkbox"
                        id="isSalingWood"
                        className="mt-0.5 w-4 h-4 rounded border-slate-800 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-emerald-500"
                        checked={isSalingWood}
                        onChange={(e) => setIsSalingWood(e.target.checked)}
                        disabled={provisioningLoading}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100">Traitement Bois</span>
                          {isSalingWood && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Seed tables bois naturel (m³, colis, essences)
                        </p>
                      </div>
                    </label>

                    {/* Module 2: Chantiers */}
                    <label
                      htmlFor="isManagingConstructions"
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none ${
                        isManagingConstructions
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-850"
                      }`}
                    >
                      <input
                        type="checkbox"
                        id="isManagingConstructions"
                        className="mt-0.5 w-4 h-4 rounded border-slate-800 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-emerald-500"
                        checked={isManagingConstructions}
                        onChange={(e) => setIsManagingConstructions(e.target.checked)}
                        disabled={provisioningLoading}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100">Module Chantiers</span>
                          {isManagingConstructions && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Gestion des chantiers & approvisionnements
                        </p>
                      </div>
                    </label>

                    {/* Module 3: Production */}
                    <label
                      htmlFor="isManagingProduction"
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none ${
                        isManagingProduction
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-850"
                      }`}
                    >
                      <input
                        type="checkbox"
                        id="isManagingProduction"
                        className="mt-0.5 w-4 h-4 rounded border-slate-800 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-emerald-500"
                        checked={isManagingProduction}
                        onChange={(e) => setIsManagingProduction(e.target.checked)}
                        disabled={provisioningLoading}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100">
                            Module Production
                          </span>
                          {isManagingProduction && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Ateliers d&apos;usinage, ordres de production
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              {/* ---------------------------------------------------- */}
              {/* SECTION 6: INTERNAL NOTES                            */}
              {/* ---------------------------------------------------- */}
              <section id="sec-notes" className="space-y-2 scroll-mt-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-primary" />
                    <label
                      htmlFor="prov-internal-notes"
                      className="text-xs font-mono uppercase tracking-wider text-primary font-semibold cursor-pointer"
                    >
                      5. Notes Internes & Données Réservées
                    </label>
                    {notes && notes.trim().startsWith("{") && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        JSON brut conservé
                      </span>
                    )}
                  </div>

                  {notes && notes.length > 80 && (
                    <button
                      type="button"
                      onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {isNotesExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Réduire</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Agrandir</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <textarea
                  id="prov-internal-notes"
                  className={`w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary transition-all ${
                    isNotesExpanded ? "h-36 resize-y" : "h-16 resize-none"
                  }`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes spéciales pour ce compte, conditions contractuelles..."
                  disabled={provisioningLoading}
                />
              </section>
            </div>

            {/* ======================================================== */}
            {/* D. STICKY FOOTER — CRITICAL REQUIREMENT                 */}
            {/* ======================================================== */}
            <footer className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between gap-4 z-10 backdrop-blur-md">
              {/* Left Side: Status / Validation feedback */}
              <div className="flex items-center gap-2 text-xs font-mono min-w-0">
                {provisioningLoading ? (
                  <span className="flex items-center gap-2 text-amber-400 truncate">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">Provisionnement du locataire en cours...</span>
                  </span>
                ) : !isNameValid ? (
                  <span className="flex items-center gap-1.5 text-amber-400 truncate">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Nom d&apos;entreprise requis</span>
                  </span>
                ) : !isAdminValid ? (
                  <span className="flex items-center gap-1.5 text-amber-400 truncate">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Email admin requis</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      {isEditingActive
                        ? "Prêt à enregistrer"
                        : "Prêt pour le provisionnement"}
                    </span>
                  </span>
                )}
              </div>

              {/* Right Side: Cancel & Primary Action Button */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={provisioningLoading}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono font-medium transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={provisioningLoading || !isFormValid}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs font-bold rounded-lg hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {provisioningLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PROVISIONNEMENT...</span>
                    </>
                  ) : isEditingActive ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ENREGISTRER LES MODIFICATIONS</span>
                    </>
                  ) : existingId ? (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>PROVISIONNER L&apos;ENTREPRISE</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>CRÉER & PROVISIONNER</span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
