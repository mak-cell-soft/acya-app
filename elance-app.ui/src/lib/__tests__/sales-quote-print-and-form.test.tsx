import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentTypes, Document } from '../../types/document';
import { Enterprise } from '../../types/settings';
import { QuoteStandard } from '../../components/print/quote-standard';
import { QuoteLight } from '../../components/print/quote-light';
import { DeliveryNoteStandard } from '../../components/print/delivery-note-standard';
import { DeliveryNoteLight } from '../../components/print/delivery-note-light';

const mockEnterprise: Enterprise = {
  id: 1,
  name: 'ACYA Timber Co',
  description: 'Négoce de bois et dérivés',
  capital: '100000',
  phone: '+216 71 000 000',
  email: 'contact@acya.site',
  matriculeFiscal: '1234567/A/M/000',
  commercialregister: 'B12345672020',
  siegeAddress: 'Zone Industrielle, Tunis',
  mobileOne: '+216 98 000 000',
} as unknown as Enterprise;

const baseQuoteDoc: Document = {
  id: 101,
  type: DocumentTypes.customerQuote,
  stocktransactiontype: 0,
  docnumber: 'DEV-26-0001',
  description: 'Devis pour chantier résidence',
  supplierReference: '',
  isinvoiced: false,
  merchandises: [
    {
      id: 1,
      packagereference: 'PKG-01',
      description: 'Bois Rouge 50x150',
      creationdate: '2026-02-01',
      updatedate: '2026-02-01',
      updatedbyid: 1,
      quantity: 10,
      unit_price_ht: 25.5,
      cost_ht: 255,
      discount_percentage: 0,
      cost_discount_value: 0,
      cost_net_ht: 255,
      tva_value: 48.45,
      cost_ttc: 303.45,
      documentid: 101,
      isinvoicible: true,
      allownegativstock: false,
      article: {
        id: 1,
        reference: 'BR-50-150',
        designation: 'Bois Rouge 50x150',
        unit: 'M3',
        nature: 'Standard',
        purchase_price_ht: 20,
        tva: { id: 1, name: '19%', value: '19%' },
      } as any,
      lisoflengths: [],
      ismergedwith: false,
      isdeleted: false,
      line_type: 1 as any,
    },
  ],
  total_ht_net_doc: 255,
  total_discount_doc: 0,
  total_tva_doc: 48.45,
  total_net_ttc: 303.45,
  currency: 'TND',
  exchangeRate: 1.0,
  withholdingtax: false,
  counterpart: {
    id: 50,
    name: 'Société Bois & Construction',
    address: 'Avenue Habib Bourguiba, Sfax',
    taxregistrationnumber: '0987654/B/N/000',
  } as any,
  sales_site: { id: 1, name: 'Dépôt Principal' } as any,
  creationdate: '2026-02-01T10:00:00Z',
  updatedate: '2026-02-01T10:00:00Z',
  updatedbyid: 1,
  isdeleted: false,
  regulationid: 0,
  editing: false,
  docstatus: 3 as any,
  billingstatus: 1 as any,
  isPaid: false,
  isservice: false,
  validity_duration: 15,
  validity_unit: 'days',
  commercial_conditions: 'Dans la limite du stock disponible.',
};

const baseDeliveryNoteDoc: Document = {
  ...baseQuoteDoc,
  id: 202,
  type: DocumentTypes.customerDeliveryNote,
  docnumber: 'BL-26-0042',
  validity_duration: undefined,
  validity_unit: undefined,
  commercial_conditions: undefined,
};

test('A. Sales Quote title: QuoteStandard displays DEVIS N° {quoteNumber}', () => {
  const html = renderToStaticMarkup(
    <QuoteStandard document={baseQuoteDoc} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('DEVIS N° DEV-26-0001'), 'Title must be DEVIS N° DEV-26-0001');
  assert.ok(!html.includes('BON DE LIVRAISON N° DEV-26-0001'), 'Must not display BON DE LIVRAISON for quote');
  assert.ok(!html.includes('BL Réf:'), 'Must not display BL Réf for quotation');
});

test('A. Sales Quote title: QuoteLight displays DEVIS CLIENT N° {quoteNumber}', () => {
  const html = renderToStaticMarkup(
    <QuoteLight document={baseQuoteDoc} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('DEVIS CLIENT N° DEV-26-0001'), 'Light title must be DEVIS CLIENT N° DEV-26-0001');
  assert.ok(!html.includes('BON DE LIVRAISON CLIENT N° DEV-26-0001'), 'Light must not display BON DE LIVRAISON');
});

test('B. Delivery Note title: DeliveryNoteStandard preserves BON DE LIVRAISON N° {docNumber}', () => {
  const html = renderToStaticMarkup(
    <DeliveryNoteStandard document={baseDeliveryNoteDoc} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('BON DE LIVRAISON N° BL-26-0042'), 'Must preserve BON DE LIVRAISON N° BL-26-0042');
  assert.ok(!html.includes('DEVIS N° BL-26-0042'), 'Delivery note must not print DEVIS');
});

test('B. Delivery Note title: DeliveryNoteLight preserves BON DE LIVRAISON CLIENT N° {docNumber}', () => {
  const html = renderToStaticMarkup(
    <DeliveryNoteLight document={baseDeliveryNoteDoc} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('BON DE LIVRAISON CLIENT N° BL-26-0042'), 'Must preserve BON DE LIVRAISON CLIENT N° BL-26-0042');
  assert.ok(!html.includes('DEVIS CLIENT N° BL-26-0042'), 'Light delivery note must not print DEVIS CLIENT');
});

test('C. Quote validity & commercial conditions: displays configured values', () => {
  const customQuote: Document = {
    ...baseQuoteDoc,
    validity_duration: 30,
    validity_unit: 'days',
    commercial_conditions: 'Paiement 50% à la commande.\nLivraison sous 48h.',
  };

  const html = renderToStaticMarkup(
    <QuoteStandard document={customQuote} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('Validité &amp; Conditions commerciales') || html.includes('Validité & Conditions commerciales'));
  assert.ok(html.includes('Devis valide 30 jours.'));
  assert.ok(html.includes('Paiement 50% à la commande.'));
  assert.ok(html.includes('Livraison sous 48h.'));
});

test('C. Quote validity & commercial conditions: defaults when fields are not set', () => {
  const quoteWithoutConditions: Document = {
    ...baseQuoteDoc,
    validity_duration: undefined,
    validity_unit: undefined,
    commercial_conditions: undefined,
  };

  const html = renderToStaticMarkup(
    <QuoteStandard document={quoteWithoutConditions} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('Devis valide 15 jours.'), 'Must use 15 jours default');
  assert.ok(html.includes('Dans la limite du stock disponible.'), 'Must use default conditions');
  assert.ok(!html.includes('undefined'), 'Must not print undefined');
  assert.ok(!html.includes('null'), 'Must not print null');
});

test('D. Document-type isolation: DeliveryNoteStandard NEVER displays commercial conditions', () => {
  // Even if a Delivery Note object had conditions populated, it must NOT display them
  const dnWithAccidentalConditions: Document = {
    ...baseDeliveryNoteDoc,
    validity_duration: 15,
    validity_unit: 'days',
    commercial_conditions: 'Conditions qui ne doivent pas apparaître',
  };

  const html = renderToStaticMarkup(
    <DeliveryNoteStandard document={dnWithAccidentalConditions} enterprise={mockEnterprise} />
  );

  assert.ok(!html.includes('Conditions qui ne doivent pas apparaître'), 'Conditions must NEVER appear on Delivery Note');
  assert.ok(!html.includes('Validité &amp; Conditions commerciales'), 'Validity section must NEVER appear on Delivery Note');
});

test('D. Document-type isolation: DeliveryNoteLight NEVER displays commercial conditions for BL', () => {
  const dnWithAccidentalConditions: Document = {
    ...baseDeliveryNoteDoc,
    validity_duration: 15,
    validity_unit: 'days',
    commercial_conditions: 'Conditions interdites sur BL',
  };

  const html = renderToStaticMarkup(
    <DeliveryNoteLight document={dnWithAccidentalConditions} enterprise={mockEnterprise} />
  );

  assert.ok(!html.includes('Conditions interdites sur BL'), 'Conditions must NEVER appear on Light Delivery Note');
  assert.ok(!html.includes('VALIDITÉ &amp; CONDITIONS COMMERCIALES'), 'Validity header must NEVER appear on Light Delivery Note');
});

test('E. Advanced options: isAdvancedOptionsDoc includes customerQuote, customerDeliveryNote, and customerInvoice', () => {
  const isAdvancedOptionsDoc = (docType: DocumentTypes) =>
    docType === DocumentTypes.customerInvoice ||
    docType === DocumentTypes.customerDeliveryNote ||
    docType === DocumentTypes.customerQuote;

  assert.equal(isAdvancedOptionsDoc(DocumentTypes.customerQuote), true, 'customerQuote must be an advanced options doc');
  assert.equal(isAdvancedOptionsDoc(DocumentTypes.customerDeliveryNote), true, 'customerDeliveryNote must be an advanced options doc');
  assert.equal(isAdvancedOptionsDoc(DocumentTypes.customerInvoice), true, 'customerInvoice must be an advanced options doc');
  assert.equal(isAdvancedOptionsDoc(DocumentTypes.customerOrder), false, 'customerOrder must not be in advanced options');
  assert.equal(isAdvancedOptionsDoc(DocumentTypes.stockTransfer), false, 'stockTransfer must not be in advanced options');
});

test('F. Defense-in-depth: DeliveryNoteStandard renders DEVIS N° if passed a customerQuote document', () => {
  const html = renderToStaticMarkup(
    <DeliveryNoteStandard document={baseQuoteDoc} enterprise={mockEnterprise} />
  );

  assert.ok(html.includes('DEVIS N° DEV-26-0001'), 'DeliveryNoteStandard must adapt to DEVIS if passed a quote');
  assert.ok(!html.includes('BON DE LIVRAISON N° DEV-26-0001'), 'Must not say BON DE LIVRAISON');
  assert.ok(html.includes('Validité &amp; Conditions commerciales') || html.includes('Validité & Conditions commerciales'));
});
