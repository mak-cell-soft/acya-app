// Site flag / priority indicator
export type SiteFlag = 'green' | 'orange' | 'red';

// Role types for employees
export type EmployeeRole =
  | 'chef_chantier'
  | 'ouvrier'
  | 'menuisier'
  | 'macon'
  | 'electricien'
  | 'plombier'
  | 'peintre';

// Production categories
export type ProductionCategory =
  | 'bois'       // aménagement, porte, cuisine, dressing
  | 'aluminium'  // store, fenêtre, porte
  | 'fer'        // portail, fenêtre
  | 'climatisation'
  | 'plomberie';

export type ProductionStatus = 'planifie' | 'en_cours' | 'termine';

export type ToolType = 'fixe' | 'mobile';

// ── Entities ──────────────────────────────────────────────

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  phone?: string;
  joinedAt: Date;
}

export interface Production {
  id: string;
  label: string;
  category: ProductionCategory;
  subCategory?: string;          // e.g. "cuisine", "store", "portail"
  status: ProductionStatus;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  unit: string;                  // m³, kg, sacs, t., u., m
  quantity: number;
  minThreshold: number;          // triggers low-stock alert
  category: string;              // bois massif, brique, fer, ciment, etc.
}

export interface ConsumableItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minThreshold: number;
}

export interface Tool {
  id: string;
  name: string;
  type: ToolType;
  quantity: number;
  location: string;              // zone label or vehicle id
  vehicleId?: string;            // set only when type === 'mobile'
}

export interface Magasin {
  responsable: Employee;
  tools: Tool[];
}

export interface Vehicle {
  id: string;
  label: string;                 // e.g. "Camion Iveco"
  plateNumber: string;
  livreur: Employee;
  mobileMaterials: string[];     // free-text cargo descriptions
}

export interface Architect {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface LifecycleEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  status: 'done' | 'current' | 'pending';
}

// ── Main entity ────────────────────────────────────────────

export interface ConstructionSite {
  id: string;
  name: string;
  description: string;
  flag: SiteFlag;
  location: string;
  coordinates?: { lat: number; lng: number };
  createdAt: Date;
  estimatedEndDate?: Date;
  progressPercent: number;       // 0–100, computed or manual

  employees: Employee[];
  productions: Production[];
  materials: MaterialItem[];
  consumables: ConsumableItem[];
  magasin: Magasin;
  vehicles: Vehicle[];
  architect?: Architect;
  lifecycle: LifecycleEvent[];

  internalNote?: string;         // free text, shown as colored note box
}
