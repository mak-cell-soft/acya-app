/**
 * ACYA Élancé — Guidance Registry Configuration
 * 
 * Central declarative registry defining structured user-guidance,
 * welcome intros, workflow steps, FAQs, and prerequisites for ERP modules.
 */

export type GuidanceModuleKey =
  | 'articles'
  | 'sales'
  | 'purchases'
  | 'stock'
  | 'customers'
  | 'suppliers'
  | 'production'
  | 'chantiers'
  | 'accounting'
  | 'settings';

export interface GuidanceAction {
  label: string;
  href: string;
  variant?: 'default' | 'outline' | 'secondary';
  external?: boolean;
}

export interface GuidanceWorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  tip?: string;
}

export interface GuidancePrerequisiteDefinition {
  id: string;
  title: string;
  description: string;
  severity: 'blocking' | 'recommended' | 'info';
  action?: GuidanceAction;
  documentationLink?: string;
}

export interface ModuleWelcomeContent {
  title: string;
  subtitle: string;
  summary: string;
  highlights: {
    title: string;
    description: string;
  }[];
  quickLinks?: GuidanceAction[];
}

export interface PageGuidanceContent {
  title: string;
  description: string;
  workflowSteps?: GuidanceWorkflowStep[];
  faq?: {
    question: string;
    answer: string;
  }[];
  tips?: string[];
  externalDocUrl?: string;
}

export interface ModuleGuidanceDefinition {
  moduleKey: GuidanceModuleKey;
  routePrefix: string;
  title: string;
  welcome: ModuleWelcomeContent;
  pageGuidance: PageGuidanceContent;
  prerequisites: GuidancePrerequisiteDefinition[];
}

/**
 * Registry containing static definitions for modules.
 * In Phase 2, this provides the pilot definition for Articles & Produits.
 */
export const GUIDANCE_REGISTRY: Record<string, ModuleGuidanceDefinition> = {
  articles: {
    moduleKey: 'articles',
    routePrefix: '/articles',
    title: 'Articles & Produits',
    welcome: {
      title: 'Bienvenue dans le catalogue Articles & Produits',
      subtitle: 'Gérez vos références de bois, marchandises générales et articles de service.',
      summary: 'Le module Articles constitue le socle de données de votre ERP Élancé. Toutes vos opérations de vente, d’achat, de gestion de stock et de production s’appuient sur ces fiches.',
      highlights: [
        {
          title: 'Articles standards & bois dimensional (m³)',
          description: 'Prise en charge native des dimensions (épaisseur, largeur, longueurs) et calcul automatique du cubage.',
        },
        {
          title: 'Catégorisation & TVA',
          description: 'Organisation par familles et sous-familles avec rattachement aux taux fiscaux en vigueur.',
        },
        {
          title: 'Suivi des prix & marges',
          description: 'Gestion des prix d’achat HT/TTC, prix de vente et calcul en direct du taux de marque.',
        },
      ],
      quickLinks: [
        { label: 'Configurer les Catégories', href: '/settings?tab=params&section=categories', variant: 'outline' },
        { label: 'Paramétrer les Taux de TVA', href: '/settings?tab=params&section=taxes', variant: 'outline' },
      ],
    },
    pageGuidance: {
      title: 'Guide d’utilisation du catalogue Articles',
      description: 'Consultez, recherchez et gérez les fiches articles de votre entreprise.',
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Configuration préalable',
          description: 'Vérifiez la présence des catégories d’articles et des taux de TVA dans les Paramètres système.',
          tip: 'Paramètres > Paramètres > Catégories & Taxes',
        },
        {
          stepNumber: 2,
          title: 'Création d’un article',
          description: 'Renseignez la référence, la désignation, l’unité (Unité, M², M³) et la catégorie.',
          tip: 'Pour les articles de type Bois, les dimensions épaisseur et largeur sont requises.',
        },
        {
          stepNumber: 3,
          title: 'Alimentation du stock',
          description: 'Alimentez vos stocks initiaux ou créez des Bons de Réception dans le module Achats.',
        },
      ],
      faq: [
        {
          question: 'Comment différencier un article Bois d’une marchandise standard ?',
          answer: 'Lors de la création de la fiche, sélectionnez le type "Bois". Cela active la saisie des dimensions (épaisseur, largeur, longueurs) et le décompte volumique en mètres cubes (m³).',
        },
        {
          question: 'Puis-je modifier la TVA ou la catégorie d’un article déjà utilisé ?',
          answer: 'Oui. La modification s’appliquera aux nouveaux documents créés. Les factures et bons déjà validés conservent leurs montants et taux historiques archivés.',
        },
      ],
      tips: [
        'Utilisez la recherche instantanée pour filtrer par référence, désignation ou catégorie.',
        'La marge bénéficiaire estimée s’actualise automatiquement en fonction du dernier prix d’achat et du prix de vente TTC.',
      ],
    },
    prerequisites: [
      {
        id: 'articles_require_category',
        title: 'Catégories d’articles requises',
        description: 'La création d’un article nécessite au moins une catégorie et une sous-catégorie active.',
        severity: 'blocking',
        action: { label: 'Gérer les catégories', href: '/settings?tab=params&section=categories' },
      },
      {
        id: 'articles_require_tva',
        title: 'Taux de TVA requis',
        description: 'Un taux de TVA par défaut est obligatoire pour le calcul automatique des prix TTC.',
        severity: 'blocking',
        action: { label: 'Configurer la TVA', href: '/settings?tab=params&section=taxes' },
      },
      {
        id: 'articles_require_dimensions',
        title: 'Dimensions du bois recommandées',
        description: 'Pour le négoce du bois, configurez vos épaisseurs et largeurs courantes pour accélérer la saisie.',
        severity: 'recommended',
        action: { label: 'Configurer les dimensions', href: '/settings?tab=params&section=dimensions' },
      },
    ],
  },
};

/**
 * Finds the matching guidance definition for a given route pathname.
 */
export function getGuidanceForPathname(pathname: string): ModuleGuidanceDefinition | null {
  if (!pathname) return null;
  const cleanPath = pathname.split('?')[0].toLowerCase();
  
  for (const moduleDef of Object.values(GUIDANCE_REGISTRY)) {
    if (cleanPath === moduleDef.routePrefix || cleanPath.startsWith(`${moduleDef.routePrefix}/`)) {
      return moduleDef;
    }
  }

  return null;
}
