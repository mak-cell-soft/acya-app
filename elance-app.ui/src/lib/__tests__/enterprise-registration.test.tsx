import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as Record<string, unknown>).React = React;
import {
  EnterpriseRegistrationForm,
  registrationSchema,
  evaluatePasswordStrength,
  COUNTRIES,
  MODULE_OPTIONS,
  buildRegistrationPayload,
} from '../../components/auth/enterprise-registration-form';

const baseValidData = {
  firstName: 'Karim',
  lastName: 'Ben Ali',
  email: 'karim@bois-tunisie.tn',
  password: 'StrongPassword123!',
  phoneCountry: 'TN',
  phone: '22 345 678',
  companyName: 'Menuiserie Élancé SARL',
  country: 'TN',
  devise: 'TND',
  matriculeFiscal: '',
  isWoodSelling: false,
  isManagingConstructions: false,
  isManagingProduction: false,
  acceptTerms: true,
};

describe('ACYA Élancé Two-Step Enterprise Registration Flow', () => {
  it('1. Step 1 SSR HTML renders required administrator fields, progress indicator (Étape 1 sur 2), country code, Continue button, and Sign-In link', () => {
    const html = renderToStaticMarkup(<EnterpriseRegistrationForm initialStep={1} />);

    assert.ok(html.includes('Étape 1 sur 2'), 'Must show Step 1 of 2 indicator');
    assert.ok(html.includes('Créez votre compte administrateur'), 'Must show Step 1 heading');
    assert.ok(html.includes('id="reg-firstName"'), 'Must render first name input');
    assert.ok(html.includes('id="reg-lastName"'), 'Must render last name input');
    assert.ok(html.includes('id="reg-email"'), 'Must render email input');
    assert.ok(html.includes('id="reg-password"'), 'Must render password input');
    assert.ok(html.includes('type="password"'), 'Password must be masked by default');
    assert.ok(
      html.includes('Afficher le mot de passe'),
      'Must provide control to show/hide password'
    );
    assert.ok(
      html.includes('data-testid="password-strength-meter"'),
      'Must render visual password strength indicator'
    );
    assert.ok(
      html.includes('+216'),
      'Must display default international country calling code (+216)'
    );
    assert.ok(html.includes('id="reg-phone"'), 'Must render phone number input');
    assert.ok(html.includes('Continuer'), 'Must render primary Continue button');
    assert.ok(
      html.includes('Vous avez déjà un compte ?') && html.includes('Se connecter'),
      'Must render secondary Sign-In link'
    );
  });

  it('2. Step 2 SSR HTML renders company configuration fields, optional Choose Your Modules cards with 0 preselected by default, Terms checkbox, and navigation controls', () => {
    const html = renderToStaticMarkup(<EnterpriseRegistrationForm initialStep={2} />);

    assert.ok(html.includes('Étape 2 sur 2'), 'Must show Step 2 of 2 indicator');
    assert.ok(html.includes('Configurez votre entreprise'), 'Must show Step 2 heading');
    assert.ok(html.includes('id="reg-companyName"'), 'Must render company name input');
    assert.ok(
      html.includes('data-testid="company-country-select"'),
      'Must render country selector'
    );
    assert.ok(
      html.includes('data-testid="company-currency-select"'),
      'Must render default currency selector'
    );
    assert.ok(
      html.includes('id="reg-matriculeFiscal"') && html.includes('Optionnel'),
      'Must render optional tax identification number field'
    );

    // Module Selection section
    assert.ok(
      html.includes('Choisissez vos modules'),
      'Must render Choose Your Modules section title'
    );
    assert.strictEqual(MODULE_OPTIONS.length, 3, 'Must offer exactly 3 selectable modules');
    assert.ok(
      html.includes('Bois') &&
        html.includes('Gérez les produits bois, articles, achats, ventes et stocks.'),
      'Must render Wood module card and description'
    );
    assert.ok(
      html.includes('Chantiers') &&
        html.includes(
          'Gérez les activités de chantier et les demandes de caisse chantier.'
        ),
      'Must render Construction Sites module card and description'
    );
    assert.ok(
      html.includes('Production') &&
        html.includes(
          'Gérez les activités de fabrication et évaluez les coûts de production.'
        ),
      'Must render Production module card and description'
    );

    // Confirm all 3 module cards are unselected (aria-checked="false") by default and no module error is shown
    const uncheckedCards = html.match(/role="checkbox" aria-checked="false"/g) || [];
    assert.strictEqual(
      uncheckedCards.length,
      3,
      'All 3 module cards must default to unselected (aria-checked="false")'
    );
    assert.ok(
      !html.includes('Veuillez sélectionner au moins un module'),
      'Must not render module requirement error message'
    );
    assert.ok(
      !html.includes('data-testid="modules-error"'),
      'Must not render module error element'
    );

    // Terms & Navigation
    assert.ok(
      html.includes('data-testid="accept-terms-checkbox"'),
      'Must render required Terms & Conditions checkbox'
    );
    assert.ok(html.includes('Créer mon compte'), 'Must render Create My Account button');
    assert.ok(
      html.includes('Retour à vos informations'),
      'Must render Back to Your Information control'
    );

    // Must not introduce fake promo code or self-employed controls
    assert.ok(!html.includes('Code promotionnel'), 'Must not include fake promo code');
    assert.ok(!html.includes('Auto-entrepreneur'), 'Must not include fake self-employed option');
  });

  it('3. Password strength evaluator scores weak, medium, good, and strong passwords accurately', () => {
    assert.strictEqual(evaluatePasswordStrength('').score, 0);
    assert.strictEqual(evaluatePasswordStrength('short').label, 'Faible');
    assert.strictEqual(evaluatePasswordStrength('loweronly1').label, 'Moyen');
    assert.strictEqual(evaluatePasswordStrength('MixedCase1').label, 'Bon');
    assert.strictEqual(evaluatePasswordStrength('StrongPass123!').label, 'Fort');
  });

  it('4. Allows registration with ZERO selected modules and produces all-false module flags in API payload', () => {
    const zeroModulesValidation = registrationSchema.safeParse({
      ...baseValidData,
      isWoodSelling: false,
      isManagingConstructions: false,
      isManagingProduction: false,
    });

    assert.strictEqual(
      zeroModulesValidation.success,
      true,
      'Registration schema must accept 0 selected modules when required fields and terms are valid'
    );

    const payload = buildRegistrationPayload({
      ...baseValidData,
      isWoodSelling: false,
      isManagingConstructions: false,
      isManagingProduction: false,
    });

    assert.strictEqual(payload.issalingwood, false, 'issalingwood must be false');
    assert.strictEqual(
      payload.ismanagingconstructions,
      false,
      'ismanagingconstructions must be false'
    );
    assert.strictEqual(
      payload.ismanagingproduction,
      false,
      'ismanagingproduction must be false'
    );
  });

  it('5. Supports selecting 1, 2, or all 3 modules and reflects selected state in payload and UI', () => {
    // 1 module selected (Wood only)
    const oneWood = registrationSchema.safeParse({
      ...baseValidData,
      isWoodSelling: true,
      isManagingConstructions: false,
      isManagingProduction: false,
    });
    assert.strictEqual(oneWood.success, true);

    // 1 module selected (Construction Sites only)
    const oneConstructions = registrationSchema.safeParse({
      ...baseValidData,
      isWoodSelling: false,
      isManagingConstructions: true,
      isManagingProduction: false,
    });
    assert.strictEqual(oneConstructions.success, true);

    // 1 module selected (Production only)
    const oneProduction = registrationSchema.safeParse({
      ...baseValidData,
      isWoodSelling: false,
      isManagingConstructions: false,
      isManagingProduction: true,
    });
    assert.strictEqual(oneProduction.success, true);

    // 2 modules selected
    const twoModulesData = {
      ...baseValidData,
      isWoodSelling: true,
      isManagingConstructions: true,
      isManagingProduction: false,
    };
    assert.strictEqual(registrationSchema.safeParse(twoModulesData).success, true);
    const twoPayload = buildRegistrationPayload(twoModulesData);
    assert.strictEqual(twoPayload.issalingwood, true);
    assert.strictEqual(twoPayload.ismanagingconstructions, true);
    assert.strictEqual(twoPayload.ismanagingproduction, false);

    // All 3 modules selected
    const threeModulesData = {
      ...baseValidData,
      isWoodSelling: true,
      isManagingConstructions: true,
      isManagingProduction: true,
    };
    assert.strictEqual(registrationSchema.safeParse(threeModulesData).success, true);
    const threePayload = buildRegistrationPayload(threeModulesData);
    assert.strictEqual(threePayload.issalingwood, true);
    assert.strictEqual(threePayload.ismanagingconstructions, true);
    assert.strictEqual(threePayload.ismanagingproduction, true);

    // Verify UI rendering with 2 modules selected
    const htmlWithTwoSelected = renderToStaticMarkup(
      <EnterpriseRegistrationForm initialStep={2} initialValues={twoModulesData} />
    );
    const checkedCards =
      htmlWithTwoSelected.match(/role="checkbox" aria-checked="true"/g) || [];
    assert.strictEqual(checkedCards.length, 2, 'Must render 2 checked module cards');
    assert.ok(
      htmlWithTwoSelected.includes('2 sélectionnés'),
      'Must show selection badge count when modules are selected'
    );
  });

  it('6. Enforces required fields (firstName, lastName, email, password, phone, companyName, country, devise) and Terms acceptance even when 0 modules are allowed', () => {
    const missingRequired = registrationSchema.safeParse({
      ...baseValidData,
      firstName: '',
      lastName: '',
      email: 'not-an-email',
      password: '123',
      phone: '12',
      companyName: '',
      country: '',
      devise: '',
      acceptTerms: false,
    });

    assert.strictEqual(missingRequired.success, false);
    const fieldIssues = missingRequired.error.issues.map((i) => i.path[0]);
    assert.ok(fieldIssues.includes('firstName'));
    assert.ok(fieldIssues.includes('lastName'));
    assert.ok(fieldIssues.includes('email'));
    assert.ok(fieldIssues.includes('password'));
    assert.ok(fieldIssues.includes('phone'));
    assert.ok(fieldIssues.includes('companyName'));
    assert.ok(fieldIssues.includes('country'));
    assert.ok(fieldIssues.includes('devise'));
    assert.ok(fieldIssues.includes('acceptTerms'));
    assert.ok(
      !fieldIssues.includes('isWoodSelling'),
      'Must never flag isWoodSelling as a validation error'
    );

    const withoutTermsOnly = registrationSchema.safeParse({
      ...baseValidData,
      acceptTerms: false,
    });
    assert.strictEqual(withoutTermsOnly.success, false);

    const withoutTaxId = registrationSchema.safeParse({
      ...baseValidData,
      matriculeFiscal: '',
      acceptTerms: true,
    });
    assert.strictEqual(withoutTaxId.success, true);

    const withTaxId = registrationSchema.safeParse({
      ...baseValidData,
      matriculeFiscal: '1234567/A/A/M/000',
      acceptTerms: true,
    });
    assert.strictEqual(withTaxId.success, true);
  });

  it('7. Preserves entered administrator and company information across steps and maps country currencies', () => {
    const tn = COUNTRIES.find((c) => c.code === 'TN');
    const fr = COUNTRIES.find((c) => c.code === 'FR');
    const us = COUNTRIES.find((c) => c.code === 'US');
    assert.strictEqual(tn?.defaultCurrency, 'TND');
    assert.strictEqual(fr?.defaultCurrency, 'EUR');
    assert.strictEqual(us?.defaultCurrency, 'USD');

    // Render Step 1 with entered values
    const step1Html = renderToStaticMarkup(
      <EnterpriseRegistrationForm initialStep={1} initialValues={baseValidData} />
    );
    assert.ok(step1Html.includes('value="Karim"'), 'Step 1 preserves firstName');
    assert.ok(step1Html.includes('value="Ben Ali"'), 'Step 1 preserves lastName');
    assert.ok(
      step1Html.includes('value="karim@bois-tunisie.tn"'),
      'Step 1 preserves email'
    );
    assert.ok(step1Html.includes('value="22 345 678"'), 'Step 1 preserves phone');

    // Render Step 2 with the same form state and confirm values are retained in Step 2 and payload
    const step2Html = renderToStaticMarkup(
      <EnterpriseRegistrationForm
        initialStep={2}
        initialValues={{
          ...baseValidData,
          country: 'FR',
          devise: 'EUR',
          matriculeFiscal: '9876543/B/A/M/000',
        }}
      />
    );
    assert.ok(
      step2Html.includes('value="Menuiserie Élancé SARL"'),
      'Step 2 preserves companyName'
    );
    assert.ok(
      step2Html.includes('value="9876543/B/A/M/000"'),
      'Step 2 preserves matriculeFiscal'
    );
    assert.ok(step2Html.includes('France'), 'Step 2 preserves selected country');
    assert.ok(step2Html.includes('Euro (€)'), 'Step 2 preserves selected currency');
  });
});
