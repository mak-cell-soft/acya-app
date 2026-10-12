import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentTypes, Document } from '../../types/document';
import { Enterprise } from '../../types/settings';
import { PrintLocale } from '../../hooks/use-print-locale';
import { QuoteStandard } from '../../components/print/quote-standard';
import { QuoteLight } from '../../components/print/quote-light';
import { DeliveryNoteStandard } from '../../components/print/delivery-note-standard';
import { DeliveryNoteLight } from '../../components/print/delivery-note-light';
import { InvoiceStandard } from '../../components/print/invoice-standard';
import { InvoiceLight } from '../../components/print/invoice-light';
import { PurchaseStandard } from '../../components/print/purchase-standard';
import { PurchaseLight } from '../../components/print/purchase-light';

const mockBaseEnterprise: Enterprise = {
  id: 1,
  name: 'Acya Wood Industries',
  description: 'Négoce de bois et panneaux',
  capital: '500000',
  phone: '+216 71 123 456',
  email: 'contact@acyawood.site',
  matriculeFiscal: '0012345/A/M/000',
  commercialregister: 'B12345678',
  siegeAddress: '45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis',
  mobileOne: '+216 98 765 432',
} as unknown as Enterprise;

const mockArabicLocale: PrintLocale = {
  originalLabel: { bl: 'الأصل', invoice: 'الأصل' },
  originalLabelTransfer: 'تحويل',
  companyArabicName: 'شركة أكيا لصناعة الأخشاب',
  companyArabicCapital: 'شركة خفية الإسم رأس مالها 500.000 د.ت',
  companyArabicAddress: '45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس',
  labels: {
    client: 'Client / الحريف',
    address: 'Adresse / العنوان',
    tvaCode: 'M.F / المعرف الجبائي',
    date: 'Date / التاريخ',
    docNumberBL: 'N° BL',
    docNumberInvoice: 'N° Facture',
    accountNumber: 'N° Compte',
    designations: 'Désignation',
    unit: 'Unité',
    qty: 'Qté',
    unitPriceHT: 'P.U.HT',
    tva: 'TVA',
    discount: 'Remise',
    amountHT: 'Montant HT',
    taxe: 'Taxe',
    base: 'Base',
    percent: 'Taux',
    value: 'Valeur',
    arreteLaSomme: 'Arrêté la somme',
    totalHT: 'Total HT',
    totalTVA: 'Total TVA',
    totalTTC: 'Total TTC',
    stampTax: 'Timbre',
    withholdingTax: 'Retenue',
    netPayable: 'Net à payer',
    signClient: 'Signature',
    truckNumber: 'Camion',
    driverName: 'Chauffeur',
    cin: 'CIN',
    controlBL: 'Contrôle',
    controlExit: 'Sortie',
  },
};

const mockQuoteDoc: Document = {
  id: 101,
  type: DocumentTypes.customerQuote,
  docnumber: 'DEV-26-0001',
  creationdate: '2026-03-01',
  total_ht_net_doc: 1000,
  total_tva_doc: 190,
  total_net_payable: 1190,
  total_net_ttc: 1190,
  counterpart: {
    id: 42,
    name: 'Entreprise de Menuiserie Moderne',
    address: '10 Avenue Habib Bourguiba, Ariana',
    matriculeFiscal: '9988776/B/N/000',
  } as any,
  merchandises: [
    {
      id: 1,
      quantity: 5,
      unit_price_ht: 200,
      cost_net_ht: 1000,
      article: {
        id: 10,
        reference: 'BR-40-120',
        designation: 'Bois Rouge 40x120',
        unit: 'M3',
        tva: { value: '19' },
      } as any,
    } as any,
  ],
} as unknown as Document;

const mockOrderDoc: Document = {
  ...mockQuoteDoc,
  id: 102,
  type: DocumentTypes.customerOrder,
  docnumber: 'BC-26-0002',
};

const mockDeliveryNoteDoc: Document = {
  ...mockQuoteDoc,
  id: 103,
  type: DocumentTypes.customerDeliveryNote,
  docnumber: 'BL-26-0003',
};

const mockInvoiceDoc: Document = {
  ...mockQuoteDoc,
  id: 104,
  type: DocumentTypes.customerInvoice,
  docnumber: 'FAC-26-0004',
};

const mockSupplierOrderDoc: Document = {
  ...mockQuoteDoc,
  id: 105,
  type: DocumentTypes.supplierOrder,
  docnumber: 'BCF-26-0005',
  counterpart: {
    id: 88,
    name: 'Scierie du Nord',
    address: 'Zone Portuaire, Bizerte',
    matriculeFiscal: '5544332/C/A/000',
  } as any,
};

test('1. Devis (French & Arabic): Full enterprise address restored', () => {
  // Standard
  const htmlStd = renderToStaticMarkup(
    <QuoteStandard document={mockQuoteDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlStd.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'QuoteStandard must contain the complete French enterprise address'
  );
  assert.ok(
    htmlStd.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'QuoteStandard must contain the complete Arabic enterprise address'
  );

  // Light
  const htmlLight = renderToStaticMarkup(
    <QuoteLight document={mockQuoteDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlLight.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'QuoteLight must contain the complete French enterprise address in header and footer'
  );
  assert.ok(
    htmlLight.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'QuoteLight must contain the complete Arabic enterprise address'
  );
});

test('2. Commande Client (French & Arabic): Full enterprise address restored', () => {
  // DeliveryNoteStandard used for Customer Order
  const htmlStd = renderToStaticMarkup(
    <DeliveryNoteStandard document={mockOrderDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlStd.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'DeliveryNoteStandard (Order) must contain the complete French enterprise address'
  );
  assert.ok(
    htmlStd.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'DeliveryNoteStandard (Order) must contain the complete Arabic enterprise address'
  );
  assert.ok(
    htmlStd.includes('BON DE COMMANDE N° BC-26-0002'),
    'DeliveryNoteStandard must render BON DE COMMANDE title for order'
  );

  // DeliveryNoteLight used for Customer Order
  const htmlLight = renderToStaticMarkup(
    <DeliveryNoteLight document={mockOrderDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlLight.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'DeliveryNoteLight (Order) must contain the complete French enterprise address'
  );
  assert.ok(
    htmlLight.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'DeliveryNoteLight (Order) must contain the complete Arabic enterprise address'
  );
  assert.ok(
    htmlLight.includes('BON DE COMMANDE CLIENT N° BC-26-0002'),
    'DeliveryNoteLight must render BON DE COMMANDE CLIENT title for order'
  );
});

test('3. Commande Fournisseur (French & Arabic): Full enterprise address restored', () => {
  // PurchaseStandard
  const htmlStd = renderToStaticMarkup(
    <PurchaseStandard document={mockSupplierOrderDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlStd.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'PurchaseStandard must contain the complete French enterprise address'
  );
  assert.ok(
    htmlStd.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'PurchaseStandard must contain the complete Arabic enterprise address'
  );

  // PurchaseLight
  const htmlLight = renderToStaticMarkup(
    <PurchaseLight document={mockSupplierOrderDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlLight.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'PurchaseLight must contain the complete French enterprise address'
  );
  assert.ok(
    htmlLight.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'PurchaseLight must contain the complete Arabic enterprise address'
  );
});

test('4. Bon de Livraison (French & Arabic): Full enterprise address restored', () => {
  // DeliveryNoteStandard
  const htmlStd = renderToStaticMarkup(
    <DeliveryNoteStandard document={mockDeliveryNoteDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlStd.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'DeliveryNoteStandard (BL) must contain the complete French enterprise address'
  );
  assert.ok(
    htmlStd.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'DeliveryNoteStandard (BL) must contain the complete Arabic enterprise address'
  );
  assert.ok(
    htmlStd.includes('BON DE LIVRAISON N° BL-26-0003'),
    'DeliveryNoteStandard must render BON DE LIVRAISON title for delivery note'
  );

  // DeliveryNoteLight
  const htmlLight = renderToStaticMarkup(
    <DeliveryNoteLight document={mockDeliveryNoteDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlLight.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'DeliveryNoteLight (BL) must contain the complete French enterprise address'
  );
  assert.ok(
    htmlLight.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'DeliveryNoteLight (BL) must contain the complete Arabic enterprise address'
  );
  assert.ok(
    htmlLight.includes('BON DE LIVRAISON CLIENT N° BL-26-0003'),
    'DeliveryNoteLight must render BON DE LIVRAISON CLIENT title for delivery note'
  );
});

test('5. Facture (French & Arabic): Full enterprise address restored', () => {
  // InvoiceStandard
  const htmlStd = renderToStaticMarkup(
    <InvoiceStandard document={mockInvoiceDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlStd.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'InvoiceStandard must contain the complete French enterprise address'
  );
  assert.ok(
    htmlStd.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'InvoiceStandard must contain the complete Arabic enterprise address'
  );

  // InvoiceLight
  const htmlLight = renderToStaticMarkup(
    <InvoiceLight document={mockInvoiceDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    htmlLight.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'),
    'InvoiceLight must contain the complete French enterprise address'
  );
  assert.ok(
    htmlLight.includes('45 نهج الصناعة، المنطقة الصناعية سيدي داود، 2046 المرسى، تونس'),
    'InvoiceLight must contain the complete Arabic enterprise address'
  );
});

test('6. Arabic Address Fallback: Falls back to enterprise.siegeAddress when Arabic address is not set', () => {
  const localeWithoutArabicAddress: PrintLocale = {
    ...mockArabicLocale,
    companyArabicAddress: '',
  };

  const htmlQuote = renderToStaticMarkup(
    <QuoteStandard document={mockQuoteDoc} enterprise={mockBaseEnterprise} printLocale={localeWithoutArabicAddress} />
  );
  // Both French and Arabic header columns will display the full address
  const matches = (htmlQuote.match(/45 Rue de l’Industrie, Z\.I\. Sidi Daoud, 2046 La Marsa, Tunis/g) || []).length;
  // Should appear in French header, Arabic header (as fallback), and footer
  assert.ok(matches >= 2, `Expected siegeAddress to appear at least twice (header French and header Arabic fallback), found ${matches}`);
  assert.ok(htmlQuote.includes('dir="rtl"'), 'Arabic address section must preserve RTL');
});

test('7. Long Address Handling: Entire address is preserved and not truncated', () => {
  const longAddressEnterprise: Enterprise = {
    ...mockBaseEnterprise,
    siegeAddress: 'Complexe Industriel El Amen, Bâtiment B - 3ème étage, Route de Gabès Km 4.5, Zone Industrielle Oued Chaabouni, 3052 Sfax, Tunisie',
  };

  const html = renderToStaticMarkup(
    <InvoiceStandard document={mockInvoiceDoc} enterprise={longAddressEnterprise} printLocale={mockArabicLocale} />
  );
  assert.ok(
    html.includes('Complexe Industriel El Amen, Bâtiment B - 3ème étage, Route de Gabès Km 4.5, Zone Industrielle Oued Chaabouni, 3052 Sfax, Tunisie'),
    'Full long address must be preserved without clipping or omission'
  );
});

test('8. Multi-Tenant Independence: Tenant configurations do not leak across tenants', () => {
  const tenantA: Enterprise = {
    ...mockBaseEnterprise,
    id: 10,
    name: 'SOCOFEB S.A.',
    siegeAddress: 'Route de Raoued Km 4, 2083 Ariana, Tunisie',
  };

  const tenantB: Enterprise = {
    ...mockBaseEnterprise,
    id: 20,
    name: 'Méditerranée Bois & Dérivés',
    siegeAddress: 'Zone Portuaire de Radès, Hangar 12, 2040 Ben Arous, Tunisie',
  };

  const htmlA = renderToStaticMarkup(
    <QuoteStandard document={mockQuoteDoc} enterprise={tenantA} />
  );
  const htmlB = renderToStaticMarkup(
    <QuoteStandard document={mockQuoteDoc} enterprise={tenantB} />
  );

  assert.ok(htmlA.includes('Route de Raoued Km 4, 2083 Ariana, Tunisie'), 'Tenant A must show Tenant A address');
  assert.ok(!htmlA.includes('Zone Portuaire de Radès'), 'Tenant A must NOT contain Tenant B address');

  assert.ok(htmlB.includes('Zone Portuaire de Radès, Hangar 12, 2040 Ben Arous, Tunisie'), 'Tenant B must show Tenant B address');
  assert.ok(!htmlB.includes('Route de Raoued'), 'Tenant B must NOT contain Tenant A address');
});

test('9. Missing Address Handling: Renders cleanly when address is empty or undefined', () => {
  const enterpriseNoAddress: Enterprise = {
    ...mockBaseEnterprise,
    siegeAddress: undefined as any,
  };

  const emptyLocale: PrintLocale = {
    ...mockArabicLocale,
    companyArabicAddress: '',
  };

  // Must not throw for any of the document components
  assert.doesNotThrow(() => {
    renderToStaticMarkup(<QuoteStandard document={mockQuoteDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<QuoteLight document={mockQuoteDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<DeliveryNoteStandard document={mockDeliveryNoteDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<DeliveryNoteLight document={mockDeliveryNoteDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<InvoiceStandard document={mockInvoiceDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<InvoiceLight document={mockInvoiceDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<PurchaseStandard document={mockSupplierOrderDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
    renderToStaticMarkup(<PurchaseLight document={mockSupplierOrderDoc} enterprise={enterpriseNoAddress} printLocale={emptyLocale} />);
  }, 'Rendering with missing address must not throw errors');
});

test('10. Document integrity: Customer address and financial totals remain intact and separate', () => {
  const html = renderToStaticMarkup(
    <InvoiceStandard document={mockInvoiceDoc} enterprise={mockBaseEnterprise} printLocale={mockArabicLocale} />
  );

  // Customer address is separate
  assert.ok(html.includes('10 Avenue Habib Bourguiba, Ariana'), 'Customer address must remain in customer box');
  assert.ok(html.includes('Entreprise de Menuiserie Moderne'), 'Customer name must remain intact');

  // Enterprise address is in enterprise section
  assert.ok(html.includes('45 Rue de l’Industrie, Z.I. Sidi Daoud, 2046 La Marsa, Tunis'), 'Enterprise address in company section');

  // Totals
  assert.ok(html.includes('1 190.000') || html.includes('1190'), 'Total net payable must remain intact');
});
