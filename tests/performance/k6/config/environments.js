/**
 * ACYA SaaS — k6 Environment Configuration
 * 
 * Tenant resolution (priority order in SubdomainTenantResolver.cs):
 *   1. Header: X-Tenant-Slug          ← utilisé par Nginx en production
 *   2. Subdomain: socofeb.acya.site    ← production / staging
 *   3. QueryString: ?tenant=socofeb   ← fallback local (Docker/k6)
 */

export const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:8080/api',
    // En local on passe le tenant via query param (le plus simple sans Nginx)
    tenantMode: 'header',      // 'header' | 'querystring'
    tenantHeader: 'X-Tenant-Slug',
    description: 'Local Docker Compose',
  },
  staging: {
    baseUrl: 'https://staging.acya.site/api',
    tenantMode: 'subdomain',
    description: 'Staging environment',
  },
  prod: {
    baseUrl: 'https://acya.site/api',
    tenantMode: 'subdomain',
    description: 'Production — ONLY smoke tests!',
  },
};

// Sélection de l'environnement via variable K6_ENV (défaut: local)
const envName = __ENV.K6_ENV || 'local';
export const ENV = ENVIRONMENTS[envName] || ENVIRONMENTS.local;

/**
 * Tenants disponibles pour les tests
 * Format: { slug, displayName }
 * 
 * Pour tester en local, le tenant doit exister dans la master DB.
 * Utiliser le slug enregistré dans la table TenantRegistries.
 */
export const TENANTS = [
  { slug: __ENV.K6_TENANT || 'socofeb', displayName: 'Socofeb (principal)' },
];

/**
 * Credentials de test — injectés via variables d'env k6
 * Usage: k6 run -e K6_USER=admin -e K6_PASS=secret ...
 */
export const TEST_CREDENTIALS = {
  login: __ENV.K6_USER || 'admin',
  password: __ENV.K6_PASS || 'admin123',
};

/**
 * Construire les headers pour une requête tenant
 * @param {string} slug - Le slug du tenant
 * @param {string|null} token - JWT Bearer token (null si non authentifié)
 * @returns {Object} headers HTTP
 */
export function buildHeaders(slug, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': slug,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
