import React from 'react';
import { Supplier, SUPPLIER_CATEGORIES, GOUVERNORATES_TN } from '@/types/customer';
import { Enterprise } from '@/types/settings';
import { PrintLocale } from '@/hooks/use-print-locale';
import defaultAr from '@/locales/print-ar.json';
import * as utils from './print-utils';

export interface SuppliersListStandardProps {
  suppliersList: Supplier[];
  enterprise: Enterprise;
  printLocale?: PrintLocale;
  filterTitle?: string;
}

/**
 * SuppliersListStandard
 * 
 * Aesthetic Direction: Refined Corporate Ledger (Tunisian Corporate Context).
 * Renders an A4 multi-page printable list of all or filtered suppliers with:
 * - Enterprise header with Arabic metadata
 * - Identification, tax numbers, contact, category, and governorate
 * - Running total of current balances (Total des dettes / créances fournisseurs)
 * - Automatic page break headers (@media print)
 */
export function SuppliersListStandard({
  suppliersList = [],
  enterprise,
  printLocale,
  filterTitle = 'Tous les fournisseurs',
}: SuppliersListStandardProps) {
  const ar = printLocale || defaultAr;

  // Aggregate total balance across all listed suppliers
  const totalBalance = suppliersList.reduce((sum, s) => {
    return sum + (s.currentbalance ?? s.openingbalance ?? 0);
  }, 0);

  const getCategoryLabel = (id?: string | number) => {
    if (!id) return '—';
    return SUPPLIER_CATEGORIES.find(c => c.id.toString() === id.toString() || c.value === id)?.value || id.toString() || '—';
  };

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
          <div className="report-arabic-badge">قائمة المزودين</div>
        </div>
      </div>

      {/* 2. Document Title Banner */}
      <div className="report-title-banner">
        <div className="title-left">
          <h2 className="title-text">LISTE GÉNÉRALE DES FOURNISSEURS</h2>
          <p className="subtitle-text">
            Édité le {utils.formatDate(new Date())} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' • '}Filtre: <span className="font-semibold">{filterTitle}</span>
            {' • '}Total: <span className="font-bold">{suppliersList.length} fournisseur(s)</span>
          </p>
        </div>
      </div>

      {/* 3. Suppliers Table */}
      <div className="report-section">
        <table className="report-table">
          <thead>
            <tr>
              <th className="th-idx text-center">N°</th>
              <th className="th-code">Code</th>
              <th className="th-name">Raison Sociale / Fournisseur</th>
              <th className="th-tax">M.F. / C.I.N.</th>
              <th className="th-contact">Contact (Tél / Email)</th>
              <th className="th-city">Gouvernorat</th>
              <th className="th-cat">Catégorie d&apos;activité</th>
              <th className="th-type text-center">Type</th>
              <th className="th-amount text-right">Solde Actuel (TND)</th>
            </tr>
          </thead>
          <tbody>
            {suppliersList.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell text-center p-8">
                  Aucun fournisseur trouvé selon les critères actuels.
                </td>
              </tr>
            ) : (
              suppliersList.map((s, idx) => {
                const gov = GOUVERNORATES_TN.find(g => g.key.toString() === s.gouvernorate || g.value === s.gouvernorate)?.value || s.gouvernorate || '—';
                const balance = s.currentbalance ?? s.openingbalance ?? 0;
                const typeLabel = s.type === 'Both' ? 'Mixte' : 'Fournisseur';

                return (
                  <tr key={s.id}>
                    <td className="text-center mono text-xs">{idx + 1}</td>
                    <td className="mono font-bold text-corp-blue text-xs">FR-{String(s.id).padStart(4, '0')}</td>
                    <td>
                      <div className="font-bold text-corp-blue">{s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim()}</div>
                      {s.name && (s.firstname || s.lastname) && (
                        <div className="text-xs text-muted font-medium">{s.firstname} {s.lastname}</div>
                      )}
                    </td>
                    <td className="mono text-xs">
                      <div>{s.taxregistrationnumber || '—'}</div>
                      {s.identitycardnumber && <div className="text-[7pt] text-muted">CIN: {s.identitycardnumber}</div>}
                    </td>
                    <td className="text-xs">
                      <div className="mono font-semibold">{s.phonenumberone || '—'}</div>
                      {s.email && <div className="text-[7pt] text-muted truncate max-w-[120px]">{s.email}</div>}
                    </td>
                    <td className="text-xs">{gov}</td>
                    <td className="text-xs">{getCategoryLabel(s.jobtitle)}</td>
                    <td className="text-center text-xs">
                      <span className="status-tag">{typeLabel}</span>
                    </td>
                    <td className={`mono text-right font-bold text-xs ${balance < 0 ? 'text-danger' : 'text-success'}`}>
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
                Total ({suppliersList.length} fournisseurs) :
              </td>
              <td className="text-right mono text-xs">—</td>
              <td className={`mono font-bold text-right ${totalBalance < 0 ? 'text-danger' : 'text-success'}`}>
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
