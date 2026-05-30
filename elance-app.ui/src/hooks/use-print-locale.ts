import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors the top-level structure of src/locales/print-ar.json */
export interface PrintLocaleLabels {
  client: string;
  address: string;
  tvaCode: string;
  date: string;
  docNumberBL: string;
  docNumberInvoice: string;
  accountNumber: string;
  designations: string;
  unit: string;
  qty: string;
  unitPriceHT: string;
  tva: string;
  discount: string;
  amountHT: string;
  taxe: string;
  base: string;
  percent: string;
  value: string;
  arreteLaSomme: string;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  stampTax: string;
  withholdingTax: string;
  netPayable: string;
  signClient: string;
  truckNumber: string;
  driverName: string;
  cin: string;
  controlBL: string;
  controlExit: string;
}

export interface PrintLocale {
  originalLabel: {
    bl: string;
    invoice: string;
  };
  originalLabelTransfer: string;
  companyArabicName: string;
  companyArabicCapital: string;
  companyArabicAddress: string;
  labels: PrintLocaleLabels;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Read the current print-ar.json via the Next.js API route (filesystem read). */
async function fetchPrintLocale(): Promise<PrintLocale> {
  const res = await fetch('/api/print-locale');
  if (!res.ok) throw new Error('Impossible de charger la configuration d\'impression.');
  return res.json();
}

/** Write the updated print-ar.json via the Next.js API route (filesystem write). */
async function savePrintLocale(data: PrintLocale): Promise<void> {
  const res = await fetch('/api/print-locale', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Impossible d\'enregistrer la configuration d\'impression.');
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns the current print-ar.json content from the server. */
export function usePrintLocale() {
  return useQuery<PrintLocale>({
    queryKey: ['print-locale'],
    queryFn: fetchPrintLocale,
  });
}

/** Mutation hook — saves the full updated PrintLocale object to disk and invalidates the cache. */
export function useUpdatePrintLocale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: savePrintLocale,
    onSuccess: () => {
      // NOTE: Invalidate so the UI re-fetches fresh data after the file write.
      queryClient.invalidateQueries({ queryKey: ['print-locale'] });
      toast.success('Configuration d\'impression mise à jour avec succès.');
    },
    onError: (error: Error) => {
      console.error('[useUpdatePrintLocale]', error);
      toast.error('Erreur lors de la mise à jour de la configuration d\'impression.');
    },
  });
}
