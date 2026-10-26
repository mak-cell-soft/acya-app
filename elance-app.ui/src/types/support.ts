export type SupportPriority = 'Normale' | 'Élevée' | 'Critique';

export interface SupportPriorityOption {
  value: SupportPriority;
  label: string;
  description: string;
  colorClass: string;
  badgeClass: string;
}

export const SUPPORT_PRIORITIES: SupportPriorityOption[] = [
  {
    value: 'Normale',
    label: 'Normale',
    description: 'Question ou problème non bloquant',
    colorClass: 'border-slate-200 hover:border-slate-300 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  {
    value: 'Élevée',
    label: 'Élevée',
    description: 'Problème important affectant un flux de travail',
    colorClass: 'border-amber-200 hover:border-amber-300 text-amber-800',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  {
    value: 'Critique',
    label: 'Critique',
    description: 'Interruption opérationnelle majeure bloquant l\'activité',
    colorClass: 'border-rose-200 hover:border-rose-300 text-rose-800',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
  }
];

export interface SupportCategoryConfig {
  id: string;
  label: string;
  iconName: string;
  moduleKey?: 'isManagingConstructions' | 'isManagingProduction';
  subcategories: string[];
}

export const SUPPORT_CATEGORIES: SupportCategoryConfig[] = [
  {
    id: 'Application mobile',
    label: 'Application mobile',
    iconName: 'Smartphone',
    subcategories: [
      "Demande d'accès à l'application mobile",
      'Installation',
      'Problème de connexion',
      'Problème de synchronisation',
      'Autre problème mobile'
    ]
  },
  {
    id: 'Gestion du stock',
    label: 'Gestion du stock',
    iconName: 'Warehouse',
    subcategories: [
      'Quantité de stock incorrecte',
      'Entrée de stock',
      'Sortie de stock',
      'Inventaire',
      'Transfert de stock',
      'Autre problème de stock'
    ]
  },
  {
    id: 'Gestion des articles',
    label: 'Gestion des articles',
    iconName: 'Package',
    subcategories: [
      "Création ou modification d'un article",
      'Référence incorrecte',
      'Prix incorrect',
      'Article introuvable',
      "Autre problème d'article"
    ]
  },
  {
    id: 'Ressources humaines',
    label: 'Ressources humaines',
    iconName: 'Users',
    subcategories: [
      "Création ou modification d'un employé",
      "Gestion de l'équipe",
      'Problème de présence',
      'Informations incorrectes',
      'Accès aux fonctionnalités RH',
      'Autre problème RH'
    ]
  },
  {
    id: 'Chantiers & Production',
    label: 'Chantiers & Production',
    iconName: 'Factory',
    moduleKey: 'isManagingConstructions',
    subcategories: [
      'Gestion des chantiers',
      'Suivi des opérations',
      'Gestion de la production',
      'Étapes de fabrication',
      "Coûts de main-d'œuvre",
      'Autre problème'
    ]
  },
  {
    id: 'Autre demande',
    label: 'Autre demande',
    iconName: 'HelpCircle',
    subcategories: [
      "Question sur l'utilisation",
      "Demande d'évolution",
      "Demande d'information",
      'Problème technique',
      'Autre'
    ]
  }
];

export interface SupportContextData {
  mobileAccessType?: 'new_install' | 'additional_device';
  mobilePlatform?: 'android' | 'ios' | 'both';
  userCount?: number;
  issueStartTime?: string;
  errorMessage?: string;
  articleId?: number;
  articleName?: string;
  articleReference?: string;
  salesSiteId?: number;
  salesSiteName?: string;
  employeeId?: number;
  employeeName?: string;
  chantierId?: number;
  chantierName?: string;
  productionOrderId?: number;
  expectedResult?: string;
  observedResult?: string;
}

export interface SupportTicketResponse {
  ticketReference: string;
  category: string;
  subcategory: string;
  priority: string;
  subject: string;
  createdAt: string;
  emailStatus: string;
  emailDispatched: boolean;
  attachmentFileName?: string;
}
