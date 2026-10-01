import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatChantierClientName,
  formatChantierClientOptionLabel,
  resolveChantierClientDisplay,
  matchesChantierCustomerSearch
} from '../chantier-utils';
import { Customer } from '../../types/customer';

describe('Chantier Client / Commanditaire Display & Selection Tests', () => {
  // CASE 1 — Individual customer
  describe('CASE 1: Individual customer', () => {
    it('should format full name when firstname and lastname are present', () => {
      const customer: Partial<Customer> = {
        id: 101,
        prefix: '',
        name: '',
        firstname: 'Ali',
        lastname: 'Ben Salah',
      };
      const formatted = formatChantierClientName(customer);
      assert.strictEqual(formatted, 'Ali Ben Salah');

      const optionLabel = formatChantierClientOptionLabel(customer as Customer);
      assert.strictEqual(optionLabel, 'Ali Ben Salah');
    });

    it('should include prefix if available for individual customer', () => {
      const customer: Partial<Customer> = {
        id: 102,
        prefix: 'Mr',
        name: '',
        firstname: 'Khaled',
        lastname: 'Kacem',
      };
      assert.strictEqual(formatChantierClientName(customer), 'Mr Khaled Kacem');
    });

    it('should handle only firstname or only lastname safely without undefined', () => {
      const onlyFirst: Partial<Customer> = {
        id: 103,
        name: '',
        firstname: 'Karim',
        lastname: '',
      };
      assert.strictEqual(formatChantierClientName(onlyFirst), 'Karim');

      const onlyLast: Partial<Customer> = {
        id: 104,
        name: '',
        firstname: '',
        lastname: 'Mejri',
      };
      assert.strictEqual(formatChantierClientName(onlyLast), 'Mejri');
    });
  });

  // CASE 2 — Company customer
  describe('CASE 2: Company customer', () => {
    it('should display company name when only name is present', () => {
      const company: Partial<Customer> = {
        id: 201,
        prefix: 'STE',
        name: 'eddomaine',
        firstname: '',
        lastname: '',
      };
      assert.strictEqual(formatChantierClientName(company), 'eddomaine');
      assert.strictEqual(formatChantierClientOptionLabel(company as Customer), 'eddomaine');
    });

    it('should preserve existing convention Company (Contact) when both exist', () => {
      const companyWithContact: Partial<Customer> = {
        id: 202,
        prefix: 'STE',
        name: 'Société Carthage',
        firstname: 'Slim',
        lastname: 'Riahi',
      };
      assert.strictEqual(
        formatChantierClientName(companyWithContact),
        'Société Carthage (Slim Riahi)'
      );
    });

    it('should append tax registration number (MF) when present in option label', () => {
      const companyWithMF: Partial<Customer> = {
        id: 203,
        name: 'eddomaine',
        taxregistrationnumber: '1234567M',
      };
      assert.strictEqual(
        formatChantierClientOptionLabel(companyWithMF as Customer),
        'eddomaine (1234567M)'
      );
    });
  });

  // CASE 3 — Existing Chantier with ClientCounterPartId
  describe('CASE 3: Existing Chantier with ClientCounterPartId', () => {
    const customers: Customer[] = [
      {
        id: 15,
        prefix: '',
        name: 'eddomaine',
        firstname: '',
        lastname: '',
        taxregistrationnumber: '1234567M',
      } as Customer,
      {
        id: 20,
        prefix: '',
        name: '',
        firstname: 'Yassine',
        lastname: 'Ayari',
        taxregistrationnumber: '9876543A',
      } as Customer,
    ];

    it('should resolve client display from loaded customers list by ID', () => {
      const chantierWithCompany = {
        clientCounterPartId: 15,
        clientName: 'eddomaine',
      };
      assert.strictEqual(
        resolveChantierClientDisplay(chantierWithCompany, customers),
        'eddomaine'
      );

      const chantierWithPerson = {
        clientCounterPartId: 20,
        clientName: 'Inconnu', // Fallback in DB before proper resolution
      };
      assert.strictEqual(
        resolveChantierClientDisplay(chantierWithPerson, customers),
        'Yassine Ayari'
      );
    });

    it('should fallback to clean clientName if customers list is not yet loaded', () => {
      const chantier = {
        clientCounterPartId: 15,
        clientName: 'eddomaine Construction',
      };
      assert.strictEqual(
        resolveChantierClientDisplay(chantier, []),
        'eddomaine Construction'
      );
    });
  });

  // CASE 4 — Chantier without client
  describe('CASE 4: Chantier without client', () => {
    it('should return empty string and never undefined or null for null clientCounterPartId', () => {
      const chantierNull = {
        clientCounterPartId: null,
        clientName: null,
      };
      assert.strictEqual(resolveChantierClientDisplay(chantierNull), '');

      const chantierUndefined = {
        clientCounterPartId: undefined,
        clientName: undefined,
      };
      assert.strictEqual(resolveChantierClientDisplay(chantierUndefined), '');

      assert.strictEqual(resolveChantierClientDisplay(null), '');
      assert.strictEqual(resolveChantierClientDisplay(undefined), '');
    });

    it('should never display literal strings like "Inconnu", "undefined", or "null"', () => {
      const chantierWithGarbage = {
        clientCounterPartId: null,
        clientName: 'Inconnu',
      };
      assert.strictEqual(resolveChantierClientDisplay(chantierWithGarbage), '');

      const chantierWithNullString = {
        clientCounterPartId: null,
        clientName: 'null',
      };
      assert.strictEqual(resolveChantierClientDisplay(chantierWithNullString), '');
    });
  });

  // CASE 5 — Search
  describe('CASE 5: Search matching', () => {
    const customer: Customer = {
      id: 50,
      prefix: '',
      name: 'Socobois SARL',
      firstname: 'Mounir',
      lastname: 'Gharbi',
      taxregistrationnumber: '0012457K/A/M/000',
      phonenumberone: '22114455',
      phonenumbertwo: '71998877',
      identitycardnumber: '08123456',
    } as Customer;

    it('should match by company name', () => {
      assert.strictEqual(matchesChantierCustomerSearch(customer, 'Socobois'), true);
      assert.strictEqual(matchesChantierCustomerSearch(customer, 'sarl'), true);
    });

    it('should match by first name or last name', () => {
      assert.strictEqual(matchesChantierCustomerSearch(customer, 'Mounir'), true);
      assert.strictEqual(matchesChantierCustomerSearch(customer, 'gharbi'), true);
    });

    it('should match by phone number', () => {
      assert.strictEqual(matchesChantierCustomerSearch(customer, '22114455'), true);
      assert.strictEqual(matchesChantierCustomerSearch(customer, '71998877'), true);
    });

    it('should match by tax registration number (MF) or CIN', () => {
      assert.strictEqual(matchesChantierCustomerSearch(customer, '0012457K'), true);
      assert.strictEqual(matchesChantierCustomerSearch(customer, '08123456'), true);
    });

    it('should not match irrelevant query', () => {
      assert.strictEqual(matchesChantierCustomerSearch(customer, 'NonExistent999'), false);
    });
  });
});
