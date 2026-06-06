'use client';

import * as React from 'react';
import { usePrintLocale, useUpdatePrintLocale, PrintLocale, PrintLocaleLabels } from '@/hooks/use-print-locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Save, Loader2, Printer, Type, Building2, Tag, TableProperties,
  Receipt, AlignLeft, Hash,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Renders a single labelled text input field with consistent styling. */
function FieldInput({
  id,
  label,
  value,
  onChange,
  rtl = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rtl?: boolean;
  placeholder?: string;
}) {
  return (
    // NOTE: Each field is a self-contained labeled unit for consistent vertical rhythm.
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold text-forest-500 uppercase tracking-wider">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={rtl ? 'rtl' : 'ltr'}
        className={`h-10 rounded-xl bg-sand-50/60 border-forest-100 focus:bg-white focus:border-forest-600 transition-all font-medium text-sm${rtl ? ' text-right font-arabic' : ''}`}
      />
    </div>
  );
}

/** Renders a labelled group card section with an icon header. */
function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid lg:grid-cols-3 gap-8">
      <div className="space-y-2">
        <h3 className="text-base font-bold text-forest-900 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">{icon}</div>
          {title}
        </h3>
        <p className="text-[0.85rem] text-sand-400 font-medium leading-relaxed">{subtitle}</p>
      </div>
      <Card className="lg:col-span-2 border-forest-100 rounded-xl shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </section>
  );
}

// ─── Sub-group label ──────────────────────────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 pt-2 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-forest-300">{label}</span>
      <div className="flex-1 h-px bg-forest-50" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PrintTab() {
  const { data: locale, isLoading } = usePrintLocale();
  const updateLocale = useUpdatePrintLocale();

  // NOTE: Local state mirrors the JSON structure so each input has a controlled value.
  const [form, setForm] = React.useState<PrintLocale | null>(null);

  // NOTE: Sync local form state when the server data arrives.
  React.useEffect(() => {
    if (locale) setForm(structuredClone(locale));
  }, [locale]);

  // ─── Setters ────────────────────────────────────────────────────────────────

  const setTop = (key: keyof Omit<PrintLocale, 'originalLabel' | 'labels'>, value: string) =>
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const setOriginalLabel = (key: keyof PrintLocale['originalLabel'], value: string) =>
    setForm((prev) => prev ? { ...prev, originalLabel: { ...prev.originalLabel, [key]: value } } : prev);

  const setLabel = (key: keyof PrintLocaleLabels, value: string) =>
    setForm((prev) => prev ? { ...prev, labels: { ...prev.labels, [key]: value } } : prev);

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!form) return;
    updateLocale.mutate(form);
  };

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (isLoading || (!form && !locale)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500 font-medium">Erreur lors du chargement de la configuration.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Réessayer</Button>
      </div>
    );
  }

  const lbl = form.labels;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-12 pb-12"
    >
      {/* ── Section 1 : Identité Société ───────────────────────────────── */}
      <SectionCard
        icon={<Building2 className="w-4 h-4" />}
        title="Identité Société (Arabe)"
        subtitle="Ces informations apparaissent en arabe sur vos documents imprimés."
      >
        <div className="grid grid-cols-1 gap-5">
          <FieldInput
            id="companyArabicName"
            label="Nom de la société"
            value={form.companyArabicName}
            onChange={(v) => setTop('companyArabicName', v)}
            rtl
            placeholder="اسم الشركة"
          />
          <FieldInput
            id="companyArabicCapital"
            label="Capital social"
            value={form.companyArabicCapital}
            onChange={(v) => setTop('companyArabicCapital', v)}
            rtl
            placeholder="رأس المال"
          />
          <FieldInput
            id="companyArabicAddress"
            label="Adresse du siège"
            value={form.companyArabicAddress}
            onChange={(v) => setTop('companyArabicAddress', v)}
            rtl
            placeholder="العنوان الاجتماعي"
          />
        </div>
      </SectionCard>

      <div className="h-px bg-forest-50" />

      {/* ── Section 2 : En-tête document ──────────────────────────────── */}
      <SectionCard
        icon={<Printer className="w-4 h-4" />}
        title="En-tête des Documents"
        subtitle="Libellés qui apparaissent en haut de chaque document imprimé."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldInput
            id="originalLabel_bl"
            label="Original BL"
            value={form.originalLabel.bl}
            onChange={(v) => setOriginalLabel('bl', v)}
          />
          <FieldInput
            id="originalLabel_invoice"
            label="Original Facture"
            value={form.originalLabel.invoice}
            onChange={(v) => setOriginalLabel('invoice', v)}
          />
          <FieldInput
            id="originalLabelTransfer"
            label="Transfert Stock"
            value={form.originalLabelTransfer}
            onChange={(v) => setTop('originalLabelTransfer', v)}
          />
        </div>
      </SectionCard>

      <div className="h-px bg-forest-50" />

      {/* ── Section 3 : Informations Client ───────────────────────────── */}
      <SectionCard
        icon={<Tag className="w-4 h-4" />}
        title="Informations Client"
        subtitle="Étiquettes affichées dans l'en-tête client du document."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldInput id="lbl_client"        label="Client"         value={lbl.client}        onChange={(v) => setLabel('client', v)} />
          <FieldInput id="lbl_address"       label="Adresse"        value={lbl.address}       onChange={(v) => setLabel('address', v)} />
          <FieldInput id="lbl_tvaCode"       label="Code TVA"       value={lbl.tvaCode}       onChange={(v) => setLabel('tvaCode', v)} />
          <FieldInput id="lbl_accountNumber" label="N° Compte"      value={lbl.accountNumber} onChange={(v) => setLabel('accountNumber', v)} />
          <FieldInput id="lbl_date"          label="Date"           value={lbl.date}          onChange={(v) => setLabel('date', v)} />
          <FieldInput id="lbl_docNumberBL"   label="N° BL"          value={lbl.docNumberBL}   onChange={(v) => setLabel('docNumberBL', v)} />
          <FieldInput id="lbl_docNumberInvoice" label="N° BL/Facture" value={lbl.docNumberInvoice} onChange={(v) => setLabel('docNumberInvoice', v)} />
        </div>
      </SectionCard>

      <div className="h-px bg-forest-50" />

      {/* ── Section 4 : Colonnes du Tableau ───────────────────────────── */}
      <SectionCard
        icon={<TableProperties className="w-4 h-4" />}
        title="Colonnes du Tableau"
        subtitle="En-têtes des colonnes dans le corps du document."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <FieldInput id="lbl_designations" label="Désignations" value={lbl.designations} onChange={(v) => setLabel('designations', v)} />
          <FieldInput id="lbl_unit"         label="Unité"        value={lbl.unit}         onChange={(v) => setLabel('unit', v)} />
          <FieldInput id="lbl_qty"          label="Quantité"     value={lbl.qty}          onChange={(v) => setLabel('qty', v)} />
          <FieldInput id="lbl_unitPriceHT"  label="P.U. HT"      value={lbl.unitPriceHT}  onChange={(v) => setLabel('unitPriceHT', v)} />
          <FieldInput id="lbl_tva"          label="TVA"          value={lbl.tva}          onChange={(v) => setLabel('tva', v)} />
          <FieldInput id="lbl_discount"     label="Remise"       value={lbl.discount}     onChange={(v) => setLabel('discount', v)} />
          <FieldInput id="lbl_amountHT"     label="Montant HT"   value={lbl.amountHT}     onChange={(v) => setLabel('amountHT', v)} />
          <FieldInput id="lbl_taxe"         label="Taxe"         value={lbl.taxe}         onChange={(v) => setLabel('taxe', v)} />
          <FieldInput id="lbl_base"         label="Base"         value={lbl.base}         onChange={(v) => setLabel('base', v)} />
          <FieldInput id="lbl_percent"      label="Pourcentage"  value={lbl.percent}      onChange={(v) => setLabel('percent', v)} />
          <FieldInput id="lbl_value"        label="Valeur"       value={lbl.value}        onChange={(v) => setLabel('value', v)} />
        </div>
      </SectionCard>

      <div className="h-px bg-forest-50" />

      {/* ── Section 5 : Totaux & Bas de Page ──────────────────────────── */}
      <SectionCard
        icon={<Receipt className="w-4 h-4" />}
        title="Totaux & Pied de Page"
        subtitle="Libellés du récapitulatif financier et des zones de signature."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GroupLabel label="Totaux" />
          <FieldInput id="lbl_arreteLaSomme"  label="Arrêté la somme"    value={lbl.arreteLaSomme}  onChange={(v) => setLabel('arreteLaSomme', v)} />
          <FieldInput id="lbl_totalHT"        label="Total H.T.V.A"      value={lbl.totalHT}        onChange={(v) => setLabel('totalHT', v)} />
          <FieldInput id="lbl_totalTVA"       label="Total TVA"          value={lbl.totalTVA}       onChange={(v) => setLabel('totalTVA', v)} />
          <FieldInput id="lbl_totalTTC"       label="Total TTC"          value={lbl.totalTTC}       onChange={(v) => setLabel('totalTTC', v)} />
          <FieldInput id="lbl_stampTax"       label="Timbre Fiscal"      value={lbl.stampTax}       onChange={(v) => setLabel('stampTax', v)} />
          <FieldInput id="lbl_withholdingTax" label="Retenue à la Source" value={lbl.withholdingTax} onChange={(v) => setLabel('withholdingTax', v)} />
          <FieldInput id="lbl_netPayable"     label="Net à Payer"        value={lbl.netPayable}     onChange={(v) => setLabel('netPayable', v)} />

          <GroupLabel label="Signatures & Transport" />
          <FieldInput id="lbl_signClient"  label="Signature Client"  value={lbl.signClient}  onChange={(v) => setLabel('signClient', v)} />
          <FieldInput id="lbl_truckNumber" label="N° Camion"         value={lbl.truckNumber} onChange={(v) => setLabel('truckNumber', v)} />
          <FieldInput id="lbl_driverName"  label="Nom Chauffeur"     value={lbl.driverName}  onChange={(v) => setLabel('driverName', v)} />
          <FieldInput id="lbl_cin"         label="C.I.N"             value={lbl.cin}         onChange={(v) => setLabel('cin', v)} />
          <FieldInput id="lbl_controlBL"   label="Contrôle BL"       value={lbl.controlBL}   onChange={(v) => setLabel('controlBL', v)} />
          <FieldInput id="lbl_controlExit" label="Contrôle Sortie"   value={lbl.controlExit} onChange={(v) => setLabel('controlExit', v)} />
        </div>
      </SectionCard>

      {/* ── Save Button ───────────────────────────────────────────────── */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={updateLocale.isPending}
          id="print-locale-save"
          className="bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 h-12 px-8 transition-all duration-300"
        >
          {updateLocale.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Enregistrer les étiquettes
        </Button>
      </div>
    </motion.div>
  );
}

