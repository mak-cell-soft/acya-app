import React from 'react';
import { formatDate, formatNumber, numberToWordsFR } from './print-utils';

interface CaisseRemiseStandardProps {
  deposit: any;
  caisseName?: string;
  bank?: any;
  userName?: string;
  enterprise?: any;
  printLocale?: any;
}

export function CaisseRemiseStandard({
  deposit,
  caisseName = 'Caisse Principale',
  bank,
  userName = 'Utilisateur',
  enterprise,
}: CaisseRemiseStandardProps) {
  const companyName = enterprise?.name || 'ENTREPRISE';
  const companyMf = enterprise?.matriculeFiscal || enterprise?.taxRegistrationNumber || '---';
  const companyAddress = enterprise?.siegeAddress || enterprise?.address || '';
  const companyPhone = enterprise?.phone || '';

  const depositDate = deposit?.depositDate || deposit?.createdAt || new Date();
  const refNumber = deposit?.reference || `REM-${deposit?.id || Date.now()}`;
  const depositType = deposit?.depositType || 'ESPECE';
  const amount = deposit?.amountHT || deposit?.amount || 0;
  const destinationBank = bank?.designation || bank?.name || deposit?.bankName || 'Banque';
  const bankCode = bank?.bankCode || bank?.code || '';

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
            <div className="half-doc-title">REMISE DE CAISSE</div>
            <div className="half-doc-ref">N° {refNumber}</div>
            <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '2px' }}>
              Date: {formatDate(depositDate)}
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="half-info-grid">
          <div className="half-info-card">
            <div className="half-info-label">Source</div>
            <div className="half-info-value">{caisseName}</div>
          </div>
          <div className="half-info-card">
            <div className="half-info-label">Banque Destination</div>
            <div className="half-info-value">
              {destinationBank} {bankCode && `(Code: ${bankCode})`}
            </div>
          </div>
          <div className="half-info-card">
            <div className="half-info-label">Mode de Versement</div>
            <div className="half-info-value" style={{ textTransform: 'uppercase' }}>
              {depositType}
            </div>
          </div>
          <div className="half-info-card">
            <div className="half-info-label">Opérateur / Utilisateur</div>
            <div className="half-info-value">{userName}</div>
          </div>
        </div>

        {/* Details Table */}
        <table className="half-table">
          <thead>
            <tr>
              <th>Désignation / Motif</th>
              <th>Mode</th>
              <th style={{ textAlign: 'right' }}>Montant (TND)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Dépôt de caisse vers compte bancaire
                {deposit?.notes && <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '2px' }}>Note: {deposit.notes}</div>}
              </td>
              <td style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}>{depositType}</td>
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
              Montant Total Déposé
            </div>
            <div className="half-total-words">
              Arrêté la présente remise à la somme de : <strong>{numberToWordsFR(amount)}</strong>
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
          <div className="half-sig-title">Cachet &amp; Signature Émetteur</div>
          <div style={{ fontSize: '7pt', color: '#94a3b8', fontStyle: 'italic' }}>({userName})</div>
        </div>
        <div className="half-sig-box">
          <div className="half-sig-title">Accusé Réception / Caissier</div>
          <div style={{ fontSize: '7pt', color: '#94a3b8', fontStyle: 'italic' }}>(Visa &amp; Signature)</div>
        </div>
      </div>
    </div>
  );
}
