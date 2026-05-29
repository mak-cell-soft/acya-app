import React from 'react';
import { StockTransferInfo, StockTransferDetails } from '@/types/stock';
import { Enterprise } from '@/types/settings';
import ar from '@/locales/print-ar.json';
import * as utils from './print-utils';

interface StockTransferLightProps {
  transfer: StockTransferInfo;
  details: StockTransferDetails[];
  enterprise: Enterprise;
}

export function StockTransferLight({ transfer, details, enterprise }: StockTransferLightProps) {
  // Resolve the confirmation code (PIN code) from either details items or transfer metadata
  const confirmationCode = details?.find(d => d.confirmationCode)?.confirmationCode || 
                           (transfer as any).confirmationCode || 
                           '';

  // Helper to extract vehicle info
  const getVehicleInfo = () => {
    if ((transfer as any).vehicleSerialNumber) {
      return (transfer as any).vehicleSerialNumber;
    }
    if (details && details.length > 0 && (details[0] as any).vehicleSerialNumber) {
      return (details[0] as any).vehicleSerialNumber;
    }
    return '---';
  };

  return (
    <div className="print-container">
      {/* Monospace Header */}
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
        TRANSFERT INTER-DEPOTS (SORTIE)
      </div>

      {/* Meta & client details box */}
      <div className="meta-and-client">
        <div className="meta-box" style={{ width: '50%' }}>
          <div className="info-row">
            <span className="info-label">{ar.labels.date}: </span>
            <span>{utils.formatDate(transfer.transferDate)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">N° SORTIE: </span>
            <span>{transfer.docSortie || 'BROUILLON'}</span>
          </div>
          {confirmationCode && (
            <div className="info-row">
              <span className="info-label">CONF. CODE: </span>
              <span style={{ fontWeight: 'bold' }}>{confirmationCode}</span>
            </div>
          )}
        </div>

        <div className="client-box" style={{ width: '45%' }}>
          <div className="info-row">
            <span className="info-label">Origine: </span>
            <span>{transfer.origine || transfer.originSiteAddress}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Destin: </span>
            <span>{transfer.destination || transfer.destinationSiteAddress}</span>
          </div>
        </div>
      </div>

      {/* Items list */}
      <table className="items-table">
        <thead>
          <tr>
            <th className="col-code" style={{ textAlign: 'center' }}>#</th>
            <th className="col-designation" style={{ textAlign: 'left' }}>DÉSIGNATION</th>
            <th className="col-unit" style={{ textAlign: 'center' }}>UN</th>
            <th className="col-qty">QTÉ</th>
          </tr>
        </thead>
        <tbody>
          {details.map((item, idx) => (
            <tr key={item.id || idx} className="item-row">
              <td className="col-code" style={{ textAlign: 'center' }}>{idx + 1}</td>
              <td className="col-designation">
                {/* Fallback to description from backend API or articleDescription from local frontend state */}
                <div>{item.description || item.articleDescription}</div>
                {/* Wood lengths print inline */}
                {(item as any).exitDocLengths && (item as any).exitDocLengths.length > 0 && (
                  <div className="item-lengths-detail">
                    Long: {(item as any).exitDocLengths.map((len: any, lIdx: number) => (
                      <span key={len.id || lIdx}>
                        {len.nbpieces}p/{len.length?.value}m{lIdx < (item as any).exitDocLengths.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="col-unit" style={{ textAlign: 'center' }}>{item.unit || 'PCS'}</td>
              <td className="col-qty">{utils.formatQuantity(item.quantity, item.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="separator" />

      {/* Simple Courier Monospace Signatures */}
      <div className="signatures">
        <div className="sig-box" style={{ width: '23%' }}>
          <div className="sig-label">CHAUFFEUR</div>
          <div style={{ fontSize: '7.5pt', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {transfer.transporter || '---'}
          </div>
          <div style={{ fontSize: '7pt', color: '#666' }}>Mat: {getVehicleInfo()}</div>
        </div>
        <div className="sig-box" style={{ width: '23%' }}>
          <div className="sig-label">RESP. SORTIE</div>
          <div></div>
        </div>
        <div className="sig-box" style={{ width: '23%' }}>
          <div className="sig-label">CONTRÔLE</div>
          <div></div>
        </div>
        <div className="sig-box" style={{ width: '23%' }}>
          <div className="sig-label">RÉCEPTION</div>
          <div></div>
        </div>
      </div>

      <div className="footer-legal-light">
        {enterprise.name} - Transfert Logistique
      </div>
    </div>
  );
}
