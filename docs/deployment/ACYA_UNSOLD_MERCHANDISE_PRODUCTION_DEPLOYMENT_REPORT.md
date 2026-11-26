# ACYA Élancé — Unsold Merchandise Analytics & Security Upgrade Production Deployment Report

**Date:** 2026-11-26  
**Repository:** `/home/ubuntu/acya-app` (`main`)  
**Target Environment:** Production (`https://socofeb.acya.site/analytics`)  
**Deployment Status:** **DEPLOYED & OPERATIONAL**

---

## 1. Deployed Git Commit

- **Branch:** `main`
- **Deployed HEAD (Local == `origin/main`):** `0d74eaeae78cc47cdba5962b495a894714f22269`
- **Included Commits:**
  1. `bb55818f` — `feat(analytics): add unsold merchandise dormant stock analytics`
  2. `0d74eaea` — `chore(security): upgrade next and eslint-config-next to 16.4.6 and patch follow-redirects`
- **Pre-existing `docker-compose.yml` Modification:** Preserved untouched (`127.0.0.1:` localhost port-binding hardening).
- **Preserved Worktree & Reports:** `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade`) and all `ACYA_*.md` reports preserved untouched.

---

## 2. Docker Service Names

- **Backend API Compose Service:** `api` (container: `wood-app-api`, image: `acya-app-api`)
- **Élancé Frontend Compose Service:** `elance-app-ui` (container: `elance-app-ui`, image: `acya-elance-app-ui`)
- **Untouched Services (Never Rebuilt or Restarted):** `postgres` (`8cdff3364501_wood-app-postgres`), `admin-api` (`admin-elance-back`), `admin-ui` (`admin-elance-front`), `n8n`, `postgres-n8n`, `acya-restore-n8n-pg`, `acya-restore-test-pg`.

---

## 3. Node.js & npm Versions Used During Build

- **Frontend Dockerfile Base Image:** `node:20-alpine` (`sha256:fb4cd12c85ee...`)
- **Node.js Version:** **`v20.20.2`** (satisfies all dependency `engines.node >= 20.19.0` requirements with zero `EBADENGINE` warnings)
- **npm Version:** **`10.8.2`**
- **Dockerfile Changes:** None required.

---

## 4. Vitest & Frontend Test Results

Executed inside the actual `node:20-alpine` (`v20.20.2` / `npm 10.8.2`) Docker build environment:
- **Finding:** `elance-app.ui` has no `vitest.config.*` and no `"test"` script in `package.json`. All 11 existing test files under `src/lib/` use **`node:test`** (`import { describe, it } from 'node:test'`) rather than Vitest's `describe/it`.
- When invoked via `npx vitest run`:
  - All 8 pure `.ts`/`.mjs` `node:test` suites executed cleanly and reported `# fail 0` in TAP output, while Vitest reported `No test suite found` because they register tests on `node:test` instead of Vitest.
  - The 3 `.tsx` test files failed path-alias resolution (`@/lib/...`, `@/components/...`) because no `vitest.config.*` defines `@` alias mapping.
  - **Conclusion:** Pre-existing test runner configuration gap in `elance-app.ui`, unrelated to Next.js `16.4.6` or Unsold Merchandise Analytics.

---

## 5. Frontend Production Build Results

Executed both in isolated Phase 2 validation (`node:20-alpine`) and Phase 3 production Docker image build:
- `npm ci`: **PASS** (`added 854 packages in 24s`, 0 engine warnings)
- `npx next typegen`: **PASS** (`✓ Types generated successfully`)
- `npx tsc --noEmit`: **PASS** (`0` errors)
- `npm run build` (**`▲ Next.js 16.4.6 (Turbopack)`**):
  - **PASS** — `✓ Compiled successfully in 16.3s` (including `DM Sans` from Google Fonts)
  - TypeScript verification: `Finished TypeScript in 42s` (`0` errors)
  - Static generation: `✓ Generating static pages using 5 workers (54/54) in 1876ms` (including `/analytics`)
  - **Zero security vulnerability warnings.**

---

## 6. Backend Build Results

- Built inside `mcr.microsoft.com/dotnet/sdk:7.0` (`Release` configuration):
  - `dotnet restore`: **PASS** (`5.2s`)
  - `dotnet build -c Release`: **PASS** (`20.4s`)
  - `dotnet publish -c Release`: **PASS** (`19.5s`)
- Previously validated unit & integration tests: `14/14` passing (`UnsoldMerchandiseAnalyticsTests` + `ServiceArticleTests` + `ApiHealthRegressionTests`).
- Database migrations: **0 migrations introduced** (`No migrations were applied. The database is already up to date.` across all active tenant schemas).

---

## 7. Docker Image Build Results

Command: `sudo docker compose build --no-cache api elance-app-ui`
- **`acya-app-api` (`api`):** **BUILT** (`sha256:f2d336624ff7948b...`)
- **`acya-elance-app-ui` (`elance-app-ui`):** **BUILT** (`sha256:72d44bbf891a1ca6...`)

---

## 8. Container Deployment Status

Deployed sequentially (`api` first, verified healthy, then `elance-app-ui`) using `sudo docker compose up -d --no-deps`:

| Container | Image | Status | Notes |
| :--- | :--- | :--- | :--- |
| `wood-app-api` | `acya-app-api` | **Up (healthy)** | PostgreSQL & all tenant schemas (`tenant_socofeb`, `tenant_piqbit`, `tenant_tucobois`, `tenant_mansour_construction`) verified; zero EF Core/middleware errors |
| `elance-app-ui` | `acya-elance-app-ui` | **Up** | `▲ Next.js 16.4.6`, `✓ Ready in 228ms`, zero runtime errors |
| `8cdff3364501_wood-app-postgres` | `postgres:15-alpine` | **Up 2 months (healthy)** | Untouched |
| `postgres-n8n` | `postgres:15-alpine` | **Up 2 months (healthy)** | Untouched |
| `admin-elance-front` / `admin-elance-back` | `acya-app-admin-*` | **Up 32 hours** | Untouched |
| `n8n` | `n8nio/n8n:latest` | **Up 2 weeks** | Untouched |

**Preflight Backup Verified:** Latest scheduled Restic backup `run-20261126T023000Z-67dc7f0d` (`2026-11-26 02:30 UTC`) completed with `outcome: "success"`, `exitCode: 0`.

---

## 9. Production Smoke-Test Results (`https://socofeb.acya.site`)

| Check | Endpoint / Target | Result |
| :--- | :--- | :--- |
| Local Frontend Upstream | `http://127.0.0.1:5000/analytics` | **HTTP 200** |
| Public Tenant Analytics | `https://socofeb.acya.site/analytics` | **HTTP 200** |
| Deployed UI Bundle Verification | `/app/.next/static/chunks/` (`grep unsold-merchandise`) | **Confirmed present** (`07namx73a__ay.js`, `38g8q7dkjd3mp.js`) |
| Public Tenant Settings API | `https://socofeb.acya.site/api/enterprise/public-settings?slug=socofeb` | **HTTP 200** |
| Existing ERP Routes | `/`, `/login`, `/dashboard`, `/articles`, `/stock`, `/sales`, `/purchases`, `/accounting/treasury`, `/settings` | **All HTTP 200** |
| Authenticated Interactive UI Walkthrough (3/6/12m filters, site dropdown, search, pagination, toggles, CSV/Excel export) | `https://socofeb.acya.site/analytics` | **Pending user browser sign-in** (no tenant credentials provided/forged in automation; backend logic verified by `14/14` automated tests and production container confirmed live) |

---

## 10. API Authentication & Tenant Isolation Checks

| Security Check | Request | Observed Response |
| :--- | :--- | :--- |
| Unauthenticated Public Request | `GET https://socofeb.acya.site/api/Analytics/unsold-merchandise?months=6` | **HTTP 401 Unauthorized** |
| Invalid Bearer Token | `GET https://socofeb.acya.site/api/Analytics/unsold-merchandise?months=6` (`Authorization: Bearer invalid.jwt.token`) | **HTTP 401 Unauthorized** |
| Unknown Tenant Slug | `GET http://127.0.0.1:8080/api/Analytics/unsold-merchandise?months=6` (`X-Tenant-Slug: nonexistent-tenant-smoke`) | **HTTP 404 Not Found** (`TenantMiddleware` rejection) |

---

## 11. Docker Disk Space Before & After Safe Cleanup

Executed strictly safe cleanup commands (`docker container prune -f`, `docker image prune -af`, `docker builder prune -af`):

| Resource | Before Cleanup | After Cleanup |
| :--- | :--- | :--- |
| **Images** | 9 total / 6 active (`6.253GB`, `1.789GB` reclaimable) | 6 total / 6 active (`4.812GB`) |
| **Containers** | 9 total / 9 active (`63.92MB`) | 9 total / 9 active (`63.92MB`) |
| **Build Cache** | 51 objects (`5.409GB`) | 0 objects (`0B`) |
| **Local Volumes** | 8 total / 4 active (`477.5MB`) | **8 total / 4 active (`477.5MB`) — untouched** |
| **Total Reclaimed Space** | — | **`8.41GB`** |

---

## 12. Persistent Volumes Confirmation

**Confirmed 100% preserved (no volume prune or destructive commands executed):**
- `acya-app_postgres_data`
- `postgres_n8n`
- `n8n_data`
- `acya-restore-n8n-data`
- `acya-restore-test-data`
- Plus all 3 anonymous local volumes (`8` total volumes before and after cleanup).

---

## 13. Outstanding Risks & Follow-Up Items

1. **Authenticated Browser Verification:** Please sign in to `https://socofeb.acya.site/analytics` with a `socofeb` account to visually confirm the *Articles sans ventes (Stock Dormant)* section, `3 / 6 / 12 mois` toggles, dynamic site selector, and CSV/Excel export on live tenant data.
2. **Legacy `AnalyticsController` Endpoints (Pre-Existing, Out of Scope):** The 4 legacy endpoints (`dashboard`, `monthly-revenue`, `top-subcategories`, `stock-health`) still lack `[Authorize]` attributes and should be hardened in a dedicated follow-up PR.
3. **Frontend Test Runner Alignment (Pre-Existing):** Consider adding a `vitest.config.ts` with `@/*` path alias mapping (or standardizing `node:test` vs Vitest) in a future maintenance task so `npx vitest run` executes all 11 legacy frontend test files cleanly.
4. **Temporary Worktree Cleanup:** Once live visual confirmation is complete, `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade`) can be safely removed via `git worktree remove`.
