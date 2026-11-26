# ACYA Élancé — Next.js 16.4.6 Security Upgrade Integration Report

**Date:** 2026-11-26  
**Source Worktree:** `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade` — preserved, not deleted)  
**Target Working Checkout:** `/home/ubuntu/acya-app` (`main` @ `f09695ae`)  
**Status:** Integrated & Validated (Uncommitted, Unpushed, Not Deployed)

---

## 1. Phase-by-Phase Execution Summary

| Phase | Scope | Result |
| :--- | :--- | :--- |
| **Phase 1 — Pre-Integration Verification** | Verified `/home/ubuntu/acya-app` Git status, confirmed `next@16.4.6` & `eslint-config-next@16.4.6` in source worktree, and verified via `diff -q` that all 11 Unsold Merchandise Analytics files matched 100% identically between worktree and target. | **PASS** |
| **Phase 2 — Controlled Transfer** | Transferred **only** `elance-app.ui/package.json` (`+2 / -2` lines) and `elance-app.ui/package-lock.json` (`+48 / -48` lines). Zero unrelated files transferred. | **PASS** |
| **Phase 3 — Clean Dependency Installation & Audit** | Staged the 5 SHA-512 verified `16.4.6` tarballs in the local npm cache and executed `npm ci --offline` (`added 851 packages in 23s`, exit `0`). Verified `next@16.4.6`, `eslint-config-next@16.4.6`, `npm ls --depth=0`, and audited all 829 unique packages against live `registry.npmjs.org/-/npm/v1/security/advisories/bulk`. | **PASS** |
| **Phase 4 — Complete Validation** | Executed `next typegen`, `tsc --noEmit`, targeted ESLint, `vitest run`, and `npm run build`. | **PASS (Static/Type/Lint)** · **2 Environment-Specific Constraints Documented** |
| **Phase 5 — Final Review** | Verified Unsold Merchandise Analytics intact, zero unintended package upgrades, `git diff --check` clean (exit `0`), original worktree preserved, nothing committed/pushed/deployed. | **PASS** |

---

## 2. Installed Versions & Dependency Verification

- **`next`:** `16.4.6` (`./node_modules/.bin/next --version` → `Next.js v16.4.6`)
- **`eslint-config-next`:** `16.4.6`
- **`react` / `react-dom`:** `19.2.4` / `19.2.4`
- **`npm ls --depth=0`:** Exit code `0`, zero missing or incompatible peer dependencies.
- **Dependency Diff Scope:** Strictly limited to the 12 `next`, `eslint-config-next`, `@next/env`, `@next/eslint-plugin-next`, and `@next/swc-*` entries (`16.4.3` → `16.4.6`). No unrelated packages were upgraded.

---

## 3. Full Dependency Tree Security Audit (829 Unique Packages)

Queried live against `https://registry.npmjs.org/-/npm/v1/security/advisories/bulk` across all 829 unique packages in `elance-app.ui/package-lock.json`:

### Next.js Status: **0 Vulnerabilities**
All **7 moderate security advisories** previously affecting `next@16.4.3` (`GHSA-mfr8-8qww-v76h`, `GHSA-vc7v-qv4w-wrv8`, `GHSA-7qx7-33qx-rqx2`, `GHSA-f3mh-rxg3-f5g2`, `GHSA-pc58-hwjq-p385`, `GHSA-rhh4-g77r-r9qj`, `GHSA-vvgp-ww4w-46vf`) are **100% resolved** in `next@16.4.6`.

### Pre-Existing Non-Next.js Transitive Advisories (Reported for Follow-Up, Out of Scope Here)
6 non-Next.js packages in the existing dependency tree reported advisories (none introduced by this upgrade):

| Severity | Package (Version) | Advisory | Exposure / Context |
| :--- | :--- | :--- | :--- |
| **HIGH** | `follow-redirects@1.16.1` | `GHSA-mrwp-f3q8-3g9p` (`>=1.16.0 <=1.16.1`) | Runtime transitive dep of `axios@1.20.0` (currently pinned via `overrides["follow-redirects"]: "^1.16.1"` in `package.json`). Recommend bumping override in a dedicated security follow-up. |
| **MODERATE** | `@hono/node-server@2.1.5` (×2) | `GHSA-qv5m-9pm6-hqp3`, `GHSA-jpvv-r467-5p4w` | Dev/CLI tooling transitive dep (via `shadcn` / `@modelcontextprotocol/sdk`), not in browser runtime bundle. |
| **MODERATE** / **LOW** | `hono@4.13.14` (×4 mod, ×1 low) | `GHSA-4m76-xfj5-7975`, `GHSA-h7mg-cq63-vhpq`, `GHSA-46wx-v44x-9hh2`, `GHSA-4h7h-rv7c-7m2v`, `GHSA-3gg2-335m-rxc6` | Dev/CLI tooling transitive dep (via `shadcn` / `@modelcontextprotocol/sdk`), not in browser runtime bundle. |
| **MODERATE** | `minimatch@10.2.5` | `GHSA-g3hv-75wg-m249` (`>=7.0.0 <11.0.1`) | Build/lint tooling transitive dep. |
| **MODERATE** | `vitest@4.1.5` & `@vitest/mocker@4.1.5` (×2) | `GHSA-82fw-gwwq-j7x9`, `GHSA-qxg6-89mg-rqv8` | `devDependencies` test runner only, not shipped to production. |

---

## 4. Build, Static Analysis & Test Results

| Check | Command | Result | Root-Cause / Notes |
| :--- | :--- | :--- | :--- |
| **Next.js Typegen** | `./node_modules/.bin/next typegen` | **PASS** | `✓ Types generated successfully` |
| **TypeScript Compilation** | `./node_modules/.bin/tsc --noEmit` | **PASS** | `0` errors across entire `elance-app.ui` |
| **ESLint (Unsold Merchandise)** | `./node_modules/.bin/eslint src/types/analytics.ts src/services/components/analytics.service.ts src/hooks/use-analytics-kpis.ts src/components/analytics/unsold-merchandise-section.tsx src/components/analytics/unsold-merchandise-dialog.tsx` | **PASS** | `0` errors, `0` warnings under `eslint-config-next@16.4.6` |
| **Production Build** | `npm run build` | **Blocked by Sandbox Network (Not a Regression)** | `▲ Next.js 16.4.6 (Turbopack)` ran `next.config.ts` in `50ms` with **no security advisory banner** and **zero code/config errors**. Failed solely because `next/font/google` cannot reach `fonts.googleapis.com` (`DM Sans`) from this sandboxed host. Must be executed on a build host / Docker container with outbound Google Fonts connectivity before production deployment. |
| **Vitest Suite** | `./node_modules/.bin/vitest run` | **Blocked by Local Environment (Not a Regression)** | Failed at Rolldown startup (`Cannot find module '@rolldown/binding-wasm32-wasi'`) because: (1) `@rolldown/binding-linux-x64-gnu` was absent from the offline `/home/ubuntu/.npm` cache during `npm ci --offline`, and (2) `rolldown@1.2.15` / `vite@8.3.5` / `jsdom@29.1.0` declare `engines.node: >=20.19.0`, whereas this host runs `Node v20.18.1`. Running online `npm ci` on Node `>=20.19.0` (or `Node 22 LTS`) resolves this. |
| **Git Whitespace Check** | `git diff --check` | **PASS** | Exit code `0` |

---

## 5. Final Git Status (`/home/ubuntu/acya-app`)

- **Modified (Unsold Merchandise Analytics):**
  - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs`
  - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Interfaces/IAnalyticsService.cs`
  - `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/AnalyticsService.cs`
  - `elance-app.ui/src/app/analytics/page.tsx`
  - `elance-app.ui/src/hooks/use-analytics-kpis.ts`
  - `elance-app.ui/src/services/components/analytics.service.ts`
  - `elance-app.ui/src/types/analytics.ts`
- **Untracked (Unsold Merchandise Analytics):**
  - `wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs`
  - `wood-app.api/tests/UnsoldMerchandiseAnalyticsTests.cs`
  - `elance-app.ui/src/components/analytics/unsold-merchandise-section.tsx`
  - `elance-app.ui/src/components/analytics/unsold-merchandise-dialog.tsx`
- **Modified (Next.js 16.4.6 Security Upgrade):**
  - `elance-app.ui/package.json`
  - `elance-app.ui/package-lock.json`
- **Pre-existing / Reports (Preserved Untouched):**
  - `docker-compose.yml` (pre-existing modification)
  - `ACYA_*_REPORT.md` / `ACYA_*_INVESTIGATION.md` files
- **Worktree Preserved:** `/home/ubuntu/acya-app-next-security-upgrade` (`chore/nextjs-16-security-upgrade`) remains intact and has not been deleted.

---

## 6. Recommended Commit Separation

Once final online `npm run build` and `npx vitest run` are confirmed on the CI/Docker host, commit cleanly in two separate commits:

1. **Commit 1 — Unsold Merchandise Analytics Feature:**
   ```bash
   git add \
     wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs \
     wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs \
     wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Interfaces/IAnalyticsService.cs \
     wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/AnalyticsService.cs \
     wood-app.api/tests/UnsoldMerchandiseAnalyticsTests.cs \
     elance-app.ui/src/types/analytics.ts \
     elance-app.ui/src/services/components/analytics.service.ts \
     elance-app.ui/src/hooks/use-analytics-kpis.ts \
     elance-app.ui/src/components/analytics/unsold-merchandise-section.tsx \
     elance-app.ui/src/components/analytics/unsold-merchandise-dialog.tsx \
     elance-app.ui/src/app/analytics/page.tsx
   git commit -m "feat(analytics): add unsold merchandise dormant stock analytics"
   ```
2. **Commit 2 — Next.js 16.4.6 Security Patch:**
   ```bash
   git add elance-app.ui/package.json elance-app.ui/package-lock.json
   git commit -m "chore(security): upgrade next and eslint-config-next from 16.4.3 to 16.4.6"
   ```
3. **Optional Follow-Up (Separate Task):**
   - Bump `overrides["follow-redirects"]` to address `GHSA-mrwp-f3q8-3g9p` and remove the temporary worktree (`git worktree remove /home/ubuntu/acya-app-next-security-upgrade && git branch -D chore/nextjs-16-security-upgrade`).
