# ACYA Élancé — Final Frontend Security Hardening & Validation Report

**Date:** 2026-11-26  
**Working Directory:** `/home/ubuntu/acya-app` (`main` @ `f09695ae`)  
**Preserved Worktree:** `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade` — untouched)  
**Scope:** `follow-redirects` HIGH-severity remediation (`GHSA-mrwp-f3q8-3g9p`), full dependency security audit, frontend validation, `AnalyticsController.cs` authorization review, and final integrity verification.

---

## 1. Exact Dependency Versions (Before vs. After)

Only **3 lines** changed in `elance-app.ui/package.json` (`+3 / -3`) and **13 package entries** updated in `elance-app.ui/package-lock.json` (`+54 / -51` lines). Zero unrelated packages were upgraded.

| Package | Before | After | Scope |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.3` | **`16.4.6`** | Production dependency (`dependencies`) |
| `eslint-config-next` | `16.4.3` | **`16.4.6`** | Development dependency (`devDependencies`) |
| `@next/env`, `@next/eslint-plugin-next`, `@next/swc-*` (8 platforms) | `16.4.3` | **`16.4.6`** | Matched Next.js `16.4.6` transitive/optional packages |
| `overrides["follow-redirects"]` | `^1.16.1` (installed `1.16.1`) | **`^1.16.3` (installed `1.16.3`)** | Production transitive override under `axios@1.20.0` |

### `follow-redirects` Verification
- `npm ls follow-redirects --all`:
  ```text
  next-boilerplate@0.1.0 /home/ubuntu/acya-app/elance-app.ui
  └─┬ axios@1.20.0
    └── follow-redirects@1.16.3 overridden
  ```
- **No vulnerable copies remain** anywhere in the dependency tree.
- **Axios compatibility:** Verified `require("axios")` loads cleanly (`typeof axios.create === "function"`) with `follow-redirects@1.16.3` (satisfies `axios@1.20.0` semver range `^1.15.6`).
- **Tarball Integrity:** `follow-redirects-1.16.3.tgz` verified against official registry SHA-512 digest (`sha512-toOSoqN6d51Wjf1aOFJYcoVv1aND9rj/CwjLU0Vz40oDuSpWDayCeKe4JpL5NL0WdFvoOOCI3BRo69HahjbR1A==`).

---

## 2. Complete Security Audit Findings (829 Unique Packages)

Executed live against `https://registry.npmjs.org/-/npm/v1/security/advisories/bulk` across all **829 unique packages** in `elance-app.ui/package-lock.json` (after clean `npm ci --offline`, `added 851 packages in 23s`, exit `0`).

### Summary by Severity & Runtime Exposure
| Severity | Production Runtime Count | Dev / CLI / Test Tooling Count | Total |
| :--- | :-: | :-: | :-: |
| **CRITICAL** | **0** | **0** | **0** |
| **HIGH** | **0** *(was 1: `follow-redirects@1.16.1`)* | **0** | **0** |
| **MODERATE** | **0** *(was 7: `next@16.4.3`)* | **10** (across 5 dev/tooling packages) | **10** |
| **LOW** | **0** | **1** (`hono@4.13.14`) | **1** |

### Resolved Vulnerabilities
- **Next.js (`16.4.3` → `16.4.6`):** All **7 moderate** advisories resolved (`GHSA-mfr8-8qww-v76h`, `GHSA-vc7v-qv4w-wrv8`, `GHSA-7qx7-33qx-rqx2`, `GHSA-f3mh-rxg3-f5g2`, `GHSA-pc58-hwjq-p385`, `GHSA-rhh4-g77r-r9qj`, `GHSA-vvgp-ww4w-46vf`).
- **`follow-redirects` (`1.16.1` → `1.16.3`):** **1 HIGH** advisory resolved (`GHSA-mrwp-f3q8-3g9p` — cross-realm `sensitiveHeaders` / credentials on redirect).

### Remaining Advisories (All Dev / Build / CLI Tooling — Zero Production Runtime Exposure)
| Package (Version) | Severity | Advisory | Classification & Source |
| :--- | :--- | :--- | :--- |
| `@hono/node-server@2.1.5` | MODERATE (×2) | `GHSA-qv5m-9pm6-hqp3`, `GHSA-jpvv-r467-5p4w` | **Dev/CLI only** — transitive via `shadcn` / `@modelcontextprotocol/sdk` |
| `hono@4.13.14` | MODERATE (×4), LOW (×1) | `GHSA-4m76-xfj5-7975`, `GHSA-h7mg-cq63-vhpq`, `GHSA-46wx-v44x-9hh2`, `GHSA-4h7h-rv7c-7m2v`, `GHSA-3gg2-335m-rxc6` | **Dev/CLI only** — transitive via `shadcn` / `@modelcontextprotocol/sdk` |
| `minimatch@10.2.5` | MODERATE (×1) | `GHSA-g3hv-75wg-m249` | **Build/lint tooling only** |
| `vitest@4.1.5` & `@vitest/mocker@4.1.5` | MODERATE (×2) | `GHSA-82fw-gwwq-j7x9`, `GHSA-qxg6-89mg-rqv8` | **Dev test runner only** (`devDependencies`, not bundled into production) |

*(Note: `npm audit` CLI itself stalls on this sandbox's HTTP proxy; querying the official npm bulk advisory endpoint directly via Node 20 `fetch` provided the exact same advisory dataset without suppressing any finding.)*

---

## 3. Build, Test, Lint & TypeScript Results

**Host Runtime Environment:** `Node v20.18.1` (Node 22 LTS is not installed on this sandboxed host; outbound connectivity to `fonts.googleapis.com` is blocked by the sandbox).

| Check | Command | Actual Result | Detailed Findings |
| :--- | :--- | :--- | :--- |
| **Clean Install** | `npm ci --offline --no-audit --no-fund` | **PASS** | `added 851 packages in 23s`; emitted `EBADENGINE` warnings for `rolldown@1.2.15`, `vite@8.3.5`, `jsdom@29.1.0` (`required: >=20.19.0`, `current: v20.18.1`) |
| **Dependency Tree** | `npm ls --depth=0` & `npm ls follow-redirects --all` | **PASS** | Exit `0`; `next@16.4.6`, `eslint-config-next@16.4.6`, `follow-redirects@1.16.3 overridden` |
| **Next.js Typegen** | `./node_modules/.bin/next typegen` | **PASS** | `✓ Types generated successfully` |
| **TypeScript Check** | `./node_modules/.bin/tsc --noEmit` | **PASS** | `0` errors across entire `elance-app.ui` |
| **ESLint (Unsold Merchandise)** | `./node_modules/.bin/eslint src/types/analytics.ts src/services/components/analytics.service.ts src/hooks/use-analytics-kpis.ts src/components/analytics/unsold-merchandise-section.tsx src/components/analytics/unsold-merchandise-dialog.tsx` | **PASS** | `0` errors, `0` warnings under `eslint-config-next@16.4.6` |
| **ESLint (Full Repo)** | `npm run lint` | **FAIL (Pre-existing Legacy Debt)** | `1,729` pre-existing repo-wide problems (`1,206 errors, 523 warnings`, primarily `@typescript-eslint/no-explicit-any` in unrelated legacy files). Zero issues in our new/modified files. |
| **Vitest Suite** | `./node_modules/.bin/vitest run` | **BLOCKED (Environment)** | Startup error: `Cannot find native binding` (`@rolldown/binding-wasm32-wasi`). Cause: host runs `Node v20.18.1` (below `rolldown@1.2.15`'s `>=20.19.0` engine requirement) and `npm ci --offline` skipped optional `@rolldown/binding-linux-x64-gnu`. **Must be executed on Node 22 LTS with online `npm ci`.** |
| **Production Build** | `npm run build` | **BLOCKED (Environment)** | `▲ Next.js 16.4.6 (Turbopack)` ran `next.config.ts` cleanly in `50ms` with **no security vulnerability warning** and zero code/config errors; failed solely because `next/font/google` could not connect to `fonts.googleapis.com` for `DM Sans` in this offline sandbox. **Must be executed in an environment with outbound Google Fonts connectivity (e.g., Docker build host / CI).** |

---

## 4. Analytics Authorization & Security Review (`AnalyticsController.cs`)

Inspected `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs` (L1–161). **No legacy endpoints were modified.**

| Endpoint | Route | `[Authorize]` | Tenant Isolation | Input Validation | Error Handling | Risk Level |
| :--- | :--- | :-: | :--- | :--- | :--- | :---: |
| `GetDashboardKpis` | `GET /api/Analytics/dashboard` | **MISSING** | Schema-scoped via `TenantMiddleware`, but **no JWT `tenant_slug` cross-check** when unauthenticated | `month`/`year` unbounded; `enterpriseId` unused | Leaks raw `ex.Message` in `400 BadRequest`; no `ILogger` | **HIGH** |
| `GetMonthlyRevenue` | `GET /api/Analytics/monthly-revenue` | **MISSING** | Same as above | `months` unbounded (DoS risk with large values) | Leaks raw `ex.Message`; no `ILogger` | **HIGH** |
| `GetTopSubCategories` | `GET /api/Analytics/top-subcategories` | **MISSING** | Same as above | `months` unbounded; loads all matching lines into memory | Leaks raw `ex.Message`; no `ILogger` | **HIGH** |
| `GetStockHealth` | `GET /api/Analytics/stock-health` | **MISSING** | Same as above | `siteId` not validated against `tbl_sales_sites` | Leaks raw `ex.Message`; no `ILogger` | **HIGH** |
| `GetUnsoldMerchandise` *(New)* | `GET /api/Analytics/unsold-merchandise` | **PRESENT** (L109) | Full JWT + `TenantMiddleware` + `WoodAppContext` + `siteId` tenant check | Strict allow-lists & bounds on all 14 parameters | Logs via `_logger.LogError`, returns generic French `500` message | **LOW (Hardened)** |

### Proposed Separate Remediation (Follow-Up PR)
Because `elance-app.ui/src/lib/axios.ts` already attaches the Bearer JWT on every request, adding `[Authorize]` at the class level on `AnalyticsController` should be safe for the web ERP, but should be executed in a **dedicated PR** after verifying whether any external/mobile/monitoring callers hit those 4 legacy routes without a JWT:
1. Add `[Authorize]` on `AnalyticsController` class.
2. Bound `months` (`1..36`) on `monthly-revenue` and `top-subcategories`, and validate `siteId` against `tbl_sales_sites` on `stock-health`.
3. Replace raw `ex.Message` responses with `_logger.LogError(...)` + generic `500` responses.

---

## 5. Final Git Status & Changed-File Inventory

- **`git diff --check`:** **PASS** (exit `0`).
- **Database Migrations (`wood-app.api/db/`):** **0 files modified or added.**
- **Docker Configuration (`docker-compose.yml`):** Untouched by any task in this session (pre-existing modification preserved).
- **Preserved Worktree:** `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade`) remains intact.
- **Git Policy:** No commits, no pushes, no deployments performed.

### Changed / Created Files for This Release
1. **Unsold Merchandise Analytics (11 files — all intact):**
   - `wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs` *(new)*
   - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs` *(modified)*
   - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Interfaces/IAnalyticsService.cs` *(modified)*
   - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/AnalyticsService.cs` *(modified)*
   - `wood-app.api/tests/UnsoldMerchandiseAnalyticsTests.cs` *(new)*
   - `elance-app.ui/src/types/analytics.ts` *(modified)*
   - `elance-app.ui/src/services/components/analytics.service.ts` *(modified)*
   - `elance-app.ui/src/hooks/use-analytics-kpis.ts` *(modified)*
   - `elance-app.ui/src/components/analytics/unsold-merchandise-section.tsx` *(new)*
   - `elance-app.ui/src/components/analytics/unsold-merchandise-dialog.tsx` *(new)*
   - `elance-app.ui/src/app/analytics/page.tsx` *(modified)*
2. **Frontend Security Hardening (2 files):**
   - `elance-app.ui/package.json` *(modified: `next@16.4.6`, `eslint-config-next@16.4.6`, `overrides["follow-redirects"]: "^1.16.3"`)*
   - `elance-app.ui/package-lock.json` *(modified: exact SHA-512 locked entries for `next@16.4.6` suite + `follow-redirects@1.16.3`)*
3. **Documentation Reports (untracked):**
   - `ACYA_UNSOLD_MERCHANDISE_ANALYTICS_INVESTIGATION.md`
   - `ACYA_UNSOLD_MERCHANDISE_ANALYTICS_IMPLEMENTATION_REPORT.md`
   - `ACYA_NEXTJS_SECURITY_UPGRADE_INTEGRATION_REPORT.md`
   - `ACYA_FINAL_FRONTEND_SECURITY_AND_VALIDATION_REPORT.md`

---

## 6. Remaining Risks

1. **Unverified Full `next build` & `vitest run` on Node 22 LTS:** Neither `npm run build` (blocked by offline `fonts.googleapis.com`) nor `npx vitest run` (blocked by host `Node v20.18.1` + offline `@rolldown` native binding) could complete to green on this sandboxed host.
2. **Pre-existing Unauthenticated Legacy Analytics Endpoints (HIGH):** The 4 legacy endpoints in `AnalyticsController.cs` remain unprotected by `[Authorize]` until the recommended follow-up PR is applied.
3. **Dev/Tooling Moderate Advisories:** `vitest@4.1.5`, `hono@4.13.14`, `@hono/node-server@2.1.5`, and `minimatch@10.2.5` carry moderate dev/CLI advisories (zero browser/production runtime impact; can be upgraded in a future dev-tooling maintenance pass).

---

## 7. Explicit Final Recommendation

- **For Git Commit (Clean Feature + Security Patch Commits):** **READY**  
  *(All backend tests `14/14` pass, TypeScript `0` errors, `next typegen` pass, targeted ESLint `0` errors/warnings, `git diff --check` pass, and **0 CRITICAL / 0 HIGH** vulnerabilities across all 829 packages.)*
- **For Production Deployment:** **NOT READY** until the following single verification gate passes on a **Node 22 LTS** / Docker build host with outbound `registry.npmjs.org` and `fonts.googleapis.com` connectivity:
  1. `cd elance-app.ui && npm ci`
  2. `npx vitest run` → **all tests pass**
  3. `npm run build` → **production build completes with 0 errors**

Once that gate passes on the build host, the release is ready for targeted Docker deployment (`sudo docker compose build --no-cache api elance-app-ui && sudo docker compose up -d --no-deps api elance-app-ui`).
