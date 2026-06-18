import React from 'react';
import { Person } from '@/types/team';
import { Leave } from '@/types/hr';
import { Enterprise } from '@/types/settings';
import templates from '@/locales/hr-print-templates.json';
import ar from '@/locales/print-ar.json';

interface LeaveStandardProps {
  employee: Person;
  leave: Leave;
  enterprise: Enterprise;
}

export function LeaveStandard({ employee, leave, enterprise }: LeaveStandardProps) {
  // Token formatting helper to dynamically populate template paragraphs
  const formatText = (template: string) => {
    if (!template) return '';
    return template
      .replace(/{employerName}/g, 'Le Gérant')
      .replace(/{enterpriseName}/g, enterprise.name || '')
      .replace(/{employeeName}/g, `${employee.firstname} ${employee.lastname}`)
      .replace(/{cin}/g, employee.cin || '---')
      .replace(/{cnss}/g, employee.idcnss || '---')
      .replace(/{leaveType}/g, leave.leavetype)
      .replace(/{durationDays}/g, leave.durationdays.toString())
      .replace(/{startDate}/g, new Date(leave.startdate).toLocaleDateString('fr-FR'))
      .replace(/{endDate}/g, new Date(leave.enddate).toLocaleDateString('fr-FR'));
  };

  const bodyFr = formatText(templates.leave.bodyTemplate);
  const bodyAr = formatText(templates.leave.bodyTemplateAr);

  return (
    <div className="print-container">
      {/* Custom Stylesheet specifically for administrative letters */}
      <style>{`
        .letter-content {
          margin-top: 10mm;
          margin-bottom: 10mm;
          display: flex;
          flex-direction: column;
          gap: 8mm;
        }
        .body-paragraph {
          font-size: 10.5pt;
          line-height: 1.8;
          text-align: justify;
          margin-bottom: 6mm;
          color: #111;
        }
        .body-paragraph.arabic {
          direction: rtl;
          text-align: justify;
          font-family: 'Inter', Arial, sans-serif;
          font-weight: bold;
          font-size: 11pt;
        }
        .hr-signature-section {
          margin-top: 15mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20mm;
        }
        .hr-sig-box {
          border: 1px dashed #ccc;
          padding: 4mm;
          min-height: 35mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-radius: 8px;
        }
        .hr-sig-label {
          font-weight: bold;
          font-size: 9.5pt;
          text-align: center;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 1.5mm;
          margin-bottom: 3mm;
          text-transform: uppercase;
        }
        .hr-sig-area {
          flex: 1;
        }
        .hr-sig-footer {
          font-size: 7.5pt;
          color: #666;
          text-align: center;
          margin-top: auto;
        }
      `}</style>

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

        {/* Right: Arabic Info and Title Label */}
        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">
            {enterprise.capital ? `شركة خفية الإسم رأس مالها ${enterprise.capital}` : ar.companyArabicCapital}
          </p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
        </div>
      </div>

      {/* Document Title Header */}
      <div className="document-header" style={{ marginBottom: '5mm' }}>
        <div className="document-title-section" style={{ width: '100%', padding: '6mm' }}>
          <h2 className="document-title" style={{ letterSpacing: '1px' }}>{templates.leave.title}</h2>
          <span style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '2mm', display: 'block' }}>{templates.leave.titleAr}</span>
        </div>
      </div>

      {/* Meta Dates Bar */}
      <div className="document-details" style={{ marginBottom: '5mm' }}>
        <div className="detail-item">
          <span className="detail-label">DATE DOCUMENT</span>
          <span className="detail-value">{new Date().toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">CONGÉ ID</span>
          <span className="detail-value">#{leave.id}</span>
        </div>
      </div>

      {/* Bilingual Letter Body */}
      <div className="letter-content">
        {/* French Block */}
        <div className="body-paragraph" style={{ whiteSpace: 'pre-line' }}>
          {bodyFr}
        </div>

        <div style={{ borderBottom: '1px dotted #ccc', margin: '4mm 0' }} />

        {/* Arabic Block */}
        <div className="body-paragraph arabic" style={{ whiteSpace: 'pre-line' }}>
          {bodyAr}
        </div>
      </div>

      {/* Signatures Row */}
      <div className="hr-signature-section">
        <div className="hr-sig-box">
          <span className="hr-sig-label">{templates.leave.employeeSignature}</span>
          <div className="hr-sig-area"></div>
          <span className="hr-sig-footer">Nom & Signature</span>
        </div>
        <div className="hr-sig-box">
          <span className="hr-sig-label">{templates.leave.employerSignature}</span>
          <div className="hr-sig-area"></div>
          <span className="hr-sig-footer">Cachet & Signature de la Direction</span>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="footer-legal" style={{ marginTop: '15mm' }}>
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

