import React from 'react';
import { StockTransferInfo, StockTransferDetails } from '@/types/stock';
import { Enterprise } from '@/types/settings';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';
import * as utils from './print-utils';

interface StockTransferStandardProps {
  transfer: StockTransferInfo;
  details: StockTransferDetails[];
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function StockTransferStandard({ transfer, details, enterprise, printLocale }: StockTransferStandardProps) {
  const ar = printLocale || defaultAr;
  // Pad the items table with empty rows to match the A4 print height standard.
  const rowCount = details?.length || 0;
  const paddingCount = Math.max(0, 15 - rowCount);
  const emptyRows = Array.from({ length: paddingCount });

  // Resolve the confirmation code (PIN code) from either details items or transfer metadata
  const confirmationCode = details?.find(d => d.confirmationCode)?.confirmationCode || 
                           (transfer as any).confirmationCode || 
                           '';

  // Resolve notes from transfer or details
  const notes = transfer.notes || (details && details.length > 0 && (details[0] as any).notes) || '';

  // Helper to extract vehicle information
  const getVehicleInfo = () => {
    if ((transfer as any).vehicleSerialNumber) {
      return (transfer as any).vehicleSerialNumber;
    }
    if (details && details.length > 0 && (details[0] as any).vehicleSerialNumber) {
      return (details[0] as any).vehicleSerialNumber;
    }
    return '---';
  };

  const getOriginDisplay = () => {
    if (transfer.originGov && transfer.originAddress) {
      if (transfer.originAddress.toLowerCase().includes(transfer.originGov.toLowerCase())) {
        return transfer.originAddress;
      }
      return `${transfer.originGov} - ${transfer.originAddress}`;
    }
    if (transfer.origine && transfer.originSiteAddress && transfer.origine !== transfer.originSiteAddress) {
      return `${transfer.origine} - ${transfer.originSiteAddress}`;
    }
    return transfer.origine || transfer.originSiteAddress || '---';
  };

  const getDestinationDisplay = () => {
    if (transfer.destinationGov && transfer.destinationAddress) {
      if (transfer.destinationAddress.toLowerCase().includes(transfer.destinationGov.toLowerCase())) {
        return transfer.destinationAddress;
      }
      return `${transfer.destinationGov} - ${transfer.destinationAddress}`;
    }
    if (transfer.destination && transfer.destinationSiteAddress && transfer.destination !== transfer.destinationSiteAddress) {
      return `${transfer.destination} - ${transfer.destinationSiteAddress}`;
    }
    return transfer.destination || transfer.destinationSiteAddress || '---';
  };

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

        {/* Center: Styled Logo (Choose a not so bold character as requested) */}
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

        {/* Right: Arabic Info and Label */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <h3 className="original-label">{ar.originalLabelTransfer}</h3>
        </div>
      </div>

      {/* Document Title and Transfer Info Box */}
      <div className="document-header">
        <div className="document-title-section" style={{ width: '100%' }}>
          <h2 className="document-title">
            ORDRE DE TRANSFERT INTERDEPOTS
            {transfer.revisionNumber && transfer.revisionNumber > 1 ? (
              <span className="text-xs font-bold text-zinc-600 block mt-0.5">
                REV {transfer.revisionNumber.toString().padStart(2, '0')}
                {transfer.updateDate && (
                  <span className="font-normal text-zinc-500 ml-2">
                    — Modifié le: {new Date(transfer.updateDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </span>
            ) : null}
          </h2>
        </div>

        <div className="client-info">
          <div className="info-row">
            <span className="label">Origine:</span>
            <span className="value font-bold">{getOriginDisplay()}</span>
          </div>
          <div className="info-row">
            <span className="label">Destination:</span>
            <span className="value font-bold">{getDestinationDisplay()}</span>
          </div>
          {confirmationCode && (
            <div className="info-row">
              <span className="label">Code Conf:</span>
              <span className="value font-mono font-bold">{confirmationCode}</span>
            </div>
          )}
          {notes && (
            <div className="info-row" style={{ marginTop: '2px' }}>
              <span className="label">Instructions:</span>
              <span className="value font-medium" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '8pt' }}>{notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Document Details Bar */}
      <div className="document-details">
        <div className="detail-item">
          <span className="detail-label">{ar.labels.date}</span>
          <span className="detail-value">{utils.formatDate(transfer.transferDate)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">N° SORTIE</span>
          <span className="detail-value">{transfer.docSortie || 'BROUILLON'}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="items-table-container">
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-code">#</th>
              <th className="col-designation">{ar.labels.designations}</th>
              <th className="col-pack">REF. PAQUET</th>
              <th className="col-unit">{ar.labels.unit}</th>
              <th className="col-qty">{ar.labels.qty}</th>
            </tr>
          </thead>
          <tbody>
            {details.map((item, idx) => (
              <tr key={item.id || idx} className="item-row">
                <td className="col-code">{idx + 1}</td>
                <td className="col-designation">
                  <div className="item-description">
                    {/* Fallback to description from backend API or articleDescription from local frontend state */}
                    {item.description || item.articleDescription}
                  </div>
                  {/* Handle lengths list details if they are nested inside details */}
                  {(item as any).exitDocLengths && (item as any).exitDocLengths.length > 0 && (
                    <div className="item-lengths-detail">
                      <span className="lengths-label">Détail Longueurs:</span>
                      <div className="lengths-wrap">
                        {(item as any).exitDocLengths.map((len: any, lIdx: number) => (
                          <span key={len.id || lIdx} className="length-item">
                            {len.nbpieces}p / {len.length?.value}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="col-pack" style={{ fontFamily: 'monospace' }}>
                  {/* Fallback to refPaquet from backend API or packageReference from local frontend state */}
                  {item.refPaquet || item.packageReference || '---'}
                </td>
                <td className="col-unit">{item.unit || 'PCS'}</td>
                <td className="col-qty">{utils.formatQuantity(item.quantity, item.unit)}</td>
              </tr>
            ))}
            {/* Pad rest of A4 page with blank rows */}
            {emptyRows.map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row">
                <td colSpan={5}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signature boxes */}
      <div className="signature-section" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="signature-box">
          <span className="signature-label">CHAUFFEUR</span>
          <div className="signature-area font-bold text-center text-xs pt-1">
            {transfer.transporter || '---'} <br />
            <span className="text-[8px] font-medium text-stone-500 font-mono">Véhicule: {getVehicleInfo()}</span>
          </div>
          <span className="cin-label">Nom & Signature</span>
        </div>
        <div className="signature-box">
          <span className="signature-label">RESP. SORTIE</span>
          <div className="signature-area"></div>
        </div>
        <div className="signature-box">
          <span className="signature-label">CONTRÔLEUR</span>
          <div className="signature-area"></div>
          <span className="cin-label" style={{ fontSize: '6.5pt' }}>Date & Heure</span>
        </div>
        <div className="signature-box">
          <span className="signature-label">RÉCEPTIONNAIRE</span>
          <div className="signature-area"></div>
          <span className="cin-label" style={{ fontSize: '6.5pt' }}>Cachet & Signature</span>
        </div>
        <div className="signature-box">
          <span className="signature-label">CACHET SOCIETE</span>
          <div className="signature-area"></div>
        </div>
      </div>

      {/* Stamp / Signature Image - bottom right */}
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
          Adresse: {enterprise.siegeAddress} | Tél: {enterprise.phone} | M.F: {enterprise.matriculeFiscal}
        </p>
      </div>
    </div>
  );
}

