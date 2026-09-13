import React from 'react';
import { Customer, GOUVERNORATES_TN, SOCIETY_PREFIXES } from '@/types/customer';
import { Document, DocumentTypes } from '@/types/document';
import { PurchasedMerchandise } from '@/services/components/deep-search.service';
import { Enterprise } from '@/types/settings';
import { PrintLocale } from '@/hooks/use-print-locale';
import defaultAr from '@/locales/print-ar.json';
import * as utils from './print-utils';

/**
 * Interface defining input contract for CustomerReportStandard.
 * NOTE: C#/API Contract Assumption:
 * - Documents are retrieved from GET /Document/counterpart/{id} (DocumentDto)
 * - Purchased merchandise is retrieved from GET /DeepSearch/customer-purchases/{customerId}
 * - Enterprise branding is provided by useEnterprise()
 */
export interface CustomerReportStandardProps {
  customer: Customer;
  documents?: Document[];
  purchasedMerchandise?: PurchasedMerchandise[];
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

/**
 * CustomerReportStandard
 * 
 * Aesthetic Direction: Editorial Refined Business Luxury (Tunisian Corporate Context).
 * Optimized for multi-page A4 printing with:
 * - High typographic hierarchy (Outfit for headlines, Inter for structured financial figures)
 * - Complete customer profile & tax identifiers (Matricule Fiscal, CIN, Patente)
 * - KPI financial summary strips (Ventes HT, TVA, TTC, Réglé, Solde)
 * - Document-level sales history with payment statuses
 * - Merchandise sales lines breakdown
 * - Automatic repeated table headers (@media print) & clean page breaking
 */
export function CustomerReportStandard({
  customer,
  documents = [],
  purchasedMerchandise = [],
  enterprise,
  printLocale,
}: CustomerReportStandardProps) {
  const ar = printLocale || defaultAr;

  // Filter to sales documents only: Factures, BLs, Avoirs, Bons de commande, Devis
  const salesDocs = documents.filter(d => 
    d.type === DocumentTypes.customerInvoice ||
    d.type === DocumentTypes.customerDeliveryNote ||
    d.type === DocumentTypes.customerInvoiceReturn ||
    d.type === DocumentTypes.customerOrder ||
    d.type === DocumentTypes.customerQuote
  );

  // Financial aggregates calculated from existing backend document values
  // Invoices & Delivery notes represent sales; Avoirs represent deductions
  const totalHT = salesDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.customerInvoiceReturn ? -1 : 1;
    return sum + (d.total_ht_net_doc || 0) * mult;
  }, 0);

  const totalTVA = salesDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.customerInvoiceReturn ? -1 : 1;
    return sum + (d.total_tva_doc || 0) * mult;
  }, 0);

  const totalTTC = salesDocs.reduce((sum, d) => {
    const mult = d.type === DocumentTypes.customerInvoiceReturn ? -1 : 1;
    return sum + (d.total_net_ttc || 0) * mult;
  }, 0);

  const totalPaid = salesDocs.reduce((sum, d) => sum + (d.total_paid || 0), 0);
  const totalRemaining = salesDocs.reduce((sum, d) => sum + (d.remaining_balance || 0), 0);

  // Resolve customer metadata labels
  const isSociety = SOCIETY_PREFIXES.some(p => p.id === customer.prefix) || !!customer.name;
  const personTypeLabel = isSociety ? 'Personne Morale (Société)' : 'Personne Physique';
  const govLabel = GOUVERNORATES_TN.find(g => g.key.toString() === customer.gouvernorate || g.value === customer.gouvernorate)?.value || customer.gouvernorate || '—';
  const customerFullName = customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Client sans nom';
  const currentBalance = customer.currentbalance ?? customer.openingbalance ?? 0;

  // Helper to map document type to a clean readable French label
  const getDocTypeTitle = (type: DocumentTypes) => {
    switch (type) {
      case DocumentTypes.customerInvoice:
        return 'Facture';
      case DocumentTypes.customerDeliveryNote:
        return 'Bon de Livraison';
      case DocumentTypes.customerInvoiceReturn:
        return 'Avoir Client';
      case DocumentTypes.customerOrder:
        return 'Commande';
      case DocumentTypes.customerQuote:
        return 'Devis';
      default:
        return 'Document';
    }
  };

  // Helper to map payment and document status to a readable badge text
  const getPaymentStatusLabel = (doc: Document) => {
    if (doc.type === DocumentTypes.customerInvoice) {
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
      {/* 1. Header Section: Corporate Tunisian Layout (French Left, Logo Center, Arabic Right) */}
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
          <div className="report-arabic-badge">تقرير نشاط الحريف</div>
        </div>
      </div>

      {/* 2. Document Title Banner */}
      <div className="report-title-banner">
        <div className="title-left">
          <h2 className="title-text">FICHE &amp; HISTORIQUE CLIENT</h2>
          <p className="subtitle-text">
            Édité le {utils.formatDate(new Date())} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' • '}Réf. Client: <span className="mono font-bold">CL-{String(customer.id).padStart(4, '0')}</span>
          </p>
        </div>
        <div className="title-right">
          <span className="person-type-badge">{personTypeLabel}</span>
        </div>
      </div>

      {/* 3. Customer Identification Grid Card */}
      <div className="customer-card-grid">
        <div className="card-column">
          <div className="section-title">1. Identification &amp; Fiscalité</div>
          <div className="info-item">
            <span className="info-label">Raison Sociale / Nom :</span>
            <span className="info-value font-bold text-corp-blue">{customerFullName}</span>
          </div>
          {customer.name && (customer.firstname || customer.lastname) && (
            <div className="info-item">
              <span className="info-label">Contact / Représentant :</span>
              <span className="info-value">{customer.firstname} {customer.lastname}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Civilité / Forme :</span>
            <span className="info-value">{customer.prefix || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Matricule Fiscal (M.F.) :</span>
            <span className="info-value mono font-bold">{customer.taxregistrationnumber || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">N° C.I.N. :</span>
            <span className="info-value mono">{customer.identitycardnumber || '—'}</span>
          </div>
          {customer.patentecode && (
            <div className="info-item">
              <span className="info-label">Code Patente :</span>
              <span className="info-value mono">{customer.patentecode}</span>
            </div>
          )}
        </div>

        <div className="card-column">
          <div className="section-title">2. Coordonnées &amp; Localisation</div>
          <div className="info-item">
            <span className="info-label">Adresse :</span>
            <span className="info-value">{customer.address || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Gouvernorat :</span>
            <span className="info-value font-semibold">{govLabel}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Téléphone 1 :</span>
            <span className="info-value mono font-bold">{customer.phonenumberone || '—'}</span>
          </div>
          {customer.phonenumbertwo && (
            <div className="info-item">
              <span className="info-label">Téléphone 2 :</span>
              <span className="info-value mono">{customer.phonenumbertwo}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Email :</span>
            <span className="info-value">{customer.email || '—'}</span>
          </div>
          {customer.jobtitle && (
            <div className="info-item">
              <span className="info-label">Activité :</span>
              <span className="info-value">{customer.jobtitle}</span>
            </div>
          )}
        </div>

        <div className="card-column financial-column">
          <div className="section-title">3. Conditions Financières</div>
          <div className="info-item">
            <span className="info-label">Solde Actuel :</span>
            <span className={`info-value font-bold text-lg mono ${currentBalance < 0 ? 'text-danger' : 'text-success'}`}>
              {utils.formatNumber(currentBalance)} TND
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Plafond Crédit :</span>
            <span className="info-value mono font-semibold">
              {customer.maximumsalesbar ? `${utils.formatNumber(customer.maximumsalesbar)} TND` : 'Non plafonné'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Remise Maximale :</span>
            <span className="info-value mono font-semibold">{customer.maximumdiscount ?? 0} %</span>
          </div>
          {customer.notes && (
            <div className="info-item notes-item">
              <span className="info-label">Observations :</span>
              <span className="info-value italic text-xs">{customer.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Financial KPI Summary Strip */}
      <div className="financial-kpi-strip">
        <div className="kpi-cell">
          <span className="kpi-label">DOCUMENTS VENTE</span>
          <span className="kpi-value mono">{salesDocs.length}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">TOTAL VENTES HT</span>
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
          <span className="kpi-label">RESTE À PAYER</span>
          <span className="kpi-value mono font-bold text-danger">{utils.formatNumber(totalRemaining)}</span>
        </div>
      </div>

      {/* 5. Sales Documents Table */}
      <div className="report-section">
        <div className="report-section-header">
          <h3 className="section-heading">4. HISTORIQUE DES DOCUMENTS DE VENTE</h3>
          <span className="section-badge">{salesDocs.length} document(s)</span>
        </div>

        {salesDocs.length === 0 ? (
          <div className="empty-notice">
            <p className="empty-text">Aucun document de vente enregistré pour ce client.</p>
          </div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th className="th-date">Date</th>
                <th className="th-type">Type</th>
                <th className="th-num">N° Document</th>
                <th className="th-amount text-right">Total HT (TND)</th>
                <th className="th-amount text-right">TVA (TND)</th>
                <th className="th-amount text-right">Total TTC (TND)</th>
                <th className="th-amount text-right">Réglé (TND)</th>
                <th className="th-amount text-right">Solde Dû (TND)</th>
                <th className="th-status text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {salesDocs.map((doc) => {
                const isAvoir = doc.type === DocumentTypes.customerInvoiceReturn;
                const sign = isAvoir ? -1 : 1;
                return (
                  <tr key={doc.id || doc.docnumber} className={isAvoir ? 'row-avoir' : ''}>
                    <td className="mono">{utils.formatDate(doc.creationdate)}</td>
                    <td className="font-semibold">{getDocTypeTitle(doc.type)}</td>
                    <td className="mono font-bold text-corp-blue">{doc.docnumber || '—'}</td>
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
                <td colSpan={3} className="font-bold text-right uppercase">Totaux Ventes :</td>
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

      {/* 6. Purchased Merchandise / Products Details Section */}
      {purchasedMerchandise.length > 0 && (
        <div className="report-section page-break-inside-avoid">
          <div className="report-section-header">
            <h3 className="section-heading">5. ARTICLES &amp; MARCHANDISES FACTURÉES</h3>
            <span className="section-badge">{purchasedMerchandise.length} article(s)</span>
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th className="th-ref">Réf. Article</th>
                <th className="th-desc">Désignation</th>
                <th className="th-pkg">Colisage</th>
                <th className="th-qty text-right">Qté Totale</th>
                <th className="th-unit text-center">Unité</th>
                <th className="th-price text-right">P.U. Moyen HT</th>
                <th className="th-amount text-right">Total HT Net (TND)</th>
                <th className="th-docs">Documents Associés</th>
              </tr>
            </thead>
            <tbody>
              {purchasedMerchandise.map((item, idx) => {
                const lineTotalHT = (item.totalQuantity || 0) * (item.averagePriceHT || 0);
                return (
                  <tr key={`${item.merchandiseId}-${idx}`}>
                    <td className="mono font-bold">{item.articleReference}</td>
                    <td className="font-medium">{item.articleDescription || '—'}</td>
                    <td className="mono text-xs">{item.packageReference || 'Standard'}</td>
                    <td className="mono text-right font-bold">{utils.formatQuantity(item.totalQuantity, item.unit)}</td>
                    <td className="text-center text-xs">{item.unit || 'Pcs'}</td>
                    <td className="mono text-right">{utils.formatNumber(item.averagePriceHT)}</td>
                    <td className="mono text-right font-bold">{utils.formatNumber(lineTotalHT)}</td>
                    <td className="text-xs mono text-muted">
                      {item.relatedDocuments && item.relatedDocuments.length > 0
                        ? item.relatedDocuments.slice(0, 4).join(', ') + (item.relatedDocuments.length > 4 ? '...' : '')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. Legal Certification & Balance in Words */}
      <div className="certification-box page-break-inside-avoid">
        <p className="certification-text">
          Arrêté le solde de compte de ce client à la somme de :
        </p>
        <p className="certification-words font-bold">
          {utils.numberToWordsFR(totalRemaining > 0 ? totalRemaining : currentBalance)}
        </p>
        <p className="certification-sub">
          (Solde net débiteur : <span className="mono font-bold">{utils.formatNumber(totalRemaining > 0 ? totalRemaining : currentBalance)} TND</span>)
        </p>
      </div>

      {/* 8. Stamp / Signature Image if available */}
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

      {/* 9. Standard Legal Footer */}
      <div className="report-footer-legal">
        <p className="legal-title">
          {enterprise.name} {enterprise.description ? `— ${enterprise.description}` : ''}
        </p>
        <p className="legal-address">
          Siège social: {enterprise.siegeAddress} | Tél: {enterprise.phone} | Email: {enterprise.email} | M.F: {enterprise.matriculeFiscal}
        </p>
        <p className="legal-notice">
          Document généré électroniquement via la plateforme de gestion ERP ACYA • Valeur indicative faisant foi selon le grand livre comptable.
        </p>
      </div>
    </div>
  );
}
