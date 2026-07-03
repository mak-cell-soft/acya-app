import React from 'react';
import { Enterprise } from '@/types/settings';
import { BankStatementResponse } from '@/hooks/use-bank-transactions';
import defaultAr from '@/locales/print-ar.json';
import { PrintLocale } from '@/hooks/use-print-locale';
import * as utils from './print-utils';

interface CashDeposit {
  id: number;
  bankId: number;
  depositDate: string;
  depositType: string;
  amountHT: number;
  netAmount: number;
  reference?: string;
  salesSiteName?: string;
}

interface BankStatementLightProps {
  statement: BankStatementResponse;
  cashDeposits: CashDeposit[];
  bank: { designation: string; rib?: string } | null;
  month: number;
  year: number;
  enterprise: Enterprise;
  printLocale?: PrintLocale;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function BankStatementLight({
  statement,
  cashDeposits,
  bank,
  month,
  year,
  enterprise,
  printLocale,
}: BankStatementLightProps) {
  const ar = printLocale || defaultAr;
  const monthName = MONTHS_FR[month - 1];

  // Calculate totals
  const totalCashDeposits = cashDeposits.reduce((sum, d) => sum + d.amountHT, 0);
  const totalDebits = statement.transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredits = statement.transactions.reduce((sum, tx) => sum + tx.credit, 0);

  // Solde Final = Solde Initial + Total Cash Deposits + Total Credits - Total Debits
  const finalBalance = statement.initialBalance + totalCashDeposits + totalCredits - totalDebits;

  return (
    <div className="print-container" style={{ fontFamily: 'monospace' }}>
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

      {/* Document Type Header */}
      <div className="document-type-header" style={{ textTransform: 'uppercase' }}>
        RAPPROCHEMENT BANCAIRE - {monthName} {year}
      </div>

      {/* Meta & Bank Info */}
      <div className="meta-and-client">
        <div className="meta-box" style={{ width: '45%' }}>
          <div className="info-row">
            <span className="info-label">Période: </span>
            <span>{monthName} {year}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Date Imp: </span>
            <span>{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
        <div className="client-box" style={{ width: '50%', borderLeft: '1px dashed #000', paddingLeft: '3mm' }}>
          <div className="info-row">
            <span className="info-label">Banque: </span>
            <span>{bank?.designation || '—'}</span>
          </div>
          {bank?.rib && (
            <div className="info-row">
              <span className="info-label">RIB: </span>
              <span style={{ fontSize: '8.5pt' }}>{bank.rib}</span>
            </div>
          )}
        </div>
      </div>

      <div className="separator" />

      {/* Summary Table */}
      <table style={{ width: '100%', fontSize: '9pt', borderCollapse: 'collapse', marginBottom: '4mm' }}>
        <tbody>
          <tr>
            <td style={{ padding: '1mm 0', fontWeight: 'bold' }}>SOLDE INITIAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{utils.formatNumber(statement.initialBalance)}</td>
          </tr>
          <tr>
            <td style={{ padding: '1mm 0' }}>TOTAL VERSEMENTS ESPECES (+):</td>
            <td style={{ textAlign: 'right' }}>{utils.formatNumber(totalCashDeposits)}</td>
          </tr>
          <tr>
            <td style={{ padding: '1mm 0' }}>TOTAL CREDITS (+):</td>
            <td style={{ textAlign: 'right' }}>{utils.formatNumber(totalCredits)}</td>
          </tr>
          <tr>
            <td style={{ padding: '1mm 0' }}>TOTAL DEBITS (-):</td>
            <td style={{ textAlign: 'right' }}>{utils.formatNumber(totalDebits)}</td>
          </tr>
          <tr style={{ borderTop: '1px double #000', borderBottom: '1px double #000' }}>
            <td style={{ padding: '2mm 0', fontWeight: 'bold' }}>SOLDE FINAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10pt' }}>{utils.formatNumber(finalBalance)}</td>
          </tr>
        </tbody>
      </table>

      <div className="separator" />

      {/* Ledger Monospace Table */}
      <table className="items-table" style={{ width: '100%', fontSize: '8.5pt' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px dashed #000', paddingBottom: '1mm', width: '15%' }}>DATE</th>
            <th style={{ textAlign: 'left', borderBottom: '1px dashed #000', paddingBottom: '1mm', width: '50%' }}>DESCRIPTION / REFERENCE</th>
            <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', paddingBottom: '1mm', width: '17%' }}>DEBIT (-)</th>
            <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', paddingBottom: '1mm', width: '18%' }}>CREDIT (+)</th>
          </tr>
        </thead>
        <tbody>
          {/* Initial Balance */}
          <tr>
            <td style={{ padding: '1mm 0' }}>01/{month.toString().padStart(2, '0')}</td>
            <td style={{ padding: '1mm 0', fontStyle: 'italic' }}>SOLDE INITIAL</td>
            <td style={{ textAlign: 'right', padding: '1mm 0' }}>
              {statement.initialBalance < 0 ? utils.formatNumber(Math.abs(statement.initialBalance)) : '-'}
            </td>
            <td style={{ textAlign: 'right', padding: '1mm 0' }}>
              {statement.initialBalance >= 0 ? utils.formatNumber(statement.initialBalance) : '-'}
            </td>
          </tr>

          {/* Cash Deposits */}
          {cashDeposits.length > 0 && (
            <>
              <tr>
                <td colSpan={4} style={{ padding: '1mm 0', fontWeight: 'bold', borderBottom: '1px dashed #eee' }}>
                  -- VERSEMENTS ESPECES --
                </td>
              </tr>
              {cashDeposits.map((deposit) => (
                <tr key={`cash-${deposit.id}`}>
                  <td style={{ padding: '1mm 0' }}>
                    {new Date(deposit.depositDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td style={{ padding: '1mm 0' }}>
                    VE ESPECES {deposit.salesSiteName ? `(${deposit.salesSiteName})` : ''} 
                    {deposit.reference ? ` Réf:${deposit.reference}` : ''}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1mm 0' }}>-</td>
                  <td style={{ textAlign: 'right', padding: '1mm 0', fontWeight: 'bold' }}>
                    {utils.formatNumber(deposit.amountHT)}
                  </td>
                </tr>
              ))}
            </>
          )}

          {/* Transactions */}
          {statement.transactions.length > 0 && (
            <>
              <tr>
                <td colSpan={4} style={{ padding: '1mm 0', fontWeight: 'bold', borderBottom: '1px dashed #eee' }}>
                  -- MOUVEMENTS BANCAIRES --
                </td>
              </tr>
              {statement.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ padding: '1mm 0' }}>
                    {new Date(tx.transactionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td style={{ padding: '1mm 0' }}>
                    {tx.description} {tx.reference ? ` Réf:${tx.reference}` : ''}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1mm 0' }}>
                    {tx.credit > 0 ? utils.formatNumber(tx.credit) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '1mm 0' }}>
                    {tx.debit > 0 ? utils.formatNumber(tx.debit) : '-'}
                  </td>
                </tr>
              ))}
            </>
          )}

          {/* Empty state */}
          {cashDeposits.length === 0 && statement.transactions.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '4mm 0', fontStyle: 'italic' }}>
                Aucun mouvement enregistré.
              </td>
            </tr>
          )}

          {/* Final Balance Row */}
          <tr style={{ borderTop: '1px dashed #000', fontWeight: 'bold' }}>
            <td style={{ padding: '2mm 0' }}>Fin {month.toString().padStart(2, '0')}</td>
            <td style={{ padding: '2mm 0' }}>SOLDE FINAL DE RAPPROCHEMENT</td>
            <td style={{ textAlign: 'right', padding: '2mm 0' }}>
              {finalBalance < 0 ? utils.formatNumber(Math.abs(finalBalance)) : '-'}
            </td>
            <td style={{ textAlign: 'right', padding: '2mm 0' }}>
              {finalBalance >= 0 ? utils.formatNumber(finalBalance) : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
