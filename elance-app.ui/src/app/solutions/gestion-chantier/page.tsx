import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { PublicFooter } from "@/components/shared/public-footer";
import {
  HardHat,
  Building2,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Coins,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  BarChart2,
  FileText,
  HelpCircle,
  Layers,
  AlertTriangle,
} from "lucide-react";

// ─── SEO Metadata ──────────────────────────────────────────────────────────────
const PAGE_URL = "https://acya.site/solutions/gestion-chantier";

export const metadata: Metadata = {
  title: "Logiciel de gestion de chantier pour entreprises du bois et BTP",
  description:
    "Élancé vous permet de piloter tous vos chantiers depuis une seule plateforme : matériaux, équipe, budget, caisse, matériel et suivi d'avancement. ERP gestion de chantier conçu pour les entreprises de bois, de construction et de négoce en Tunisie.",
  keywords: [
    "logiciel de gestion de chantier",
    "gestion de chantier",
    "logiciel chantier BTP",
    "suivi de chantier",
    "ERP chantier",
    "gestion chantier Tunisie",
    "logiciel chantier Tunisie",
    "gestion matériaux chantier",
    "gestion stock chantier",
    "logiciel BTP Tunisie",
    "ERP BTP",
    "gestion des coûts chantier",
    "suivi avancement chantier",
    "budget chantier",
    "caisse chantier",
    "Élancé chantier",
  ],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "Logiciel de gestion de chantier pour entreprises du bois et BTP | Élancé",
    description:
      "Pilotez chaque chantier avec précision : matériaux, équipe, budget, caisse, planning et statistiques. ERP SaaS conçu pour le secteur bois et construction en Tunisie.",
    url: PAGE_URL,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gestion de chantier avec Élancé — ERP BTP Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Logiciel de gestion de chantier | Élancé by ACYA",
    description:
      "Pilotez chaque chantier avec précision : matériaux, équipe, budget, caisse et planning. ERP SaaS pour le BTP en Tunisie.",
  },
};

// ─── JSON-LD: SoftwareApplication focused on Chantier + FAQ + BreadcrumbList ──
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: "https://acya.site",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Solutions",
          item: "https://acya.site/#modules",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Gestion de chantier",
          item: PAGE_URL,
        },
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${PAGE_URL}#chantier-software`,
      name: "Élancé — Module Gestion de Chantier",
      url: PAGE_URL,
      description:
        "Module de gestion de chantier intégré à l'ERP Élancé. Pilotez vos projets de construction, suivez les matériaux, gérez l'équipe, contrôlez la caisse et analysez la rentabilité de chaque chantier.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "ConstructionManagement",
      operatingSystem: "Web",
      inLanguage: "fr-TN",
      publisher: {
        "@type": "Organization",
        name: "ACYA Consulting",
        url: "https://acya.site",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Qu'est-ce qu'un logiciel de gestion de chantier ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Un logiciel de gestion de chantier est un outil numérique qui permet aux entreprises de construction, de BTP et de négoce de piloter leurs projets de bout en bout : création et suivi des chantiers, gestion des matériaux et du stock, affectation des équipes, contrôle du budget et de la caisse, et analyse des statistiques de rentabilité.",
          },
        },
        {
          "@type": "Question",
          name: "Comment suivre plusieurs chantiers avec Élancé ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Élancé affiche tous vos chantiers actifs dans une vue liste avec leur état d'avancement, leur localisation et leur indicateur de santé (vert / orange / rouge). Cliquez sur un chantier pour accéder à son tableau de bord complet avec 8 onglets : Général, Équipe, Production, Matériaux, Magasin, Caisse, Suivi et Statistiques.",
          },
        },
        {
          "@type": "Question",
          name: "Peut-on gérer les matériaux d'un chantier dans Élancé ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. L'onglet Matériaux permet d'associer des articles de votre catalogue (bois en M³, quincaillerie, consommables) à chaque chantier avec une quantité requise et une quantité minimale. Vous pouvez ensuite enregistrer les consommations réelles au fur et à mesure de l'avancement des travaux.",
          },
        },
        {
          "@type": "Question",
          name: "Comment suivre les dépenses et la caisse d'un chantier ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "L'onglet Caisse d'Élancé permet d'enregistrer toutes les entrées et sorties financières de chaque chantier. Vous gérez les alimentations de caisse, les dépenses, et suivez le solde disponible en temps réel. Les transactions peuvent être soumises à validation pour plus de contrôle.",
          },
        },
        {
          "@type": "Question",
          name: "Élancé convient-il aux entreprises du BTP en Tunisie ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Élancé est spécifiquement conçu pour répondre aux besoins des entreprises tunisiennes du secteur bois, matériaux de construction et BTP. Le module chantier prend en charge la gestion par gouvernorat, le suivi des équipes locales, et s'intègre avec la facturation électronique Qwerty pour les experts-comptables.",
          },
        },
        {
          "@type": "Question",
          name: "Élancé est-il adapté aux entreprises de bois et matériaux ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolument. Élancé est né pour le négoce de bois et matériaux : calcul automatique du M³, gestion multi-dépôts, articles avec conversions d'unités spécifiques au bois, et liaison directe entre votre stock d'articles et les besoins de chaque chantier. C'est l'ERP de référence pour ce secteur en Tunisie.",
          },
        },
        {
          "@type": "Question",
          name: "Peut-on voir les statistiques et la rentabilité d'un chantier ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. L'onglet Statistiques de chaque chantier présente des graphiques d'avancement (prévu vs réel), la répartition budgétaire par phase (gros œuvre, second œuvre, finitions) et l'évolution de la main-d'œuvre semaine par semaine.",
          },
        },
      ],
    },
  ],
};

// ─── Feature cards ────────────────────────────────────────────────────────────
const features = [
  {
    icon: Building2,
    title: "Gestion centralisée des chantiers",
    desc: "Créez et organisez tous vos projets de construction dans une vue unique. Chaque chantier dispose d'une fiche complète avec référence, localisation, gouvernorat, architecte responsable, chef de projet, date de démarrage, fin estimée et budget prévisionnel.",
    color: "text-corp-blue-600",
    bg: "bg-corp-blue-50",
  },
  {
    icon: Package,
    title: "Matériaux et besoins par chantier",
    desc: "Associez des articles de votre catalogue (bois en M³, quincaillerie, consommables) à chaque chantier avec une quantité requise et un seuil d'alerte. Enregistrez les consommations réelles au fil de l'avancement des travaux.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Users,
    title: "Équipe et main-d'œuvre",
    desc: "Affectez vos équipes à chaque chantier en définissant les rôles (architecte, chef de projet, maître d'œuvre, ouvriers). Suivez la composition de la main-d'œuvre et son évolution dans le temps.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Coins,
    title: "Caisse et dépenses du chantier",
    desc: "Gérez toutes les entrées et sorties financières par chantier. Alimentez la caisse, enregistrez les dépenses, soumettez des demandes de sortie à validation et suivez le solde disponible en temps réel.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Calendar,
    title: "Planning et suivi d'avancement",
    desc: "Définissez les dates de démarrage et de fin prévue. Mettez à jour le pourcentage d'avancement global. L'indicateur de santé (vert / orange / rouge) vous alerte dès qu'un chantier prend du retard ou dépasse son budget.",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: BarChart2,
    title: "Statistiques et rentabilité",
    desc: "Consultez les graphiques d'avancement prévu vs réel, la répartition budgétaire par phase de travaux et l'évolution de la main-d'œuvre. Comparez rapidement budget initial et coûts engagés pour maîtriser la rentabilité.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

// ─── FAQ items ─────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Qu'est-ce qu'un logiciel de gestion de chantier ?",
    a: "Un logiciel de gestion de chantier est un outil qui permet de piloter vos projets de construction de bout en bout : création du chantier, suivi des matériaux et du stock, affectation des équipes, contrôle du budget et de la caisse, et analyse de la rentabilité. Élancé regroupe toutes ces fonctionnalités dans un seul ERP SaaS accessible depuis n'importe quel navigateur.",
  },
  {
    q: "Comment suivre plusieurs chantiers en même temps avec Élancé ?",
    a: "Élancé affiche tous vos chantiers actifs dans une vue liste avec leur état d'avancement, leur localisation et leur indicateur de santé (vert / orange / rouge). Cliquez sur n'importe quel chantier pour accéder à son tableau de bord complet avec 8 onglets dédiés.",
  },
  {
    q: "Peut-on gérer les matériaux de bois et matériaux de construction d'un chantier ?",
    a: "Oui. L'onglet Matériaux vous permet d'associer des articles de votre catalogue (bois en M³, quincaillerie, consommables) à chaque chantier avec quantité requise et seuil d'alerte de stock. Vous enregistrez ensuite les consommations réelles à mesure de l'avancement des travaux.",
  },
  {
    q: "Comment suivre les dépenses et la caisse d'un chantier ?",
    a: "L'onglet Caisse permet d'enregistrer toutes les entrées et sorties financières de chaque chantier. Vous gérez les alimentations, les dépenses, et suivez le solde disponible en temps réel avec un système de validation des demandes de sortie.",
  },
  {
    q: "Élancé convient-il aux entreprises du BTP et de la construction en Tunisie ?",
    a: "Oui. Élancé est spécifiquement conçu pour les entreprises tunisiennes du secteur bois, matériaux de construction et BTP. Il prend en charge la gestion par gouvernorat, le suivi des équipes locales, et s'intègre avec la facturation électronique Qwerty pour vos experts-comptables.",
  },
  {
    q: "Élancé est-il adapté aux entreprises de négoce de bois ?",
    a: "Absolument. Élancé est né pour le négoce de bois : calcul automatique du M³, gestion multi-dépôts, articles avec conversions d'unités spécifiques au bois, et liaison directe entre votre stock et les besoins en matériaux de chaque chantier.",
  },
  {
    q: "Peut-on voir les statistiques de rentabilité d'un chantier ?",
    a: "Oui. L'onglet Statistiques présente des graphiques d'avancement (prévu vs réel), la répartition budgétaire par phase de travaux et l'évolution de la main-d'œuvre semaine par semaine, pour une vision claire de la santé financière de chaque chantier.",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function GestionChantierPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex flex-col min-h-screen bg-white selection:bg-corp-blue-500/20">
        <PublicNavbar />

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="relative pt-32 pb-24 px-6 md:px-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0A1224 0%, #0f1f3d 50%, #0e1830 100%)",
          }}
        >
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-[15%] w-[500px] h-[500px] rounded-full bg-corp-blue-600/10 blur-[120px]" />
            <div className="absolute bottom-0 left-[10%] w-[400px] h-[400px] rounded-full bg-corp-cyan/8 blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
          </div>

          <div className="max-w-[1200px] mx-auto relative z-10">
            {/* Breadcrumb */}
            <nav
              aria-label="Fil d'Ariane"
              className="flex items-center gap-2 text-xs text-slate-400 mb-10"
            >
              <Link
                href="/"
                className="hover:text-white transition-colors font-semibold"
              >
                Accueil
              </Link>
              <span>/</span>
              <Link
                href="/#modules"
                className="hover:text-white transition-colors font-semibold"
              >
                Solutions
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-bold">
                Gestion de chantier
              </span>
            </nav>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-corp-cyan uppercase mb-6">
              <HardHat size={13} className="text-corp-cyan" />
              Module Chantier — Élancé by ACYA
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-[-0.03em] leading-[1.08] text-white mb-6 max-w-4xl [text-wrap:balance]">
              Logiciel de gestion de chantier pour les entreprises du bois et du{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
                BTP
              </span>
            </h1>

            <p className="text-lg leading-relaxed text-slate-300 max-w-2xl mb-10 [text-wrap:pretty]">
              Élancé centralise la gestion de vos chantiers dans un tableau de
              bord unique. Suivez vos matériaux, votre équipe, votre budget, votre
              caisse et votre avancement — sans jongler entre plusieurs outils.
              Conçu pour le secteur bois, matériaux et construction en Tunisie.
            </p>

            {/* Trust checks */}
            <div className="grid sm:grid-cols-2 gap-3 mb-10 max-w-xl">
              {[
                "Suivi d'avancement en temps réel",
                "Gestion des matériaux par chantier",
                "Caisse et dépenses intégrées",
                "Statistiques et rentabilité",
                "Équipe et rôles par projet",
                "Intégration stock & articles (M³)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-corp-cyan shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/enterprise-registration"
                className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xl px-8 text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] transition-all duration-200 active:scale-[0.97]"
              >
                Essai gratuit 14 jours
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 hover:border-white/40 px-7 text-base font-semibold text-slate-100 hover:text-white bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-md transition-all duration-200"
              >
                Demander une démo
              </Link>
            </div>
          </div>
        </section>

        {/* ── What is Élancé Chantier ────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-[#f8fafc] border-b border-slate-100">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-3xl">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
                Un logiciel de suivi de chantier intégré à votre ERP
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-5">
                Le module Chantier d'Élancé est conçu pour les entreprises du
                secteur <strong>bois, matériaux de construction et BTP</strong>{" "}
                en Tunisie. Il vous permet de créer et de suivre chaque projet de
                construction de façon centralisée — depuis l'ouverture du
                chantier jusqu'à sa réception finale.
              </p>
              <p className="text-base text-slate-500 leading-relaxed">
                Contrairement aux outils génériques, Élancé lie directement votre
                gestion de chantier à votre{" "}
                <Link
                  href="/#modules"
                  className="text-corp-blue-600 font-semibold hover:underline"
                >
                  stock d'articles
                </Link>
                , vos{" "}
                <Link
                  href="/#modules"
                  className="text-corp-blue-600 font-semibold hover:underline"
                >
                  achats fournisseurs
                </Link>{" "}
                et votre{" "}
                <Link
                  href="/#modules"
                  className="text-corp-blue-600 font-semibold hover:underline"
                >
                  comptabilité
                </Link>
                . Une modification du stock impacte automatiquement les besoins
                matériaux de vos chantiers, sans double saisie.
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature cards ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="fonctionnalites-titre"
          className="py-24 px-6 md:px-10 bg-white"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-corp-blue-50 border border-corp-blue-100 text-sm font-bold text-corp-blue-700 uppercase tracking-widest mb-5">
                <HardHat className="w-4 h-4" />
                Fonctionnalités
              </div>
              <h2
                id="fonctionnalites-titre"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4"
              >
                Tout ce dont vous avez besoin pour piloter un chantier
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Du premier coup de pelle à la réception finale, chaque aspect de
                vos chantiers est couvert nativement dans Élancé.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <article
                    key={f.title}
                    className="group p-7 rounded-2xl border border-slate-200/80 bg-white hover:border-corp-blue-200 hover:shadow-[0_8px_30px_rgba(37,99,235,0.07)] transition-all duration-300"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <Icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {f.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Chantier & Ecosystem section ──────────────────────────────────── */}
        <section
          aria-labelledby="ecosysteme-titre"
          className="py-24 px-6 md:px-10 bg-[#f8fafc] border-y border-slate-100"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700 uppercase tracking-widest mb-6">
                  <Layers className="w-4 h-4" />
                  Interconnexion native
                </div>
                <h2
                  id="ecosysteme-titre"
                  className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-5"
                >
                  Chantier, stock, achats et ventes connectés
                </h2>
                <p className="text-base text-slate-600 leading-relaxed mb-6">
                  Le module chantier d'Élancé n'est pas un outil isolé. Il
                  s'intègre nativement avec tous les modules de l'ERP pour
                  éliminer les ressaisies et garantir la cohérence de vos
                  données.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      label: "Stock & Articles (M³)",
                      desc: "Les besoins matériaux de vos chantiers font référence à vos articles catalogués — bois en M³, quincaillerie, consommables.",
                    },
                    {
                      label: "Achats fournisseurs",
                      desc: "Approvisionnez-vous directement depuis le module Achats et associez les réceptions à vos besoins de chantier.",
                    },
                    {
                      label: "Clients & Ventes",
                      desc: "Associez vos chantiers à vos clients et liez les avancements à vos documents de vente.",
                    },
                    {
                      label: "Comptabilité Qwerty",
                      desc: "Les dépenses de chantier remontent automatiquement à votre expert-comptable via la passerelle Qwerty.",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold text-slate-800 mb-0.5">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Stats visual */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-corp-blue-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-corp-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Tableau de bord chantier
                      </div>
                      <div className="text-xs text-slate-400">
                        Vue d'ensemble en temps réel
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Résidence Les Palmiers", pct: 72, color: "bg-emerald-500" },
                      { label: "Immeuble Tunis Nord", pct: 45, color: "bg-corp-blue-500" },
                      { label: "Villa El Menzah IX", pct: 91, color: "bg-corp-blue-600" },
                    ].map((c) => (
                      <div key={c.label}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                          <span>{c.label}</span>
                          <span className="tabular-nums">{c.pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${c.color} rounded-full`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Coins, label: "Caisse disponible", value: "12 400 TND", color: "text-emerald-600 bg-emerald-50" },
                    { icon: AlertTriangle, label: "Alertes matériaux", value: "2 articles", color: "text-amber-600 bg-amber-50" },
                    { icon: Users, label: "Ouvriers affectés", value: "14 équipiers", color: "text-sky-600 bg-sky-50" },
                    { icon: MapPin, label: "Gouvernorat", value: "Tunis / Ariana", color: "text-violet-600 bg-violet-50" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="bg-white rounded-xl border border-slate-100 p-4"
                      >
                        <div className={`w-8 h-8 rounded-lg ${stat.color.split(" ")[1]} flex items-center justify-center mb-2`}>
                          <Icon className={`w-4 h-4 ${stat.color.split(" ")[0]}`} />
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mb-0.5">
                          {stat.label}
                        </div>
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                          {stat.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ───────────────────────────────────────────────────── */}
        <section
          aria-labelledby="faq-chantier-titre"
          className="py-24 px-6 md:px-10 bg-white"
        >
          <div className="max-w-[900px] mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-corp-blue-50 border border-corp-blue-100 text-sm font-bold text-corp-blue-700 uppercase tracking-widest mb-5">
                <HelpCircle className="w-4 h-4" />
                Questions fréquentes
              </div>
              <h2
                id="faq-chantier-titre"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4"
              >
                Tout savoir sur la gestion de chantier avec Élancé
              </h2>
              <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
                Retrouvez les réponses aux questions les plus fréquentes sur le
                module chantier d'Élancé.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer font-bold text-slate-800 hover:text-corp-blue-600 transition-colors list-none">
                    <span>{faq.q}</span>
                    <span className="text-slate-300 group-open:rotate-45 transition-transform duration-200 shrink-0 text-xl leading-none">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>

            <p className="text-center text-sm text-slate-500 mt-10">
              D'autres questions ?{" "}
              <Link
                href="/contact"
                className="text-corp-blue-600 font-bold hover:underline hover:text-corp-blue-700 transition-colors"
              >
                Contactez notre équipe
              </Link>
            </p>
          </div>
        </section>

        {/* ── Related Solutions ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="solutions-titre"
          className="py-20 px-6 md:px-10 bg-[#f8fafc] border-t border-slate-100"
        >
          <div className="max-w-[1200px] mx-auto">
            <h2
              id="solutions-titre"
              className="text-2xl font-extrabold text-slate-900 tracking-tight mb-8"
            >
              Solutions complémentaires à la gestion de chantier
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Package,
                  title: "Gestion du stock",
                  desc: "Stock multi-dépôts avec calcul M³ automatique. Articles de bois, matériaux et quincaillerie trackés en temps réel.",
                  href: "/#modules",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  icon: ShoppingCart,
                  title: "Gestion des achats",
                  desc: "Commandes fournisseurs, bons de réception et rapprochement automatique avec votre stock de matériaux.",
                  href: "/#modules",
                  color: "text-corp-blue-600",
                  bg: "bg-corp-blue-50",
                },
                {
                  icon: TrendingUp,
                  title: "Gestion des ventes",
                  desc: "Devis, facturation et suivi des livraisons. Associez vos ventes à vos projets de construction.",
                  href: "/#modules",
                  color: "text-violet-600",
                  bg: "bg-violet-50",
                },
                {
                  icon: FileText,
                  title: "Intégration comptable",
                  desc: "Connectez Élancé à votre expert-comptable via Qwerty pour une transmission automatique des données financières.",
                  href: "/#integration-qwerty",
                  color: "text-amber-600",
                  bg: "bg-amber-50",
                },
              ].map((sol) => {
                const Icon = sol.icon;
                return (
                  <Link
                    key={sol.title}
                    href={sol.href}
                    className="group p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-corp-blue-200 hover:shadow-[0_4px_20px_rgba(37,99,235,0.07)] transition-all duration-300 flex flex-col gap-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${sol.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}
                    >
                      <Icon className={`w-5 h-5 ${sol.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 mb-1.5">
                        {sol.title}
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        {sol.desc}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-corp-blue-600 group-hover:gap-2 transition-all">
                      En savoir plus <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA banner ────────────────────────────────────────────────────── */}
        <section
          className="py-20 px-6 md:px-10 text-center"
          style={{
            background:
              "linear-gradient(135deg, #0A1224 0%, #0f1f3d 50%, #0e1830 100%)",
          }}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-5">
              Prêt à piloter vos chantiers avec Élancé ?
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-8">
              Rejoignez les entreprises du bois, du négoce et de la construction
              en Tunisie qui utilisent Élancé pour centraliser leur gestion de
              chantier. Essai gratuit 14 jours, sans carte bancaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/enterprise-registration"
                className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xl px-8 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] transition-all duration-200 active:scale-[0.97]"
              >
                Essai gratuit 14 jours
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 hover:border-white/40 px-7 text-base font-semibold text-slate-100 hover:text-white bg-white/[0.07] hover:bg-white/[0.12] transition-all duration-200"
              >
                Demander une démo
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </main>
    </>
  );
}
