import React from 'react';
import { Stock } from '@/types/stock';
import { Enterprise } from '@/types/settings';
import { WoodStockDetailsResult } from '@/lib/wood-stock-utils';

interface StockPrintLabelProps {
  stock: Stock;
  woodDetails?: WoodStockDetailsResult | null;
  enterprise?: Enterprise | null;
  copyNumber: number;
}

export function formatQuantity(qty: number, unit?: string | null): string {
  const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
  if (isM3) {
    return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  } else {
    return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  }
}

export function StockPrintLabel({ stock, woodDetails, enterprise, copyNumber }: StockPrintLabelProps) {
  const article = stock.merchandise?.article;
  const isWood = article?.iswood || article?.categoryid === 1 || !!woodDetails;
  const fullArticle = woodDetails?.fullArticle;
  const lengthsList = woodDetails?.details || [];
  const totals = woodDetails?.totals || { pieces: 0, volume: 0 };

  return (
    <div className="stock-label-box">
      {/* Top Header */}
      <div className="label-header">
        <div className="brand-info">
          <h1 className="company-name-title">{enterprise?.name || 'ELANCÉ'}</h1>
          <p className="depot-subtitle">
            Dépôt: <span className="font-bold">{stock.site?.gov || 'Central'} - {stock.site?.address || ''}</span>
          </p>
        </div>
        <div className="label-badge-box">
          <span className="label-badge-title">ETIQUETTE DE STOCK</span>
          <span className="label-copy-tag">COPIE #{copyNumber}</span>
        </div>
      </div>

      {/* Main Stock Data Card */}
      <div className="main-stock-card">
        <div className="stock-field-grid">
          <div className="stock-field-col span-2">
            <span className="field-label">RÉF ARTICLE</span>
            <span className="field-value-ref">{article?.reference || 'N/A'}</span>
          </div>

          <div className="stock-field-col span-2">
            <span className="field-label">LIBELLÉ</span>
            <span className="field-value-desc">{article?.description || 'N/A'}</span>
          </div>

          <div className="stock-field-col">
            <span className="field-label">RÉF PAQUET</span>
            <span className="field-value-pack">{stock.merchandise?.packagereference || 'Standard'}</span>
          </div>

          <div className="stock-field-col">
            <span className="field-label">QUANTITÉ</span>
            <span className="field-value-qty">
              {formatQuantity(stock.quantity, article?.unit)} <span className="unit-tag">{article?.unit || ''}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Wood Details Section if Wood Stock */}
      {isWood && (
        <div className="wood-details-block">
          <div className="wood-specs-bar">
            <div className="wood-spec-item">
              <span className="spec-label">ÉPAISSEUR</span>
              <span className="spec-val">{fullArticle?._displayThickness || '—'} mm</span>
            </div>
            <div className="wood-spec-item">
              <span className="spec-label">LARGEUR</span>
              <span className="spec-val">
                {(article as any)?.subcategory?.reference?.toUpperCase() === 'BD' || lengthsList.some(d => d.customLengthCm || d.totalWidthCm)
                  ? 'Variable (BD)'
                  : `${fullArticle?._displayWidth || '—'} mm`
                }
              </span>
            </div>
            <div className="wood-spec-item text-right">
              <span className="spec-label">TOTAL PIÈCES</span>
              <span className="spec-val">{totals.pieces > 0 ? `${totals.pieces} pcs` : '—'}</span>
            </div>
            <div className="wood-spec-item text-right">
              <span className="spec-label">VOLUME TOTAL</span>
              <span className="spec-val">{totals.volume > 0 ? `${totals.volume.toFixed(3)} M³` : '—'}</span>
            </div>
          </div>

          {lengthsList.length > 0 && (
            <table className="wood-lengths-table">
              <thead>
                <tr>
                  <th>LONGUEUR</th>
                  <th className="text-center">NB PIÈCES</th>
                  <th className="text-right">VOLUME (M³)</th>
                </tr>
              </thead>
              <tbody>
                {lengthsList.slice(0, 6).map((row) => (
                  <tr key={row.lengthId}>
                    <td>
                      <span className="font-bold">{row.customLengthCm ? `${row.customLengthCm} cm` : `${row.lengthName} cm`}</span>
                      <span className="sub-dim">
                        ({((row.customLengthCm || parseFloat(row.lengthName) || 0) / 100).toFixed(2)} m
                        {row.totalWidthCm ? ` • Ép: ${fullArticle?._displayThickness || '—'}mm • Larg: ${row.totalWidthCm}cm` : ''})
                      </span>
                    </td>
                    <td className="text-center font-bold">{row.remainingPieces} pcs</td>
                    <td className="text-right font-mono font-bold">{row.volumeM3?.toFixed(4)} M³</td>
                  </tr>
                ))}
                {lengthsList.length > 6 && (
                  <tr>
                    <td colSpan={3} className="text-center text-more font-italic">
                      + {lengthsList.length - 6} autres longueurs répertoriées...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

interface StockPrintA4DocumentProps {
  stock: Stock;
  woodDetails?: WoodStockDetailsResult | null;
  enterprise?: Enterprise | null;
}

export function StockPrintA4Document({ stock, woodDetails, enterprise }: StockPrintA4DocumentProps) {
  return (
    <div className="stock-a4-page">
      <StockPrintLabel stock={stock} woodDetails={woodDetails} enterprise={enterprise} copyNumber={1} />
      
      <div className="stock-cut-line">
        ✂ -------------------------------- DÉCOUPE / LABELS -------------------------------- ✂
      </div>

      <StockPrintLabel stock={stock} woodDetails={woodDetails} enterprise={enterprise} copyNumber={2} />
    </div>
  );
}
