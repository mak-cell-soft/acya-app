import React from 'react';
import { Supplier, GOUVERNORATES_TN, SUPPLIER_CATEGORIES } from '@/types/customer';
import { Document, DocumentTypes } from '@/types/document';
import { Enterprise } from '@/types/settings';
import { PrintLocale } from '@/hooks/use-print-locale';
import defaultAr from '@/locales/print-ar.json';
import * as utils from './print-utils';

export interface SupplierReportStandardProps {
  supplier: Supplier;
  documents?: Document[];
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

/**
 * SupplierReportStandard
 * 
 * Aesthetic Direction: Editorial Refined Corporate Dossier (Tunisian Business Context).
 * Renders an A4 multi-page printable report containing:
 * - Enterprise header with Arabic metadata & badge "تقرير نشاط المزود"
 * - Complete supplier profile, tax identifiers (MF, CIN, Patente) & bank details
 * - Financial summary KPI strip (Total Achats HT, TVA, TTC, Réglé, Solde Dû)
 * - Chronological table of purchase documents (Factures, BR, Avoirs, Commandes)
 * - Certified debt amount in words (Dinars et Millimes tunisiens)
 * - Automatic repeated table headers (@media print)
 */
export function SupplierReportStandard({
  supplier,
  documents = [],
  enterprise,
  printLocale,
}: SupplierReportStandardProps) {
  const ar = printLocale || defaultAr;

  // Filter to purchase documents only
  const purchaseDocs = documents.filter(d =>
    d.type === DocumentTypes.supplierInvoice ||
    d.type === DocumentTypes.supplierReceipt ||
    d.type === DocumentTypes.supplierInvoiceReturn ||
    d.type === DocumentTypes.supplierOrder
  );

  // Financial aggregates calculated from existing backend document values
  // Invoices & Receipts represent purchases; Avoirs represent deductions
  const totalHT = purchaseDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.supplierInvoiceReturn ? -1 : 1;
    return sum + (d.total_ht_net_doc || 0) * mult;
  }, 0);

  const totalTVA = purchaseDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.supplierInvoiceReturn ? -1 : 1;
    return sum + (d.total_tva_doc || 0) * mult;
  }, 0);

  const totalTTC = purchaseDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.supplierInvoiceReturn ? -1 : 1;
    return sum + (d.total_net_ttc || 0) * mult;
  }, 0);

  const totalPaid = purchaseDocs.reduce((sum, d) => sum + (d.total_paid || 0), 0);
  const totalRemaining = purchaseDocs.reduce((sum, d) => sum + (d.remaining_balance || 0), 0);

  // Resolve supplier metadata
  const govLabel = GOUVERNORATES_TN.find(g => g.key.toString() === supplier.gouvernorate || g.value === supplier.gouvernorate)?.value || supplier.gouvernorate || '—';
  const categoryLabel = SUPPLIER_CATEGORIES.find(c => c.id.toString() === supplier.jobtitle?.toString() || c.value === supplier.jobtitle)?.value || supplier.jobtitle || '—';
  const supplierFullName = supplier.name || `${supplier.firstname || ''} ${supplier.lastname || ''}`.trim() || 'Fournisseur sans nom';
  const currentBalance = supplier.currentbalance ?? supplier.openingbalance ?? 0;
  const typeLabel = supplier.type === 'Both' ? 'Partenaire Mixte (Client & Fournisseur)' : 'Fournisseur Exclusif';

  // Helper to map document type to a clean readable French label
  const getDocTypeTitle = (type: DocumentTypes) => {
    switch (type) {
      case DocumentTypes.supplierInvoice:
        return 'Facture Fournisseur';
      case DocumentTypes.supplierReceipt:
        return 'Bon de Réception';
      case DocumentTypes.supplierInvoiceReturn:
        return 'Avoir Fournisseur';
      case DocumentTypes.supplierOrder:
        return 'Bon de Commande';
      default:
        return 'Document Achat';
    }
  };

  // Helper to map payment and document status to a readable badge text
  const getPaymentStatusLabel = (doc: Document) => {
    if (doc.type === DocumentTypes.supplierInvoice) {
      if (doc.billingstatus === 2 || doc.remaining_balance === 0) return 'Payée';
      if (doc.billingstatus === 1 || (doc.total_paid && doc.total_paid > 0)) return 'Partielle';
      return 'Non Payée';
    }
    if (doc.docstatus === 2) return 'Validé';
    if (doc.docstatus === 1) return 'Partiel';
    return 'Brouillon';
  };

  return (
    <div className="customer-report-container">
      {/* 1. Header Section */}
      <div className="report-header">
        <div className="company-info">
          <h2 className="company-name">{enterprise.name}</h2>
          <p className="company-details">
            {enterprise.description || (enterprise.capital ? `S.A. au Capital de ${enterprise.capital}` : '')}
          </p>
          <p className="company-details">{enterprise.siegeAddress}</p>
          <p className="company-details">
            Tél: {enterprise.phone} {enterprise.mobileOne ? `| ${enterprise.mobileOne}` : ''}
          </p>
          <p className="company-details">{enterprise.email}</p>
          <p className="company-details">
            M.F: <span className="mono font-bold">{enterprise.matriculeFiscal}</span>
            {enterprise.commercialregister ? ` | R.C: ${enterprise.commercialregister}` : ''}
          </p>
        </div>

        <div className="center-section">
          <div className="logo-box">
            <h1 className="logo-title">{enterprise.name}</h1>
          </div>
          <div className="location-tag">
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'TUNISIE'}</p>
          </div>
        </div>

        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <div className="report-arabic-badge">تقرير نشاط المزود</div>
        </div>
      </div>

      {/* 2. Document Title Banner */}
      <div className="report-title-banner">
        <div className="title-left">
          <h2 className="title-text">FICHE &amp; HISTORIQUE FOURNISSEUR</h2>
          <p className="subtitle-text">
            Édité le {utils.formatDate(new Date())} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' • '}Réf. Fournisseur: <span className="mono font-bold">FR-{String(supplier.id).padStart(4, '0')}</span>
          </p>
        </div>
        <div className="title-right">
          <span className="person-type-badge">{typeLabel}</span>
        </div>
      </div>

      {/* 3. Supplier Identification Grid Card */}
      <div className="customer-card-grid">
        <div className="card-column">
          <div className="section-title">1. Identification &amp; Fiscalité</div>
          <div className="info-item">
            <span className="info-label">Raison Sociale / Nom :</span>
            <span className="info-value font-bold text-corp-blue">{supplierFullName}</span>
          </div>
          {supplier.name && (supplier.firstname || supplier.lastname) && (
            <div className="info-item">
              <span className="info-label">Responsable :</span>
              <span className="info-value">{supplier.firstname} {supplier.lastname}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Civilité / Forme :</span>
            <span className="info-value">{supplier.prefix || 'STE'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Matricule Fiscal (M.F.) :</span>
            <span className="info-value mono font-bold">{supplier.taxregistrationnumber || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">N° C.I.N. :</span>
            <span className="info-value mono">{supplier.identitycardnumber || '—'}</span>
          </div>
          {supplier.patentecode && (
            <div className="info-item">
              <span className="info-label">Code Patente :</span>
              <span className="info-value mono">{supplier.patentecode}</span>
            </div>
          )}
        </div>

        <div className="card-column">
          <div className="section-title">2. Coordonnées &amp; Localisation</div>
          <div className="info-item">
            <span className="info-label">Adresse :</span>
            <span className="info-value">{supplier.address || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Gouvernorat :</span>
            <span className="info-value font-semibold">{govLabel}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Téléphone 1 :</span>
            <span className="info-value mono font-bold">{supplier.phonenumberone || '—'}</span>
          </div>
          {supplier.phonenumbertwo && (
            <div className="info-item">
              <span className="info-label">Téléphone 2 :</span>
              <span className="info-value mono">{supplier.phonenumbertwo}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Email :</span>
            <span className="info-value">{supplier.email || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Catégorie :</span>
            <span className="info-value font-semibold">{categoryLabel}</span>
          </div>
        </div>

        <div className="card-column financial-column">
          <div className="section-title">3. Situation Financière</div>
          <div className="info-item">
            <span className="info-label">Solde Fournisseur :</span>
            <span className={`info-value font-bold text-lg mono ${currentBalance < 0 ? 'text-danger' : 'text-success'}`}>
              {utils.formatNumber(currentBalance)} TND
            </span>
          </div>
          {supplier.bankname && (
            <div className="info-item">
              <span className="info-label">Banque :</span>
              <span className="info-value font-semibold">{supplier.bankname}</span>
            </div>
          )}
          {supplier.bankaccountnumber && (
            <div className="info-item">
              <span className="info-label">RIB / Compte :</span>
              <span className="info-value mono text-xs">{supplier.bankaccountnumber}</span>
            </div>
          )}
          {supplier.notes && (
            <div className="info-item notes-item">
              <span className="info-label">Observations :</span>
              <span className="info-value italic text-xs">{supplier.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Financial KPI Summary Strip */}
      <div className="financial-kpi-strip">
        <div className="kpi-cell">
          <span className="kpi-label">DOCUMENTS ACHAT</span>
          <span className="kpi-value mono">{purchaseDocs.length}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">TOTAL ACHATS HT</span>
          <span className="kpi-value mono">{utils.formatNumber(totalHT)}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">TOTAL TVA</span>
          <span className="kpi-value mono">{utils.formatNumber(totalTVA)}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">TOTAL NET TTC</span>
          <span className="kpi-value mono font-bold text-corp-blue">{utils.formatNumber(totalTTC)}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">TOTAL RÉGLÉ</span>
          <span className="kpi-value mono text-success">{utils.formatNumber(totalPaid)}</span>
        </div>
        <div className="kpi-cell highlight-cell">
          <span className="kpi-label">RESTE DÛ / SOLDE</span>
          <span className="kpi-value mono font-bold text-danger">{utils.formatNumber(totalRemaining)}</span>
        </div>
      </div>

      {/* 5. Purchase Documents Table */}
      <div className="report-section">
        <div className="report-section-header">
          <h3 className="section-heading">4. HISTORIQUE DES DOCUMENTS D&apos;ACHAT</h3>
          <span className="section-badge">{purchaseDocs.length} document(s)</span>
        </div>

        {purchaseDocs.length === 0 ? (
          <div className="empty-notice">
            <p className="empty-text">Aucun document d&apos;achat enregistré pour ce fournisseur.</p>
          </div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th className="th-date">Date</th>
                <th className="th-type">Type</th>
                <th className="th-num">N° Interne</th>
                <th className="th-ref">Réf. Fournisseur</th>
                <th className="th-amount text-right">Total HT (TND)</th>
                <th className="th-amount text-right">TVA (TND)</th>
                <th className="th-amount text-right">Total TTC (TND)</th>
                <th className="th-amount text-right">Réglé (TND)</th>
                <th className="th-amount text-right">Solde Dû (TND)</th>
                <th className="th-status text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {purchaseDocs.map((doc) => {
                const isAvoir = doc.type === DocumentTypes.supplierInvoiceReturn;
                const sign = isAvoir ? -1 : 1;
                return (
                  <tr key={doc.id || doc.docnumber} className={isAvoir ? 'row-avoir' : ''}>
                    <td className="mono">{utils.formatDate(doc.creationdate)}</td>
                    <td className="font-semibold">{getDocTypeTitle(doc.type)}</td>
                    <td className="mono font-bold text-corp-blue">{doc.docnumber || '—'}</td>
                    <td className="mono text-xs">{doc.supplierReference || '—'}</td>
                    <td className="mono text-right">{utils.formatNumber((doc.total_ht_net_doc || 0) * sign)}</td>
                    <td className="mono text-right">{utils.formatNumber((doc.total_tva_doc || 0) * sign)}</td>
                    <td className="mono text-right font-bold">{utils.formatNumber((doc.total_net_ttc || 0) * sign)}</td>
                    <td className="mono text-right text-success">{utils.formatNumber(doc.total_paid || 0)}</td>
                    <td className="mono text-right font-bold text-danger">{utils.formatNumber(doc.remaining_balance || 0)}</td>
                    <td className="text-center">
                      <span className="status-tag">{getPaymentStatusLabel(doc)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-totals-row">
                <td colSpan={4} className="font-bold text-right uppercase">Totaux Achats :</td>
                <td className="mono font-bold text-right">{utils.formatNumber(totalHT)}</td>
                <td className="mono font-bold text-right">{utils.formatNumber(totalTVA)}</td>
                <td className="mono font-bold text-right">{utils.formatNumber(totalTTC)}</td>
                <td className="mono font-bold text-right text-success">{utils.formatNumber(totalPaid)}</td>
                <td className="mono font-bold text-right text-danger">{utils.formatNumber(totalRemaining)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* 6. Legal Certification & Balance in Words */}
      <div className="certification-box page-break-inside-avoid">
        <p className="certification-text">
          Arrêté le solde de compte fournisseur à la somme de :
        </p>
        <p className="certification-words font-bold">
          {utils.numberToWordsFR(totalRemaining > 0 ? totalRemaining : currentBalance)}
        </p>
        <p className="certification-sub">
          (Solde net à régler : <span className="mono font-bold">{utils.formatNumber(totalRemaining > 0 ? totalRemaining : currentBalance)} TND</span>)
        </p>
      </div>

      {/* 7. Stamp / Signature Image if available */}
      {ar.stampImageBase64 && (
        <div className="stamp-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ar.stampImageBase64}
            alt="Cachet et Signature"
            className="stamp-image"
          />
        </div>
      )}

      {/* 8. Standard Legal Footer */}
      <div className="report-footer-legal">
        <p className="legal-title">
          {enterprise.name} {enterprise.description ? `— ${enterprise.description}` : ''}
        </p>
        <p className="legal-address">
          Siège social: {enterprise.siegeAddress} | Tél: {enterprise.phone} | Email: {enterprise.email} | M.F: {enterprise.matriculeFiscal}
        </p>
        <p className="legal-notice">
          Document généré électroniquement via la plateforme de gestion ERP ACYA • Situation comptable fournisseur.
        </p>
      </div>
    </div>
  );
}
