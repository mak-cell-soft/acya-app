'use client';

import React from 'react';
import { Enterprise } from '@/types/settings';
import { DashboardKpiDto, MonthlyRevenueDto } from '@/types/analytics';
import { ProfitMarginSummary } from '@/services/components/deep-search.service';

interface AnalyticsReportProps {
  enterprise?: Enterprise | null;
  chartMonth: number | 'ALL';
  chartYear: number;
  kpis?: DashboardKpiDto | null;
  totalPurchasesTTC: number;
  monthlyData?: MonthlyRevenueDto[];
  profitMarginAnalytics?: ProfitMarginSummary | null;
  futureTotals: {
    purchases: number;
    sales: number;
    net: number;
  };
  stockStats?: {
    healthyStockItems?: number;
    lowStockItems?: number;
    outOfStockItems?: number;
  } | null;
  customersCount: number;
  suppliersCount: number;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const formatCurrency = (value: number | undefined | null) => {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value || 0).replace('TND', 'DT');
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const AnalyticsReport: React.FC<AnalyticsReportProps> = ({
  enterprise,
  chartMonth,
  chartYear,
  kpis,
  totalPurchasesTTC,
  monthlyData = [],
  profitMarginAnalytics,
  futureTotals,
  stockStats,
  customersCount,
  suppliersCount
}) => {
  const periodText = chartMonth === 'ALL'
    ? `Année ${chartYear}`
    : `${MONTH_NAMES[(chartMonth as number) - 1]} ${chartYear}`;

  const documentTypeTranslations: Record<string, string> = {
    customerDeliveryNote: 'Bon de Livraison Client',
    customerInvoice: 'Facture Client',
    customerOrder: 'Commande Client',
    customerQuote: 'Devis Client',
    stockTransfer: 'Transfert de Stock',
    supplierInvoice: 'Facture Fournisseur',
    supplierInvoiceReturn: 'Retour Facture Fournisseur',
    supplierOrder: 'Commande Fournisseur',
    supplierReceipt: 'Reçu Fournisseur',
    invoice: 'Facture',
    deliveryNote: 'Bon de Livraison',
    quote: 'Devis',
    purchaseOrder: 'Bon de Commande',
    creditNote: 'Avoir',
    payment: 'Paiement',
    receipt: 'Reçu',
    order: 'Commande'
  };

  const docCounts = kpis?.documentCounts ? Object.entries(kpis.documentCounts).map(([key, count]) => ({
    name: documentTypeTranslations[key] || key,
    count
  })).filter(d => d.count > 0) : [];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', padding: '24px', backgroundColor: '#ffffff', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            {enterprise?.name || 'ENTREPRISE'}
          </h1>
          {enterprise?.siegeAddress && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
              <strong>Siège:</strong> {enterprise.siegeAddress}
            </p>
          )}
          {enterprise?.matriculeFiscal && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
              <strong>Matricule Fiscal:</strong> {enterprise.matriculeFiscal}
            </p>
          )}
          {enterprise?.phone && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
              <strong>Tél:</strong> {enterprise.phone} {enterprise.email ? `| Email: ${enterprise.email}` : ''}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#0284c7' }}>
            RAPPORT D'ANALYSE BUSINESS
          </h2>
          <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
            Période: {periodText}
          </p>
          <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>
            Généré le: {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* 1. Key Performance Indicators Summary */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderLeft: '4px solid #0284c7', paddingLeft: '8px', marginBottom: '12px' }}>
          1. Résumé Indicateurs Clés (KPIs)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>CA Aujourd'hui</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>{formatCurrency(kpis?.dailySales)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>CA Semaine</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>{formatCurrency(kpis?.weeklySales)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>CA Mois</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>{formatCurrency(kpis?.monthlySales)}</div>
          </div>
          <div style={{ border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px', backgroundColor: '#fff7ed' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a3412', textTransform: 'uppercase' }}>CA Mois Achats (TTC)</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#c2410c', marginTop: '4px' }}>{formatCurrency(totalPurchasesTTC)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Alertes Stock</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: kpis?.stockAlertCount ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
              {kpis?.stockAlertCount || 0} art.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Profit & Margins Breakdown */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderLeft: '4px solid #10b981', paddingLeft: '8px', marginBottom: '12px' }}>
          2. Rentabilité & Marges Bénéficiaires
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <div style={{ border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px', backgroundColor: '#ecfdf5' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#065f46' }}>Marge Totale HT</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#047857', marginTop: '4px' }}>{formatCurrency(profitMarginAnalytics?.totalMarginHT)}</div>
          </div>
          <div style={{ border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px', backgroundColor: '#f0f9ff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#075985' }}>Ventes Totales HT</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1', marginTop: '4px' }}>{formatCurrency(profitMarginAnalytics?.totalSalesHTNet)}</div>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', backgroundColor: '#1e293b', color: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Taux de Marge Global</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>{(profitMarginAnalytics?.globalMarginPercentage || 0).toFixed(2)} %</div>
          </div>
        </div>
      </div>

      {/* 3. Treasury Projection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', borderLeft: '4px solid #f59e0b', paddingLeft: '8px', marginBottom: '12px' }}>
          3. Projection de Trésorerie Future
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Encaissements Prévus (Clients)</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>{formatCurrency(futureTotals.sales)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Décaissements Prévus (Achats)</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ea580c', marginTop: '2px' }}>{formatCurrency(futureTotals.purchases)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', backgroundColor: futureTotals.net >= 0 ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Solde Net Prévisionnel</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: futureTotals.net >= 0 ? '#15803d' : '#b91c1c', marginTop: '2px' }}>{formatCurrency(futureTotals.net)}</div>
          </div>
        </div>
      </div>

      {/* 4. Top Clients & Stock Health Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Top Clients Table */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b', marginBottom: '8px' }}>
            Top Clients du mois
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>#</th>
                <th style={{ padding: '6px' }}>Client</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Montant HT</th>
              </tr>
            </thead>
            <tbody>
              {kpis?.topClients && kpis.topClients.length > 0 ? (
                kpis.topClients.map((client, index) => (
                  <tr key={client.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: '700', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '6px', fontWeight: '600' }}>{client.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: '#0284c7' }}>{formatCurrency(client.totalAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>Aucune vente pour la période</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stock & Base Stats */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b', marginBottom: '8px' }}>
            Santé du Stock & Tiers
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', color: '#475569' }}>Articles Stock Bon</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{stockStats?.healthyStockItems ?? 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', color: '#475569' }}>Articles Stock Bas</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{stockStats?.lowStockItems ?? 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', color: '#475569' }}>Articles Rupture</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{stockStats?.outOfStockItems ?? 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', color: '#475569' }}>Total Clients Actifs</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>{customersCount}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', color: '#475569' }}>Total Fournisseurs Actifs</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>{suppliersCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Document Volume Activity */}
      {docCounts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b', marginBottom: '8px' }}>
            Activité Opérationnelle par Document
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {docCounts.map((doc) => (
              <div key={doc.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', backgroundColor: '#fafafa' }}>
                <span style={{ fontWeight: '500', color: '#334155' }}>{doc.name}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{doc.count} doc(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Customer Receivables Table */}
      {kpis?.customerReceivables && kpis.customerReceivables.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b', borderLeft: '4px solid #dc2626', paddingLeft: '8px', marginBottom: '8px' }}>
            Suivi des Créances Clients
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Client</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total Facturé</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total Payé</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Solde Restant</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Ancienneté</th>
              </tr>
            </thead>
            <tbody>
              {kpis.customerReceivables.slice(0, 15).map((client) => {
                const ageColor = client.oldestInvoiceDays > 90 ? '#dc2626' : client.oldestInvoiceDays > 30 ? '#d97706' : '#16a34a';
                return (
                  <tr key={client.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: '600' }}>{client.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatCurrency(client.totalInvoiced)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatCurrency(client.totalPaid)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(client.outstanding)}</td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: ageColor }}>{client.oldestInvoiceDays} j</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {kpis.customerReceivables.length > 15 && (
            <p style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
              * Affichage des 15 plus grandes créances sur {kpis.customerReceivables.length} clients au total.
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8' }}>
        <span>ACYA - Logiciel de Gestion Commerciale</span>
        <span>Document confidentiel à usage interne</span>
        <span>Page 1 / 1</span>
      </div>
    </div>
  );
};
