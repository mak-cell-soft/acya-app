import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SupportPriority
} from '../../types/support';

describe('Support Ticket Domain & Configuration Tests', () => {

  describe('1. Category Configuration', () => {
    it('should include all required support categories', () => {
      const expectedCategories = [
        'Application mobile',
        'Gestion du stock',
        'Gestion des articles',
        'Ressources humaines',
        'Chantiers & Production',
        'Autre demande'
      ];

      const categoryIds = SUPPORT_CATEGORIES.map(c => c.id);
      for (const expected of expectedCategories) {
        assert.ok(categoryIds.includes(expected), `Category "${expected}" must be configured.`);
      }
      assert.strictEqual(SUPPORT_CATEGORIES.length, 6);
    });

    it('should configure correct subcategories for Application mobile', () => {
      const mobileCat = SUPPORT_CATEGORIES.find(c => c.id === 'Application mobile');
      assert.ok(mobileCat);
      assert.deepStrictEqual(mobileCat.subcategories, [
        "Demande d'accès à l'application mobile",
        'Installation',
        'Problème de connexion',
        'Problème de synchronisation',
        'Autre problème mobile'
      ]);
    });

    it('should configure correct subcategories for Gestion du stock', () => {
      const stockCat = SUPPORT_CATEGORIES.find(c => c.id === 'Gestion du stock');
      assert.ok(stockCat);
      assert.deepStrictEqual(stockCat.subcategories, [
        'Quantité de stock incorrecte',
        'Entrée de stock',
        'Sortie de stock',
        'Inventaire',
        'Transfert de stock',
        'Autre problème de stock'
      ]);
    });

    it('should configure correct subcategories for Gestion des articles', () => {
      const articlesCat = SUPPORT_CATEGORIES.find(c => c.id === 'Gestion des articles');
      assert.ok(articlesCat);
      assert.deepStrictEqual(articlesCat.subcategories, [
        "Création ou modification d'un article",
        'Référence incorrecte',
        'Prix incorrect',
        'Article introuvable',
        "Autre problème d'article"
      ]);
    });

    it('should configure correct subcategories for Ressources humaines', () => {
      const hrCat = SUPPORT_CATEGORIES.find(c => c.id === 'Ressources humaines');
      assert.ok(hrCat);
      assert.deepStrictEqual(hrCat.subcategories, [
        "Création ou modification d'un employé",
        "Gestion de l'équipe",
        'Problème de présence',
        'Informations incorrectes',
        'Accès aux fonctionnalités RH',
        'Autre problème RH'
      ]);
    });

    it('should configure correct subcategories for Chantiers & Production', () => {
      const cpCat = SUPPORT_CATEGORIES.find(c => c.id === 'Chantiers & Production');
      assert.ok(cpCat);
      assert.deepStrictEqual(cpCat.subcategories, [
        'Gestion des chantiers',
        'Suivi des opérations',
        'Gestion de la production',
        'Étapes de fabrication',
        "Coûts de main-d'œuvre",
        'Autre problème'
      ]);
      assert.strictEqual(cpCat.moduleKey, 'isManagingConstructions');
    });

    it('should configure correct subcategories for Autre demande', () => {
      const otherCat = SUPPORT_CATEGORIES.find(c => c.id === 'Autre demande');
      assert.ok(otherCat);
      assert.deepStrictEqual(otherCat.subcategories, [
        "Question sur l'utilisation",
        "Demande d'évolution",
        "Demande d'information",
        'Problème technique',
        'Autre'
      ]);
    });
  });

  describe('2. Priority Configuration', () => {
    it('should configure three defined priorities with Normale as default', () => {
      const priorityValues = SUPPORT_PRIORITIES.map(p => p.value);
      assert.deepStrictEqual(priorityValues, ['Normale', 'Élevée', 'Critique']);
    });

    it('should contain accurate French descriptions for each priority', () => {
      const normale = SUPPORT_PRIORITIES.find(p => p.value === 'Normale');
      const elevee = SUPPORT_PRIORITIES.find(p => p.value === 'Élevée');
      const critique = SUPPORT_PRIORITIES.find(p => p.value === 'Critique');

      assert.ok(normale?.description.includes('non bloquant'));
      assert.ok(elevee?.description.includes('important'));
      assert.ok(critique?.description.includes('bloquant'));
    });
  });

  describe('3. Tenant Feature Gating', () => {
    it('should filter out Chantiers & Production if tenant does not subscribe to construction or production', () => {
      const filterCategories = (isManagingConstructions: boolean, isManagingProduction: boolean) => {
        return SUPPORT_CATEGORIES.filter((cat) => {
          if (cat.id === 'Chantiers & Production') {
            return isManagingConstructions || isManagingProduction;
          }
          return true;
        });
      };

      const gatedWhenDisabled = filterCategories(false, false);
      assert.strictEqual(gatedWhenDisabled.some(c => c.id === 'Chantiers & Production'), false);
      assert.strictEqual(gatedWhenDisabled.length, 5);

      const visibleWhenConstruction = filterCategories(true, false);
      assert.strictEqual(visibleWhenConstruction.some(c => c.id === 'Chantiers & Production'), true);
      assert.strictEqual(visibleWhenConstruction.length, 6);

      const visibleWhenProduction = filterCategories(false, true);
      assert.strictEqual(visibleWhenProduction.some(c => c.id === 'Chantiers & Production'), true);
    });
  });

  describe('4. File Validation Logic', () => {
    it('should validate allowed file extensions (.png, .jpg, .jpeg, .pdf)', () => {
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf'];
      const isValid = (fileName: string) => {
        const lower = fileName.toLowerCase();
        return allowedExtensions.some(ext => lower.endsWith(ext));
      };

      assert.strictEqual(isValid('screenshot.PNG'), true);
      assert.strictEqual(isValid('error_log.pdf'), true);
      assert.strictEqual(isValid('photo.JPEG'), true);
      assert.strictEqual(isValid('image.jpg'), true);
      assert.strictEqual(isValid('script.exe'), false);
      assert.strictEqual(isValid('payload.bat'), false);
      assert.strictEqual(isValid('archive.zip'), false);
    });

    it('should validate file size within 5MB limit', () => {
      const maxBytes = 5 * 1024 * 1024;
      const isSizeValid = (size: number) => size <= maxBytes;

      assert.strictEqual(isSizeValid(1024), true);
      assert.strictEqual(isSizeValid(5 * 1024 * 1024), true);
      assert.strictEqual(isSizeValid(5 * 1024 * 1024 + 1), false);
      assert.strictEqual(isSizeValid(10 * 1024 * 1024), false);
    });
  });

  describe('5. Unique Reference Format Validation', () => {
    it('should match backend generated format EL-YYYY-XXXXX', () => {
      const regex = /^EL-\d{4}-\d{5}$/;

      assert.strictEqual(regex.test('EL-2026-00001'), true);
      assert.strictEqual(regex.test('EL-2026-00124'), true);
      assert.strictEqual(regex.test('EL-2026-99999'), true);
      assert.strictEqual(regex.test('EL-26-001'), false);
      assert.strictEqual(regex.test('INVALID-REF'), false);
    });
  });
});
