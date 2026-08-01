import React from 'react';
import { formatDate, formatNumber, numberToWordsFR } from './print-utils';

interface SupplierPaymentStandardProps {
  payment: any;
  enterprise?: any;
  printLocale?: any;
}

export function SupplierPaymentStandard({
  payment,
  enterprise,
}: SupplierPaymentStandardProps) {
  const companyName = enterprise?.name || 'ENTREPRISE';
  const companyMf = enterprise?.matriculeFiscal || enterprise?.taxRegistrationNumber || '---';
  const companyAddress = enterprise?.siegeAddress || enterprise?.address || '';
  const companyPhone = enterprise?.phone || '';

  const paymentDate = payment?.date || payment?.creationdate || payment?.paymentDate || new Date();
  const refNumber = payment?.reference || payment?.receiptNumber || `REG-FOURN-${payment?.id || Date.now()}`;
  const paymentMode = payment?.mode || payment?.paymentMethod || payment?.type || 'Chèque';
  const amount = payment?.amount || payment?.total_net_ttc || payment?.montant || 0;
  
  const supplierName = payment?.supplierName || payment?.counterpart?.name || payment?.supplier?.name || 'Fournisseur';
  const supplierMf = payment?.supplierMf || payment?.counterpart?.taxregistrationnumber || payment?.supplier?.taxregistrationnumber || '---';
  const supplierAddress = payment?.supplierAddress || payment?.counterpart?.address || '';
  
  const instrumentNumber = payment?.instrumentNumber || payment?.chequeNumber || payment?.traiteNumber || payment?.reference || '---';
  const bankName = payment?.bankName || payment?.bank?.designation || payment?.bank || '';

  return (
    <div className="half-a4-container">
      <div>
        {/* Header */}
        <div className="half-header">
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '12pt', fontWeight: 800, color: '#0f172a' }}>
              {companyName}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: '2px' }}>
              MF: {companyMf} {companyAddress && `| ${companyAddress}`}
            </div>
            {companyPhone && (
              <div style={{ fontSize: '7.5pt', color: '#475569' }}>
                Tél: {companyPhone}
              </div>
            )}
          </div>
          <div className="half-title-badge">
            <div className="half-doc-title">REÇU DE RÈGLEMENT</div>
            <div className="half-doc-ref">N° {refNumber}</div>
            <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '2px' }}>
              Date: {formatDate(paymentDate)}
            </div>
          </div>
        </div>

        {/* Fournisseur Info */}
        <div className="half-info-card" style={{ marginBottom: '4mm' }}>
          <div className="half-info-label">Bénéficiaire (Fournisseur)</div>
          <div style={{ fontSize: '10pt', fontWeight: 800, color: '#0f172a' }}>{supplierName}</div>
          <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: '2px' }}>
            MF: {supplierMf} {supplierAddress && `| ${supplierAddress}`}
          </div>
        </div>

        {/* Payment Info Grid */}
        <div className="half-info-grid">
          <div className="half-info-card">
            <div className="half-info-label">Mode de Règlement</div>
            <div className="half-info-value" style={{ textTransform: 'uppercase' }}>
              {paymentMode}
            </div>
          </div>
          <div className="half-info-card">
            <div className="half-info-label">N° Instrument / Réf</div>
            <div className="half-info-value" style={{ fontFamily: 'monospace' }}>
              {instrumentNumber}
            </div>
          </div>
          {bankName && (
            <div className="half-info-card" style={{ gridColumn: 'span 2' }}>
              <div className="half-info-label">Banque Émettrice</div>
              <div className="half-info-value">{bankName}</div>
            </div>
          )}
        </div>

        {/* Payment Summary Table */}
        <table className="half-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence / Facture</th>
              <th style={{ textAlign: 'right' }}>Montant (TND)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Règlement facture fournisseur</td>
              <td style={{ fontFamily: 'monospace' }}>{payment?.invoiceDocNumber || payment?.supplierInvoiceRef || 'Paiement compte'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                {formatNumber(amount)} TND
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total Box */}
        <div className="half-total-box">
          <div>
            <div style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
              Montant Règlement Net
            </div>
            <div className="half-total-words">
              Arrêté le présent règlement à la somme de : <strong>{numberToWordsFR(amount)}</strong>
            </div>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '13pt', fontWeight: 800, color: '#0f172a' }}>
            {formatNumber(amount)} TND
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="half-signatures">
        <div className="half-sig-box">
          <div className="half-sig-title">Pour Acquit (Signature Fournisseur)</div>
          <div style={{ fontSize: '7pt', color: '#94a3b8', fontStyle: 'italic' }}>(Date &amp; Cachet)</div>
        </div>
        <div className="half-sig-box">
          <div className="half-sig-title">Comptabilité / Direction</div>
          <div style={{ fontSize: '7pt', color: '#94a3b8', fontStyle: 'italic' }}>(Visa &amp; Cachet)</div>
        </div>
      </div>
    </div>
  );
}
