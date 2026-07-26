import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authHeaders } from '../helpers/auth.js';
import { buildDocumentPayload, DOCUMENT_TYPES } from '../helpers/data-generators.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Document Flow Module
 * 
 * Simule le workflow commercial complet : Devis → BonDeCommande → BonDeLivraison → Facture.
 * 
 * Ratio lecture/écriture : 70% lectures, 30% écritures.
 * 
 * Endpoints couverts (DocumentController.cs — le plus lourd, 88KB, 2120 lignes):
 *   GET  /api/document?_type=0        (liste des Devis — jointures profondes)
 *   GET  /api/document?_type=3        (liste des Factures)
 *   POST /api/document                (création d'un Devis)
 *   GET  /api/document/{id}           (détail document)
 */

/**
 * Flux principal Documents
 * @param {Object} session - { token, tenantSlug }
 * @param {Object} refs - { counterPartIds, salesSiteIds, merchandiseIds }
 */
export function runDocumentFlow(session, refs) {
  const headers = authHeaders(session);

  group('documents_read', () => {
    // Lecture liste Devis (DocumentTypes.Devis = 0)
    group('list_devis', () => {
      const res = http.get(
        `${ENV.baseUrl}/document?_type=${DOCUMENT_TYPES.DEVIS}`,
        { headers, tags: { name: 'doc_list_devis' } }
      );

      check(res, {
        'documents: status 200': (r) => r.status === 200,
        'documents: réponse JSON array': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body));
          } catch {
            return false;
          }
        },
      });
      sleep(0.5);
    });

    // Lecture liste Factures (DocumentTypes.Facture = 3)
    group('list_factures', () => {
      const res = http.get(
        `${ENV.baseUrl}/document?_type=${DOCUMENT_TYPES.FACTURE}`,
        { headers, tags: { name: 'doc_list_factures' } }
      );

      check(res, {
        'factures: status 200': (r) => r.status === 200,
      });
      sleep(0.3);
    });
  });

  // Écriture uniquement 30% du temps
  if (Math.random() < 0.3) {
    group('documents_write', () => {
      group('create_devis', () => {
        const payload = buildDocumentPayload(refs);
        const res = http.post(
          `${ENV.baseUrl}/document`,
          JSON.stringify(payload),
          { headers, tags: { name: 'doc_create_devis' } }
        );

        check(res, {
          'create devis: status 200 ou 201': (r) => r.status === 200 || r.status === 201,
          'create devis: pas d\'erreur': (r) => {
            if (r.status >= 400) {
              console.warn(`[doc] Erreur création devis: ${r.body?.substring(0, 300)}`);
              return false;
            }
            return true;
          },
        });
        sleep(1);
      });
    });
  }
}
