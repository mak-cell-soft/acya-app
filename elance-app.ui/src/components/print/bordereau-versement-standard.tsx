import React from 'react';
import { formatDate, formatNumber, numberToWordsFR } from './print-utils';

interface BordereauVersementStandardProps {
  instruments: any[];
  bank?: any;
  bordereauType?: 'CHEQUE' | 'TRAITE';
  counterpartType?: 'client' | 'supplier';
  bordereauNumber?: string;
  depositDate?: Date | string;
  enterprise?: any;
  printLocale?: any;
}

export function BordereauVersementStandard({
  instruments = [],
  bank,
  bordereauType = 'CHEQUE',
  counterpartType = 'client',
  bordereauNumber,
  depositDate,
  enterprise,
}: BordereauVersementStandardProps) {
  const companyName = enterprise?.name || 'ENTREPRISE';
  const companyMf = enterprise?.matriculeFiscal || enterprise?.taxRegistrationNumber || '---';
  const companyAddress = enterprise?.siegeAddress || enterprise?.address || '';
  const companyPhone = enterprise?.phone || '';

  const bankName = bank?.designation || bank?.name || 'Banque';
  const bankCode = bank?.bankCode || bank?.code || '---';
  const bankRib = bank?.rib || bank?.accountNumber || '';

  const refBordereau = bordereauNumber || `BV-${bordereauType.slice(0, 3)}-${Date.now().toString().slice(-6)}`;
  const dateVersement = depositDate || new Date();

  // Compute total amount
  const totalAmount = instruments.reduce((sum, item) => {
    const val = item?.amount || item?.montant || item?.total_net_ttc || item?.amountHT || 0;
    return sum + Number(val);
  }, 0);

  // Render a single copy of the Bordereau box
  const renderBordereauCopy = (copyTitleLabel: string) => (
    <div className="bordereau-copy-box">
      <div>
        {/* Header */}
        <div className="bordereau-header">
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11pt', fontWeight: 800, color: '#0f172a' }}>
              {companyName}
            </div>
            <div style={{ fontSize: '7pt', color: '#475569', marginTop: '1px' }}>
              MF: {companyMf} {companyAddress && `| ${companyAddress}`}
            </div>
            {companyPhone && (
              <div style={{ fontSize: '7pt', color: '#475569' }}>
                Tél: {companyPhone}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="bordereau-title">
              BORDEREAU DE VERSEMENT DE {bordereauType}S
            </div>
            <div style={{ fontSize: '7.5pt', fontWeight: 700, color: '#475569', marginTop: '1px' }}>
              ({counterpartType === 'client' ? 'ENCAISSEMENTS CLIENTS' : 'RÈGLEMENTS FOURNISSEURS'}) — <span style={{ color: '#0284c7' }}>{copyTitleLabel}</span>
            </div>
          </div>

          <div className="bordereau-bank-badge">
            <div className="bordereau-bank-name">{bankName}</div>
            <div className="bordereau-bank-code">Code Banque : <strong>{bankCode}</strong></div>
            {bankRib && <div style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '1px' }}>RIB: {bankRib}</div>}
          </div>
        </div>

        {/* Top Info line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5mm', fontSize: '7.5pt' }}>
          <div>
            N° Bordereau : <strong style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>{refBordereau}</strong>
          </div>
          <div>
            Date de remise : <strong>{formatDate(dateVersement)}</strong>
          </div>
          <div>
            Nombre d&apos;instruments : <strong style={{ fontFamily: 'monospace' }}>{instruments.length}</strong>
          </div>
        </div>

        {/* Instruments Table */}
        <table className="bordereau-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>N°</th>
              <th style={{ width: '130px' }}>Banque Entreprise</th>
              <th>N° Instrument</th>
              <th>Banque Émettrice</th>
              <th>Tiers ({counterpartType === 'client' ? 'Client' : 'Fournisseur'})</th>
              <th style={{ width: '80px' }}>Échéance</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Montant (TND)</th>
            </tr>
          </thead>
          <tbody>
            {instruments.length > 0 ? (
              instruments.map((inst, idx) => {
                const instNum = inst?.number || inst?.instrumentNumber || inst?.chequeNumber || inst?.traiteNumber || inst?.reference || '---';
                const instBank = inst?.bankName || inst?.issuerBank || inst?.bank || '---';
                const tierName = inst?.counterpartName || inst?.clientName || inst?.supplierName || inst?.counterpart?.name || '---';
                const dateEcheance = inst?.dueDate || inst?.echeance || inst?.date || null;
                const itemAmount = inst?.amount || inst?.montant || inst?.total_net_ttc || inst?.amountHT || 0;

                return (
                  <tr key={inst.id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{bankName} ({bankCode})</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{instNum}</td>
                    <td>{instBank}</td>
                    <td style={{ fontWeight: 600 }}>{tierName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{dateEcheance ? formatDate(dateEcheance) : '---'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatNumber(Number(itemAmount))}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '4mm' }}>
                  Aucun instrument sélectionné
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer & Total */}
      <div>
        <div className="bordereau-footer-grid">
          <div>
            <div style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
              Montant Total en toutes lettres :
            </div>
            <div style={{ fontSize: '7.5pt', fontStyle: 'italic', color: '#0f172a', marginTop: '1px', fontWeight: 600 }}>
              {numberToWordsFR(totalAmount)}
            </div>
          </div>
          <div className="bordereau-total-card" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '6.5pt', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
              Total Général Remise
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11pt', fontWeight: 900, color: '#0f172a' }}>
              {formatNumber(totalAmount)} TND
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginTop: '3mm', paddingTop: '2mm', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '6.5pt', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
              Cachet &amp; Signature Émetteur
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '6.5pt', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
              Accusé Réception Banque
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="a4-duplicated-page">
      {/* Copy 1: Exemplaire Banque */}
      {renderBordereauCopy('EXEMPLAIRE BANQUE')}

      {/* Cut Line */}
      <div className="bordereau-cut-line">
        ✂️ <span>LIGNE DE DÉCOUPE — BORDEREAU DE VERSEMENT DUPLIQUÉ</span> ✂️
      </div>

      {/* Copy 2: Exemplaire Entreprise / Souche */}
      {renderBordereauCopy('EXEMPLAIRE SOUCHE ENTREPRISE')}
    </div>
  );
}
