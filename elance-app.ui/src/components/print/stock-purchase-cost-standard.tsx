import React from 'react';
import { Enterprise } from '@/types/settings';
import * as utils from './print-utils';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';

export interface StockValuationPrintItem {
  merchandiseId: number;
  reference: string;
  description: string;
  currentStockQuantity: number;
  unit: string;
  cmpUnitPrice: number;
  cmpTotalValue: number;
  lastPurchasePrice: number;
  lastPurchaseTotalValue: number;
}

export interface StockPurchaseCostFilterInfo {
  year: number;
  searchQuery?: string;
  totalFilteredCount: number;
  totalRawCount: number;
}

interface StockPurchaseCostStandardProps {
  valuationItems: StockValuationPrintItem[];
  enterprise: Enterprise;
  filterInfo: StockPurchaseCostFilterInfo;
  printLocale?: PrintLocale;
}

export function StockPurchaseCostStandard({
  valuationItems,
  enterprise,
  filterInfo,
  printLocale,
}: StockPurchaseCostStandardProps) {
  const ar = printLocale || defaultAr;

  // Calculate totals
  let totalCmpValue = 0;
  let totalLastPurchaseValue = 0;
  const quantitiesByUnit: { [unit: string]: number } = {};

  valuationItems.forEach((item) => {
    totalCmpValue += item.cmpTotalValue || 0;
    totalLastPurchaseValue += item.lastPurchaseTotalValue || 0;

    const unit = (item.unit || 'U').trim().toUpperCase();
    quantitiesByUnit[unit] = (quantitiesByUnit[unit] || 0) + (item.currentStockQuantity || 0);
  });

  const unitTotals = Object.entries(quantitiesByUnit).map(([unit, total]) => ({
    unit,
    total,
  }));

  const varianceValue = totalLastPurchaseValue - totalCmpValue;

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

  const isFiltered = Boolean(filterInfo.searchQuery && filterInfo.searchQuery.trim() !== '');

  return (
    <div className="print-container cost-print-page">
      {/* Header Section with Official Enterprise Branding */}
      <div className="header">
        {/* Left: French Enterprise Details */}
        <div className="company-info">
          <h2 className="company-name">{enterprise.name}</h2>
          <p className="company-details">
            {enterprise.description ||
              (enterprise.capital ? `S.A. au Capital de ${enterprise.capital}` : '')}
          </p>
          <p className="company-details">{enterprise.siegeAddress}</p>
          <p className="company-details">
            Tél: {enterprise.phone} {enterprise.mobileOne ? `| ${enterprise.mobileOne}` : ''}
          </p>
          <p className="company-details">{enterprise.email}</p>
          <p className="company-details">
            M.F: {enterprise.matriculeFiscal}{' '}
            {enterprise.commercialregister ? `| R.C: ${enterprise.commercialregister}` : ''}
          </p>
        </div>

        {/* Center: Styled Logo */}
        <div className="center-section">
          <div className="logo" style={{ borderColor: '#0f172a' }}>
            <h1
              className="logo-text"
              style={{
                fontWeight: 600,
                fontSize: '18pt',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              {enterprise.name}
            </h1>
          </div>
          <div className="location">
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'TUNIS'}</p>
          </div>
        </div>

        {/* Right: Arabic Details */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <h3 className="original-label" style={{ marginTop: '3mm' }}>
            كلفة الشراء و تقييم المخزون
          </h3>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="cost-doc-header">
        <div className="cost-title-box">
          <div className="title-row">
            <h2 className="cost-title">
              VALORISATION DES STOCKS & COÛT D'ACHAT (CMP / DERNIER PRIX)
            </h2>
            <span className="print-date-badge">
              Imprimé le {utils.formatDate(new Date())} à{' '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="filter-description-box">
            <span className="filter-label">Exercice d'imputation :</span>{' '}
            <span className="filter-val">Année {filterInfo.year}</span>
            {isFiltered && (
              <>
                <span className="sep">•</span>
                <span className="filter-label">Filtre appliqué :</span>{' '}
                <span className="filter-val">"{filterInfo.searchQuery}"</span>
              </>
            )}
            <span className="filter-count">
              ({valuationItems.length} article{valuationItems.length > 1 ? 's' : ''} valorisé{valuationItems.length > 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Overview Cards */}
      <div className="cost-kpi-summary-grid">
        <div className="kpi-card">
          <div className="kpi-label">Volume Total en Stock</div>
          <div className="kpi-quantities">
            {unitTotals.length === 0 ? (
              <span className="kpi-value">0</span>
            ) : (
              unitTotals.map((ut, idx) => (
                <span key={ut.unit} className="kpi-val-span">
                  {idx > 0 ? ' • ' : ''}
                  <strong>{formatQuantity(ut.total, ut.unit)}</strong> <small>{ut.unit}</small>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="kpi-card highlight-cmp">
          <div className="kpi-label">Valeur Totale CMP (HT)</div>
          <div className="kpi-value">{utils.formatNumber(totalCmpValue)} <span className="kpi-currency">TND</span></div>
          <div className="kpi-subtitle">Coût Moyen Pondéré {filterInfo.year}</div>
        </div>

        <div className="kpi-card highlight-last">
          <div className="kpi-label">Valeur Totale Dernier Prix (HT)</div>
          <div className="kpi-value">{utils.formatNumber(totalLastPurchaseValue)} <span className="kpi-currency">TND</span></div>
          <div className="kpi-subtitle">Dernière facture/commande {filterInfo.year}</div>
        </div>

        <div className="kpi-card highlight-variance">
          <div className="kpi-label">Écart de Valorisation (HT)</div>
          <div className="kpi-value" style={{ color: varianceValue >= 0 ? '#15803d' : '#b91c1c' }}>
            {varianceValue >= 0 ? '+' : ''}{utils.formatNumber(varianceValue)} <span className="kpi-currency">TND</span>
          </div>
          <div className="kpi-subtitle">Dernier Prix vs CMP</div>
        </div>
      </div>

      {/* Main Valuation Items Table */}
      <div className="cost-items-table-container">
        <table className="cost-items-table">
          <thead>
            <tr>
              <th className="col-idx" style={{ width: '4%' }}>#</th>
              <th className="col-ref" style={{ width: '13%' }}>Référence</th>
              <th className="col-desc" style={{ width: '27%' }}>Désignation Article</th>
              <th className="col-qty" style={{ width: '12%' }}>Stock Actuel</th>
              <th className="col-cmp-pu" style={{ width: '11%' }}>P.U. CMP (HT)</th>
              <th className="col-cmp-val" style={{ width: '11%' }}>Valeur CMP (HT)</th>
              <th className="col-last-pu" style={{ width: '11%' }}>Dernier P.U. (HT)</th>
              <th className="col-last-val" style={{ width: '11%' }}>Valeur Dernier (HT)</th>
            </tr>
          </thead>
          <tbody>
            {valuationItems.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8} style={{ textAlign: 'center', padding: '15px' }}>
                  Aucun article trouvé pour les critères sélectionnés.
                </td>
              </tr>
            ) : (
              valuationItems.map((item, idx) => {
                const unit = (item.unit || 'U').trim();
                return (
                  <tr key={item.merchandiseId || idx} className="cost-row">
                    <td className="col-idx">{idx + 1}</td>
                    <td className="col-ref font-mono">{item.reference || '—'}</td>
                    <td className="col-desc">{item.description || '—'}</td>
                    <td className="col-qty font-bold">
                      <span>{formatQuantity(item.currentStockQuantity, unit)}</span>{' '}
                      <span className="qty-unit">{unit}</span>
                    </td>
                    <td className="col-cmp-pu bg-cmp-subtle">
                      {item.cmpUnitPrice > 0 ? utils.formatNumber(item.cmpUnitPrice) : '—'}
                    </td>
                    <td className="col-cmp-val font-bold bg-cmp-subtle">
                      {item.cmpTotalValue > 0 ? utils.formatNumber(item.cmpTotalValue) : '—'}
                    </td>
                    <td className="col-last-pu bg-last-subtle">
                      {item.lastPurchasePrice > 0 ? utils.formatNumber(item.lastPurchasePrice) : '—'}
                    </td>
                    <td className="col-last-val font-bold bg-last-subtle">
                      {item.lastPurchaseTotalValue > 0 ? utils.formatNumber(item.lastPurchaseTotalValue) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {valuationItems.length > 0 && (
            <tfoot>
              <tr className="cost-footer-row">
                <td colSpan={3} className="text-right font-bold">
                  TOTAL GLOBAL ({valuationItems.length} articles) :
                </td>
                <td className="text-right font-bold">
                  {unitTotals.map((ut, i) => (
                    <span key={ut.unit}>
                      {i > 0 ? ' • ' : ''}
                      {formatQuantity(ut.total, ut.unit)} {ut.unit}
                    </span>
                  ))}
                </td>
                <td className="bg-cmp-subtle"></td>
                <td className="text-right font-bold bg-cmp-subtle text-amber-700">
                  {utils.formatNumber(totalCmpValue)} TND
                </td>
                <td className="bg-last-subtle"></td>
                <td className="text-right font-bold bg-last-subtle text-blue-700">
                  {utils.formatNumber(totalLastPurchaseValue)} TND
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer Legal & Stamp Section */}
      <div className="cost-footer-section">
        <div className="footer-notes">
          <p className="note-text font-bold">
            Méthodologie de valorisation :
          </p>
          <p className="note-text">
            • <strong>CMP (Coût Moyen Pondéré) :</strong> Calculé sur la base des achats nets HT (remises déduites) cumulés sur l'exercice {filterInfo.year}.
          </p>
          <p className="note-text">
            • <strong>Dernier Prix d'Achat :</strong> Valorisé selon le prix unitaire net HT de la dernière commande/facture enregistrée en {filterInfo.year}.
          </p>
          <p className="note-text">
            • Les articles sans achats enregistrés sur l'exercice {filterInfo.year} sont valorisés à 0,000 TND.
          </p>
        </div>

        {/* Company Stamp / Signature */}
        {ar.stampImageBase64 ? (
          <div className="stamp-container">
            <div className="stamp-title">Cachet & Visa Direction / Comptabilité</div>
            <img
              src={ar.stampImageBase64}
              alt="Cachet et Signature"
              className="stamp-image"
            />
          </div>
        ) : (
          <div className="signature-box">
            <div className="sig-title">Visa Direction / Contrôle de Gestion</div>
            <div className="sig-line"></div>
          </div>
        )}
      </div>
    </div>
  );
}
