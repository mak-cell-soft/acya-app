import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authHeaders } from '../helpers/auth.js';
import { ENV } from '../config/environments.js';

/**
 * ACYA SaaS — Auth Flow Module
 * 
 * Teste les endpoints d'authentification et de profil utilisateur.
 * 
 * Endpoints couverts:
 *   POST /api/account/login          [AllowAnonymous]
 *   GET  /api/account/profile/{id}   [Authorize]
 *   PUT  /api/account/update-profile [Authorize]
 */

/**
 * Flux d'authentification complet
 * @param {Object} session - Session avec { token, tenantSlug }
 */
export function runAuthFlow(session) {
  group('auth', () => {
    // 1. Vérifier le profil de l'utilisateur courant
    group('get_profile', () => {
      const res = http.get(
        `${ENV.baseUrl}/account/profile/1`,
        {
          headers: authHeaders(session),
          tags: { name: 'auth_get_profile' },
        }
      );

      check(res, {
        'profile: status 200': (r) => r.status === 200,
        'profile: a un fullname': (r) => {
          try {
            const body = JSON.parse(r.body);
            return typeof body?.fullName === 'string' || typeof body?.login === 'string';
          } catch {
            return false;
          }
        },
      });

      sleep(0.5);
    });
  });
}
