export interface ModulePermissions {
  canRead: boolean;
  canAdd: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface AppPermissionsMap {
  articles: ModulePermissions;
  customers: ModulePermissions;
  providers: ModulePermissions;
  purchases: ModulePermissions;
  sales: ModulePermissions;
  stock: ModulePermissions;
  inventory: ModulePermissions;
  accounting: ModulePermissions;
  hr: ModulePermissions;
  configuration: ModulePermissions;
}

export interface UserPermissionsDto {
  userId: number;
  permissions: AppPermissionsMap;
}

export const PERMISSION_MODULES = [
  { key: 'articles',      label: 'Articles',         icon: 'Package' },
  { key: 'customers',     label: 'Clients',           icon: 'Users' },
  { key: 'providers',     label: 'Fournisseurs',      icon: 'Truck' },
  { key: 'purchases',     label: 'Achats',            icon: 'ShoppingCart' },
  { key: 'sales',         label: 'Ventes',            icon: 'TrendingUp' },
  { key: 'stock',         label: 'Stock & Mouvements', icon: 'Warehouse' },
  { key: 'inventory',     label: 'Inventaire',        icon: 'ClipboardList' },
  { key: 'accounting',    label: 'Comptabilité',      icon: 'Calculator' },
  { key: 'hr',            label: 'RH & Équipe',       icon: 'Briefcase' },
  { key: 'configuration', label: 'Configuration',     icon: 'Settings' },
] as const;

export type PermissionModuleKey = keyof AppPermissionsMap;
export type PermissionActionKey = keyof ModulePermissions;
