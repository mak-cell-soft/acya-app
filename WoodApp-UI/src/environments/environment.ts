// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT environment
// ─────────────────────────────────────────────────────────────────────────────
// This file is active when running `ng serve` (development mode).
// It is replaced by environment.prod.ts during `ng build --configuration production`.
//
// WHY relative URLs:
//   The Angular dev-server proxy (proxy.conf.json) intercepts any request
//   to `/api/*` and forwards it to the local .NET backend (localhost:44306).
//   Using a full URL like http://51.210.10.108 would bypass the proxy entirely
//   and trigger a CORS / network error (status: 0, Unknown Error).
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: false,

  // NOTE: Empty base URL — requests are relative so the proxy handles routing to localhost.
  apiBaseUrl: '',

  // All HTTP calls like `this.http.get(environment.apiUrl + 'Enterprise/...')` will
  // be intercepted by the proxy and forwarded to https://localhost:44306/api/...
  apiUrl: '/api/'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
