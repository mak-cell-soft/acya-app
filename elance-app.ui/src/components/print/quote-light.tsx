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

interface QuoteLightProps {
  document: Document;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function QuoteLight({ document, enterprise, printLocale }: QuoteLightProps) {
  const ar = printLocale || defaultAr;
  const amountInWords = numberToFrenchWords(document?.total_net_ttc || 0);

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
      {/* Light Header (Monospace Text Layout) */}
      <div className="header">
        <div className="company-info">
          <div className="company-name">{enterprise.name}</div>
          <div className="company-details">Tél: {enterprise.phone}</div>
          <div className="company-details">M.F: {enterprise.matriculeFiscal}</div>
        </div>
        <div className="arabic-info">
          <div className="arabic-text">{ar.companyArabicName}</div>
        </div>
      </div>

      <div className="separator" />

      {/* Document Type Label */}
      <div className="document-type-header">
        DEVIS CLIENT N° {document?.docnumber || 'BROUILLON'}
      </div>

      {/* Meta details & client box side-by-side */}
      <div className="meta-and-client">
        <div className="meta-box">
          <div className="info-row">
            <span className="info-label">{ar.labels.date}: </span>
            <span>{utils.formatDate(document?.creationdate)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Validité: </span>
            <span>{validitySentence}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.accountNumber}: </span>
            <span>{utils.getAccountNumber(document)}</span>
          </div>
        </div>

        <div className="client-box">
          <div className="info-row">
            <span className="info-label">{ar.labels.client}: </span>
            <span style={{ fontWeight: 'bold' }}>{utils.getClientName(document)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Adresse: </span>
            <span>{utils.getCustomerRealAddress(document) || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.tvaCode}: </span>
            <span>{utils.getTvaCode(document)}</span>
          </div>
        </div>
      </div>

      {/* Items List Table */}
      <table className="items-table">
        <thead>
          <tr>
            <th className="col-code" style={{ textAlign: 'center' }}>#</th>
            <th className="col-designation" style={{ textAlign: 'left' }}>DÉSIGNATION</th>
            <th className="col-unit" style={{ textAlign: 'center' }}>UN</th>
            <th className="col-qty">QTÉ</th>
            <th className="col-price">P.U.HT</th>
            <th className="col-tva" style={{ textAlign: 'center' }}>TVA</th>
            <th className="col-total">TOTAL HT</th>
          </tr>
        </thead>
        <tbody>
          {document?.merchandises?.map((merch, idx) => (
            <tr key={merch.id || idx} className="item-row">
              <td className="col-code" style={{ textAlign: 'center' }}>{idx + 1}</td>
              <td className="col-designation" style={{ textAlign: 'left' }}>
                <div>{merch.description || merch.article?.description}</div>
                {/* Wood lengths breakdown */}
                {merch.lisoflengths && merch.lisoflengths.length > 0 && (
                  <div className="item-lengths-detail">
                    Longueurs:{' '}
                    <span className="lengths-wrap">
                      {merch.lisoflengths.map((len, lIdx) => (
                        <span key={len.id || lIdx}>
                          {len.nbpieces}p/{len.length?.value}m{lIdx < merch.lisoflengths.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </td>
              <td className="col-unit" style={{ textAlign: 'center' }}>{merch.article?.unit || 'PCS'}</td>
              <td className="col-qty">{utils.formatQuantity(merch.quantity, merch.article?.unit)}</td>
              <td className="col-price">{utils.formatNumber(merch.unit_price_ht)}</td>
              <td className="col-tva" style={{ textAlign: 'center' }}>{merch.article?.tva?.value || 0}%</td>
              <td className="col-total">{utils.formatNumber(merch.cost_net_ht)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer totals & conditions */}
      <div className="footer-section">
        <div className="words-and-legal">
          <div className="words-label">{ar.labels.arreteLaSomme}</div>
          <div className="words-value">{amountInWords}</div>

          {/* Validité & Conditions commerciales */}
          <div style={{ marginTop: '3mm', padding: '1.5mm', border: '1px dashed #000' }}>
            <div style={{ fontWeight: 'bold' }}>VALIDITÉ &amp; CONDITIONS COMMERCIALES :</div>
            <div>Validité : {validitySentence}</div>
            {conditionsText ? (
              <div style={{ marginTop: '0.5mm', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                Conditions : {conditionsText}
              </div>
            ) : null}
          </div>
        </div>

        <div className="totals-box">
          <div className="total-row">
            <span>{ar.labels.totalHT}:</span>
            <span>{utils.formatNumber(document?.total_ht_net_doc)}</span>
          </div>
          <div className="total-row">
            <span>{ar.labels.totalTVA}:</span>
            <span>{utils.formatNumber(document?.total_tva_doc)}</span>
          </div>
          <div className="total-row highlight">
            <span>{ar.labels.totalTTC}:</span>
            <span>{utils.formatNumber(document?.total_net_ttc)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures">
        <div className="sig-box" style={{ width: '48%' }}>
          <span>Bon pour accord (Client)</span>
        </div>
        <div className="sig-box" style={{ width: '48%' }}>
          <span>Entreprise</span>
        </div>
      </div>
    </div>
  );
}
