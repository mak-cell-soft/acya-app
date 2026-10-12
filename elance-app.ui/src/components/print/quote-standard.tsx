import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import { numberToFrenchWords } from '@/lib/number-to-words';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';
import {
  DEFAULT_VALIDITY_DURATION,
  DEFAULT_VALIDITY_UNIT,
  DEFAULT_COMMERCIAL_CONDITIONS,
  generateValiditySentence,
} from '@/lib/quotation-utils';
import * as utils from './print-utils';

interface QuoteStandardProps {
  document: Document;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function QuoteStandard({ document, enterprise, printLocale }: QuoteStandardProps) {
  const ar = printLocale || defaultAr;
  const amountInWords = numberToFrenchWords(document?.total_net_ttc || 0);
  const tvaBreakdown = utils.getTvaBreakdown(document);

  // Pad items table with empty rows to maintain professional A4 page height
  const rowCount = document?.merchandises?.length || 0;
  const paddingCount = Math.max(0, 8 - rowCount);
  const emptyRows = Array.from({ length: paddingCount });

  // Resolve validity duration and commercial conditions from document or defaults
  const validityDuration = document?.validity_duration ?? DEFAULT_VALIDITY_DURATION;
  const validityUnit = document?.validity_unit ?? DEFAULT_VALIDITY_UNIT;
  const validitySentence = generateValiditySentence(validityDuration, validityUnit);
  const conditionsText =
    document?.commercial_conditions !== undefined && document?.commercial_conditions !== null
      ? document.commercial_conditions.trim()
      : DEFAULT_COMMERCIAL_CONDITIONS;

  return (
    <div className="print-container">
      {/* Header Section */}
      <div className="header">
        {/* Left: Connected Enterprise Info */}
        <div className="company-info">
          <h2 className="company-name">{enterprise.name}</h2>
          <p className="company-details">
            {enterprise.description || (enterprise.capital ? `S.A. au Capital de ${enterprise.capital}` : '')}
          </p>
          <p className="company-details">
            Tél: {enterprise.phone} {enterprise.mobileOne ? `| ${enterprise.mobileOne}` : ''}
          </p>
          <p className="company-details">{enterprise.email}</p>
          <p className="company-details">
            M.F: {enterprise.matriculeFiscal} {enterprise.commercialregister ? `| R.C: ${enterprise.commercialregister}` : ''}
          </p>
        </div>

        {/* Center: Styled Enterprise Name */}
        <div className="center-section">
          <div className="logo" style={{ borderColor: '#000' }}>
            <h1
              className="logo-text"
              style={{ fontWeight: 400, fontSize: '18pt', letterSpacing: '3px', textTransform: 'uppercase' }}
            >
              {enterprise.name}
            </h1>
          </div>
        </div>

        {/* Right: Arabic Info */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
        </div>
      </div>

      {/* Document Title and Client Info */}
      <div className="document-header">
        <div className="document-title-section">
          <h2 className="document-title">
            DEVIS N° {document?.docnumber || 'BROUILLON'}
          </h2>
        </div>

        <div className="client-info">
          <div className="info-row">
            <span className="label">{ar.labels.client}</span>
            <span className="value font-bold">{utils.getClientName(document)}</span>
          </div>
          <div className="info-row">
            <span className="label">Adresse</span>
            <span className="value">{utils.getCustomerRealAddress(document) || '—'}</span>
          </div>
          <div className="info-row">
            <span className="label">{ar.labels.tvaCode}</span>
            <span className="value font-mono text-xs">{utils.getTvaCode(document)}</span>
          </div>
        </div>
      </div>

      {/* Document Details Bar */}
      <div className="document-details">
        <div className="detail-item">
          <span className="detail-label">{ar.labels.date}</span>
          <span className="detail-value">{utils.formatDate(document?.creationdate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Validité</span>
          <span className="detail-value">{validitySentence}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{ar.labels.accountNumber}</span>
          <span className="detail-value">{utils.getAccountNumber(document)}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="items-table-container">
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-code">#</th>
              <th className="col-designation">{ar.labels.designations}</th>
              <th className="col-unit">{ar.labels.unit}</th>
              <th className="col-qty">{ar.labels.qty}</th>
              <th className="col-price">{ar.labels.unitPriceHT}</th>
              <th className="col-tva">{ar.labels.tva}</th>
              <th className="col-rm">{ar.labels.discount}</th>
              <th className="col-total">{ar.labels.amountHT}</th>
            </tr>
          </thead>
          <tbody>
            {document?.merchandises?.map((merch, idx) => (
              <tr key={merch.id || idx} className="item-row">
                <td className="col-code">{idx + 1}</td>
                <td className="col-designation">
                  <div className="item-description">
                    {merch.description || merch.article?.description}
                  </div>
                  {/* Wood lengths detail if applicable */}
                  {merch.lisoflengths && merch.lisoflengths.length > 0 && (
                    <div className="item-lengths-detail">
                      <span className="lengths-label">Détail Longueurs:</span>
                      <div className="lengths-wrap">
                        {merch.lisoflengths.map((len, lIdx) => (
                          <span key={len.id || lIdx} className="length-item">
                            {len.nbpieces}p / {len.length?.value}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="col-unit">{merch.article?.unit || 'PCS'}</td>
                <td className="col-qty">{utils.formatQuantity(merch.quantity, merch.article?.unit)}</td>
                <td className="col-price">{utils.formatNumber(merch.unit_price_ht)}</td>
                <td className="col-tva">{merch.article?.tva?.value || 0}</td>
                <td className="col-rm">{utils.formatNumber(merch.discount_percentage)}</td>
                <td className="col-total">{utils.formatNumber(merch.cost_net_ht)}</td>
              </tr>
            ))}
            {/* Blank row padding */}
            {emptyRows.map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row">
                <td colSpan={8}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Totals & Summary */}
      <div className="footer-section">
        {/* Left Side: Tax Breakdown, Amount in Words & Commercial Conditions */}
        <div className="tax-sections">
          <div className="tax-tables">
            <table className="tax-table">
              <thead>
                <tr>
                  <th>{ar.labels.taxe}</th>
                  <th>{ar.labels.base}</th>
                  <th>{ar.labels.percent}</th>
                  <th>{ar.labels.value}</th>
                </tr>
              </thead>
              <tbody>
                {tvaBreakdown.map((tva, index) => (
                  <tr key={index}>
                    <td>TVA</td>
                    <td>{utils.formatNumber(tva.base)}</td>
                    <td>{tva.percentage}</td>
                    <td>{utils.formatNumber(tva.value)}</td>
                  </tr>
                ))}
                {tvaBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={4}>&nbsp;</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="amount-words">
            <span className="words-label">{ar.labels.arreteLaSomme}</span>
            <p className="words-value">{amountInWords}</p>
          </div>

          {/* Validité & Conditions commerciales */}
          <div className="amount-words" style={{ marginTop: '2.5mm' }}>
            <span className="words-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Validité &amp; Conditions commerciales
            </span>
            <div style={{ fontSize: '8pt', lineHeight: 1.4 }}>
              <div>
                <strong>Validité : </strong>
                <span>{validitySentence}</span>
              </div>
              {conditionsText ? (
                <div style={{ marginTop: '1mm' }}>
                  <strong>Conditions : </strong>
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{conditionsText}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Document totals */}
        <div className="totals-column">
          <div className="total-row">
            <span className="total-label">{ar.labels.totalHT}</span>
            <span className="total-value">{utils.formatNumber(document?.total_ht_net_doc)}</span>
          </div>
          <div className="total-row">
            <span className="total-label">{ar.labels.totalTVA}</span>
            <span className="total-value">{utils.formatNumber(document?.total_tva_doc)}</span>
          </div>
          <div className="total-row total-ttc">
            <span className="total-label">{ar.labels.totalTTC}</span>
            <span className="total-value">{utils.formatNumber(document?.total_net_ttc)}</span>
          </div>
        </div>
      </div>

      {/* Signature boxes for Quotation */}
      <div className="signature-section" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="signature-box">
          <span className="signature-label">Bon pour accord / Client</span>
          <div className="signature-area" style={{ minHeight: '16mm' }}></div>
        </div>
        <div className="signature-box">
          <span className="signature-label">Direction / Commercial</span>
          <div className="signature-area" style={{ minHeight: '16mm' }}></div>
        </div>
      </div>

      {/* Stamp / Signature Image if configured */}
      {ar.stampImageBase64 && (
        <div className="stamp-container">
          <img
            src={ar.stampImageBase64}
            alt="Cachet et Signature"
            className="stamp-image"
          />
        </div>
      )}

      {/* Legal terms footer */}
      <div className="footer-legal">
        <p className="legal-text">
          {enterprise.description ? `${enterprise.name} - ${enterprise.description}` : enterprise.name}
        </p>
        <p className="agency-info">
          Tél: {enterprise.phone} | M.F: {enterprise.matriculeFiscal}
        </p>
      </div>
    </div>
  );
}
