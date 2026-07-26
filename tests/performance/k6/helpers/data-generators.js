import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

/**
 * ACYA SaaS — Data Generators
 * 
 * Génère des données de test réalistes pour les requêtes ACYA.
 * Les IDs de référence (articles, counterparts, sites) sont chargés
 * dans setup() du script principal via des appels GET, puis injectés ici.
 */

// ─── Types de Documents ───────────────────────────────────────────────────────
export const DOCUMENT_TYPES = {
  DEVIS: 0,
  BON_DE_COMMANDE: 1,
  BON_DE_LIVRAISON: 2,
  FACTURE: 3,
  AVOIR: 4,
};

export const DOCUMENT_TYPE_NAMES = {
  0: 'Devis',
  1: 'BonDeCommande',
  2: 'BonDeLivraison',
  3: 'Facture',
  4: 'Avoir',
};

// ─── Générateurs de référence ─────────────────────────────────────────────────

/**
 * Génère un numéro de document unique pour les tests
 * Format: K6-{TYPE}-{timestamp}-{random}
 */
export function generateDocumentRef(type = 'DEVIS') {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `K6-${type}-${ts}-${rand}`;
}

/**
 * Sélectionne un élément aléatoire dans un tableau
 */
export function randomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Génère une quantité aléatoire (1–50)
 */
export function randomQuantity(min = 1, max = 50) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère un prix unitaire aléatoire (100–5000 DZD)
 */
export function randomPrice(min = 100, max = 5000) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// ─── Payload Builders ─────────────────────────────────────────────────────────

/**
 * Construit un payload de création de document (Devis)
 * @param {Object} refs - { counterPartIds, salesSiteIds, merchandiseIds }
 */
export function buildDocumentPayload(refs) {
  const counterPartId = randomItem(refs.counterPartIds) || 1;
  const salesSiteId = randomItem(refs.salesSiteIds) || 1;
  const merchandiseId = randomItem(refs.merchandiseIds) || 1;
  const qty = randomQuantity(1, 20);
  const unitPrice = randomPrice(200, 3000);

  return {
    type: DOCUMENT_TYPES.DEVIS,
    ref: generateDocumentRef('DEVIS'),
    counterPartId,
    salesSiteId: salesSiteId,
    note: `Test k6 - ${new Date().toISOString()}`,
    documentMerchandises: [
      {
        merchandiseId,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
      },
    ],
  };
}

/**
 * Construit un payload de login
 */
export function buildLoginPayload(login, password) {
  return { login, password };
}

/**
 * Construit un payload de recherche article
 */
export function buildSearchQuery() {
  const terms = ['bois', 'pin', 'chêne', 'planche', 'chevron', 'lambourde'];
  return randomItem(terms);
}
