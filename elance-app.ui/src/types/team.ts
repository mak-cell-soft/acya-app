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

export const ROLE_LABELS: Record<number, string> = {
  10: 'Super Admin',
  20: 'Admin',
  30: 'Utilisateur',
  40: 'Conducteur de Travaux',
  55: 'Commercial / Vendeur', // Seller is 50 in Roles.cs? Wait!
  50: 'Vendeur',
  60: 'Agent de Facturation',
  70: 'Gestionnaire de Stock'
};
