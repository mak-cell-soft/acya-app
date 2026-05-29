import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import { numberToFrenchWords } from '@/lib/number-to-words';
import ar from '@/locales/print-ar.json';
import * as utils from './print-utils';

interface InvoiceLightProps {
  document: Document;
  enterprise: Enterprise;
}

export function InvoiceLight({ document, enterprise }: InvoiceLightProps) {
  const finalPayable = document?.total_net_payable || document?.total_net_ttc || 0;
  const amountInWords = numberToFrenchWords(finalPayable);

  return (
    <div className="print-container">
      {/* Light Header */}
      <div className="header">
        <div className="company-info">
          <div className="company-name">{enterprise.name}</div>
          <div className="company-details">{enterprise.siegeAddress}</div>
          <div className="company-details">Tél: {enterprise.phone}</div>
          <div className="company-details">M.F: {enterprise.matriculeFiscal}</div>
        </div>
        <div className="arabic-info">
          <div className="arabic-text">{ar.companyArabicName}</div>
          <div className="arabic-details">{ar.companyArabicAddress}</div>
        </div>
      </div>

      <div className="separator" />

      {/* Document Type Label */}
      <div className="document-type-header">
        FACTURE CLIENT
      </div>

      {/* Meta & client box */}
      <div className="meta-and-client">
        <div className="meta-box">
          <div className="info-row">
            <span className="info-label">{ar.labels.date}: </span>
            <span>{utils.formatDate(document?.creationdate)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.docNumberInvoice}: </span>
            <span>{document?.docnumber || 'BROUILLON'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.accountNumber}: </span>
            <span>{utils.getAccountNumber(document)}</span>
          </div>
        </div>

        <div className="client-box">
          <div className="info-row">
            <span className="info-label">{ar.labels.client} </span>
            <span style={{ fontWeight: 'bold' }}>{utils.getClientName(document)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.address} </span>
            <span>{utils.getClientAddress(document)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{ar.labels.tvaCode} </span>
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
              <td className="col-designation">
                <div>{merch.description || merch.article?.description}</div>
                {merch.lisoflengths && merch.lisoflengths.length > 0 && (
                  <div className="item-lengths-detail">
                    Long: {merch.lisoflengths.map((len, lIdx) => (
                      <span key={len.id || lIdx}>
                        {len.nbpieces}p/{len.length?.value}m{lIdx < merch.lisoflengths.length - 1 ? ', ' : ''}
                      </span>
                    ))}
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

      <div className="separator" />

      {/* Totals Section with Invoice taxes (Stamp & Withholding RS) */}
      <div className="footer-section">
        <div className="words-and-legal">
          <div className="words-label">{ar.labels.arreteLaSomme}</div>
          <div className="words-value">{amountInWords}</div>
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
          
          {document?.taxe && document.taxe.taxvalue > 0 && (
            <div className="total-row">
              <span>{ar.labels.stampTax}:</span>
              <span>+{utils.formatNumber(document.taxe.taxvalue)}</span>
            </div>
          )}

          <div className="total-row highlight">
            <span>{ar.labels.totalTTC}:</span>
            <span>{utils.formatNumber(document?.total_net_ttc)}</span>
          </div>

          {document?.holdingtax && document.holdingtax.taxvalue > 0 && (
            <div className="total-row">
              <span>{ar.labels.withholdingTax} ({document.holdingtax.taxpercentage}%):</span>
              <span>-{utils.formatNumber(document.holdingtax.taxvalue)}</span>
            </div>
          )}

          <div className="total-row payable">
            <span>{ar.labels.netPayable}:</span>
            <span>{utils.formatNumber(finalPayable)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures">
        <div className="sig-box">
          <div className="sig-label">CLIENT</div>
          <div style={{ fontSize: '7pt', textAlign: 'center' }}>Date & Sign</div>
        </div>
        <div className="sig-box">
          <div className="sig-label">CHAUFFEUR</div>
          <div style={{ fontSize: '7pt', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {utils.getTransporterName(document)}
          </div>
        </div>
        <div className="sig-box">
          <div className="sig-label">MATRICULE</div>
          <div style={{ fontSize: '7.5pt', textAlign: 'center' }}>
            {utils.getVehicleInfo(document)}
          </div>
        </div>
        <div className="sig-box">
          <div className="sig-label">CONTRÔLE</div>
          <div></div>
        </div>
        <div className="sig-box">
          <div className="sig-label">SORTIE</div>
          <div></div>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="footer-legal-light">
        {enterprise.name} - Ariana, Tunisie
      </div>
    </div>
  );
}
