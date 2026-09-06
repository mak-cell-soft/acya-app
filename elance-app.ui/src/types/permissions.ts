export interface ModulePermissions {
  canRead: boolean;
  canAdd: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface AppPermissionsMap {
  analytics: ModulePermissions;
  articles: ModulePermissions;
  customers: ModulePermissions;
  providers: ModulePermissions;
  purchases: ModulePermissions;
  sales: ModulePermissions;
  stock: ModulePermissions;
  inventory: ModulePermissions;
  accounting: ModulePermissions;
  hr: ModulePermissions;
  vehicles: ModulePermissions;
  configuration: ModulePermissions;
  chantier: ModulePermissions;
}

export interface UserPermissionsDto {
  userId: number;
  permissions: AppPermissionsMap;
}

export type PermissionModuleKey = keyof AppPermissionsMap;
export type PermissionActionKey = keyof ModulePermissions;

export interface PermissionModuleDefinition {
  key: PermissionModuleKey;
  label: string;
  icon: string;
  // NOTE: Optional tenant feature key required to activate this module in UI/Permissions dialog
  requiredFeature?: 'isManagingConstructions' | 'isSalingWood';
}

export const PERMISSION_MODULES: readonly PermissionModuleDefinition[] = [
  { key: 'analytics',     label: 'Analyses',          icon: 'BarChart3' },
  { key: 'articles',      label: 'Articles',         icon: 'Package' },
  { key: 'customers',     label: 'Clients',           icon: 'Users' },
  { key: 'providers',     label: 'Fournisseurs',      icon: 'Truck' },
  { key: 'purchases',     label: 'Achats',            icon: 'ShoppingCart' },
  { key: 'sales',         label: 'Ventes',            icon: 'TrendingUp' },
  { key: 'stock',         label: 'Stock & Mouvements', icon: 'Warehouse' },
  { key: 'inventory',     label: 'Inventaire',        icon: 'ClipboardList' },
  { key: 'accounting',    label: 'Comptabilité',      icon: 'Calculator' },
  { key: 'vehicles',      label: 'Véhicules',         icon: 'Car' },
  { key: 'hr',            label: 'RH & Équipe',       icon: 'Briefcase' },
  { key: 'configuration', label: 'Configuration',     icon: 'Settings' },
  { key: 'chantier',      label: 'Chantiers',         icon: 'HardHat', requiredFeature: 'isManagingConstructions' },
] as const;
