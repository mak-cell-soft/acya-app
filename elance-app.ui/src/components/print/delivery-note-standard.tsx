import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import { numberToFrenchWords } from '@/lib/number-to-words';
import ar from '@/locales/print-ar.json';
import * as utils from './print-utils';

interface DeliveryNoteStandardProps {
  document: Document;
  enterprise: Enterprise;
}

export function DeliveryNoteStandard({ document, enterprise }: DeliveryNoteStandardProps) {
  const amountInWords = numberToFrenchWords(document?.total_net_ttc || 0);
  const tvaBreakdown = utils.getTvaBreakdown(document);

  // Pad the items table with empty rows to match the A4 print height standard from the Angular template.
  const rowCount = document?.merchandises?.length || 0;
  const paddingCount = Math.max(0, 10 - rowCount);
  const emptyRows = Array.from({ length: paddingCount });

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
          <p className="company-details">{enterprise.siegeAddress}</p>
          <p className="company-details">
            Tél: {enterprise.phone} {enterprise.mobileOne ? `| ${enterprise.mobileOne}` : ''}
          </p>
          <p className="company-details">{enterprise.email}</p>
          <p className="company-details">
            M.F: {enterprise.matriculeFiscal} {enterprise.commercialregister ? `| R.C: ${enterprise.commercialregister}` : ''}
          </p>
        </div>

        {/* Center: Styled Enterprise Name (Choose a not so bold character) */}
        <div className="center-section">
          <div className="logo" style={{ borderColor: '#000' }}>
            <h1 
              className="logo-text" 
              style={{ fontWeight: 400, fontSize: '18pt', letterSpacing: '3px', textTransform: 'uppercase' }}
            >
              {enterprise.name}
            </h1>
          </div>
          <div className="location">
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'TUNIS'}</p>
          </div>
        </div>

        {/* Right: Arabic Info and Original Label */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {enterprise.capital ? `شركة خفية الإسم رأس مالها ${enterprise.capital}` : ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <h3 className="original-label">{ar.originalLabel.bl}</h3>
        </div>
      </div>

      {/* Document Title and Client Info */}
      <div className="document-header">
        <div className="document-title-section">
          <h2 className="document-title">BON DE LIVRAISON</h2>
        </div>

        <div className="client-info">
          <div className="info-row">
            <span className="label">{ar.labels.client}</span>
            <span className="value font-bold">{utils.getClientName(document)}</span>
          </div>
          <div className="info-row">
            <span className="label">{ar.labels.address}</span>
            <span className="value">{utils.getClientAddress(document)}</span>
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
          <span className="detail-label">{ar.labels.docNumberBL}</span>
          <span className="detail-value">{document?.docnumber || 'BROUILLON'}</span>
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
                  {/* Handle wood dimensions if they exist */}
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
            {/* Pad rest of A4 page with blank rows */}
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
        {/* Left Side: Tax Breakdowns & Words Amount */}
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

            {/* Empty secondary tax table for future adjustments or stamps */}
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
                <tr>
                  <td colSpan={4}>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="amount-words">
            <span className="words-label">{ar.labels.arreteLaSomme}</span>
            <p className="words-value">{amountInWords}</p>
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

      {/* Signature boxes */}
      <div className="signature-section">
        <div className="signature-box">
          <span className="signature-label">{ar.labels.signClient}</span>
          <div className="signature-area"></div>
        </div>
        <div className="signature-box">
          <span className="signature-label">{ar.labels.truckNumber}</span>
          <div className="signature-area font-bold text-center pt-2">
            {utils.getVehicleInfo(document)}
          </div>
        </div>
        <div className="signature-box">
          <span className="signature-label">{ar.labels.driverName}</span>
          <div className="signature-area font-bold text-center pt-2">
            {utils.getTransporterName(document)}
          </div>
          <span className="cin-label">{ar.labels.cin}</span>
        </div>
        <div className="signature-box">
          <span className="signature-label">{ar.labels.controlBL}</span>
          <div className="signature-area"></div>
        </div>
        <div className="signature-box">
          <span className="signature-label">{ar.labels.controlExit}</span>
          <div className="signature-area"></div>
        </div>
      </div>

      {/* Legal terms footer */}
      <div className="footer-legal">
        <p className="legal-text">
          {enterprise.description ? `${enterprise.name} - ${enterprise.description}` : enterprise.name}
        </p>
        <p className="agency-info">
          Adresse: {enterprise.siegeAddress} | Tél: {enterprise.phone} | M.F: {enterprise.matriculeFiscal}
        </p>
      </div>
    </div>
  );
}
