import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authHeaders } from '../helpers/auth.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Stock Flow Module
 * 
 * Endpoints couverts:
 *   GET  /api/stock              (état du stock global)
 *   GET  /api/stockmovement      (mouvements de stock)
 *   GET  /api/inventory          (inventaire)
 */

export function runStockFlow(session) {
  const headers = authHeaders(session);

  group('stock', () => {
    // Lecture stock global
    group('get_stock', () => {
      const res = http.get(
        `${ENV.baseUrl}/stock`,
        { headers, tags: { name: 'stock_get' } }
      );
      check(res, {
        'stock: status 200': (r) => r.status === 200,
        'stock: corps non vide': (r) => r.body && r.body.length > 2,
      });
      sleep(0.3);
    });

    // Mouvements de stock
    group('stock_movements', () => {
      const res = http.get(
        `${ENV.baseUrl}/stockmovement`,
        { headers, tags: { name: 'stock_movements' } }
      );
      check(res, {
        'stock movements: status 200': (r) => r.status === 200,
      });
      sleep(0.3);
    });

    // Inventaire (moins fréquent — 20% du temps)
    if (Math.random() < 0.2) {
      group('inventory', () => {
        const res = http.get(
          `${ENV.baseUrl}/inventory`,
          { headers, tags: { name: 'inventory_get' } }
        );
        check(res, {
          'inventory: status 200': (r) => r.status === 200,
        });
        sleep(0.5);
      });
    }
  });
}
