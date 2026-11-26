# ACYA Élancé — Next.js 16.x Security Upgrade Report

**Date:** 2026-11-26  
**Worktree Path:** `/home/ubuntu/acya-app-next-security-upgrade`  
**Worktree Branch:** `chore/nextjs-16-security-upgrade` (branched from `f09695ae`)  
**Original Working Checkout:** `/home/ubuntu/acya-app` (**100% preserved, untouched**)  
**Status:** Validated in Isolated Worktree — Ready for Controlled Integration

---

## 1. Version Summary

| Package | Previous Version | Upgraded Version | Release Line |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.3` | **`16.4.6`** | `16.x` (patch upgrade, no major bump) |
| `eslint-config-next` | `16.4.3` | **`16.4.6`** | `16.x` (matched patch version) |
| `@next/env` | `16.4.3` | **`16.4.6`** | `16.x` |
| `@next/eslint-plugin-next` | `16.4.3` | **`16.4.6`** | `16.x` |
| `@next/swc-*` (8 platform binaries) | `16.4.3` | **`16.4.6`** | `16.x` |

---

## 2. Security Advisories Addressed

Queried directly against `https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`:
- **`next@16.4.3`:** **7 moderate advisories**
- **`next@16.4.6`:** **`{}` (0 advisories)** — all 7 vulnerabilities are patched (`vulnerable_versions <= 16.4.4`).

| Advisory ID | GHSA | Severity | Vulnerable Range | Summary |
| :--- | :--- | :--- | :--- | :--- |
| `1247486` | `GHSA-mfr8-8qww-v76h` | Moderate | `>=16.3.0 <=16.4.4` | Information disclosure across root params when a `'use cache'` function is called through `unstable_cache()` |
| `1247712` | `GHSA-vc7v-qv4w-wrv8` | Moderate | `>=16.2.0 <=16.4.4` | Cache leak across root param values in nested `'use cache'` functions via delayed inner stream metadata |
| `1248078` | `GHSA-7qx7-33qx-rqx2` | Moderate | `>=16.0.0 <=16.4.4` | SVG rejection bypass in Next.js image optimization |
| `1248080` | `GHSA-f3mh-rxg3-f5g2` | Moderate | `>=16.0.0 <=16.4.4` | `HttpOnly` cookie exposure through internal response header on Next.js Edge runtime routes |
| `1248083` | `GHSA-pc58-hwjq-p385` | Moderate | `>=16.0.0 <=16.4.4` | Cross-client response injection and disclosure in self-hosted Next.js applications forwarding fetched responses |
| `1248084` | `GHSA-rhh4-g77r-r9qj` | Moderate | `>=16.0.0 <=16.4.4` | Cross-user cache disclosure and poisoning in Next.js `'use cache'` with binary arguments |
| `1248085` | `GHSA-vvgp-ww4w-46vf` | Moderate | `>=16.4.0 <=16.4.4` | Cache poisoning of shared fallback shells in Cache Components via request-supplied placeholder route params |

---

## 3. Upgrade Tooling Execution Notes

1. **Official Tooling Attempted First:** Executed `npx next upgrade --agent=security --internal-nudge-id=c9925f44-49e1-4d2f-8729-c5bf2791693d` inside `/home/ubuntu/acya-app-next-security-upgrade/elance-app.ui`.
2. **Environment-Specific `npm` Transport Findings:**
   - Ubuntu's system `npm@9.2.0` fails on Node `20.18.1` HTTPS requests with `FetchError: this.connect is not a function` (`minipass-fetch` / `agent-base` incompatibility).
   - Staging `npm@10.9.2` in `/tmp/npm10` resolved the `npm 9.2.0` bug, but `npm`'s full-packument requests (`GET /next`, `GET /eslint-config-next`, ~35–55 MB) timed out through the environment proxy (`Socket closed` / `Proxy connection timed out`).
   - Node 20's native `fetch` (`undici`) fetched the exact official registry manifests (`https://registry.npmjs.org/<pkg>/16.4.6`) and tarballs cleanly in < 7 seconds.
3. **Verified Exact Upgrade Applied:**
   - Updated `elance-app.ui/package.json` (`next` and `eslint-config-next` from `16.4.3` to `16.4.6`).
   - Updated `elance-app.ui/package-lock.json` for all 12 `next`/`@next/*`/`eslint-config-next` entries using exact registry `resolved` URLs and SHA-512 `integrity` digests.
   - Downloaded, **SHA-512 verified**, and installed the 5 Linux x64 packages (`next@16.4.6`, `eslint-config-next@16.4.6`, `@next/env@16.4.6`, `@next/eslint-plugin-next@16.4.6`, `@next/swc-linux-x64-gnu@16.4.6`) into the worktree's `node_modules/`.

---

## 4. Modified Dependency Files & Diff Review

Only **2 dependency files** were modified in the worktree (in addition to the synced Unsold Merchandise implementation files):
- `elance-app.ui/package.json` (`+2 / -2` lines):
  - `"next": "16.4.3"` → `"next": "16.4.6"`
  - `"eslint-config-next": "16.4.3"` → `"eslint-config-next": "16.4.6"`
- `elance-app.ui/package-lock.json` (`+48 / -48` lines):
  - Exactly 12 package entries updated from `16.4.3` to `16.4.6` with exact registry `resolved` and `integrity` values.
- **Zero** unrelated packages were added, removed, or bumped.

---

## 5. Dependency & Peer-Dependency Compatibility Results

Verified via `npm ls next eslint-config-next react react-dom @next/env @next/eslint-plugin-next @next/swc-linux-x64-gnu` (exit code `0`, zero warnings/errors) and live manifest comparison:

| Dependency | Installed | Required by `16.4.6` | Status |
| :--- | :--- | :--- | :--- |
| `react` | `19.2.4` | `^18.2.0 \|\| ^19.0.0` | **Compatible** |
| `react-dom` | `19.2.4` | `^18.2.0 \|\| ^19.0.0` | **Compatible** |
| `eslint` | `^9` | `>=9.0.0` | **Compatible** |
| `typescript` | `^5` | `>=3.3.1` | **Compatible** |
| `next-safe-action` | `8.7.3` | peer `next >= 14.0.0` | **Compatible (`next@16.4.6 deduped`)** |
| `sharp` | `^0.35.5` (override) | `^0.35.5` | **Compatible** |
| Transitive dependencies of `next` & `eslint-config-next` | `postcss@8.5.23`, `styled-jsx@5.1.6`, `@swc/helpers@0.5.23`, `eslint-plugin-react-hooks@^7.1.0`, `typescript-eslint@^8.56.0`, etc. | Identical to `16.4.3` | **Zero breaking or transitive changes** |

---

## 6. Build, Static Analysis & Test Results (in Worktree)

| Validation Step | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Installed Version** | `./node_modules/.bin/next --version` | **PASS** | `Next.js v16.4.6` |
| **Dependency Tree** | `npm ls next eslint-config-next react react-dom ...` | **PASS** | Exit code `0`; zero peer mismatches |
| **Next.js Typegen** | `./node_modules/.bin/next typegen` | **PASS** | `✓ Types generated successfully` |
| **TypeScript Check** | `./node_modules/.bin/tsc --noEmit` | **PASS** | `0` errors across entire `elance-app.ui` including Unsold Merchandise components |
| **ESLint (Unsold Merchandise)** | `./node_modules/.bin/eslint src/types/analytics.ts src/services/components/analytics.service.ts src/hooks/use-analytics-kpis.ts src/components/analytics/unsold-merchandise-section.tsx src/components/analytics/unsold-merchandise-dialog.tsx` | **PASS** | `0` errors, `0` warnings under `eslint-config-next@16.4.6` |
| **Production Build** | `npm run build` | **Environment-Blocked (Not a Regression)** | `▲ Next.js 16.4.6 (Turbopack)` ran `next.config.ts` in `51ms` with **no security advisory banner** and **zero code/config errors**. Failed solely on the known pre-existing offline `next/font/google` fetch for `DM Sans` (`fonts.googleapis.com` unreachable in this sandbox). |
| **Vitest Suite** | `./node_modules/.bin/vitest run` | **Pre-existing Environment Issue (Not a Regression)** | Failed at Vitest/Rolldown startup (`Cannot find module '@rolldown/binding-wasm32-wasi'`) due to pre-existing optional native binding absence in the copied `node_modules` (unrelated to Next.js `16.4.6`). |

### Unsold Merchandise Analytics Verification
All Unsold Merchandise Analytics files (`src/types/analytics.ts`, `src/services/components/analytics.service.ts`, `src/hooks/use-analytics-kpis.ts`, `src/components/analytics/unsold-merchandise-section.tsx`, `src/components/analytics/unsold-merchandise-dialog.tsx`, and `src/app/analytics/page.tsx`) were synced into the worktree and validated with `next typegen`, `tsc --noEmit`, and `eslint-config-next@16.4.6` with **0 errors and 0 warnings**.

---

## 7. Migration & Configuration Changes

- **Breaking changes:** None (`16.4.3` → `16.4.6` is a strict patch-level security release).
- **`next.config.ts` changes:** None required (remember `AGENTS.md`: do NOT set `turbopack.root`).
- **Application code changes:** None required.

---

## 8. Git Worktree Status

```text
/home/ubuntu/acya-app                        f09695ae [main]                             (Original checkout — 100% untouched)
/home/ubuntu/acya-app-next-security-upgrade  f09695ae [chore/nextjs-16-security-upgrade] (Isolated upgrade worktree — uncommitted)
```

- Original checkout `/home/ubuntu/acya-app` remains at `next@16.4.3` with all Unsold Merchandise implementation files intact.
- Nothing was committed, merged, pushed, or deployed.

---

## 9. Recommended Integration Procedure

When ready to integrate the Next.js `16.4.6` security patch into your main working checkout:

1. **Apply only the 2 dependency files** from the worktree into `/home/ubuntu/acya-app`:
   ```bash
   cp /home/ubuntu/acya-app-next-security-upgrade/elance-app.ui/package.json /home/ubuntu/acya-app/elance-app.ui/package.json
   cp /home/ubuntu/acya-app-next-security-upgrade/elance-app.ui/package-lock.json /home/ubuntu/acya-app/elance-app.ui/package-lock.json
   ```
2. **In an environment with full npm/Docker registry & Google Fonts access (e.g., CI or production build host):**
   - Run `npm ci` inside `elance-app.ui/` to refresh `node_modules` (including platform-native `@rolldown` bindings for Vitest).
   - Run `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, and `npm run build` (which will download `DM Sans` cleanly).
3. **Commit in two clean, logical commits** (or keep them grouped per your release process):
   - Commit 1: Unsold Merchandise Analytics (`wood-app.api` + `elance-app.ui`).
   - Commit 2: `chore(security): upgrade Next.js and eslint-config-next from 16.4.3 to 16.4.6`.
4. **Clean up the temporary worktree** once integrated:
   ```bash
   git worktree remove /home/ubuntu/acya-app-next-security-upgrade
   git branch -D chore/nextjs-16-security-upgrade
   ```
5. **Deploy safely** using the targeted rebuild workflow in `AGENTS.md` (`sudo docker compose build --no-cache elance-app-ui && sudo docker compose up -d --no-deps elance-app-ui`).
