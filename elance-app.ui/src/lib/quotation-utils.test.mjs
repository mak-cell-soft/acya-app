import test from 'node:test';
import assert from 'node:assert/strict';

// Test scenarios matching all user specifications
import {
  generateValiditySentence,
  validateValidityDuration,
  DEFAULT_VALIDITY_DURATION,
  DEFAULT_VALIDITY_UNIT,
  DEFAULT_COMMERCIAL_CONDITIONS
} from './quotation-utils.ts';

test('Scenario 1: Default configuration values', () => {
  assert.equal(DEFAULT_VALIDITY_DURATION, 15);
  assert.equal(DEFAULT_VALIDITY_UNIT, 'days');
  assert.equal(DEFAULT_COMMERCIAL_CONDITIONS, 'Dans la limite du stock disponible.');
  assert.equal(generateValiditySentence(15, 'days'), 'Devis valide 15 jours.');
});

test('Scenario 2: Validity of 30 Days', () => {
  assert.equal(generateValiditySentence(30, 'days'), 'Devis valide 30 jours.');
  assert.equal(generateValiditySentence('30', 'Jours'), 'Devis valide 30 jours.');
});

test('Scenario 3: Validity of 1 Day and 1 Month (Singular forms)', () => {
  assert.equal(generateValiditySentence(1, 'days'), 'Devis valide 1 jour.');
  assert.equal(generateValiditySentence(1, 'Jours'), 'Devis valide 1 jour.');
  assert.equal(generateValiditySentence(1, 'months'), 'Devis valide 1 mois.');
  assert.equal(generateValiditySentence(1, 'Mois'), 'Devis valide 1 mois.');
});

test('Scenario 4: Validity of 2 Months and multiple months (Plural forms)', () => {
  assert.equal(generateValiditySentence(2, 'months'), 'Devis valide 2 mois.');
  assert.equal(generateValiditySentence(3, 'months'), 'Devis valide 3 mois.');
  assert.equal(generateValiditySentence('2', 'Mois'), 'Devis valide 2 mois.');
});

test('Scenario 9: Validation for duration field', () => {
  // Valid positive integers
  assert.equal(validateValidityDuration(1), null);
  assert.equal(validateValidityDuration(15), null);
  assert.equal(validateValidityDuration(30), null);
  assert.equal(validateValidityDuration('15'), null);

  // Invalid: empty or undefined
  assert.notEqual(validateValidityDuration(''), null);
  assert.notEqual(validateValidityDuration('   '), null);
  assert.notEqual(validateValidityDuration(undefined), null);
  assert.notEqual(validateValidityDuration(null), null);

  // Invalid: zero
  assert.equal(
    validateValidityDuration(0),
    'La durée doit être un entier strictement positif (supérieur à 0).'
  );
  assert.equal(
    validateValidityDuration('0'),
    'La durée doit être un entier strictement positif (supérieur à 0).'
  );

  // Invalid: negative numbers
  assert.equal(
    validateValidityDuration(-5),
    'La durée doit être un entier strictement positif (supérieur à 0).'
  );

  // Invalid: fractional / decimal numbers
  assert.equal(
    validateValidityDuration(15.5),
    'La durée doit être un nombre entier.'
  );
  assert.equal(
    validateValidityDuration('15.5'),
    'La durée doit être un nombre entier.'
  );

  // Invalid: NaN / non-numeric string
  assert.equal(
    validateValidityDuration('abc'),
    'La durée doit être un nombre valide.'
  );
});
