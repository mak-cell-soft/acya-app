import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Tenant Module Gating & 403 Suppression Logic', () => {
  describe('1. Inactive Module 403 Error Handling Filter', () => {
    function shouldSuppressPermissionToast(error: {
      status?: number;
      data?: any;
      url?: string;
    }): boolean {
      if (error.status !== 403) return false;

      const message = typeof error.data === 'string'
        ? error.data
        : (error.data?.message || error.data?.error || '');

      const isModuleNotActive =
        /non\s+activ[eé]|pas\s+activ[eé]|d[eé]sactiv[eé]|module.*activ/i.test(message) ||
        (error.url && /\/(chantier|production)\b/i.test(error.url));

      return Boolean(isModuleNotActive);
    }

    it('should suppress toast when Chantier module returns 403 module non activé', () => {
      const error = {
        status: 403,
        data: 'Module Chantier non activé pour cette entreprise.',
        url: 'https://socofeb.acya.site/api/chantier'
      };

      assert.strictEqual(shouldSuppressPermissionToast(error), true);
    });

    it('should suppress toast when Production module returns 403 module non activé', () => {
      const error = {
        status: 403,
        data: { message: "Le module Production n'est pas activé pour cette entreprise." },
        url: 'https://socofeb.acya.site/api/Production'
      };

      assert.strictEqual(shouldSuppressPermissionToast(error), true);
    });

    it('should suppress toast when request URL is /api/chantier or /api/Production on 403', () => {
      const error = {
        status: 403,
        data: 'Forbidden',
        url: '/api/chantier'
      };

      assert.strictEqual(shouldSuppressPermissionToast(error), true);
    });

    it('should NOT suppress toast for genuine user permission denials on active modules', () => {
      const error = {
        status: 403,
        data: { message: "Action non autorisée pour ce profil utilisateur." },
        url: '/api/invoices/123/delete'
      };

      assert.strictEqual(shouldSuppressPermissionToast(error), false);
    });

    it('should NOT suppress toast for generic user action forbidden', () => {
      const error = {
        status: 403,
        data: { message: "Access denied: insufficient privileges." },
        url: '/api/sales'
      };

      assert.strictEqual(shouldSuppressPermissionToast(error), false);
    });
  });

  describe('2. Navigation Item Gating', () => {
    const navItems = [
      { name: 'Articles', href: '/articles' },
      { name: 'Ventes', href: '/sales' },
      { name: 'Production', href: '/production' },
      { name: 'Chantiers', href: '/chantiers' },
      { name: 'Équipe & RH', href: '/team' },
    ];

    function filterNavItems(items: typeof navItems, isManagingConstructions: boolean, isManagingProduction: boolean) {
      return items.filter(item =>
        (item.name !== 'Chantiers' || isManagingConstructions) &&
        (item.name !== 'Production' || isManagingProduction)
      );
    }

    it('should exclude Chantiers and Production for tenants like socofeb that do not manage either', () => {
      const filtered = filterNavItems(navItems, false, false);
      const names = filtered.map(i => i.name);

      assert.ok(!names.includes('Chantiers'), 'Chantiers should not be in nav');
      assert.ok(!names.includes('Production'), 'Production should not be in nav');
      assert.strictEqual(filtered.length, 3);
    });

    it('should include Chantiers when isManagingConstructions is true', () => {
      const filtered = filterNavItems(navItems, true, false);
      const names = filtered.map(i => i.name);

      assert.ok(names.includes('Chantiers'));
      assert.ok(!names.includes('Production'));
      assert.strictEqual(filtered.length, 4);
    });

    it('should include Production when isManagingProduction is true', () => {
      const filtered = filterNavItems(navItems, false, true);
      const names = filtered.map(i => i.name);

      assert.ok(!names.includes('Chantiers'));
      assert.ok(names.includes('Production'));
      assert.strictEqual(filtered.length, 4);
    });
  });

  describe('3. Query Gating Logic in Dialogs and Views', () => {
    function shouldExecuteChantierQuery(isDialogOpen: boolean, category: string, isManagingConstructions: boolean) {
      return isDialogOpen && category === 'Chantiers & Production' && isManagingConstructions;
    }

    function shouldExecuteProductionQuery(isDialogOpen: boolean, category: string, isManagingProduction: boolean) {
      return isDialogOpen && category === 'Chantiers & Production' && isManagingProduction;
    }

    it('should not execute queries when dialog is closed', () => {
      assert.strictEqual(shouldExecuteChantierQuery(false, 'Chantiers & Production', true), false);
      assert.strictEqual(shouldExecuteProductionQuery(false, 'Chantiers & Production', true), false);
    });

    it('should not execute queries when category is other than Chantiers & Production', () => {
      assert.strictEqual(shouldExecuteChantierQuery(true, 'Application mobile', true), false);
      assert.strictEqual(shouldExecuteProductionQuery(true, 'Application mobile', true), false);
    });

    it('should not execute queries when tenant does not manage construction or production', () => {
      assert.strictEqual(shouldExecuteChantierQuery(true, 'Chantiers & Production', false), false);
      assert.strictEqual(shouldExecuteProductionQuery(true, 'Chantiers & Production', false), false);
    });

    it('should execute query only when dialog open, category selected, and tenant module active', () => {
      assert.strictEqual(shouldExecuteChantierQuery(true, 'Chantiers & Production', true), true);
      assert.strictEqual(shouldExecuteProductionQuery(true, 'Chantiers & Production', true), true);
    });
  });
});
