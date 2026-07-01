import React from 'react';
import { Enterprise } from '@/types/settings';
import { BankStatementResponse, BankTransaction } from '@/hooks/use-bank-transactions';
import ar from '@/locales/print-ar.json';
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

interface BankStatementStandardProps {
  statement: BankStatementResponse;
  cashDeposits: CashDeposit[];
  bank: { designation: string; rib?: string } | null;
  month: number;
  year: number;
  enterprise: Enterprise;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function BankStatementStandard({
  statement,
  cashDeposits,
  bank,
  month,
  year,
  enterprise,
}: BankStatementStandardProps) {
  const monthName = MONTHS_FR[month - 1];

  // Calculate totals
  const totalCashDeposits = cashDeposits.reduce((sum, d) => sum + d.amountHT, 0);
  const totalDebits = statement.transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredits = statement.transactions.reduce((sum, tx) => sum + tx.credit, 0);

  // Solde Final = Solde Initial + Total Cash Deposits + Total Credits - Total Debits
  const finalBalance = statement.initialBalance + totalCashDeposits + totalCredits - totalDebits;

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
          <h3 className="original-label" style={{ fontSize: '12pt', marginTop: '5px' }}>كشف تقريب بنكي</h3>
        </div>
      </div>

      {/* Document Title and Client/Supplier Info */}
      <div className="document-header" style={{ marginBottom: '15px' }}>
        <div className="document-title-section">
          <h2 className="document-title">RAPPROCHEMENT BANCAIRE</h2>
          <p className="period-text mt-2 text-sm font-medium">
            Période : {monthName} {year}
          </p>
        </div>

        <div className="client-info">
          <div className="info-row">
            <span className="label">Banque :</span>
            <span className="value font-bold">{bank?.designation || '—'}</span>
          </div>
          {bank?.rib && (
            <div className="info-row">
              <span className="label">RIB / Compte :</span>
              <span className="value font-mono text-xs">{bank.rib}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="summary-row mb-6 flex justify-between border-y border-black py-2">
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold">Solde Initial</span>
          <span className="summary-value font-bold">{utils.formatNumber(statement.initialBalance)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2 bg-amber-50/30">
          <span className="summary-label text-[8pt] font-bold text-amber-800">Versements Espèces (+)</span>
          <span className="summary-value font-bold text-amber-800">{utils.formatNumber(totalCashDeposits)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold text-emerald-700">Total Crédit (+)</span>
          <span className="summary-value font-bold text-emerald-700">{utils.formatNumber(totalCredits)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 border-r border-black last:border-0 px-2">
          <span className="summary-label text-[8pt] font-bold text-rose-700">Total Débit (-)</span>
          <span className="summary-value font-bold text-rose-700">{utils.formatNumber(totalDebits)}</span>
        </div>
        <div className="summary-item flex flex-col items-center flex-1 px-2 bg-gray-100">
          <span className="summary-label text-[8pt] font-bold">Solde Final</span>
          <span className="summary-value font-bold text-[10pt]">{utils.formatNumber(finalBalance)}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="items-table-container">
        <table className="items-table ledger-table">
          <thead>
            <tr>
              <th className="col-date" style={{ width: '15%' }}>Date</th>
              <th className="col-desc" style={{ width: '45%' }}>Description / Référence</th>
              <th className="col-debit text-rose-750 text-right" style={{ width: '15%' }}>Débit (-)</th>
              <th className="col-credit text-emerald-750 text-right" style={{ width: '15%' }}>Crédit (+)</th>
              <th className="col-status text-center" style={{ width: '10%' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {/* Solde Initial Row */}
            <tr className="item-row bg-slate-55/30 italic">
              <td className="font-mono text-slate-500 text-[10px]">01/{month.toString().padStart(2, '0')}/{year}</td>
              <td className="font-bold text-slate-800">Solde initial au 01 {monthName} {year}</td>
              <td className="text-right font-mono font-bold text-rose-600">
                {statement.initialBalance < 0 ? utils.formatNumber(Math.abs(statement.initialBalance)) : '-'}
              </td>
              <td className="text-right font-mono font-bold text-emerald-600">
                {statement.initialBalance >= 0 ? utils.formatNumber(statement.initialBalance) : '-'}
              </td>
              <td className="text-center font-bold text-[9px] uppercase tracking-wider text-slate-500">Initial</td>
            </tr>

            {/* Cash Deposits Section */}
            {cashDeposits.length > 0 && (
              <>
                <tr className="bg-amber-100/25">
                  <td colSpan={5} className="font-bold text-amber-800 text-[9px] uppercase tracking-wider px-2 py-1 border-y border-black/10">
                    Versements Espèces
                  </td>
                </tr>
                {cashDeposits.map((deposit) => (
                  <tr key={`cash-${deposit.id}`} className="item-row bg-amber-50/15">
                    <td className="font-mono text-slate-500">
                      {new Date(deposit.depositDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="font-semibold text-slate-800">
                      Versement Espèces {deposit.salesSiteName ? `(${deposit.salesSiteName})` : ''} 
                      {deposit.reference ? ` — Réf: ${deposit.reference}` : ''}
                    </td>
                    <td className="text-right font-mono">-</td>
                    <td className="text-right font-mono font-bold text-emerald-600">
                      {utils.formatNumber(deposit.amountHT)}
                    </td>
                    <td className="text-center">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-250">
                        ESPECE
                      </span>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Standard Bank Transactions Section */}
            {statement.transactions.length > 0 && (
              <>
                <tr className="bg-slate-50/50">
                  <td colSpan={5} className="font-bold text-slate-700 text-[9px] uppercase tracking-wider px-2 py-1 border-y border-black/10">
                    Mouvements Bancaires
                  </td>
                </tr>
                {statement.transactions.map((tx) => (
                  <tr key={tx.id} className={`item-row ${tx.debit > 0 ? 'row-debit' : tx.credit > 0 ? 'row-credit' : ''}`}>
                    <td className="font-mono text-slate-500">
                      {new Date(tx.transactionDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="font-semibold text-slate-800">
                      {tx.description} {tx.reference ? ` — Réf: ${tx.reference}` : ''}
                    </td>
                    <td className="text-right font-mono font-bold text-rose-600">
                      {tx.credit > 0 ? utils.formatNumber(tx.credit) : '-'}
                    </td>
                    <td className="text-right font-mono font-bold text-emerald-600">
                      {tx.debit > 0 ? utils.formatNumber(tx.debit) : '-'}
                    </td>
                    <td className="text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        tx.isReconciled 
                          ? 'bg-corp-blue-50 text-corp-blue-900 border border-corp-blue-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {tx.isReconciled ? 'RAPPROCHÉ' : 'BANQUE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Empty State */}
            {cashDeposits.length === 0 && statement.transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                  Aucun mouvement enregistré pour ce mois.
                </td>
              </tr>
            )}

            {/* Solde Final Row */}
            <tr className="bg-slate-100/80 font-bold border-t-2 border-black/25">
              <td className="font-mono text-slate-500 text-[10px]">Fin {monthName}</td>
              <td className="font-bold text-slate-900">Solde final de rapprochement</td>
              <td className="text-right font-mono font-bold text-rose-600">
                {finalBalance < 0 ? utils.formatNumber(Math.abs(finalBalance)) : '-'}
              </td>
              <td className="text-right font-mono font-bold text-emerald-600">
                {finalBalance >= 0 ? utils.formatNumber(finalBalance) : '-'}
              </td>
              <td className="text-center font-bold text-[9px] uppercase tracking-wider text-slate-800">Final</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
