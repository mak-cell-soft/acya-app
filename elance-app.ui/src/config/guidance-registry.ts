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
  | 'inventory'
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
  sales: {
    moduleKey: 'sales',
    routePrefix: '/sales',
    title: 'Ventes & Facturation Clients',
    welcome: {
      title: 'Bienvenue dans le module Ventes & Facturation Clients',
      subtitle: 'Pilotez vos devis, commandes, bons de livraison, factures et règlements clients.',
      summary: 'Le module Ventes centralise l’intégralité du cycle commercial et de facturation de votre ERP Élancé. De l’émission du devis à la livraison physique du bois, en passant par la facturation directe ou groupée et l’encaissement des règlements, assurez une traçabilité rigoureuse de vos créances et de vos sorties de stock.',
      highlights: [
        {
          title: 'Devis & Commandes (sans impact stock)',
          description: 'Négociez et contractualisez vos ventes en toute flexibilité sans affecter immédiatement l’inventaire physique.',
        },
        {
          title: 'Bons de Livraison (BL) & Sorties de Stock',
          description: 'La validation du BL constate la sortie physique réelle de marchandise de votre dépôt et décrémente immédiatement les stocks.',
        },
        {
          title: 'Facturation directe & Groupement de BLs',
          description: 'Émettez des factures directes ou convertissez plusieurs BLs d’un même client en facture unique sans doublon de mouvement de stock.',
        },
        {
          title: 'Règlements, Avoirs & Suivi des Impayés',
          description: 'Enregistrez les règlements comptants ou échelonnés, gérez les retenues à la source (RS), les retours de marchandises et suivez les créances clients.',
        },
      ],
      quickLinks: [
        { label: 'Clients', href: '/customers', variant: 'outline' },
        { label: 'Articles & Catalogue', href: '/articles', variant: 'outline' },
        { label: 'Dépôts & Stockage', href: '/settings?tab=enterprise', variant: 'outline' },
        { label: 'Transporteurs', href: '/settings?tab=params&section=transporters', variant: 'outline' },
        { label: 'Taxes & Timbres', href: '/settings?tab=params&section=taxes', variant: 'outline' },
        { label: 'Plafond quotidien', href: '/settings?tab=ceiling', variant: 'outline' },
      ],
    },
    pageGuidance: {
      title: 'Guide du cycle Ventes & Facturation Clients',
      description: 'Consultez le déroulement complet des opérations de vente, les effets précis sur le stock physique et les bonnes pratiques de facturation.',
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Préalables et configurations',
          description: 'Vérifiez la présence d’au moins un client actif (ou l’activation de l’option Client Passager), d’articles dans votre catalogue, d’un dépôt de stockage et d’au moins un transporteur pour les livraisons.',
          tip: 'Clients > /customers | Transporteurs > Paramètres > Transporteurs',
        },
        {
          stepNumber: 2,
          title: 'Devis & Commande Client (sans impact stock)',
          description: 'Émettez des devis tarifaires ou enregistrez les commandes fermes. Ces documents contractuels n’engendrent aucun mouvement sur le stock physique (stocktransactiontype = None).',
          tip: 'Vous pouvez convertir directement un devis accepté en commande ou en bon de livraison.',
        },
        {
          stepNumber: 3,
          title: 'Livraison physique & Déstockage (BL)',
          description: 'Lors de l’expédition ou de l’enlèvement des marchandises, validez le Bon de Livraison (BL). Cette action enregistre la sortie physique de stock (décrémentation) dans le dépôt sélectionné. La désignation d’un transporteur est obligatoire.',
          tip: 'Pour le bois, détaillez le cubage (m³) et les numéros de colis pour assurer la traçabilité des paquets expédiés.',
        },
        {
          stepNumber: 4,
          title: 'Facturation (Directe ou issue de BL)',
          description: 'Deux modes de facturation sont disponibles : la Facture Directe (qui génère une sortie de stock immédiate) et la Facture issue de BL (individuelle ou groupée, sans aucun impact stock supplémentaire pour éviter les doubles déductions).',
          tip: 'Les factures générées depuis des BLs sont verrouillées contre la modification directe des lignes pour préserver la concordance avec les bons de livraison.',
        },
        {
          stepNumber: 5,
          title: 'Règlements, Retours & Clôture',
          description: 'Saisissez les règlements reçus (chèques, traites, espèces, virements) et les retenues à la source (RS). En cas de retour de marchandise ou de litige, émettez un Avoir / Retour pour réintégrer les quantités en stock.',
          tip: 'Le règlement d’une facture ou d’un BL n’impacte pas le stock physique.',
        },
      ],
      faq: [
        {
          question: 'Quel est l’impact de chaque type de document sur le stock physique ?',
          answer: '• Devis et Commande : aucun impact sur le stock physique (aucun déstockage).\n• Bon de Livraison (BL) : sortie physique immédiate de stock (décrémentation).\n• Facture Directe : sortie physique immédiate de stock (décrémentation).\n• Facture issue de BL(s) (individuelle ou groupée) : AUCUN impact stock supplémentaire (la déduction a déjà été effectuée lors de la validation du BL).\n• Avoir / Retour marchandise : entrée physique en stock (réintégration des quantités).\n• Règlement client : aucun impact sur le stock.',
        },
        {
          question: 'Quand la désignation d’un transporteur est-elle obligatoire ?',
          answer: 'Le transporteur est obligatoire lors de la validation d’un Bon de Livraison (BL) ou d’une Facture Directe pour assurer la conformité d’expédition et de transport. Il est en revanche facultatif pour la rédaction des Devis et Commandes.',
        },
        {
          question: 'Comment fonctionne l’option « Client Passager » ?',
          answer: 'L’option Client Passager permet de saisir rapidement des ventes de comptoir au comptant sans créer au préalable une fiche client détaillée complète. Cependant, elle ne dispense pas de la présence générale de la base clients ni des autres exigences légales (taux de TVA, dépôt de départ, transporteur si livraison).',
        },
        {
          question: 'Pourquoi ne puis-je pas modifier les lignes d’une facture issue d’un BL ?',
          answer: 'Une facture générée à partir d’un ou plusieurs Bons de Livraison reflète juridiquement et comptablement les marchandises déjà livrées. Afin d’éviter tout écart entre la livraison constatée et la facturation, le document est verrouillé en modification directe. Pour ajuster des quantités, modifiez le BL d’origine avant facturation ou émettez un avoir.',
        },
        {
          question: 'Comment fonctionne la Facturation Groupée ?',
          answer: 'Dans la liste des documents, le bouton Facturation Groupée vous permet de sélectionner plusieurs Bons de Livraison validés d’un même client pour les fusionner en une facture unique. Chaque ligne de BL est reprise fidèlement sans recalcul de stock.',
        },
        {
          question: 'Qu’est-ce que le plafond quotidien de facturation ?',
          answer: 'Le plafond quotidien limite le montant total TTC facturable par jour selon les règles de gestion ou fiscales de votre entreprise. Il se configure dans Paramètres > Plafond quotidien.',
        },
      ],
      tips: [
        'Utilisez la « Recherche Approfondie » pour analyser l’historique des ventes par article, client ou période exacte.',
        'Pour le négoce du bois, les longueurs, largeurs et épaisseurs calculent automatiquement le cubage en m³ et le montant total de la ligne.',
        'Enregistrez les attestations de retenue à la source (RS) directement depuis le panneau latéral dédié pour un lettrage comptable fluide.',
        'Vérifiez que le timbre fiscal est activé dans vos paramètres fiscaux si vos factures clients y sont assujetties.',
      ],
    },
    prerequisites: [
      {
        id: 'sales_require_customer',
        title: 'Clients requis',
        description: 'La création de devis, commandes, bons de livraison et factures nécessite au moins un client actif enregistré dans la base.',
        severity: 'blocking',
        action: { label: 'Gérer les clients', href: '/customers' },
      },
      {
        id: 'sales_require_article',
        title: 'Articles du catalogue requis',
        description: 'Au moins un article actif (marchandise ou prestation de service) doit être enregistré pour composer vos lignes de vente.',
        severity: 'blocking',
        action: { label: 'Gérer les articles', href: '/articles' },
      },
      {
        id: 'sales_require_site',
        title: 'Dépôts de stockage requis',
        description: 'Un dépôt ou point de vente est indispensable pour déduire les sorties d’inventaire lors des livraisons et ventes directes.',
        severity: 'blocking',
        action: { label: 'Configurer les dépôts', href: '/settings?tab=enterprise' },
      },
      {
        id: 'sales_require_transporter',
        title: 'Transporteurs recommandés',
        description: 'Un transporteur est obligatoire pour valider les Bons de Livraison (BL) et Factures Directes (facultatif pour devis et commandes).',
        severity: 'recommended',
        action: { label: 'Configurer les transporteurs', href: '/settings?tab=params&section=transporters' },
      },
      {
        id: 'sales_require_taxe',
        title: 'TVA et timbre fiscal pour facturation',
        description: 'Vérifiez la configuration des taux de TVA et du timbre fiscal pour la conformité de vos factures clients.',
        severity: 'recommended',
        action: { label: 'Configurer les taxes', href: '/settings?tab=params&section=taxes' },
      },
    ],
  },
  stock: {
    moduleKey: 'stock',
    routePrefix: '/stock',
    title: 'Stock & Logistique',
    welcome: {
      title: 'Bienvenue dans le module Stock & Logistique',
      subtitle: 'Supervisez vos inventaires catégorisés, retracez les mouvements et pilotez les transferts inter-sites.',
      summary: 'Le module Stock vous permet de piloter en temps réel l’ensemble de vos dépôts, les niveaux de disponibilité par famille d’articles, les seuils d’alerte et les flux logistiques. Il intègre le suivi détaillé des cubages de bois (m³), la traçabilité complète des mouvements (timeline) et les transferts sécurisés entre dépôts par code de confirmation.',
      highlights: [
        {
          title: 'Niveaux de stock & alertes en direct',
          description: 'Visualisez les quantités disponibles par catégorie et recevez des alertes automatiques lorsque le stock passe sous le seuil minimum configuré.',
        },
        {
          title: 'Détail bois & cubage (m³)',
          description: 'Consultez la composition exacte de vos fardeaux et colis de bois (largeurs, épaisseurs, longueurs et pièces) avec calcul automatique du volume.',
        },
        {
          title: 'Journal des mouvements & traçabilité',
          description: 'Retracez l’historique chronologique de chaque entrée, sortie, ajustement et transfert avec réconciliation des flux et solde comptable.',
        },
        {
          title: 'Transferts inter-dépôts sécurisés',
          description: 'Émettez des bons de transfert avec déstockage immédiat à la source et intégration en stock à destination uniquement sur validation par code PIN à 4 chiffres.',
        },
      ],
      quickLinks: [
        { label: 'Inventaires Physiques', href: '/inventory', variant: 'outline' },
        { label: 'Nouveau Transfert', href: '/stock/transfer/new', variant: 'outline' },
        { label: 'Articles & Catalogue', href: '/articles', variant: 'outline' },
        { label: 'Dépôts & Magasins', href: '/settings?tab=enterprise', variant: 'outline' },
        { label: 'Transporteurs', href: '/settings?tab=params&section=transporters', variant: 'outline' },
      ],
    },
    pageGuidance: {
      title: 'Guide de gestion du Stock et des Transferts',
      description: 'Consultez les principes de suivi d’inventaire, les règles de mouvement de stock et la procédure de transfert logistique.',
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Configuration des dépôts et articles',
          description: 'Assurez-vous qu’au moins un dépôt actif et des articles existent dans votre base. Pour effectuer des transferts logistiques, au moins deux dépôts distincts et un transporteur sont requis.',
          tip: 'Dépôts > Paramètres > Entreprise | Transporteurs > Paramètres > Transporteurs',
        },
        {
          stepNumber: 2,
          title: 'Surveillance et seuils d’alerte',
          description: 'Dans l’onglet Stock par Catégorie, surveillez les indicateurs de statut (Optimal, Seuil Alerte, Rupture). Cliquez sur l’icône de paramétrage d’un article pour définir son stock minimum de sécurité.',
          tip: 'La case « Masquer stock nul » permet de focaliser l’affichage sur les articles effectivement en rayon.',
        },
        {
          stepNumber: 3,
          title: 'Consultation du détail bois',
          description: 'Pour les articles de bois (catégorie Bois), cliquez sur le bouton Détail Bois pour consulter la répartition unitaire des pièces par longueur et le volume total en m³.',
          tip: 'Imprimez des étiquettes individuelles d’identification de fardeaux ou l’inventaire complet du dépôt.',
        },
        {
          stepNumber: 4,
          title: 'Transferts inter-dépôts en deux temps',
          description: 'Créez un Bon de Sortie vers un dépôt récepteur. Le stock est immédiatement déduit du dépôt source (marchandises en transit). À l’arrivée, le réceptionnaire valide le transfert avec le code PIN à 4 chiffres pour créditer le dépôt destinataire.',
          tip: 'En cas de rejet (marchandise non conforme ou manquante), le stock est automatiquement réintégré dans le dépôt d’origine.',
        },
        {
          stepNumber: 5,
          title: 'Inventaires physiques périodiques',
          description: 'Utilisez la page dédiée Inventaires (/inventory) pour réaliser vos campagnes de comptage. La validation d’un inventaire ajuste automatiquement les quantités en stock sur le comptage physique réel.',
          tip: 'Ne confondez pas la consultation du stock (/stock) et la validation d’un inventaire physique (/inventory).',
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre la page Stock (/stock) et la page Inventaires (/inventory) ?',
          answer: 'Le module Stock (/stock) est votre tableau de bord opérationnel permanent : il présente l’état courant de vos disponibilités physiques par dépôt, la chronologie des mouvements et le registre des transferts logistiques.\n\nLa page Inventaires (/inventory) sert aux campagnes de comptage périodique (annuel ou tournant). C’est là que vous saisissez les quantités réellement comptées sur le terrain ; la validation d’un inventaire ajuste alors directement le stock système pour concorder avec le réel.',
        },
        {
          question: 'Comment fonctionne l’impact stock d’un transfert inter-dépôts ?',
          answer: 'Le transfert logistique applique un mécanisme en deux temps :\n1. À la création du transfert, un Bon de Sortie est émis et le stock est IMMÉDIATEMENT décrémenté du dépôt d’origine (marchandises en transit, statut « En attente »).\n2. Le dépôt destinataire n’est PAS crédité immédiatement. Il doit confirmer la réception en saisissant le code PIN à 4 chiffres généré sur le bon logistique.\n3. Dès confirmation, le Bon d’Entrée est validé et le stock de destination est crédité.\n4. Si le transfert est rejeté, le stock déduit est automatiquement réintégré (rollback) dans le dépôt d’origine.',
        },
        {
          question: 'Pourquoi un transfert inter-dépôts requiert-il obligatoirement deux dépôts et un transporteur ?',
          answer: 'Un transfert logistique correspond à un déplacement physique de marchandises d’un site de stockage vers un autre. Le dépôt de départ et le dépôt d’arrivée doivent donc être différents. La sélection d’un transporteur est obligatoire pour assurer la traçabilité juridique et routière de l’acheminement.',
        },
        {
          question: 'Pourquoi un article affiche-t-il l’erreur « L’article n’a pas de stock initial dans ce dépôt » lors d’un transfert ?',
          answer: 'Pour pouvoir transférer une marchandise depuis un dépôt source, celle-ci doit avoir été préalablement réceptionnée ou comptabilisée dans ce dépôt spécifique (existence d’un merchandiseId et d’une ligne de stock). Si un article n’a jamais été introduit dans ce dépôt, réalisez d’abord une réception d’achat ou un inventaire initial.',
        },
        {
          question: 'Comment fonctionne la Traçabilité (Timeline) et la réconciliation ?',
          answer: 'L’onglet Timeline rassemble l’historique des réceptions fournisseurs (+), livraisons clients (-), factures directes (+/-), retours (+/-), transferts et ajustements d’inventaire. Le panneau de droite réconcilie les totaux entrées et sorties pour vérifier la cohérence du stock final.',
        },
        {
          question: 'Comment sont gérées les dimensions de bois dans le stock ?',
          answer: 'Pour les références de catégorie Bois, les pièces ne sont pas uniquement comptées à l’unité : chaque colis détaille l’épaisseur, la largeur et les longueurs en centimètres, ce qui calcule automatiquement le cubage exact en mètres cubes (m³).',
        },
      ],
      tips: [
        'Dans l’onglet Stock par Catégorie, utilisez le filtre par dépôt pour auditer rapidement un point de vente spécifique.',
        'Pour expédier un transfert, transmettez le code PIN à 4 chiffres au chauffeur ou au réceptionnaire du site distant pour lui permettre de valider l’entrée.',
        'En cas d’écart constaté lors d’une livraison inter-sites, le réceptionnaire peut rejeter le transfert avec un motif : les quantités reviendront automatiquement au dépôt émetteur.',
        'Consultez régulièrement les alertes de stock en haut de page pour anticiper vos réapprovisionnements fournisseurs avant rupture.',
      ],
    },
    prerequisites: [
      {
        id: 'stock_require_site',
        title: 'Dépôts de stockage requis',
        description: 'Au moins un site de stockage ou dépôt est indispensable pour gérer les inventaires physiques et enregistrer les mouvements.',
        severity: 'blocking',
        action: { label: 'Configurer les dépôts', href: '/settings?tab=enterprise' },
      },
      {
        id: 'stock_require_article',
        title: 'Articles du catalogue requis',
        description: 'Votre catalogue doit contenir au moins un article actif pour pouvoir suivre des niveaux de stock ou initier des transferts.',
        severity: 'blocking',
        action: { label: 'Gérer les articles', href: '/articles' },
      },
      {
        id: 'stock_recommend_multiple_sites',
        title: 'Deux dépôts recommandés pour les transferts',
        description: 'Votre entreprise ne dispose actuellement que d’un seul dépôt. Les transferts logistiques inter-sites requièrent au moins deux dépôts distincts.',
        severity: 'recommended',
        action: { label: 'Ajouter un dépôt', href: '/settings?tab=enterprise' },
      },
      {
        id: 'stock_recommend_transporter',
        title: 'Transporteurs pour transferts logistiques',
        description: 'La saisie d’un transporteur est obligatoire pour émettre des bons de transfert logistique entre dépôts.',
        severity: 'recommended',
        action: { label: 'Configurer les transporteurs', href: '/settings?tab=params&section=transporters' },
      },
    ],
  },
  inventory: {
    moduleKey: 'inventory',
    routePrefix: '/inventory',
    title: 'Inventaires Physiques',
    welcome: {
      title: 'Bienvenue dans le module Inventaires Physiques',
      subtitle: 'Réalisez vos campagnes de comptage, comparez les écarts et ajustez vos stocks réels.',
      summary: 'Le module Inventaires vous permet d’organiser le contrôle périodique de vos stocks en magasin ou en dépôt. Saisissez vos comptages physiques, importez vos feuilles de relevé Excel, identifiez les écarts par rapport au stock théorique et validez définitivement la mise à niveau de votre inventaire.',
      highlights: [
        {
          title: 'Comptage physique & cubage bois (m³)',
          description: 'Saisissez les quantités constatées par référence et fardeau, avec prise en charge du calcul automatique des cubages bois.',
        },
        {
          title: 'Import & Export Excel rapide',
          description: 'Téléchargez la matrice d’inventaire pré-remplie avec le stock courant, complétez vos relevés hors-ligne et réimportez-les en un clic.',
        },
        {
          title: 'Contrôle des écarts & vérification des oublis',
          description: 'Visualisez immédiatement les deltas de stock et utilisez l’outil « Vérifier Oublis » pour détecter et solder les articles en rayon non inventoriés.',
        },
        {
          title: 'Validation comptable définitive',
          description: 'La validation par un responsable remplace le stock théorique par le comptage physique réel et verrouille la feuille contre toute modification ultérieure.',
        },
      ],
      quickLinks: [
        { label: 'Nouvel Inventaire', href: '/inventory/new', variant: 'outline' },
        { label: 'Stock & Dépôts', href: '/stock', variant: 'outline' },
        { label: 'Articles & Catalogue', href: '/articles', variant: 'outline' },
        { label: 'Dépôts & Magasins', href: '/settings?tab=enterprise', variant: 'outline' },
      ],
    },
    pageGuidance: {
      title: 'Guide des Inventaires Physiques',
      description: 'Consultez les procédures de comptage, les règles d’import/export Excel et les effets de la validation sur les stocks.',
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Préparation et sélection du dépôt',
          description: 'Choisissez le dépôt cible et préparez votre support de comptage, soit via une nouvelle feuille d’inventaire en ligne (/inventory/new), soit en exportant le modèle Excel prérempli.',
          tip: 'Filtrez l’export Excel pour inclure ou exclure le stock nul selon la nature de votre audit.',
        },
        {
          stepNumber: 2,
          title: 'Comptage physique sur le terrain',
          description: 'Relevez les quantités réellement présentes en rayon ou en parc à bois. Pour les fardeaux de bois, notez les longueurs, largeurs et pièces pour calculer le volume exact.',
        },
        {
          stepNumber: 3,
          title: 'Saisie ou import des quantités comptées',
          description: 'Enregistrez les quantités sur votre inventaire en ligne ou importez votre fichier Excel complété. L’inventaire est enregistré au statut « En attente » (aucun impact stock immédiat).',
          tip: 'Tant que l’inventaire n’est pas validé, vous pouvez rééditer et corriger les lignes depuis le bouton Éditer.',
        },
        {
          stepNumber: 4,
          title: 'Analyse des écarts & vérification des oublis',
          description: 'Dans la liste des inventaires, déployez la ligne pour examiner les deltas (en vert pour les excédents, en rouge pour les pertes). Cliquez sur « Vérifier Oublis » pour générer la mise à zéro des articles théoriques non comptés.',
          tip: 'Les articles absents de la feuille d’inventaire ne sont PAS automatiquement mis à zéro lors de la validation.',
        },
        {
          stepNumber: 5,
          title: 'Validation finale par un responsable',
          description: 'Un responsable valide la feuille d’inventaire. Cette action écrase les stocks théoriques existants par les quantités comptées et rend le document définitivement immuable.',
          tip: 'Attention : la validation est irréversible et modifie directement l’inventaire physique en base.',
        },
      ],
      faq: [
        {
          question: 'Quelle est la différence entre la page Stock (/stock) et la page Inventaires (/inventory) ?',
          answer: 'La page Stock (/stock) est un tableau de bord de consultation en direct des disponibilités et d’émission des transferts logistiques. La page Inventaires (/inventory) est dédiée aux opérations d’audit physique : elle permet de saisir les comptages périodiques et d’ajuster officiellement le stock théorique sur le réel constaté.',
        },
        {
          question: 'Quel est l’impact de la création ou modification d’un inventaire sur le stock ?',
          answer: 'Aucun impact immédiat : tant qu’un inventaire est au statut « En attente », les quantités saisies constituent une simple feuille de travail déclarative. Le stock physique du dépôt n’est absolument pas modifié.',
        },
        {
          question: 'Comment la validation modifie-t-elle les stocks ?',
          answer: 'La validation remplace la quantité en stock de chaque article compté par la quantité physique renseignée (stock.Quantity = dm.Quantity). Si l’article n’avait pas encore de ligne de stock dans ce dépôt, une nouvelle entrée de stock est créée. Cette opération est définitive et irréversible.',
        },
        {
          question: 'Pourquoi les articles non comptés ne sont-ils pas automatiquement remis à zéro ?',
          answer: 'ACYA Élancé prend en charge les inventaires partiels ou tournants (par exemple, inventorier uniquement une famille de bois ou un rayon). Afin de ne pas écraser accidentellement le reste du dépôt, les références omises conservent leur stock théorique. Pour remettre à zéro les articles oubliés ou perdus, utilisez le bouton « Vérifier Oublis » qui génère une régularisation dédiée.',
        },
        {
          question: 'Un inventaire validé peut-il être modifié ou annulé ?',
          answer: 'Non. Une fois validé, l’inventaire devient strictement immuable (lecture seule et réimpression PDF). Pour corriger une erreur après validation, il convient de créer un nouvel inventaire d’ajustement sur les lignes concernées.',
        },
        {
          question: 'Qui peut valider un inventaire physique ?',
          answer: 'Pour garantir la conformité comptable, le bouton « Valider » est réservé aux utilisateurs ayant un rôle d’encadrement (Manager ou Administrateur).',
        },
      ],
      tips: [
        'Utilisez l’import Excel pour les inventaires volumineux : cela permet à plusieurs magasiniers de compter simultanément sur des tableurs avant centralisation.',
        'Avant de valider, vérifiez systématiquement les écarts en déroulant la ligne d’inventaire ou en imprimant la fiche de contrôle.',
        'L’outil « Vérifier Oublis » est essentiel lors d’un inventaire général de fin d’exercice pour apurer les stocks disparus.',
        'La sélection d’un dépôt lors de la création d’une feuille réinitialise la grille en cas de changement pour éviter les incohérences de stock.',
      ],
    },
    prerequisites: [
      {
        id: 'inventory_require_site',
        title: 'Dépôts de stockage requis',
        description: 'Un site de stockage ou dépôt est obligatoire pour pouvoir créer et rattacher des feuilles d’inventaire physique.',
        severity: 'blocking',
        action: { label: 'Configurer les dépôts', href: '/settings?tab=enterprise' },
      },
      {
        id: 'inventory_require_article',
        title: 'Articles du catalogue requis',
        description: 'Votre catalogue doit comporter au moins un article actif pour pouvoir composer des lignes de comptage.',
        severity: 'blocking',
        action: { label: 'Gérer les articles', href: '/articles' },
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
