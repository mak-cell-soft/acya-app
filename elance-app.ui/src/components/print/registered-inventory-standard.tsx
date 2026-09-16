import React from 'react';
import { Document, DocStatus } from '@/types/document';
import { Enterprise } from '@/types/settings';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';
import * as utils from './print-utils';

export interface RegisteredInventoryStandardProps {
  document: Document;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

/**
 * RegisteredInventoryStandard
 *
 * Professional A4 Portrait printable report for an individual registered physical inventory document.
 * Displays:
 * - Enterprise header with French & Arabic corporate details
 * - Document title banner with reference, status badge, inventory date, warehouse site, and operator
 * - Summary KPI cards (total items, unit breakdowns)
 * - Complete counted articles table with package numbers, wood specifications, and counted quantities
 * - Formal signature & validation blocks for warehouse manager, counter, and management
 */
export function RegisteredInventoryStandard({
  document,
  enterprise,
  printLocale,
}: RegisteredInventoryStandardProps) {
  const ar = printLocale || defaultAr;

  const isValidated = document.docstatus === DocStatus.Validated;
  const docRef = document.docnumber || `INV-${document.id}`;

  const operatorName = document.appuser?.person
    ? `${document.appuser.person.firstname || ''} ${document.appuser.person.lastname || ''}`.trim()
    : document.appuser?.login || '—';

  const siteAddress = document.sales_site
    ? [document.sales_site.gov, document.sales_site.address].filter(Boolean).join(' - ') || 'Dépôt Central'
    : 'Dépôt Central';

  // Format quantities according to unit precision (e.g., M3 uses 3 decimal places)
  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 =
      unit?.toUpperCase().includes('M3') ||
      unit?.toUpperCase().includes('MÈTRE 3') ||
      unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    }
    return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  };

  // Group grand totals by unit
  const totalsByUnit: Record<string, number> = {};
  const merchandises = document.merchandises || [];

  merchandises.forEach((m) => {
    const unit = m.article?.unit || 'U';
    const qty = m.quantity || 0;
    totalsByUnit[unit] = (totalsByUnit[unit] || 0) + qty;
  });

  const unitTotalsList = Object.entries(totalsByUnit).map(([unit, total]) => ({
    unit,
    total,
  }));

  return (
    <div className="print-container registered-inventory-print-page">
      {/* 1. Enterprise Branding Header */}
      <div className="header">
        {/* Left: Enterprise Info */}
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

        {/* Center: Styled Logo */}
        <div className="center-section">
          <div className="logo">
            <h1 className="logo-text">{enterprise.name}</h1>
          </div>
          <div className="location">
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'TUNISIE'}</p>
          </div>
        </div>

        {/* Right: Arabic Info and Label */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <div className="original-label">جرد المخزون الفعلي</div>
        </div>
      </div>

      {/* 2. Document Title and Metadata Box */}
      <div className="inventory-doc-header">
        <div className="inventory-title-box">
          <div className="title-row">
            <div className="title-left-group">
              <h2 className="inventory-title">
                FICHE D&apos;INVENTAIRE PHYSIQUE N° <span className="mono">{docRef}</span>
              </h2>
            </div>
            <div className="title-status-group">
              {isValidated ? (
                <span className="status-badge-validated">VALIDÉ / مؤكد</span>
              ) : (
                <span className="status-badge-pending">EN ATTENTE DE VALIDATION / في انتظار المصادقة</span>
              )}
            </div>
          </div>

          <div className="inventory-metadata-grid">
            <div className="meta-item">
              <span className="meta-label">Date d&apos;inventaire :</span>
              <span className="meta-value font-bold">
                {utils.formatDate(document.creationdate)}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Dépôt / Emplacement :</span>
              <span className="meta-value font-bold text-corp-blue">
                {siteAddress}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Opérateur / Responsable :</span>
              <span className="meta-value font-bold">
                {operatorName}
              </span>
            </div>
            {document.description && (
              <div className="meta-item full-width">
                <span className="meta-label">Observations :</span>
                <span className="meta-value">{document.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      <div className="inventory-kpi-grid">
        <div className="kpi-card highlight">
          <div className="kpi-label">Lignes Répertoriées</div>
          <div className="kpi-value">{merchandises.length}</div>
        </div>
        {unitTotalsList.map((item, idx) => (
          <div key={idx} className="kpi-card">
            <div className="kpi-label">Total Compté ({item.unit})</div>
            <div className="kpi-value">
              {formatQuantity(item.total, item.unit)}{' '}
              <span className="kpi-unit">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Counted Merchandise Items Table */}
      <div className="inventory-table-container">
        <table className="inventory-items-table">
          <thead>
            <tr>
              <th className="th-index">#</th>
              <th className="th-ref">Référence</th>
              <th className="th-designation">Désignation de l&apos;article</th>
              <th className="th-package">N° Colis / Paquet</th>
              <th className="th-details">Détails / Longueurs</th>
              <th className="th-unit">Unité</th>
              <th className="th-quantity text-right">Quantité Comptée</th>
            </tr>
          </thead>
          <tbody>
            {merchandises.length === 0 ? (
              <tr>
                <td colSpan={7} className="td-empty">
                  Aucun article répertorié dans cet inventaire.
                </td>
              </tr>
            ) : (
              merchandises.map((merch, idx) => {
                const article = merch.article;
                const lengths = merch.lisoflengths || [];
                const hasLengths = lengths.length > 0;

                // Build readable wood lengths summary if present
                const lengthsSummary = hasLengths
                  ? lengths
                      .map((l) => {
                        const lenValue = l.length?.name || (l.customLength ? `${l.customLength} cm` : '');
                        return `${lenValue}: ${l.nbpieces} pcs`;
                      })
                      .join(' • ')
                  : null;

                const isWood = article?.iswood;
                const woodDimensions = isWood
                  ? [
                      article?.thickness?.name ? `Ép: ${article.thickness.name}mm` : null,
                      article?.width?.name ? `Larg: ${article.width.name}mm` : null,
                    ]
                      .filter(Boolean)
                      .join(' | ')
                  : null;

                return (
                  <tr key={merch.id || idx} className={idx % 2 === 1 ? 'row-alt' : ''}>
                    <td className="td-index font-bold">{idx + 1}</td>
                    <td className="td-ref mono font-bold text-corp-blue">
                      {article?.reference || '—'}
                    </td>
                    <td className="td-designation">
                      <div className="art-desc font-semibold">{article?.description || merch.description || '—'}</div>
                      {woodDimensions && (
                        <div className="wood-spec-pill">{woodDimensions}</div>
                      )}
                    </td>
                    <td className="td-package mono">
                      {merch.packagereference || 'Standard'}
                    </td>
                    <td className="td-details">
                      {lengthsSummary ? (
                        <div className="lengths-badge-list">{lengthsSummary}</div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="td-unit font-bold">
                      {article?.unit || 'U'}
                    </td>
                    <td className="td-quantity text-right font-bold mono">
                      {formatQuantity(merch.quantity || 0, article?.unit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Formal Signatures and Observations Box */}
      <div className="inventory-signatures-section">
        <div className="signature-box">
          <div className="sign-title">Opérateur / Compteur</div>
          <div className="sign-sub">Nom: {operatorName}</div>
          <div className="sign-space"></div>
          <div className="sign-mention">Signature & Date</div>
        </div>

        <div className="signature-box">
          <div className="sign-title">Responsable de Dépôt</div>
          <div className="sign-sub">Site: {siteAddress}</div>
          <div className="sign-space"></div>
          <div className="sign-mention">Signature & Date</div>
        </div>

        <div className="signature-box">
          <div className="sign-title">Direction Générale / Audit</div>
          <div className="sign-sub">Validation finale</div>
          <div className="sign-space"></div>
          <div className="sign-mention">Cachet & Visa</div>
        </div>
      </div>

      {/* 6. Legal Footer */}
      <div className="inventory-footer">
        <div className="footer-left">
          <span>Document généré par Élancé ERP • Réf. {docRef}</span>
        </div>
        <div className="footer-right">
          <span>
            Édité le {utils.formatDate(new Date())} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
