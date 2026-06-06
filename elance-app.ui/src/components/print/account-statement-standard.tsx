import React from 'react';
import { AccountStatement, Customer, Supplier } from '@/types/customer';
import { Enterprise } from '@/types/settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ar from '@/locales/print-ar.json';
import * as utils from './print-utils';

interface AccountStatementStandardProps {
  statement: AccountStatement;
  counterpart: Customer | Supplier;
  enterprise: Enterprise;
  periodStart: Date;
  periodEnd: Date;
  statementType: 'customer' | 'supplier';
}

export function AccountStatementStandard({
  statement,
  counterpart,
  enterprise,
  periodStart,
  periodEnd,
  statementType,
}: AccountStatementStandardProps) {
  const getDocTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      Invoice: 'Facture',
      DeliveryNote: 'Bon de Livraison',
      Payment: 'Paiement',
      CreditNote: 'Avoir',
      OpeningBalance: 'Solde Initial',
    };
    return types[type] || type;
  };

  const title = statementType === 'customer' ? 'ÉTAT DE COMPTE CLIENT' : 'ÉTAT DE COMPTE FOURNISSEUR';
  const labelText = statementType === 'customer' ? 'كشف حساب حريف' : 'كشف حساب مزود';

  const rowCount = statement?.transactions?.length || 0;
  const paddingCount = Math.max(0, 15 - rowCount);
  const emptyRows = Array.from({ length: paddingCount });

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

        {/* Right: Arabic Info and Label */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {enterprise.capital ? `شركة خفية الإسم رأس مالها ${enterprise.capital}` : ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <h3 className="original-label">{labelText}</h3>
        </div>
      </div>

      {/* Document Title and Client/Supplier Info */}
      <div className="document-header">
        <div className="document-title-section">
          <h2 className="document-title">{title}</h2>
          <p className="period-text mt-2 text-sm font-medium">
            Du {format(periodStart, 'dd/MM/yyyy')} au {format(periodEnd, 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="client-info">
          <div className="info-row">
            <span className="label">{statementType === 'customer' ? ar.labels.client : 'Fournisseur :'}</span>
            <span className="value font-bold">{counterpart.name || `${counterpart.firstname} ${counterpart.lastname}`}</span>
          </div>
          <div className="info-row">
            <span className="label">{ar.labels.address}</span>
            <span className="value">{counterpart.address}</span>
          </div>
          <div className="info-row">
            <span className="label">{ar.labels.tvaCode}</span>
            <span className="value font-mono text-xs">{counterpart.taxregistrationnumber}</span>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="summary-row mb-4 flex justify-between border-y border-black py-2">
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold">Solde Avant Période</span>
          <span className="summary-value font-bold">{utils.formatNumber(statement?.balanceBeforePeriod)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold text-rose-700">Total Débit</span>
          <span className="summary-value font-bold text-rose-700">{utils.formatNumber(statement?.totalDebit)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold text-emerald-700">Total Crédit</span>
          <span className="summary-value font-bold text-emerald-700">{utils.formatNumber(statement?.totalCredit)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 px-2 bg-gray-100">
          <span className="summary-label text-[8pt] font-bold">Solde Final</span>
          <span className="summary-value font-bold text-[10pt]">{utils.formatNumber(statement?.closingBalance)}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="items-table-container">
        <table className="items-table ledger-table">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th className="col-type">Document / Type</th>
              <th className="col-desc">Description</th>
              <th className="col-debit text-rose-700">Débit</th>
              <th className="col-credit text-emerald-700">Crédit</th>
              <th className="col-balance">Solde</th>
            </tr>
          </thead>
          <tbody>
            {statement?.transactions?.map((tx) => (
              <tr key={tx.id} className={`item-row ${tx.debit > 0 ? 'row-debit' : tx.credit > 0 ? 'row-credit' : ''}`}>
                <td className="col-date font-bold">
                  {format(new Date(tx.transactionDate), 'dd/MM/yyyy')}
                </td>
                <td className="col-type">
                  <div className="font-bold">{getDocTypeLabel(tx.type)}</div>
                  {tx.relatedId && <div className="text-[7pt] text-gray-600">REF: {tx.relatedId}</div>}
                </td>
                <td className="col-desc">
                  <div>{tx.description || '—'}</div>
                  {tx.relatedDeliveryNoteRefs && tx.relatedDeliveryNoteRefs.length > 0 && (
                    <div className="text-[7pt] text-gray-500 mt-0.5">
                      {tx.relatedDeliveryNoteRefs.join(', ')}
                    </div>
                  )}
                </td>
                <td className="col-debit font-bold text-rose-700">
                  {tx.debit > 0 ? utils.formatNumber(tx.debit) : '—'}
                </td>
                <td className="col-credit font-bold text-emerald-700">
                  {tx.credit > 0 ? utils.formatNumber(tx.credit) : '—'}
                </td>
                <td className={`col-balance font-bold ${tx.runningBalance < 0 ? 'balance-negative text-rose-700' : 'balance-positive'}`}>
                  {utils.formatNumber(tx.runningBalance)}
                </td>
              </tr>
            ))}
            {/* Pad rest of A4 page with blank rows */}
            {emptyRows.map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row">
                <td colSpan={6}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Legal */}
      <div className="footer-legal mt-8">
        <p className="text-center font-bold mb-4">
          Arrêté le présent relevé de compte à la somme de :
          <br />
          <span className="text-lg">{utils.formatNumber(statement?.closingBalance)} TND</span>
        </p>
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

