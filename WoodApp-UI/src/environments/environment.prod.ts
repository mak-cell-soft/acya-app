// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION environment
// ─────────────────────────────────────────────────────────────────────────────
// Active when running `ng build --configuration production`.
// Replaces environment.ts at build time (see angular.json fileReplacements).
//
// WHY relative URLs in production:
//   In production, the Angular dist is served by the .NET API itself (reverse proxy / same host).
//   Relative paths like `/api/` resolve correctly against the server's own origin.
//   No CORS issues, no hardcoded IPs.
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: true,

  // NOTE: Empty base URL — production server serves the app on the same origin as the API.
  apiBaseUrl: '',

  apiUrl: '/api/'
};