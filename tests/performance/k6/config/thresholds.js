/**
 * ACYA SaaS — k6 SLO Thresholds
 * 
 * Ces seuils définissent les objectifs de niveau de service (SLO).
 * k6 retourne exit code 99 si l'un d'eux est dépassé → CI fail automatique.
 */

/**
 * Seuils globaux — appliqués à tous les scénarios
 */
export const GLOBAL_THRESHOLDS = {
  // Taux d'erreur HTTP global < 1%
  http_req_failed: ['rate<0.01'],

  // P95 global < 800ms (toutes routes confondues)
  http_req_duration: ['p(95)<800', 'p(99)<1500'],

  // Checks (assertions métier) > 95% de succès
  checks: ['rate>0.95'],
};

/**
 * Seuils par groupe de routes (utiliser avec group() dans les flows)
 * 
 * Nomenclature : http_req_duration{group:::NomDuGroupe}
 */
export const GROUP_THRESHOLDS = {
  // Authentification — critique, doit être rapide
  'http_req_duration{group:::auth}': ['p(95)<300', 'p(99)<500'],

  // Documents lecture (GET) — charge lourde (jointures profondes)
  'http_req_duration{group:::documents_read}': ['p(95)<600', 'p(99)<1000'],

  // Documents écriture (POST/PUT) — transactions DB
  'http_req_duration{group:::documents_write}': ['p(95)<900', 'p(99)<1500'],

  // Stock — lecture fréquente
  'http_req_duration{group:::stock}': ['p(95)<400', 'p(99)<700'],

  // Articles / Catalogue
  'http_req_duration{group:::articles}': ['p(95)<400', 'p(99)<700'],

  // Analytics / Dashboard — agrégations lourdes, seuil plus large
  'http_req_duration{group:::analytics}': ['p(95)<1200', 'p(99)<2000'],

  // Paiements — sécurité critique
  'http_req_duration{group:::payments}': ['p(95)<500', 'p(99)<800'],
};

/**
 * Seuils par scénario — à fusionner dans chaque script
 */
export const SCENARIO_THRESHOLDS = {
  smoke:  { ...GLOBAL_THRESHOLDS },
  load:   { ...GLOBAL_THRESHOLDS, ...GROUP_THRESHOLDS },
  stress: {
    // En stress, on relâche légèrement P99 mais P95 doit tenir
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200', 'p(99)<2500'],
    checks: ['rate>0.90'],
  },
  spike: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.85'],
  },
  soak: {
    // En soak (2h), on surveille la dérive de performance
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    checks: ['rate>0.95'],
  },
};
