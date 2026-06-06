import React from 'react';
import { Person, ROLE_LABELS } from '@/types/team';
import { Payslip } from '@/types/hr';
import { Enterprise } from '@/types/settings';
import templates from '@/locales/hr-print-templates.json';
import ar from '@/locales/print-ar.json';
import { numberToFrenchWords } from '@/lib/number-to-words';

interface PayslipStandardProps {
  employee: Person;
  payslip: Payslip;
  enterprise: Enterprise;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function PayslipStandard({ employee, payslip, enterprise }: PayslipStandardProps) {
  const monthName = MONTHS_FR[(payslip.periodmonth || 1) - 1];
  const netWords = numberToFrenchWords(payslip.netsalary);
  
  // Total charges deducted (CNSS + IRPP + CSS)
  const totalCharges = (payslip.cnssamount || 0) + (payslip.irppamount || 0) + (payslip.cssamount || 0);
  const totalDeductions = totalCharges + (payslip.deductions || 0);

  return (
    <div className="print-container">
      <style>{`
        .payslip-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 6mm;
          margin-bottom: 6mm;
        }
        .payslip-box {
          border: 1px solid #000;
          padding: 3mm;
          font-size: 8pt;
        }
        .payslip-box-title {
          font-weight: 900;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 2mm;
          text-transform: uppercase;
          font-size: 8.5pt;
        }
        .payslip-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5mm;
        }
        .payslip-row:last-child {
          margin-bottom: 0;
        }
        .payslip-row .label {
          font-weight: bold;
          color: #333;
        }
        .payslip-row .value {
          font-weight: bold;
        }
        .table-payslip {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000;
          font-size: 8.5pt;
          margin-bottom: 6mm;
        }
        .table-payslip th, .table-payslip td {
          border: 1px solid #000;
          padding: 2mm 3mm;
        }
        .table-payslip th {
          background-color: #fafafa !important;
          font-weight: bold;
          text-align: center;
          font-size: 8pt;
        }
        .table-payslip td.col-rubrique {
          text-align: left;
          font-weight: bold;
        }
        .table-payslip td.col-base,
        .table-payslip td.col-gain,
        .table-payslip td.col-retenue {
          text-align: right;
          font-family: monospace;
          font-weight: bold;
        }
        .net-payable-row {
          background-color: #f0f0f0 !important;
          border-top: 2px double #000;
          font-size: 9.5pt;
        }
        .net-payable-row td {
          padding: 3mm;
        }
        .payslip-footer-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15mm;
          margin-top: 10mm;
        }
        .payslip-sig-box {
          border: 1px solid #000;
          padding: 3mm;
          min-height: 25mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `}</style>

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
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'ARIANA'}</p>
          </div>
        </div>

        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {enterprise.capital ? `شركة خفية الإسم رأس مالها ${enterprise.capital}` : ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
        </div>
      </div>

      {/* Document Title Header */}
      <div className="document-header" style={{ marginBottom: '6mm' }}>
        <div className="document-title-section" style={{ width: '100%', padding: '4mm' }}>
          <h2 className="document-title">{templates.payslip.title}</h2>
          <span style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '1.5mm', display: 'block' }}>{templates.payslip.titleAr}</span>
        </div>
      </div>

      {/* Info Boxes: Employee and Period */}
      <div className="payslip-grid">
        {/* Left Box: Employee Metadata */}
        <div className="payslip-box">
          <div className="payslip-box-title">Collaborateur</div>
          <div className="payslip-row">
            <span className="label">Nom & Prénom:</span>
            <span className="value">{employee.firstname} {employee.lastname}</span>
          </div>
          <div className="payslip-row">
            <span className="label">CIN N°:</span>
            <span className="value font-mono">{employee.cin || '---'}</span>
          </div>
          <div className="payslip-row">
            <span className="label">CNSS N°:</span>
            <span className="value font-mono">{employee.idcnss || '---'}</span>
          </div>
          <div className="payslip-row">
            <span className="label">Fonction:</span>
            <span className="value">{ROLE_LABELS[employee.role] || 'Collaborateur'}</span>
          </div>
          <div className="payslip-row">
            <span className="label">Date d'embauche:</span>
            <span className="value">{employee.hiredate ? new Date(employee.hiredate).toLocaleDateString('fr-FR') : '---'}</span>
          </div>
        </div>

        {/* Right Box: Pay Period / Payment Mode */}
        <div className="payslip-box">
          <div className="payslip-box-title">Période & Règlement</div>
          <div className="payslip-row">
            <span className="label">Mois de paie:</span>
            <span className="value">{monthName} {payslip.periodyear}</span>
          </div>
          <div className="payslip-row">
            <span className="label">Date de calcul:</span>
            <span className="value">{payslip.generatedat ? new Date(payslip.generatedat).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="payslip-row">
            <span className="label">Règlement:</span>
            <span className="value">{employee.bankaccount ? 'Virement Bancaire' : 'Espèces'}</span>
          </div>
          {employee.bankname && (
            <div className="payslip-row">
              <span className="label">Banque:</span>
              <span className="value text-xs">{employee.bankname}</span>
            </div>
          )}
          {employee.bankaccount && (
            <div className="payslip-row">
              <span className="label">RIB N°:</span>
              <span className="value font-mono text-[7.5pt]">{employee.bankaccount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Salary Breakdown Table */}
      <table className="table-payslip">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>RUBRIQUE SALARIALE</th>
            <th style={{ width: '15%', textAlign: 'right' }}>BASE (TND)</th>
            <th style={{ width: '20%', textAlign: 'right' }}>GAINS (TND)</th>
            <th style={{ width: '20%', textAlign: 'right' }}>RETENUES (TND)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="col-rubrique">Salaire de Base</td>
            <td className="col-base">{(payslip.basesalary || 0).toFixed(3)}</td>
            <td className="col-gain">{(payslip.basesalary || 0).toFixed(3)}</td>
            <td className="col-retenue">-</td>
          </tr>
          {payslip.bonuses > 0 && (
            <tr>
              <td className="col-rubrique">Primes & Indemnités</td>
              <td className="col-base">-</td>
              <td className="col-gain">{(payslip.bonuses).toFixed(3)}</td>
              <td className="col-retenue">-</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <td className="col-rubrique" style={{ color: '#555', fontStyle: 'italic' }}>Total Salaire Brut</td>
            <td className="col-base">-</td>
            <td className="col-gain" style={{ color: '#555' }}>{(payslip.brutsalary || 0).toFixed(3)}</td>
            <td className="col-retenue">-</td>
          </tr>
          {payslip.cnssamount > 0 && (
            <tr>
              <td className="col-rubrique">Cotisation Salariale CNSS (9.18%)</td>
              <td className="col-base">{(payslip.brutsalary || 0).toFixed(3)}</td>
              <td className="col-gain">-</td>
              <td className="col-retenue">{(payslip.cnssamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.irppamount > 0 && (
            <tr>
              <td className="col-rubrique">Retenue d'Impôt I.R.P.P.</td>
              <td className="col-base">-</td>
              <td className="col-gain">-</td>
              <td className="col-retenue">{(payslip.irppamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.cssamount > 0 && (
            <tr>
              <td className="col-rubrique">Contribution Sociale de Solidarité (C.S.S.)</td>
              <td className="col-base">-</td>
              <td className="col-gain">-</td>
              <td className="col-retenue">{(payslip.cssamount).toFixed(3)}</td>
            </tr>
          )}
          {payslip.deductions > 0 && (
            <tr>
              <td className="col-rubrique">Retenues sur Salaire (Avances / Prêts)</td>
              <td className="col-base">-</td>
              <td className="col-gain">-</td>
              <td className="col-retenue">{(payslip.deductions).toFixed(3)}</td>
            </tr>
          )}
          {/* Pad table with empty visual lines */}
          {Array.from({ length: Math.max(0, 4 - (payslip.bonuses > 0 ? 1 : 0) - (payslip.cnssamount > 0 ? 1 : 0) - (payslip.irppamount > 0 ? 1 : 0) - (payslip.cssamount > 0 ? 1 : 0) - (payslip.deductions > 0 ? 1 : 0)) }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: '7mm' }}>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
          {/* Net Salary Summary Row */}
          <tr className="net-payable-row">
            <td className="col-rubrique" style={{ textTransform: 'uppercase', fontSize: '9pt' }}>Net à Payer</td>
            <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>
              Total Retenues : {totalDeductions.toFixed(3)} TND
            </td>
            <td style={{ textAlign: 'right', fontWeight: '900', color: '#15803d', fontFamily: 'monospace' }}>
              {(payslip.netsalary || 0).toFixed(3)} TND
            </td>
          </tr>
        </tbody>
      </table>

      {/* Net Amount in Words Box */}
      <div className="amount-words" style={{ width: '100%', marginBottom: '6mm' }}>
        <span className="words-label">ARRÊTÉ LE PRÉSENT BULLETIN À LA SOMME NETTE DE :</span>
        <span className="words-value">{netWords} DINARS</span>
      </div>

      {/* Custom notes from JSON */}
      <div style={{ fontSize: '7.5pt', color: '#666', fontStyle: 'italic', marginBottom: '8mm' }}>
        {templates.payslip.notes} <br />
        <span dir="rtl" style={{ display: 'block', marginTop: '1mm', textAlign: 'right', fontWeight: 'bold' }}>{templates.payslip.notesAr}</span>
      </div>

      {/* Signature boxes */}
      <div className="payslip-footer-signatures">
        <div className="payslip-sig-box">
          <span className="signature-label" style={{ borderBottom: '1px dotted #000', paddingBottom: '1mm' }}>L'Employé</span>
          <div className="signature-area"></div>
          <span style={{ fontSize: '6.5pt', color: '#666', textAlign: 'center' }}>Signature précédée de "Lu et approuvé"</span>
        </div>
        <div className="payslip-sig-box">
          <span className="signature-label" style={{ borderBottom: '1px dotted #000', paddingBottom: '1mm' }}>L'Employeur (Direction)</span>
          <div className="signature-area"></div>
          <span style={{ fontSize: '6.5pt', color: '#666', textAlign: 'center' }}>Signature & Cachet</span>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="footer-legal" style={{ marginTop: '20mm' }}>
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

