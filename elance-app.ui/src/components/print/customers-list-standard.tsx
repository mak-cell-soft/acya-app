import React from 'react';
import { Customer, GOUVERNORATES_TN, SOCIETY_PREFIXES } from '@/types/customer';
import { Enterprise } from '@/types/settings';
import { PrintLocale } from '@/hooks/use-print-locale';
import defaultAr from '@/locales/print-ar.json';
import * as utils from './print-utils';

export interface CustomersListStandardProps {
  customersList: Customer[];
  enterprise: Enterprise;
  printLocale?: PrintLocale;
  filterTitle?: string;
}

/**
 * CustomersListStandard
 * 
 * Aesthetic Direction: Refined Corporate Ledger (Tunisian Business Context).
 * Renders an A4 multi-page printable list of all or filtered customers with:
 * - Enterprise header with Arabic metadata
 * - Identification, tax numbers, contact, governorate, and credit parameters
 * - Running total of current balances (Solde total)
 * - Automatic page break headers
 */
export function CustomersListStandard({
  customersList = [],
  enterprise,
  printLocale,
  filterTitle = 'Tous les clients',
}: CustomersListStandardProps) {
  const ar = printLocale || defaultAr;

  // Aggregate total balance across all listed customers
  const totalBalance = customersList.reduce((sum, c) => {
    return sum + (c.currentbalance ?? c.openingbalance ?? 0);
  }, 0);

  return (
    <div className="customers-list-container">
      {/* 1. Header Section */}
      <div className="report-header">
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
            M.F: <span className="mono font-bold">{enterprise.matriculeFiscal}</span>
            {enterprise.commercialregister ? ` | R.C: ${enterprise.commercialregister}` : ''}
          </p>
        </div>

        <div className="center-section">
          <div className="logo-box">
            <h1 className="logo-title">{enterprise.name}</h1>
          </div>
          <div className="location-tag">
            <p>{enterprise.siegeAddress?.split('-')[1]?.trim() || 'TUNISIE'}</p>
          </div>
        </div>

        <div className="arabic-info">
          <p className="arabic-text">{ar.companyArabicName}</p>
          <p className="arabic-text">{ar.companyArabicCapital}</p>
          <p className="arabic-details">{ar.companyArabicAddress}</p>
          <div className="report-arabic-badge">قائمة الحرفاء</div>
        </div>
      </div>

      {/* 2. Document Title */}
      <div className="report-title-banner">
        <div className="title-left">
          <h2 className="title-text">LISTE GÉNÉRALE DES CLIENTS</h2>
          <p className="subtitle-text">
            Édité le {utils.formatDate(new Date())} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' • '}Filtre: <span className="font-semibold">{filterTitle}</span>
            {' • '}Total: <span className="font-bold">{customersList.length} client(s)</span>
          </p>
        </div>
      </div>

      {/* 3. Customers Table */}
      <div className="report-section">
        <table className="report-table">
          <thead>
            <tr>
              <th className="th-idx text-center">N°</th>
              <th className="th-code">Code</th>
              <th className="th-name">Raison Sociale / Nom Client</th>
              <th className="th-tax">M.F. / C.I.N.</th>
              <th className="th-contact">Contact (Tél / Email)</th>
              <th className="th-city">Gouvernorat</th>
              <th className="th-type text-center">Type</th>
              <th className="th-amount text-right">Plafond (TND)</th>
              <th className="th-amount text-right">Solde Actuel (TND)</th>
            </tr>
          </thead>
          <tbody>
            {customersList.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell text-center p-8">
                  Aucun client trouvé selon les critères actuels.
                </td>
              </tr>
            ) : (
              customersList.map((c, idx) => {
                const isSociety = SOCIETY_PREFIXES.some(p => p.id === c.prefix) || !!c.name;
                const typeBadge = isSociety ? 'Société' : 'Particulier';
                const gov = GOUVERNORATES_TN.find(g => g.key.toString() === c.gouvernorate || g.value === c.gouvernorate)?.value || c.gouvernorate || '—';
                const balance = c.currentbalance ?? c.openingbalance ?? 0;

                return (
                  <tr key={c.id}>
                    <td className="text-center mono text-xs">{idx + 1}</td>
                    <td className="mono font-bold text-corp-blue text-xs">CL-{String(c.id).padStart(4, '0')}</td>
                    <td>
                      <div className="font-bold text-corp-blue">{c.name || `${c.firstname || ''} ${c.lastname || ''}`.trim()}</div>
                      {c.name && (c.firstname || c.lastname) && (
                        <div className="text-xs text-muted font-medium">{c.firstname} {c.lastname}</div>
                      )}
                    </td>
                    <td className="mono text-xs">
                      <div>{c.taxregistrationnumber || '—'}</div>
                      {c.identitycardnumber && <div className="text-[7pt] text-muted">CIN: {c.identitycardnumber}</div>}
                    </td>
                    <td className="text-xs">
                      <div className="mono font-semibold">{c.phonenumberone || '—'}</div>
                      {c.email && <div className="text-[7pt] text-muted truncate max-w-[120px]">{c.email}</div>}
                    </td>
                    <td className="text-xs">{gov}</td>
                    <td className="text-center text-xs">
                      <span className="status-tag">{typeBadge}</span>
                    </td>
                    <td className="mono text-right text-xs">
                      {c.maximumsalesbar ? utils.formatNumber(c.maximumsalesbar) : '—'}
                    </td>
                    <td className={`mono text-right font-bold text-xs ${balance < 0 ? 'text-danger' : 'text-corp-blue'}`}>
                      {utils.formatNumber(balance)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="table-totals-row">
              <td colSpan={7} className="font-bold text-right uppercase">
                Total ({customersList.length} clients) :
              </td>
              <td className="text-right mono text-xs">—</td>
              <td className={`mono font-bold text-right ${totalBalance < 0 ? 'text-danger' : 'text-corp-blue'}`}>
                {utils.formatNumber(totalBalance)} TND
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Legal Footer */}
      <div className="report-footer-legal">
        <p className="legal-title">
          {enterprise.name} {enterprise.description ? `— ${enterprise.description}` : ''}
        </p>
        <p className="legal-address">
          Siège social: {enterprise.siegeAddress} | Tél: {enterprise.phone} | M.F: {enterprise.matriculeFiscal}
        </p>
        <p className="legal-notice">
          Liste extraite le {utils.formatDate(new Date())} via l&apos;application de gestion ERP ACYA.
        </p>
      </div>
    </div>
  );
}
