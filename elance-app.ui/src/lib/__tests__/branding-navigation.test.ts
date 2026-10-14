import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Élancé Branding Navigation & External Website Integration Tests', () => {
  const authBrandPanelPath = path.resolve(__dirname, '../../components/auth/auth-brand-panel.tsx');
  const heroSectionPath = path.resolve(__dirname, '../../components/shared/hero-section.tsx');
  const loginPagePath = path.resolve(__dirname, '../../app/login/page.tsx');
  const centralLoginViewPath = path.resolve(__dirname, '../../components/auth/central-login-view.tsx');

  const authBrandPanelContent = fs.readFileSync(authBrandPanelPath, 'utf-8');
  const heroSectionContent = fs.readFileSync(heroSectionPath, 'utf-8');
  const loginPageContent = fs.readFileSync(loginPagePath, 'utf-8');
  const centralLoginViewContent = fs.readFileSync(centralLoginViewPath, 'utf-8');

  describe('Change #1: Élancé Login Page Promotional Panel Navigation', () => {
    it('NAV-01 & NAV-02: AuthBrandPanel targets the canonical public URL https://acya.site', () => {
      // Must contain a link targeting https://acya.site
      assert.match(
        authBrandPanelContent,
        /href="https:\/\/acya\.site"/,
        'AuthBrandPanel must include an anchor with canonical href="https://acya.site"'
      );
    });

    it('NAV-01 & NAV-02: AuthBrandPanel is shared between main-domain and tenant login pages', () => {
      // Check that AuthBrandPanel is imported and rendered on both central and tenant login
      assert.match(
        loginPageContent,
        /<AuthBrandPanel\s*\/>/,
        'Tenant login page must render AuthBrandPanel'
      );
      assert.match(
        centralLoginViewContent,
        /<AuthBrandPanel\s*\/>/,
        'Central login view must render AuthBrandPanel'
      );
    });

    it('NAV-06: AuthBrandPanel provides accessible label, pointer cursor, and keyboard focus styling', () => {
      assert.match(
        authBrandPanelContent,
        /aria-label="Retourner au site public Élancé \(acya\.site\)"/,
        'AuthBrandPanel link must have an explicit accessible label'
      );
      assert.match(
        authBrandPanelContent,
        /cursor-pointer/,
        'AuthBrandPanel link must display a pointer cursor'
      );
      assert.match(
        authBrandPanelContent,
        /focus-visible:ring-2/,
        'AuthBrandPanel link must support visible keyboard focus'
      );
    });

    it('NAV-03: Right-hand login form and auth elements remain independent', () => {
      // AuthBrandPanel does not enclose or modify login inputs
      assert.match(loginPageContent, /name="email"|type="email"|id="email"/i);
      assert.match(loginPageContent, /name="password"|type="password"|id="password"/i);
      assert.match(loginPageContent, /handleLogin/);
      // Panel is confined to aside element and does not wrap <main>
      assert.ok(!loginPageContent.includes('<AuthBrandPanel><main'));
    });

    it('NAV-07: AuthBrandPanel preserves existing design, dimensions, and image showcase', () => {
      assert.match(authBrandPanelContent, /bg-\[#060D1E\]/);
      assert.match(authBrandPanelContent, /og-image\.png/);
      assert.match(authBrandPanelContent, /hidden lg:flex lg:w-\[48%\] xl:w-\[50%\]/);
      assert.match(authBrandPanelContent, /p-8 xl:p-12/);
    });
  });

  describe('Change #2: RéVA Logo Navigation on Public Website', () => {
    it('NAV-04: RéVA logo targets https://reva-consulte.com in a new tab', () => {
      assert.match(
        heroSectionContent,
        /href="https:\/\/reva-consulte\.com"/,
        'Hero section must include an anchor with href="https://reva-consulte.com"'
      );
      assert.match(
        heroSectionContent,
        /target="_blank"/,
        'Hero section RéVA link must open in a new tab (target="_blank")'
      );
    });

    it('NAV-05: RéVA logo uses rel="noopener noreferrer" for security and isolation', () => {
      assert.match(
        heroSectionContent,
        /rel="noopener noreferrer"/,
        'Hero section RéVA link must use rel="noopener noreferrer"'
      );
    });

    it('NAV-06: RéVA logo link is keyboard accessible with clear accessible label', () => {
      assert.match(
        heroSectionContent,
        /aria-label="RÉVA Consulting \(ouvre un nouvel onglet\)"/,
        'RéVA link must provide an accessible name explaining external new tab behavior'
      );
      assert.match(
        heroSectionContent,
        /focus-visible:ring-2 focus-visible:ring-cyan-400/,
        'RéVA link must have visible focus styling for keyboard navigation'
      );
    });

    it('NAV-07: RéVA branding preserves dimensions, image, and does not make hero section clickable', () => {
      assert.match(heroSectionContent, /logo-reva-navbar\.png/);
      assert.match(heroSectionContent, /h-10 xl:h-11 w-auto object-contain/);
      assert.match(heroSectionContent, /Développé par/);
      // Hero section itself is not an anchor tag
      assert.ok(!heroSectionContent.startsWith('<a'));
    });
  });
});
