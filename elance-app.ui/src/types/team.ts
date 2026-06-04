export interface Person {
  id: number;
  firstname: string;
  lastname: string;
  guid?: string;
  birthdate?: string;
  cin?: string;
  idcnss?: string;
  role: number;
  address?: string;
  birthtown?: string;
  bankname?: string;
  bankaccount?: string;
  phonenumber?: string;
  isdeleted: boolean;
  isappuser: boolean;
  hiredate?: string;
  firedate?: string;
  creationdate?: string;
  updatedate?: string;
  basesalary: number;
  overtimehours: number;
  updatedby: number;
}

export interface AppUser {
  id: number;
  login: string;
  email: string;
  isactive: boolean;
  defaultsite?: number;
  identerprise?: number;
  password?: string;
  person?: Person;
}

// Roles that control system access (JWT claims, authorization)
export const SYSTEM_ROLES = [
  { value: 10, label: 'Super Admin', color: 'red' },
  { value: 20, label: 'Admin', color: 'orange' },
  { value: 30, label: 'Utilisateur', color: 'blue' },
] as const;

// Roles that describe job functions (HR / operational)
export const FUNCTION_ROLES = [
  { value: 40, label: 'Conducteur de Travaux', color: 'violet' },
  { value: 45, label: 'Conducteur Véhicule (Chauffeur)', color: 'cyan' },
  { value: 50, label: 'Vendeur', color: 'teal' },
  { value: 60, label: 'Agent de Facturation', color: 'amber' },
  { value: 70, label: 'Gestionnaire de Stock', color: 'lime' },
] as const;

// Combined for backward-compatible lookup
export const ALL_ROLES = [...SYSTEM_ROLES, ...FUNCTION_ROLES];

export const ROLE_LABELS: Record<number, string> = Object.fromEntries(
  ALL_ROLES.map(r => [r.value, r.label])
);

export const ROLE_COLORS: Record<number, string> = Object.fromEntries(
  ALL_ROLES.map(r => [r.value, r.color])
);
