import React from 'react';
import { DashboardPaymentDto } from '@/types/payment';
import { Enterprise } from '@/types/settings';
import * as utils from './print-utils';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';

interface SupplierPaymentsListStandardProps {
  paymentsList: DashboardPaymentDto[];
  listTitle: string;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

export function SupplierPaymentsListStandard({
  paymentsList,
  listTitle,
  enterprise,
  printLocale
}: SupplierPaymentsListStandardProps) {
  const ar = printLocale || defaultAr;
  const totalAmount = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="print-container">
      {/* Header Section */}
      <div className="header">
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

        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="document-header" style={{ marginBottom: '15px' }}>
        <div className="document-title-section" style={{ width: '100%', textAlign: 'center', padding: '10px 0' }}>
          <h2 className="document-title" style={{ fontSize: '16pt', textTransform: 'uppercase' }}>
            {listTitle.toUpperCase()}
          </h2>
          <p style={{ fontSize: '10pt', color: '#555', marginTop: '5px' }}>
            Imprimé le {utils.formatDate(new Date())} - {paymentsList.length} règlement(s)
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="items-table-container">
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '12%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>Date</th>
              <th style={{ width: '28%', textAlign: 'left', borderRight: '1px solid #000', padding: '4px' }}>Fournisseur</th>
              <th style={{ width: '16%', textAlign: 'right', borderRight: '1px solid #000', padding: '4px' }}>Montant (TND)</th>
              <th style={{ width: '14%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>Mode</th>
              <th style={{ width: '15%', textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>Échéance</th>
              <th style={{ width: '15%', textAlign: 'center', padding: '4px' }}>Document / Réf</th>
            </tr>
          </thead>
          <tbody>
            {paymentsList.length > 0 ? (
              paymentsList.map((p, idx) => {
                const dateObj = p.createdAt || p.paymentDate;
                const echeance = p.dueDate || '-';
                const docRef = p.invoiceNumber || p.deliveryNoteNumber || p.reference || 'Avance';
                return (
                  <tr key={p.paymentId || idx} className="item-row">
                    <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                      {utils.formatDate(dateObj)}
                    </td>
                    <td style={{ textAlign: 'left', borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>
                      {p.customerName || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>
                      {utils.formatNumber(p.amount)}
                    </td>
                    <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                      {p.paymentMethod}
                    </td>
                    <td style={{ textAlign: 'center', borderRight: '1px solid #000', padding: '4px' }}>
                      {echeance !== '-' ? utils.formatDate(echeance) : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px', fontSize: '8.5pt' }}>
                      {docRef}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="empty-row">
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                  Aucun règlement trouvé
                </td>
              </tr>
            )}
          </tbody>
          {paymentsList.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  TOTAL GLOBAL
                </td>
                <td style={{ textAlign: 'right', padding: '6px', borderRight: '1px solid #000' }}>
                  {utils.formatNumber(totalAmount)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Stamp */}
      {ar.stampImageBase64 && (
        <div className="stamp-container">
          <img src={ar.stampImageBase64} alt="Cachet et Signature" className="stamp-image" />
        </div>
      )}
    </div>
  );
}
