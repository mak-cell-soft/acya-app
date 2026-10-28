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
  purchases: {
    moduleKey: 'purchases',
    routePrefix: '/purchases',
    title: 'Achats & Approvisionnements',
    welcome: {
      title: 'Bienvenue dans le module Achats & Approvisionnements',
      subtitle: 'Pilotez vos commandes, réceptions, factures et avoirs fournisseurs.',
      summary: 'Le module Achats centralise la gestion de vos approvisionnements et l’alimentation de vos stocks. De la commande fournisseur jusqu’au rapprochement de factures et au suivi des échéances, suivez précisément chaque étape de vos réceptions de bois et marchandises.',
      highlights: [
        {
          title: 'Commandes & Bons de Réception (BR)',
          description: 'Passez vos commandes d’achat sans impact stock immédiat, puis constatez l’entrée physique en stock lors de la réception au dépôt.',
        },
        {
          title: 'Traçabilité du bois & Colisage (m³)',
          description: 'Saisie fine des numéros de colis, dimensions (épaisseur, largeur, longueurs) et cubage automatique pour chaque arrivage de bois.',
        },
        {
          title: 'Facturation directe & Rapprochement groupé',
          description: 'Créez des factures directes ou regroupez plusieurs bons de réception d’un même fournisseur en une facture unique sans ressaisie ni doublon de stock.',
        },
        {
          title: 'Règlements, Traites & Avoirs',
          description: 'Gérez les effets de commerce (traites), les échéanciers fournisseurs, les retenues à la source (RS) et les avoirs financiers.',
        },
      ],
      quickLinks: [
        { label: 'Fournisseurs', href: '/suppliers', variant: 'outline' },
        { label: 'Règlements Fournisseurs', href: '/purchases/payments', variant: 'outline' },
        { label: 'Dépôts & Stockage', href: '/settings?tab=enterprise', variant: 'outline' },
        { label: 'Timbres & TVA', href: '/settings?tab=params&section=taxes', variant: 'outline' },
      ],
    },
    pageGuidance: {
      title: 'Guide du cycle Achats & Approvisionnements',
      description: 'Consultez le flux des opérations d’achat, les règles de mouvement de stock et les procédures de facturation.',
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Configuration préalable',
          description: 'Vérifiez la présence d’au moins un fournisseur actif, d’articles dans votre catalogue et d’un dépôt de stockage configuré.',
          tip: 'Fournisseurs > /suppliers | Dépôts > Paramètres > Entreprise',
        },
        {
          stepNumber: 2,
          title: 'Commande Fournisseur (sans impact stock)',
          description: 'Formalisez l’engagement d’achat avec les prix et quantités négociés. Aucun mouvement de stock physique n’est appliqué à ce stade.',
          tip: 'Les commandes dépassant le seuil configuré sont automatiquement soumises à approbation avant exécution.',
        },
        {
          stepNumber: 3,
          title: 'Réception physique en stock (BR)',
          description: 'À la livraison, créez le Bon de Réception (ou convertissez la commande). Cette action incrémente immédiatement le stock du dépôt désigné.',
          tip: 'Pour le bois, indiquez la référence colis/paquet pour garantir la traçabilité unitaire.',
        },
        {
          stepNumber: 4,
          title: 'Facturation & Rapprochement',
          description: 'Enregistrez la facture soit en direct (entrée en stock immédiate), soit par regroupement de BRs existants (sans doublon de stock).',
          tip: 'Un timbre fiscal valide est requis pour l’enregistrement des factures fournisseurs.',
        },
        {
          stepNumber: 5,
          title: 'Règlements, Échéances & Avoirs',
          description: 'Suivez le règlement de vos factures via les traites bancaires et gérez les éventuels avoirs financiers ou retours marchandises.',
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence d’impact sur le stock entre une Commande et un Bon de Réception ?',
          answer: 'Une Commande Fournisseur est un document d’engagement contractuel : elle n’a aucun impact sur le stock physique (stocktransactiontype = None). Le Bon de Réception (BR) constate la livraison matérielle et effectue une entrée réelle en stock dans le dépôt choisi.',
        },
        {
          question: 'Comment fonctionne l’impact stock d’une Facture Fournisseur ?',
          answer: 'Si la facture est créée directement (Facture Directe), elle déclenche une entrée physique en stock car aucun BR préalable n’a été enregistré. En revanche, si la facture est générée depuis des Bons de Réception existants, elle n’impacte pas le stock une seconde fois : les marchandises ont déjà été introduites lors de la validation des BRs.',
        },
        {
          question: 'Qu’est-ce qu’un Avoir Financier par rapport à un Retour Marchandise ?',
          answer: 'L’Avoir Financier (Avoir Fournisseur) est un ajustement purement comptable ou commercial (remise, régularisation de prix) sans mouvement physique de marchandise. Le Retour Marchandise constate la réexpédition physique de produits au fournisseur et engendre une sortie de stock (décrémentation de l’inventaire).',
        },
        {
          question: 'Pourquoi le timbre fiscal est-il requis pour les factures ?',
          answer: 'En conformité fiscale, toute facture fournisseur officielle doit être soumise au droit de timbre fiscal en vigueur. Si aucun timbre n’est disponible, configurez-le dans Paramètres > Paramètres > Taxes & Timbres.',
        },
        {
          question: 'Quand les transporteurs sont-ils nécessaires ?',
          answer: 'La sélection d’un transporteur est requise uniquement lorsque vous ajoutez des lignes de frais de port ou de transport dédié à vos documents d’achat.',
        },
      ],
      tips: [
        'Dans l’onglet Réceptions, sélectionnez plusieurs BRs d’un même fournisseur pour générer une facture groupée en un clic.',
        'La Recherche Approfondie vous permet de retrouver rapidement tous les achats associés à une référence article ou à un numéro de BL fournisseur.',
        'Pour le négoce du bois, renseignez les dimensions et fardeaux pour obtenir le calcul automatique en mètres cubes (m³).',
      ],
    },
    prerequisites: [
      {
        id: 'purchases_require_supplier',
        title: 'Fournisseurs requis',
        description: 'La création de commandes, réceptions et factures nécessite au moins un fournisseur actif.',
        severity: 'blocking',
        action: { label: 'Gérer les fournisseurs', href: '/suppliers' },
      },
      {
        id: 'purchases_require_article',
        title: 'Articles du catalogue requis',
        description: 'Au moins un article de marchandise doit être enregistré pour alimenter les lignes de vos documents d’achat.',
        severity: 'blocking',
        action: { label: 'Gérer les articles', href: '/articles' },
      },
      {
        id: 'purchases_require_site',
        title: 'Dépôts de stockage requis',
        description: 'Un dépôt ou point de vente est indispensable pour réceptionner les marchandises et mettre à jour les stocks.',
        severity: 'blocking',
        action: { label: 'Configurer les dépôts', href: '/settings?tab=enterprise' },
      },
      {
        id: 'purchases_require_taxe',
        title: 'Timbre fiscal pour facturation',
        description: 'La saisie de factures d’achat requiert un timbre fiscal configuré dans les paramètres.',
        severity: 'recommended',
        action: { label: 'Configurer les taxes', href: '/settings?tab=params&section=taxes' },
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
