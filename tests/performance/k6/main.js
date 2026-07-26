import { GLOBAL_THRESHOLDS } from './config/thresholds.js';
import { runAuthFlow } from './modules/auth.flow.js';
import { runDocumentFlow } from './modules/document.flow.js';
import { runStockFlow } from './modules/stock.flow.js';
import { runArticleFlow } from './modules/article.flow.js';
import { runAnalyticsFlow } from './modules/analytics.flow.js';
import { runMultiTenantFlow } from './modules/multitenant.flow.js';
import { authenticate } from './helpers/auth.js';

/**
 * ACYA SaaS — Main Entrypoint k6
 * 
 * Permet d'exécuter un scénario configuré via les variables d'environnement.
 * 
 * Usage:
 *   k6 run -e K6_ENV=local -e K6_TENANT=socofeb main.js
 */

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: GLOBAL_THRESHOLDS,
};

export function setup() {
  const tenantSlug = __ENV.K6_TENANT || 'socofeb';
  console.log(`[setup] Connexion au tenant: ${tenantSlug}`);
  const session = authenticate(tenantSlug);
  
  return {
    session,
    refs: { counterPartIds: [1, 2], salesSiteIds: [1], merchandiseIds: [1, 2] },
  };
}

export default function (data) {
  if (!data?.session?.token) {
    return;
  }

  // Distribution typique SaaS ERP:
  // 40% Documents | 20% Stock | 15% Catalogue Articles | 15% Analytics | 10% Profile/Auth
  const rand = Math.random();

  if (rand < 0.40) {
    runDocumentFlow(data.session, data.refs);
  } else if (rand < 0.60) {
    runStockFlow(data.session);
  } else if (rand < 0.75) {
    runArticleFlow(data.session, data.refs);
  } else if (rand < 0.90) {
    runAnalyticsFlow(data.session);
  } else {
    runAuthFlow(data.session);
  }
}
