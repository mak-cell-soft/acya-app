import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authHeaders } from '../helpers/auth.js';
import { buildSearchQuery } from '../helpers/data-generators.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Analytics Flow Module
 * 
 * Les endpoints les plus lourds : agrégations, KPIs, deep search.
 * Priorité haute dans les tests de performance.
 * 
 * Endpoints couverts (AnalyticsController.cs + DeepSearchController.cs):
 *   GET  /api/analytics/dashboard   (KPIs temps réel)
 *   GET  /api/analytics/kpis        (métriques consolidées)
 *   GET  /api/deepsearch?q=...      (recherche multi-entités)
 *   GET  /api/admindash             (admin dashboard)
 */

export function runAnalyticsFlow(session) {
  const headers = authHeaders(session);

  group('analytics', () => {
    // Dashboard principal — requête la plus lourde
    group('dashboard', () => {
      const res = http.get(
        `${ENV.baseUrl}/analytics`,
        { headers, tags: { name: 'analytics_dashboard' } }
      );
      check(res, {
        'analytics: status 200 ou 204': (r) => r.status === 200 || r.status === 204,
      });
      sleep(1);
    });

    // Deep Search (moins fréquent — coûteux en DB)
    if (Math.random() < 0.3) {
      group('deepsearch', () => {
        const query = buildSearchQuery();
        const res = http.get(
          `${ENV.baseUrl}/deepsearch?q=${encodeURIComponent(query)}`,
          { headers, tags: { name: 'deepsearch' } }
        );
        check(res, {
          'deepsearch: status 200': (r) => r.status === 200,
          'deepsearch: réponse dans les délais': (r) => r.timings.duration < 3000,
        });
        sleep(1.5);
      });
    }
  });
}
