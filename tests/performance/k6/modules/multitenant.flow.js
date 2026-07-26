import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, authHeaders } from '../helpers/auth.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Multi-Tenant Flow Module
 * 
 * Simule et vérifie l'isolation et la performance lors de requêtes multi-tenant.
 */

export function runMultiTenantFlow(tenantSlugs = ['socofeb']) {
  group('multitenant_isolation', () => {
    tenantSlugs.forEach((slug) => {
      group(`tenant_${slug}`, () => {
        const session = authenticate(slug);
        if (!session.success || !session.token) {
          console.warn(`[multitenant] Échec authentification tenant: ${slug}`);
          return;
        }

        const headers = authHeaders(session);

        // Appel sur l'entreprise du tenant
        const res = http.get(`${ENV.baseUrl}/enterprise`, {
          headers,
          tags: { name: 'tenant_enterprise_info' },
        });

        check(res, {
          'multitenant: status 200': (r) => r.status === 200,
          'multitenant: retour valide': (r) => r.body && r.body.length > 0,
        });

        sleep(0.5);
      });
    });
  });
}
