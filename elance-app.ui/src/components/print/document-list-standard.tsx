import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import * as utils from './print-utils';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';

interface DocumentListStandardProps {
  documentsList: Document[];
  listTitle: string;
  listContext: 'sales' | 'purchases';
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function DocumentListStandard({
  documentsList,
  listTitle,
  listContext,
  enterprise,
  printLocale
}: DocumentListStandardProps) {
  const ar = printLocale || defaultAr;
  // Aggregate totals
  const totalHT = documentsList.reduce((sum, doc) => sum + (doc.total_ht_net_doc || 0), 0);
  const totalTTC = documentsList.reduce((sum, doc) => sum + (doc.total_net_ttc || 0), 0);
  const totalRest = documentsList.reduce((sum, doc) => sum + (doc.remaining_balance || 0), 0);

  const isPurchase = listContext === 'purchases';
  const isFacture = listTitle.toLowerCase().includes('facture');
  const isBR = listTitle.toLowerCase().includes('réception') || listTitle.toLowerCase().includes('reception') || listTitle.toLowerCase().includes('bon');
  const showSupplierRef = isPurchase && (isFacture || isBR);
  const showStatus = !isPurchase;

  // Status mapping to French (simplified for print)
  const getStatusText = (doc: Document) => {
    if (isFacture) {
      return doc.billingstatus === 2 ? 'Payée' : doc.billingstatus === 1 ? 'Partielle' : 'Non Payée';
    }
    return doc.docstatus === 2 ? 'Validé' : doc.docstatus === 1 ? 'Partiel' : 'Brouillon';
  };

  const emptyColSpan = 5 + (showSupplierRef ? 1 : 0) + (isFacture ? 1 : 0) + (showStatus ? 1 : 0);
  const footerLeadingColSpan = 3 + (showSupplierRef ? 1 : 0);

  return (
    <div className="print-container">
      {/* Header Section */}
      <div className="header">
        {/* Left: Company Info */}
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

        {/* Center: Styled Logo */}
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

        {/* Right: Arabic Info */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="document-header" style={{ marginBottom: '15px' }}>
        <div className="document-title-section" style={{ width: '100%', textAlign: 'center', padding: '10px 0' }}>
          <h2 className="document-title" style={{ fontSize: '16pt', textTransform: 'uppercase' }}>
            LISTE DES {listTitle.toUpperCase()}
          </h2>
          <p style={{ fontSize: '10pt', color: '#555', marginTop: '5px' }}>
            Imprimé le {utils.formatDate(new Date())} - {documentsList.length} document(s)
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="items-table-container">
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-code" style={{ width: showSupplierRef ? (isFacture ? '13%' : '14%') : '16%', textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>N° Document</th>
              {showSupplierRef && (
                <th className="col-ref" style={{ width: isFacture ? '13%' : '14%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                  Réf Fournisseur
                </th>
              )}
              <th className="col-date" style={{ width: '10%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>Date</th>
              <th className="col-client" style={{ width: showSupplierRef ? (isFacture ? '26%' : '32%') : '30%', textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>
                {listContext === 'sales' ? 'Client' : 'Fournisseur'}
              </th>
              <th className="col-ht" style={{ width: isFacture ? '12%' : '14%', textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>Montant HT</th>
              <th className="col-ttc" style={{ width: isFacture ? '12%' : '14%', textAlign: 'right', borderRight: (isFacture || showStatus) ? '1px solid #000' : 'none', padding: '4px' }}>Montant TTC</th>
              {isFacture && (
                <th className="col-rest" style={{ width: '12%', textAlign: 'right', borderRight: showStatus ? '1px solid #000' : 'none', padding: '4px' }}>Reste à payer</th>
              )}
              {showStatus && (
                <th className="col-status" style={{ width: '10%', textAlign: 'center', padding: '4px' }}>Statut</th>
              )}
            </tr>
          </thead>
          <tbody>
            {documentsList.length > 0 ? (
              documentsList.map((doc, idx) => (
                <tr key={doc.id || idx} className="item-row">
                  <td className="col-code" style={{ textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>
                    {doc.docnumber || 'Brouillon'}
                  </td>
                  {showSupplierRef && (
                    <td className="col-ref" style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                      {doc.supplierReference || (doc as any)?.supplierreference || '—'}
                    </td>
                  )}
                  <td className="col-date" style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.formatDate(doc.creationdate)}
                  </td>
                  <td className="col-client" style={{ textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.getClientName(doc)}
                  </td>
                  <td className="col-ht" style={{ textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.formatNumber(doc.total_ht_net_doc)}
                  </td>
                  <td className="col-ttc" style={{ textAlign: 'right', borderRight: (isFacture || showStatus) ? '1px solid #000' : 'none', padding: '4px' }}>
                    {utils.formatNumber(doc.total_net_ttc)}
                  </td>
                  {isFacture && (
                    <td className="col-rest" style={{ textAlign: 'right', borderRight: showStatus ? '1px solid #000' : 'none', padding: '4px' }}>
                      {utils.formatNumber(doc.remaining_balance)}
                    </td>
                  )}
                  {showStatus && (
                    <td className="col-status" style={{ textAlign: 'center', padding: '4px', fontSize: '9pt' }}>
                      {getStatusText(doc)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr className="empty-row">
                <td colSpan={emptyColSpan} style={{ textAlign: 'center', padding: '20px' }}>
                  Aucun document trouvé
                </td>
              </tr>
            )}
          </tbody>
          {/* Totals Footer Row */}
          {documentsList.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                <td colSpan={footerLeadingColSpan} style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  TOTAL GLOBAL
                </td>
                <td style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  {utils.formatNumber(totalHT)}
                </td>
                <td style={{ textAlign: 'right', padding: '6px', borderRight: (isFacture || showStatus) ? '1px solid #000' : 'none' }}>
                  {utils.formatNumber(totalTTC)}
                </td>
                {isFacture && (
                  <td style={{ textAlign: 'right', padding: '6px', borderRight: showStatus ? '1px solid #000' : 'none' }}>
                    {utils.formatNumber(totalRest)}
                  </td>
                )}
                {showStatus && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
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
    </div>
  );
}

