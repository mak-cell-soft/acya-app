import http from 'k6/http';
import { check } from 'k6';
import { ENV, TEST_CREDENTIALS, buildHeaders } from '../config/environments.js';

/**
 * ACYA SaaS — Auth Helper
 * 
 * Gère l'authentification JWT multi-tenant.
 * 
 * Le middleware TenantMiddleware.cs résout le tenant via:
 *   1. Header X-Tenant-Slug (priorité 1 — utilisé ici)
 *   2. Subdomain
 *   3. Query string ?tenant=slug
 * 
 * L'endpoint login est AllowAnonymous → pas besoin de token pour s'authentifier.
 * Route: POST /api/account/login
 */

/**
 * Authentifie un utilisateur pour un tenant donné.
 * @param {string} tenantSlug - Slug du tenant (ex: 'socofeb')
 * @param {string} [login] - Login ou email
 * @param {string} [password] - Mot de passe
 * @returns {{ token: string, tenantSlug: string, success: boolean, fullname: string }}
 */
export function authenticate(tenantSlug, login = null, password = null) {
  const credentials = {
    login: login || TEST_CREDENTIALS.login,
    password: password || TEST_CREDENTIALS.password,
  };

  const headers = buildHeaders(tenantSlug, null);

  const res = http.post(
    `${ENV.baseUrl}/account/login`,
    JSON.stringify(credentials),
    { headers, tags: { name: 'auth_login' } }
  );

  const success = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: isSuccess true': (r) => {
      try {
        return JSON.parse(r.body)?.isSuccess === true;
      } catch {
        return false;
      }
    },
    'login: token présent': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body?.token && body.token.length > 10;
      } catch {
        return false;
      }
    },
  });

  if (!success || res.status !== 200) {
    console.warn(
      `[auth] Échec login pour tenant '${tenantSlug}': status=${res.status}, body=${res.body?.substring(0, 200)}`
    );
    return { token: null, tenantSlug, success: false, fullname: '' };
  }

  const body = JSON.parse(res.body);
  return {
    token: body.token,
    tenantSlug,
    success: body.isSuccess,
    fullname: body.fullname || '',
    enterpriseName: body.enterpriseName || '',
  };
}

/**
 * Tente de se reconnecter si le token est absent (ex: après expiration).
 * @param {Object} session - Objet session { token, tenantSlug }
 * @returns {Object} session rafraîchie
 */
export function refreshIfNeeded(session) {
  if (!session?.token) {
    const newSession = authenticate(session?.tenantSlug || TENANTS[0].slug);
    return newSession;
  }
  return session;
}

/**
 * Construit les headers d'une requête authentifiée.
 * Raccourci utile dans les modules.
 * @param {Object} session - { token, tenantSlug }
 */
export function authHeaders(session) {
  return buildHeaders(session.tenantSlug, session.token);
}
