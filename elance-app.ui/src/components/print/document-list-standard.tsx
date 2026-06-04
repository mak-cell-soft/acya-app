import React from 'react';
import { Document } from '@/types/document';
import { Enterprise } from '@/types/settings';
import * as utils from './print-utils';
import ar from '@/locales/print-ar.json';

interface DocumentListStandardProps {
  documentsList: Document[];
  listTitle: string;
  listContext: 'sales' | 'purchases';
  enterprise: Enterprise;
}

export function DocumentListStandard({
  documentsList,
  listTitle,
  listContext,
  enterprise
}: DocumentListStandardProps) {
  // Aggregate totals
  const totalHT = documentsList.reduce((sum, doc) => sum + (doc.total_ht_net_doc || 0), 0);
  const totalTTC = documentsList.reduce((sum, doc) => sum + (doc.total_net_ttc || 0), 0);
  const totalRest = documentsList.reduce((sum, doc) => sum + (doc.remaining_balance || 0), 0);

  // Status mapping to French (simplified for print)
  const getStatusText = (doc: Document) => {
    if (listTitle.toLowerCase().includes('facture')) {
      return doc.billingstatus === 2 ? 'Payée' : doc.billingstatus === 1 ? 'Partielle' : 'Non Payée';
    }
    return doc.docstatus === 2 ? 'Validé' : doc.docstatus === 1 ? 'Partiel' : 'Brouillon';
  };

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
            {enterprise.capital ? `شركة خفية الإسم رأس مالها ${enterprise.capital}` : ar.companyArabicCapital}
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
              <th className="col-code">N° Document</th>
              <th className="col-date" style={{ width: '12%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>Date</th>
              <th className="col-client" style={{ width: '30%', textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>
                {listContext === 'sales' ? 'Client' : 'Fournisseur'}
              </th>
              <th className="col-ht" style={{ width: '15%', textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>Montant HT</th>
              <th className="col-ttc" style={{ width: '15%', textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>Montant TTC</th>
              {listTitle.toLowerCase().includes('facture') && (
                <th className="col-rest" style={{ width: '12%', textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>Reste à payer</th>
              )}
              <th className="col-status" style={{ width: '10%', textAlign: 'center', padding: '4px' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {documentsList.length > 0 ? (
              documentsList.map((doc, idx) => (
                <tr key={doc.id || idx} className="item-row">
                  <td className="col-code" style={{ padding: '4px' }}>{doc.docnumber || 'Brouillon'}</td>
                  <td className="col-date" style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.formatDate(doc.creationdate)}
                  </td>
                  <td className="col-client" style={{ textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.getClientName(doc)}
                  </td>
                  <td className="col-ht" style={{ textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.formatNumber(doc.total_ht_net_doc)}
                  </td>
                  <td className="col-ttc" style={{ textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>
                    {utils.formatNumber(doc.total_net_ttc)}
                  </td>
                  {listTitle.toLowerCase().includes('facture') && (
                    <td className="col-rest" style={{ textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>
                      {utils.formatNumber(doc.remaining_balance)}
                    </td>
                  )}
                  <td className="col-status" style={{ textAlign: 'center', padding: '4px', fontSize: '9pt' }}>
                    {getStatusText(doc)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="empty-row">
                <td colSpan={listTitle.toLowerCase().includes('facture') ? 7 : 6} style={{ textAlign: 'center', padding: '20px' }}>
                  Aucun document trouvé
                </td>
              </tr>
            )}
          </tbody>
          {/* Totals Footer Row */}
          {documentsList.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  TOTAL GLOBAL
                </td>
                <td style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  {utils.formatNumber(totalHT)}
                </td>
                <td style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  {utils.formatNumber(totalTTC)}
                </td>
                {listTitle.toLowerCase().includes('facture') && (
                  <td style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                    {utils.formatNumber(totalRest)}
                  </td>
                )}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
