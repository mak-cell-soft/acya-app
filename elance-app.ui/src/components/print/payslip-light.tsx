import React from 'react';
import { Person, ROLE_LABELS } from '@/types/team';
import { Payslip } from '@/types/hr';
import { Enterprise } from '@/types/settings';
import templates from '@/locales/hr-print-templates.json';
import ar from '@/locales/print-ar.json';
import { numberToFrenchWords } from '@/lib/number-to-words';

interface PayslipLightProps {
  employee: Person;
  payslip: Payslip;
  enterprise: Enterprise;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function PayslipLight({ employee, payslip, enterprise }: PayslipLightProps) {
  const monthName = MONTHS_FR[(payslip.periodmonth || 1) - 1];
  const netWords = numberToFrenchWords(payslip.netsalary);
  
  // Total charges deducted (CNSS + IRPP + CSS)
  const totalCharges = (payslip.cnssamount || 0) + (payslip.irppamount || 0) + (payslip.cssamount || 0);
  const totalDeductions = totalCharges + (payslip.deductions || 0);

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
        BULLETIN DE PAIE - {monthName.toUpperCase()} {payslip.periodyear}
      </div>

      {/* Meta & Employee Details Box */}
      <div className="meta-and-client">
        <div className="meta-box" style={{ width: '48%' }}>
          <div className="info-row">
            <span className="info-label">Période: </span>
            <span>{monthName} {payslip.periodyear}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Date Calc: </span>
            <span>{payslip.generatedat ? new Date(payslip.generatedat).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mode Pay: </span>
            <span>{employee.bankaccount ? 'Virement' : 'Especes'}</span>
          </div>
        </div>

        <div className="client-box" style={{ width: '48%', borderLeft: '1px dashed #000', paddingLeft: '3mm' }}>
          <div className="info-row">
            <span className="info-label">Employé: </span>
            <span>{employee.firstname} {employee.lastname}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CIN N°: </span>
            <span>{employee.cin || '---'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CNSS N°: </span>
            <span>{employee.idcnss || '---'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Fonction: </span>
            <span>{ROLE_LABELS[employee.role] || 'Collaborateur'}</span>
          </div>
        </div>
      </div>

      <div className="separator" />

      {/* Monospace simple Salary breakdown table */}
      <table className="items-table">
        <thead>
          <tr>
            <th className="col-designation" style={{ textAlign: 'left', borderBottom: '1px dashed #000' }}>RUBRIQUE SALARIALE</th>
            <th style={{ textAlign: 'right', width: '20%', borderBottom: '1px dashed #000' }}>GAINS</th>
            <th style={{ textAlign: 'right', width: '20%', borderBottom: '1px dashed #000' }}>RETENUES</th>
          </tr>
        </thead>
        <tbody>
          <tr className="item-row">
            <td className="col-designation">Salaire de Base</td>
            <td style={{ textAlign: 'right' }}>{(payslip.basesalary || 0).toFixed(3)}</td>
            <td style={{ textAlign: 'right' }}>-</td>
          </tr>
          {payslip.bonuses > 0 && (
            <tr className="item-row">
              <td className="col-designation">Primes & Indemnités</td>
              <td style={{ textAlign: 'right' }}>{(payslip.bonuses).toFixed(3)}</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
          )}
          <tr className="item-row" style={{ fontStyle: 'italic', color: '#444' }}>
            <td className="col-designation">Total Brut</td>
            <td style={{ textAlign: 'right' }}>{(payslip.brutsalary || 0).toFixed(3)}</td>
            <td style={{ textAlign: 'right' }}>-</td>
          </tr>
          {payslip.cnssamount > 0 && (
            <tr className="item-row">
              <td className="col-designation">Cotisation CNSS (9.18%)</td>
              <td style={{ textAlign: 'right' }}>-</td>
              <td style={{ textAlign: 'right' }}>{(payslip.cnssamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.irppamount > 0 && (
            <tr className="item-row">
              <td className="col-designation">Retenue Impôt IRPP</td>
              <td style={{ textAlign: 'right' }}>-</td>
              <td style={{ textAlign: 'right' }}>{(payslip.irppamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.cssamount > 0 && (
            <tr className="item-row">
              <td className="col-designation">Retenue CSS</td>
              <td style={{ textAlign: 'right' }}>-</td>
              <td style={{ textAlign: 'right' }}>{(payslip.cssamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.deductions > 0 && (
            <tr className="item-row">
              <td className="col-designation">Avances / Prêts</td>
              <td style={{ textAlign: 'right' }}>-</td>
              <td style={{ textAlign: 'right' }}>{(payslip.deductions).toFixed(3)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Monospace Totals Block */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2mm' }}>
        <div className="totals-box" style={{ width: '50%', borderTop: '1px dashed #000', paddingTop: '1mm' }}>
          <div className="total-row">
            <span>Total Retenues:</span>
            <span>{totalDeductions.toFixed(3)} TND</span>
          </div>
          <div className="total-row payable" style={{ fontSize: '10pt', fontWeight: 'bold', border: '1px dashed #000', padding: '1mm' }}>
            <span>NET A PAYER:</span>
            <span>{(payslip.netsalary || 0).toFixed(3)} TND</span>
          </div>
        </div>
      </div>

      {/* Spelled net amount in words */}
      <div style={{ fontSize: '8pt', marginTop: '4mm', fontWeight: 'bold' }}>
        NET EN TOUTES LETTRES: <br />
        <span>{netWords} DINARS</span>
      </div>

      <div className="separator" style={{ marginTop: '4mm' }} />

      {/* Simple Courier Signatures */}
      <div className="signatures" style={{ marginTop: '4mm' }}>
        <div className="sig-box" style={{ width: '45%', height: '12mm' }}>
          <div className="sig-label">L'EMPLOYÉ</div>
          <div style={{ fontSize: '7pt', textAlign: 'center', color: '#666' }}>(Signature)</div>
        </div>
        <div className="sig-box" style={{ width: '45%', height: '12mm' }}>
          <div className="sig-label">L'EMPLOYEUR</div>
          <div style={{ fontSize: '7pt', textAlign: 'center', color: '#666' }}>(Cachet & Signature)</div>
        </div>
      </div>

      <div className="footer-legal-light" style={{ marginTop: '6mm' }}>
        {enterprise.name} - Bulletin de paie confidentiel
      </div>
    </div>
  );
}
