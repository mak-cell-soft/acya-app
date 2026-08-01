import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-TN', { 
    style: 'currency', 
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value || 0).replace('TND', 'DT');
};

export type SolvencyStatus = 'green' | 'orange' | 'red';

export interface SolvencyInfo {
  status: SolvencyStatus;
  label: string;
  description: string;
}

export function computeCustomerSolvency(
  balance: number,
  creditLimit: number,
  unpaidCount: number = 0
): SolvencyInfo {
  if (balance <= 0 && unpaidCount === 0) {
    return {
      status: 'green',
      label: 'Solvable / Optimal',
      description: 'Plafond OK, pas de solde débiteur ni d\'impayés.',
    };
  }

  if (creditLimit > 0) {
    if (balance >= creditLimit) {
      return {
        status: 'red',
        label: 'Plafond Atteint',
        description: `Le solde débiteur (${balance.toLocaleString('fr-FR')} TND) a atteint ou dépassé le plafond de crédit (${creditLimit.toLocaleString('fr-FR')} TND).`,
      };
    } else {
      return {
        status: 'orange',
        label: 'Solde Débiteur',
        description: `Solde débiteur de ${balance.toLocaleString('fr-FR')} TND sur plafond de ${creditLimit.toLocaleString('fr-FR')} TND.`,
      };
    }
  }

  if (balance > 0) {
    return {
      status: 'red',
      label: 'Solde Débiteur (Sans Plafond)',
      description: `Client en solde débiteur de ${balance.toLocaleString('fr-FR')} TND sans plafond de crédit configuré.`,
    };
  }

  return {
    status: 'orange',
    label: 'Factures en Attente',
    description: `Le solde est à jour mais ${unpaidCount} facture(s) reste(nt) non réglée(s).`,
  };
}

