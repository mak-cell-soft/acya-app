import React from 'react';
import { Article } from '@/types/article';
import { Enterprise } from '@/types/settings';
import { PrintLocale } from '@/hooks/use-print-locale';
import defaultAr from '@/locales/print-ar.json';
import * as utils from './print-utils';

export interface ArticlesFilterInfo {
  search?: string;
  categoryName?: string;
  subCategoryName?: string;
}

export interface ArticlesInventoryStandardProps {
  articlesList: Article[];
  stockMap?: Map<number, { total: number; breakdown: { siteName: string; quantity: number; unit: string }[] }>;
  enterprise: Enterprise;
  filterInfo?: ArticlesFilterInfo;
  printLocale?: PrintLocale;
}

/**
 * ArticlesInventoryStandard
 *
 * Professional A4 Landscape printable inventory report of all filtered articles.
 * Displays:
 * - Enterprise header with French & Arabic corporate details
 * - Active filters breakdown and edition timestamp
 * - Inventory & stock summary KPI strip (in-stock, low-stock, out-of-stock, unit sums)
 * - Complete articles table with wood-specific specifications and real-time stock
 * - Legal footer notices
 */
export function ArticlesInventoryStandard({
  articlesList = [],
  stockMap,
  enterprise,
  filterInfo,
  printLocale,
}: ArticlesInventoryStandardProps) {
  const ar = printLocale || defaultAr;

  // Build readable filter description
  const filterParts: string[] = [];
  if (filterInfo?.search && filterInfo.search.trim() !== '') {
    filterParts.push(`Recherche: "${filterInfo.search.trim()}"`);
  }
  if (filterInfo?.categoryName && filterInfo.categoryName !== 'all' && filterInfo.categoryName !== 'Toutes les catégories') {
    filterParts.push(`Catégorie: ${filterInfo.categoryName}`);
  }
  if (filterInfo?.subCategoryName && filterInfo.subCategoryName !== 'all' && filterInfo.subCategoryName !== 'Toutes les sous-catégories') {
    filterParts.push(`Sous-catégorie: ${filterInfo.subCategoryName}`);
  }

  const activeFiltersLabel = filterParts.length > 0 ? filterParts.join(' • ') : 'Tous les articles (Aucun filtre)';

  // Calculate statistics across all filtered articles
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const stockByUnit: Record<string, number> = {};

  articlesList.forEach((art) => {
    const currentStock = stockMap ? (stockMap.get(art.id)?.total ?? 0) : 0;
    const minQty = art.minquantity || 0;
    const unit = art.unit || 'PCS';

    stockByUnit[unit] = (stockByUnit[unit] || 0) + currentStock;

    if (currentStock <= 0) {
      outOfStockCount++;
    } else if (minQty > 0 && currentStock <= minQty) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  });

  const grandUnitTotals = Object.entries(stockByUnit).map(([unit, total]) => ({
    unit,
    total,
  }));

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

  const getStatusBadge = (currentStock: number, minQty: number) => {
    if (currentStock <= 0) {
      return { label: 'Rupture', className: 'status-rupture' };
    }
    if (minQty > 0 && currentStock <= minQty) {
      return { label: 'Alerte Seuil', className: 'status-alert' };
    }
    return { label: 'En Stock', className: 'status-normal' };
  };

  return (
    <div className="articles-inventory-container">
      {/* 1. Official Header Section */}
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
          <div className="report-arabic-badge">حالة المخزون والمواد</div>
        </div>
      </div>

      {/* 2. Document Title Banner */}
      <div className="report-title-banner">
        <div className="title-left">
          <h2 className="title-text">ÉTAT DU STOCK — ARTICLES</h2>
          <p className="subtitle-text">
            Édité le {utils.formatDate(new Date())} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' • '}Total : <span className="font-bold">{articlesList.length} article(s)</span>
          </p>
        </div>
        <div className="filter-badge-box">
          <span className="filter-badge-label">Filtres :</span>{' '}
          <span className="filter-badge-value font-semibold">{activeFiltersLabel}</span>
        </div>
      </div>

      {/* 3. KPI Statistics Summary Strip */}
      <div className="articles-kpi-strip">
        <div className="kpi-cell">
          <span className="kpi-label">Total Articles</span>
          <span className="kpi-value font-bold">{articlesList.length}</span>
        </div>
        <div className="kpi-cell highlight-success">
          <span className="kpi-label">En Stock (Normal)</span>
          <span className="kpi-value font-bold text-success">{inStockCount}</span>
        </div>
        <div className="kpi-cell highlight-warning">
          <span className="kpi-label">Alerte Seuil (Faible)</span>
          <span className="kpi-value font-bold text-warning">{lowStockCount}</span>
        </div>
        <div className="kpi-cell highlight-danger">
          <span className="kpi-label">Rupture de Stock</span>
          <span className="kpi-value font-bold text-danger">{outOfStockCount}</span>
        </div>
        {grandUnitTotals.map((ut) => (
          <div key={ut.unit} className="kpi-cell highlight-unit">
            <span className="kpi-label">Stock Total ({ut.unit})</span>
            <span className="kpi-value font-bold mono">
              {formatQuantity(ut.total, ut.unit)}
            </span>
          </div>
        ))}
      </div>

      {/* 4. Articles Table */}
      <div className="report-section">
        <table className="report-table">
          <thead>
            <tr>
              <th className="th-idx text-center" style={{ width: '3%' }}>N°</th>
              <th className="th-ref text-left" style={{ width: '10%' }}>Référence</th>
              <th className="th-desc text-left" style={{ width: '22%' }}>Désignation & Catégorie</th>
              <th className="th-wood text-left" style={{ width: '15%' }}>Spécifications Bois</th>
              <th className="th-unit text-center" style={{ width: '5%' }}>Unité</th>
              <th className="th-price text-right" style={{ width: '9%' }}>P.U HT (TND)</th>
              <th className="th-tva text-center" style={{ width: '5%' }}>TVA</th>
              <th className="th-price text-right" style={{ width: '9%' }}>P.U TTC (TND)</th>
              <th className="th-alert text-right" style={{ width: '7%' }}>Seuil Min</th>
              <th className="th-stock text-right" style={{ width: '9%' }}>Stock Actuel</th>
              <th className="th-status text-center" style={{ width: '6%' }}>État</th>
            </tr>
          </thead>
          <tbody>
            {articlesList.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-cell text-center p-8">
                  Aucun article ne correspond aux critères sélectionnés.
                </td>
              </tr>
            ) : (
              articlesList.map((art, idx) => {
                const currentStock = stockMap ? (stockMap.get(art.id)?.total ?? 0) : 0;
                const minQty = art.minquantity || 0;
                const status = getStatusBadge(currentStock, minQty);

                // Wood specific characteristics
                const isWood = art.iswood;
                let woodDetails = '—';
                if (isWood) {
                  const parts: string[] = [];
                  if (art.thickness?.name) parts.push(`Ép: ${art.thickness.name} mm`);
                  if (art.width?.name) parts.push(`Larg: ${art.width.name} mm`);
                  if (art.lengths) {
                    const cleanLengths = art.lengths.replace(/[\[\]]/g, '').trim();
                    if (cleanLengths) parts.push(`L: ${cleanLengths} cm`);
                  }
                  woodDetails = parts.length > 0 ? parts.join(' | ') : 'Bois (Standard)';
                }

                const catLabel = art.category?.description || '—';
                const subCatLabel = art.subcategory?.description;

                return (
                  <tr key={art.id}>
                    <td className="text-center mono text-xs">{idx + 1}</td>
                    <td className="mono font-bold text-corp-blue text-xs">
                      {art.reference}
                    </td>
                    <td>
                      <div className="font-bold text-corp-blue">{art.description}</div>
                      <div className="text-[7pt] text-muted font-medium">
                        {catLabel}
                        {subCatLabel && ` / ${subCatLabel}`}
                      </div>
                    </td>
                    <td className="text-xs">
                      {isWood ? (
                        <span className="wood-spec font-medium">{woodDetails}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-center text-xs font-semibold">{art.unit || 'PCS'}</td>
                    <td className="mono text-right text-xs">
                      {art.sellprice_ht != null ? utils.formatNumber(art.sellprice_ht) : '—'}
                    </td>
                    <td className="text-center text-xs">
                      {art.tva?.value != null ? `${art.tva.value}%` : '—'}
                    </td>
                    <td className="mono text-right text-xs font-semibold">
                      {art.sellprice_ttc != null ? utils.formatNumber(art.sellprice_ttc) : '—'}
                    </td>
                    <td className="mono text-right text-xs">
                      {minQty > 0 ? formatQuantity(minQty, art.unit) : '—'}
                    </td>
                    <td
                      className={`mono text-right text-xs font-bold ${
                        currentStock <= 0
                          ? 'text-danger'
                          : minQty > 0 && currentStock <= minQty
                          ? 'text-warning'
                          : 'text-corp-blue'
                      }`}
                    >
                      {formatQuantity(currentStock, art.unit)}
                    </td>
                    <td className="text-center text-xs">
                      <span className={`status-pill ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {articlesList.length > 0 && (
            <tfoot>
              <tr className="table-totals-row">
                <td colSpan={5} className="font-bold text-right uppercase">
                  Total ({articlesList.length} articles) :
                </td>
                <td colSpan={4} className="text-right mono text-xs">—</td>
                <td className="mono font-bold text-right text-corp-blue">
                  {grandUnitTotals.map((ut, i) => (
                    <span key={ut.unit}>
                      {i > 0 && ' • '}
                      {formatQuantity(ut.total, ut.unit)} {ut.unit}
                    </span>
                  ))}
                </td>
                <td className="text-center text-xs">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 5. Legal Footer */}
      <div className="report-footer-legal">
        <p className="legal-title">
          {enterprise.name} {enterprise.description ? `— ${enterprise.description}` : ''}
        </p>
        <p className="legal-address">
          Siège social: {enterprise.siegeAddress} | Tél: {enterprise.phone} | M.F: {enterprise.matriculeFiscal}
        </p>
        <p className="legal-notice">
          Document d&apos;inventaire et état du stock extrait le {utils.formatDate(new Date())} via l&apos;application de gestion ERP ACYA.
        </p>
      </div>
    </div>
  );
}
