import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import { numberToFrenchWords } from '@/lib/number-to-words';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';
import * as utils from './print-utils';

interface PurchaseLightProps {
  document: Document;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function PurchaseLight({ document, enterprise, printLocale }: PurchaseLightProps) {
  const ar = printLocale || defaultAr;
  const finalPayable = document?.total_net_payable || document?.total_net_ttc || 0;
  const amountInWords = numberToFrenchWords(finalPayable);
  const docTitle = utils.getPurchaseDocTitle(document?.type);

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
        {docTitle} N° {document?.docnumber || 'BROUILLON'}
        {document?.deliveryNoteDocNumbers && document.deliveryNoteDocNumbers.length > 0 && (
          <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: '6px' }}>
            (BR Réf: {document.deliveryNoteDocNumbers.join(', ')})
          </span>
        )}
      </div>

      {/* Meta details & supplier box side-by-side */}
      <div className="meta-and-client">
        <div className="meta-box">
          <div className="info-row">
            <span className="info-label">{ar.labels.date}: </span>
            <span>{utils.formatDate(document?.creationdate)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dépôt / Site: </span>
            <span>{document?.sales_site?.address || 'Site Principal'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Réf Fournisseur: </span>
            <span>{document?.supplierReference || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">N° Compte: </span>
            <span>{document?.counterpart?.id?.toString() || '—'}</span>
          </div>
        </div>

        <div className="client-box">
          <div className="info-row">
            <span className="info-label">Fournisseur : </span>
            <span style={{ fontWeight: 'bold' }}>{utils.getSupplierName(document)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Adresse : </span>
            <span>{utils.getSupplierAddress(document) || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">M.F / TVA : </span>
            <span>{utils.getSupplierTvaCode(document) || '—'}</span>
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
            <tr key={merch.id || idx}>
              <td className="col-code">{idx + 1}</td>
              <td className="col-designation">
                {merch.description || merch.article?.description}
                {merch.lisoflengths && merch.lisoflengths.length > 0 && (
                  <div style={{ fontSize: '7pt', color: '#555', marginTop: '1pt' }}>
                    Long: {merch.lisoflengths.map((len, lIdx) => (
                      <span key={len.id || lIdx} style={{ marginRight: '4px' }}>
                        {len.nbpieces}p/{len.length?.value}m
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

      {/* Totals Section */}
      <div className="summary-section">
        <div className="amount-words-light">
          Arrêté le présent document à la somme de :<br />
          <strong>{amountInWords}</strong>
        </div>

        <div className="totals-box">
          <div className="tot-row">
            <span>Total HT:</span>
            <span>{utils.formatNumber(document?.total_ht_net_doc)}</span>
          </div>
          <div className="tot-row">
            <span>Total TVA:</span>
            <span>{utils.formatNumber(document?.total_tva_doc)}</span>
          </div>
          <div className="tot-row total-highlight">
            <span>{document?.total_net_payable ? 'NET À PAYER:' : 'TOTAL TTC:'}</span>
            <span>{utils.formatNumber(finalPayable)}</span>
          </div>
        </div>
      </div>

      {/* Simple signature boxes for dot matrix */}
      <div className="signatures">
        <div className="sig-box">
          <div className="sig-label">MAGASINIER</div>
          <div style={{ fontSize: '7pt', textAlign: 'center' }}>Date & Sign</div>
        </div>
        <div className="sig-box">
          <div className="sig-label">FOURNISSEUR</div>
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
          <div className="sig-label">DIRECTION</div>
          <div></div>
        </div>
      </div>

      {/* Legal message for dot matrix */}
      <div className="footer-legal-light">
        {enterprise.name}
      </div>
    </div>
  );
}
