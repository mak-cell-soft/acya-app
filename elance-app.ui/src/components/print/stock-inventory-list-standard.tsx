import React from 'react';
import { Stock, StockCategoryGroup } from '@/types/stock';
import { Enterprise } from '@/types/settings';
import * as utils from './print-utils';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';

export interface StockInventoryFilterInfo {
  searchQuery?: string;
  siteName?: string;
  hideZeroStock?: boolean;
  totalFilteredCount: number;
  totalRawCount: number;
}

interface StockInventoryListStandardProps {
  categoryGroups: StockCategoryGroup[];
  enterprise: Enterprise;
  filterInfo?: StockInventoryFilterInfo;
  printLocale?: PrintLocale;
}

export function StockInventoryListStandard({
  categoryGroups,
  enterprise,
  filterInfo,
  printLocale,
}: StockInventoryListStandardProps) {
  const ar = printLocale || defaultAr;

  // Aggregate grand totals across all categories
  const grandTotalsMap: { [unit: string]: number } = {};
  let totalAlertsCount = 0;
  let totalZeroStockCount = 0;
  let totalItemsCount = 0;

  categoryGroups.forEach((group) => {
    group.stocks.forEach((stock) => {
      totalItemsCount += 1;
      const unit = stock.merchandise?.article?.unit || 'U';
      grandTotalsMap[unit] = (grandTotalsMap[unit] || 0) + (stock.quantity || 0);

      const minStock = stock.minimumstock || 0;
      if (stock.quantity <= 0) {
        totalZeroStockCount += 1;
      } else if (minStock > 0 && stock.quantity <= minStock) {
        totalAlertsCount += 1;
      }
    });
  });

  const grandUnitTotals = Object.entries(grandTotalsMap).map(([unit, total]) => ({
    unit,
    total,
  }));

  // Construct readable filter summary description
  const filterSummaryParts: string[] = [];
  if (filterInfo?.siteName && filterInfo.siteName !== 'Tous les dépôts') {
    filterSummaryParts.push(`Dépôt : ${filterInfo.siteName}`);
  } else {
    filterSummaryParts.push('Tous les dépôts');
  }

  if (filterInfo?.searchQuery && filterInfo.searchQuery.trim() !== '') {
    filterSummaryParts.push(`Recherche : "${filterInfo.searchQuery}"`);
  }

  if (filterInfo?.hideZeroStock) {
    filterSummaryParts.push('Stocks nuls masqués');
  } else {
    filterSummaryParts.push('Tous les stocks inclus');
  }

  const filterSummaryText = filterSummaryParts.join(' • ');

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

  const getStatusBadge = (stock: Stock) => {
    const qty = stock.quantity || 0;
    const minStock = stock.minimumstock || 0;
    if (qty <= 0) {
      return { label: 'Rupture', className: 'status-rupture' };
    }
    if (minStock > 0 && qty <= minStock) {
      return { label: 'Alerte Seuil', className: 'status-alert' };
    }
    return { label: 'En Stock', className: 'status-normal' };
  };

  return (
    <div className="print-container stock-print-page">
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
            جرد و حالة المخزون
          </h3>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="stock-doc-header">
        <div className="stock-title-box">
          <div className="title-row">
            <h2 className="stock-title">ÉTAT DU STOCK & INVENTAIRE PHYSIQUE</h2>
            <span className="print-date-badge">
              Imprimé le {utils.formatDate(new Date())} à{' '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="filter-description-box">
            <span className="filter-label">Périmètre d'impression :</span>{' '}
            <span className="filter-val">{filterSummaryText}</span>
            <span className="filter-count">
              ({totalItemsCount} référence{totalItemsCount > 1 ? 's' : ''} répertoriée{totalItemsCount > 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Overview */}
      <div className="stock-kpi-summary-grid">
        <div className="kpi-card">
          <div className="kpi-label">Catégories</div>
          <div className="kpi-value">{categoryGroups.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Fiches de Stock</div>
          <div className="kpi-value">{totalItemsCount}</div>
        </div>
        {grandUnitTotals.map((ut) => (
          <div key={ut.unit} className="kpi-card highlight">
            <div className="kpi-label">Total en {ut.unit}</div>
            <div className="kpi-value">
              {formatQuantity(ut.total, ut.unit)} <span className="kpi-unit">{ut.unit}</span>
            </div>
          </div>
        ))}
        {totalAlertsCount > 0 && (
          <div className="kpi-card warning">
            <div className="kpi-label">Alertes Seuil</div>
            <div className="kpi-value">{totalAlertsCount}</div>
          </div>
        )}
        {totalZeroStockCount > 0 && !filterInfo?.hideZeroStock && (
          <div className="kpi-card danger">
            <div className="kpi-label">Ruptures (0)</div>
            <div className="kpi-value">{totalZeroStockCount}</div>
          </div>
        )}
      </div>

      {/* Stock Items by Category Tables */}
      <div className="stock-categories-container">
        {categoryGroups.length === 0 ? (
          <div className="empty-stock-notice">
            <p>Aucun article en stock ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          categoryGroups.map((group, groupIdx) => (
            <div key={group.categoryName || groupIdx} className="category-block">
              {/* Category Header Row */}
              <div className="category-block-header">
                <div className="category-name-tag">
                  <span className="category-icon">▪</span>
                  <span className="category-name">{group.categoryName}</span>
                  <span className="category-count">({group.stocks.length} articles)</span>
                </div>
                <div className="category-subtotals">
                  {group.unitTotals.map((ut) => (
                    <span key={ut.unit} className="category-subtotal-badge">
                      Sous-total : <strong>{formatQuantity(ut.totalQuantity, ut.unit)} {ut.unit}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Items Table for this Category */}
              <table className="stock-items-table">
                <thead>
                  <tr>
                    <th className="col-idx" style={{ width: '4%' }}>#</th>
                    <th className="col-package" style={{ width: '12%' }}>N° Colis / Lot</th>
                    <th className="col-ref" style={{ width: '14%' }}>Réf. Article</th>
                    <th className="col-desc" style={{ width: '28%' }}>Désignation & Spécifications</th>
                    <th className="col-site" style={{ width: '16%' }}>Dépôt / Site</th>
                    <th className="col-min" style={{ width: '8%' }}>Seuil Min</th>
                    <th className="col-qty" style={{ width: '10%' }}>Quantité</th>
                    <th className="col-status" style={{ width: '8%' }}>État</th>
                  </tr>
                </thead>
                <tbody>
                  {group.stocks.map((stock, sIdx) => {
                    const status = getStatusBadge(stock);
                    const unit = stock.merchandise?.article?.unit || 'U';
                    const article = stock.merchandise?.article;
                    const isWood = article?.iswood || article?.categoryid === 1;

                    // Wood Dimensions formatted string
                    const dimensionsParts = [];
                    if (article?.thickness) dimensionsParts.push(`Ép: ${article.thickness}`);
                    if (article?.width) dimensionsParts.push(`Larg: ${article.width}`);
                    if (article?.lengths) dimensionsParts.push(`Long: ${article.lengths}`);
                    const dimensionsStr = dimensionsParts.join(' | ');

                    const siteLabel = stock.site
                      ? `${stock.site.gov ? stock.site.gov + ' - ' : ''}${stock.site.address || ''}`
                      : 'Non assigné';

                    return (
                      <tr key={stock.id || sIdx} className="stock-row">
                        <td className="col-idx">{sIdx + 1}</td>
                        <td className="col-package">
                          <strong>{stock.merchandise?.packagereference || `LOT-${stock.id}`}</strong>
                        </td>
                        <td className="col-ref font-mono">
                          {article?.reference || '—'}
                        </td>
                        <td className="col-desc">
                          <div className="desc-main">{article?.description || 'Sans description'}</div>
                          {isWood && dimensionsStr && (
                            <div className="desc-dim">{dimensionsStr}</div>
                          )}
                        </td>
                        <td className="col-site">{siteLabel}</td>
                        <td className="col-min">
                          {stock.minimumstock > 0 ? (
                            <span>{formatQuantity(stock.minimumstock, unit)} {unit}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="col-qty font-bold">
                          <span className="qty-value">{formatQuantity(stock.quantity, unit)}</span>{' '}
                          <span className="qty-unit">{unit}</span>
                        </td>
                        <td className="col-status">
                          <span className={`status-pill ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="category-footer-row">
                    <td colSpan={6} className="text-right">
                      Total {group.categoryName} :
                    </td>
                    <td className="text-right font-bold" colSpan={2}>
                      {group.unitTotals.map((ut, utIdx) => (
                        <span key={ut.unit}>
                          {utIdx > 0 ? ' • ' : ''}
                          {formatQuantity(ut.totalQuantity, ut.unit)} {ut.unit}
                        </span>
                      ))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Global Grand Total Footer Banner */}
      {categoryGroups.length > 0 && (
        <div className="stock-grand-totals-panel">
          <div className="grand-title">RÉCAPITULATIF GLOBAL DU STOCK</div>
          <div className="grand-metrics">
            <div className="grand-metric-item">
              <span className="label">Total Références :</span>
              <span className="val">{totalItemsCount}</span>
            </div>
            {grandUnitTotals.map((ut) => (
              <div key={ut.unit} className="grand-metric-item">
                <span className="label">Volume / Qté Total ({ut.unit}) :</span>
                <span className="val highlight">{formatQuantity(ut.total, ut.unit)} {ut.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Legal & Stamp Section */}
      <div className="stock-footer-section">
        <div className="footer-notes">
          <p className="note-text">
            Document généré automatiquement pour contrôle de stock et inventaire interne.
          </p>
          <p className="note-text">
            Établi sous réserve des mouvements et réceptions en cours de saisie.
          </p>
        </div>

        {/* Company Stamp / Signature */}
        {ar.stampImageBase64 ? (
          <div className="stamp-container">
            <div className="stamp-title">Cachet & Signature Responsable Dépôt</div>
            <img
              src={ar.stampImageBase64}
              alt="Cachet et Signature"
              className="stamp-image"
            />
          </div>
        ) : (
          <div className="signature-box">
            <div className="sig-title">Visa / Signature Responsable Stock</div>
            <div className="sig-line"></div>
          </div>
        )}
      </div>
    </div>
  );
}
