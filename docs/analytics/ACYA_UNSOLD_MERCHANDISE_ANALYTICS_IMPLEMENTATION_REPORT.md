# ACYA Élancé — Unsold Merchandise Analytics Implementation Report

**Feature:** Unsold Merchandise / *Articles sans ventes* (Dormant Stock Analytics)  
**Target Module:** `/analytics` (`elance-app.ui`) & `/api/Analytics/unsold-merchandise` (`wood-app.api`)  
**Date:** 2026-11-26  
**Reference Investigation:** `ACYA_UNSOLD_MERCHANDISE_ANALYTICS_INVESTIGATION.md`  
**Status:** All 6 Sequential Phases Implemented & Validated (Ready for Deployment Approval)

---

## 1. Executive Summary

The **Unsold Merchandise / *Articles sans ventes*** analytics capability has been implemented end-to-end across the ACYA Élancé backend (`wood-app.api`) and frontend (`elance-app.ui`) without requiring any database schema migrations and without modifying existing Analytics KPIs, charts, or workflows.

Administrators can now:
- Identify active merchandise with no qualifying commercial sales over **3, 6, or 12 months**.
- Separate **never-sold** articles from **no-recent-sales** dormant articles, while excluding recently created merchandise (< 30 days) by default and tracking the excluded count.
- Inspect **estimated dormant stock value HT** (primary) and **potential selling value HT** (secondary) with explicit estimate disclaimers and missing-cost indicators.
- View **wood volume (`m³`)** separately from non-wood units (never summing incompatible measurement units).
- Drill down into a full **Detailed Analysis Dialog** with search, dynamic site selection (`useSites()`), category/subcategory filters, zero-stock and new-article toggles, server-side sorting/pagination, and complete-dataset **CSV & Excel (`.xlsx`) export**.

---

## 2. Architecture Implemented

```text
elance-app.ui (/analytics)
├── src/app/analytics/page.tsx
│   └── Mounts <UnsoldMerchandiseSection /> below "Santé du Stock par Sous-Catégorie" and before <ActivityLogSection />
├── src/components/analytics/unsold-merchandise-section.tsx
│   ├── Period selector (3 | 6 | 12 mois), dynamic site selector (useSites), inline toggles
│   ├── 4 Summary KPI Cards (all 11 required metrics, unit-safe wood m³ vs non-wood pills)
│   ├── Recharts horizontal BarChart (leading subcategories by estimated dormant stock value HT)
│   ├── Top 10 Unsold Merchandise table + Estimate disclaimer
│   └── Opens <UnsoldMerchandiseDialog />
├── src/components/analytics/unsold-merchandise-dialog.tsx
│   └── Search, site/category/subcategory filters, inactivity pills, stock/new-article toggles,
│       server-side sorting & pagination (TablePagination), full filtered CSV & Excel export
├── src/hooks/use-analytics-kpis.ts          -> useUnsoldMerchandise(params) [staleTime: 5m, placeholderData]
├── src/services/components/analytics.service.ts -> getUnsoldMerchandise(params) [Axios + X-Tenant-Slug + JWT]
└── src/types/analytics.ts                   -> Strict TypeScript DTOs

wood-app.api (ASP.NET Core .NET 7)
├── Controllers/AnalyticsController.cs       -> [Authorize] GET /api/Analytics/unsold-merchandise
├── Interfaces/IAnalyticsService.cs          -> GetUnsoldMerchandiseAsync(queryParams, referenceUtcNow?)
├── Services/AnalyticsService.cs             -> 4 set-based EF Core LINQ queries over tenant-scoped WoodAppContext
├── Core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs
└── Tests/UnsoldMerchandiseAnalyticsTests.cs -> 6 xUnit test suites covering all 14 mandatory scenarios + security
```

---

## 3. Files Created and Modified

### Created Files
| File | Layer | Purpose |
| :--- | :--- | :--- |
| `wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs` | Backend Core | Request parameter model and response/summary/subcategory/item DTOs |
| `wood-app.api/tests/UnsoldMerchandiseAnalyticsTests.cs` | Backend Tests | Automated xUnit test suite covering all 14 mandatory business, deduplication, site, tenant, and security scenarios |
| `elance-app.ui/src/components/analytics/unsold-merchandise-section.tsx` | Frontend UI | Modular dashboard KPI section, subcategory Recharts chart, and Top 10 dormant items table |
| `elance-app.ui/src/components/analytics/unsold-merchandise-dialog.tsx` | Frontend UI | Full detailed analysis modal with filters, sorting, server-side pagination, and full-dataset CSV/Excel export |

### Modified Files
| File | Layer | Summary of Change |
| :--- | :--- | :--- |
| `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Interfaces/IAnalyticsService.cs` | Backend API | Added `GetUnsoldMerchandiseAsync` contract |
| `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/AnalyticsService.cs` | Backend API | Implemented `GetUnsoldMerchandiseAsync` with set-based EF Core LINQ, dual-direction BL/Invoice deduplication, valuation fallback, and unit-safe summaries |
| `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs` | Backend API | Added `[Authorize]` `[HttpGet("unsold-merchandise")]` endpoint with strict parameter validation and sanitized error handling |
| `elance-app.ui/src/types/analytics.ts` | Frontend Types | Added strict TypeScript interfaces mirroring backend DTOs |
| `elance-app.ui/src/services/components/analytics.service.ts` | Frontend Services | Added `analyticsService.getUnsoldMerchandise(params)` |
| `elance-app.ui/src/hooks/use-analytics-kpis.ts` | Frontend Hooks | Added `useUnsoldMerchandise(params, options)` with `staleTime: 5 min` and `placeholderData` |
| `elance-app.ui/src/app/analytics/page.tsx` | Frontend Page | Minimal 4-line integration importing and rendering `<UnsoldMerchandiseSection />` below *Santé du Stock par Sous-Catégorie* |

---

## 4. Backend Endpoint & DTO Documentation

### Endpoint
`GET /api/Analytics/unsold-merchandise`  
**Auth:** `[Authorize]` (JWT Bearer required; tenant cross-validated by `TenantMiddleware`).

### Query Parameters (Server-Side Validated)
| Parameter | Type | Default | Validation |
| :--- | :--- | :--- | :--- |
| `months` | `int` | `6` | Allow-list: `3`, `6`, `12` (`400 BadRequest` otherwise) |
| `siteId` | `int?` | `null` | If provided, must be `> 0` and exist as a non-deleted site in the active tenant's `tbl_sales_sites` |
| `categoryId` | `int?` | `null` | Optional `Article.ParentId` filter |
| `subCategoryId` | `int?` | `null` | Optional `Article.FirstChildId` filter |
| `onlyWithStock` | `bool` | `true` | `true` = `CurrentStock > 0`; `false` = includes zero/negative stock |
| `excludeNewArticles` | `bool` | `true` | Excludes articles created within `gracePeriodDays` |
| `gracePeriodDays` | `int` | `30` | Range `0..365` |
| `inactivityType` | `string?` | `null` | Allow-list: `NeverSold` \| `NoRecentSales` |
| `search` | `string?` | `null` | Max length `100`; case-insensitive match on `Reference` or `Description` |
| `sortBy` | `string` | `stockValue` | Allow-list: `stockValue`, `potentialSellValue`, `currentStock`, `lastSaleDate`, `daysSinceLastSale`, `reference`, `designation`, `creationDate` |
| `sortDirection` | `string` | `desc` | Allow-list: `asc` \| `desc` |
| `page` | `int` | `1` | `>= 1` |
| `pageSize` | `int` | `20` | Range `1..100` |
| `exportAll` | `bool` | `false` | When `true`, returns full filtered & sorted dataset (capped at 10,000 rows) for CSV/Excel export |

### Response Structure (`UnsoldMerchandiseResponseDto`)
- Metadata: `periodMonths`, `cutoffDate`, `gracePeriodDays`, `siteId`, `valuationDisclaimer`, `totalItemsCount`, `page`, `pageSize`, `totalPages`.
- `summary` (`UnsoldMerchandiseSummaryDto`): `totalActiveMerchandise`, `unsoldCount`, `unsoldPercentage`, `neverSoldCount`, `noRecentSalesCount`, `withStockCount`, `withoutStockCount`, `newlyCreatedExcludedCount`, `estimatedDormantStockValueHT`, `potentialSellingValueHT`, `missingCostCount`, `woodStockVolumeM3`, `nonWoodStockQuantitiesByUnit`.
- `bySubCategory` (`List<UnsoldMerchandiseSubCategoryDto>`): Top 12 subcategories ordered by `estimatedStockValueHT DESC`.
- `items` (`List<UnsoldMerchandiseItemDto>`): Enriched article rows with stock, unit, estimated unit cost HT, estimated stock value HT, potential selling value HT, `valuationSource`, `isMissingCost`, `creationDate`, `articleAgeDays`, `isNewlyCreated`, `lastSaleDate`, `daysSinceLastSale`, `inactivityClassification`, `stockAvailability`.

---

## 5. Business Rules Implemented & Lifecycle Notes

1. **Stock Filtering:** Defaults to `onlyWithStock = true`; setting `onlyWithStock = false` includes zero-stock articles even when `StockRepository.UpdateStock` has physically deleted their `tbl_stock` rows (defaulted to `0` via left-join dictionary semantics).
2. **Newly Created Merchandise:** Defaults to `excludeNewArticles = true` with a 30-day grace period (`CreationDate >= now.AddDays(-30)`). `Summary.NewlyCreatedExcludedCount` exposes the exact count of excluded new articles.
3. **Financial Valuation:** Primary = Estimated Purchase Cost HT; Secondary = Potential Selling Value HT. All responses include `valuationDisclaimer` explicitly stating values are estimates, not certified accounting figures.
4. **Returned Sales:** `DocumentTypes.customerInvoiceReturn` (`9`) is excluded from sales aggregation, so a historical positive sale event is never erased by a subsequent full or partial return.
5. **Production Consumption:** `DocumentTypes.productionConsumption` (`13`) and `productionOutput` (`14`) are excluded from commercial sales activity.
6. **Document Lifecycle & Documented Ambiguity:**
   - Qualifying sales explicitly exclude `IsDeleted == true` and `DocStatus` in `{ Deleted (4), Abandoned (2), Rejected (16), NotDelivered (5) }`.
   - **Lifecycle Ambiguity Discovered:** Code inspection of `DocumentController.cs` (L1398) confirmed that `Add()` decrements physical stock on document creation for `customerDeliveryNote` (`5`) and direct `customerInvoice` (`6`) regardless of `DocStatus`, while `DocStatus.NotDelivered` (`5`) is never set automatically by backend services (it can only arrive from client DTOs). Excluding `DocStatus.NotDelivered` in our analytics query satisfies Business Rule #6 safely while flagging that stock vs. `NotDelivered` status synchronization is an existing ERP lifecycle nuance outside this feature's scope.

---

## 6. SQL / EF Core Query Strategy

`AnalyticsService.GetUnsoldMerchandiseAsync` executes **4 set-based, `.AsNoTracking()` EF Core LINQ queries** (zero N+1 loops, no raw SQL, no full-history line materialization):
1. **Active Merchandise Projection:** Queries `tbl_article` (`!IsDeleted && Type == ArticleType.Merchandise`, optional `ParentId`/`FirstChildId`), projecting only scalar fields + `TVAs.Value` + category/subcategory names.
2. **Server-Side Last Sale Date Aggregation:** Queries `tbl_document_merchandise` (`Type == LineType.Merchandise && MerchandiseId != null && Quantity > 0`), joined to qualifying `tbl_document` rows with dual-direction `NOT EXISTS` anti-joins on `tbl_document_document_relationship`, grouped server-side by `ArticleId` → `MAX(CreationDate)`.
3. **Server-Side Stock Aggregation:** Queries `tbl_stock` (`!Merchandises.IsDeleted`, optional `SalesSiteId`), grouped server-side by `ArticleId` → `SUM(Quantity)`.
4. **Targeted Latest Purchase Unit Cost HT:** Scoped strictly to `candidateArticleIds` (only the filtered unsold articles), querying `supplierReceipt` (`2`) and unlinked `supplierInvoice` (`3`) lines to pick the latest `CostNetHT / Quantity` per article.

**PostgreSQL Timestamp Compatibility:** Verified `Program.cs` L12 enables `System.AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);`, ensuring full compatibility between `DateTime.UtcNow` and PostgreSQL `timestamp without time zone` columns (`tbl_document.creationdate`, `tbl_article.creationdate`).

---

## 7. BL / Invoice Deduplication Validation

Both conversion paths in `DocumentController.cs` are handled and verified by automated tests (`Scenarios_9_And_10_DualDirection_BL_Invoice_Deduplication`):
- **Batch Invoicing (`createinvoice`):** `ParentDocumentId = Invoice.Id`, `ChildDocumentId = BL.Id` → excluded via `!dm.Document.ChildDocuments.Any(r => !r.ChildDocument.IsDeleted && r.ChildDocument.Type == customerDeliveryNote)`.
- **Single Conversion (`/{parentId}/convert`):** `ParentDocumentId = BL.Id`, `ChildDocumentId = Invoice.Id` → excluded via `!dm.Document.ParentDocuments.Any(r => !r.ParentDocument.IsDeleted && r.ParentDocument.Type == customerDeliveryNote)`.
- **Result:** Neither path double-counts sales nor shifts the effective sale date from the BL delivery date to a later invoice date.

---

## 8. Stock & Financial Valuation Methodology

- **Units:** Wood articles (`IsWood == true` or `Unit == "M3"`) are aggregated in `WoodStockVolumeM3` (`m³`, 3 decimals). Non-wood articles are grouped per unit into `NonWoodStockQuantitiesByUnit` (e.g., `{ "Pcs": 10, "Kg": 25 }`) — incompatible units are never summed.
- **Cost Resolution Priority (per article):**
  1. `LastPurchaseDoc`: Latest `CostNetHT / Quantity` from qualifying `supplierReceipt` or unlinked `supplierInvoice` across all history.
  2. `ArticleLastPurchasePrice`: Fallback `Article.LastPurchasePriceTTC / (1 + TvaRate / 100.0)` when `LastPurchasePriceTTC > 0`.
  3. `MissingCost`: `0m` unit cost, `IsMissingCost = true`, counted in `Summary.MissingCostCount`.
- **Negative Stock Guard:** Valuation multiplies by `Math.Max(0.0, CurrentStock)` so negative-stock anomalies (`StockAvailability = "NegativeStock"`) never artificially reduce dormant stock value.

---

## 9. Frontend Components & Integration

- **`UnsoldMerchandiseSection`** (`src/components/analytics/unsold-merchandise-section.tsx`):
  - Mounted in `src/app/analytics/page.tsx` immediately below *Santé du Stock par Sous-Catégorie* and before `<ActivityLogSection />`.
  - Uses `useSites()` dynamically (no hardcoded site IDs), reuses the `3 | 6 | 12 mois` segmented period control, and renders all 11 required summary metrics, the Recharts horizontal subcategory bar chart, and the Top 10 dormant articles table with `font-mono tabular-nums` and `DT` 3-decimal formatting.
  - Uses React 19 `useSyncExternalStore` for hydration-safe Recharts rendering.
- **`UnsoldMerchandiseDialog`** (`src/components/analytics/unsold-merchandise-dialog.tsx`):
  - Provides debounced search, dynamic site/category/subcategory selectors, inactivity pills, stock and new-article toggles, server-side sorting & pagination (`TablePagination`), and full-dataset CSV (UTF-8 BOM + CSV formula-injection sanitization) and Excel (`.xlsx`) export via `exportAll: true`.

---

## 10. Security & Tenant-Isolation Validation

- **New Endpoint Protection:** `AnalyticsController.GetUnsoldMerchandise` is decorated with `[Authorize]`.
- **Tenant Isolation:** `TenantMiddleware` cross-validates JWT `tenant_slug` against request tenant slug (`403 Forbidden` on mismatch) and scopes `WoodAppContext` via `modelBuilder.HasDefaultSchema(SchemaName)`. Verified by `Scenario_14_TenantIsolation_NoCrossTenantLeakage`.
- **Site Validation:** Any supplied `siteId` is verified against the active tenant's non-deleted `tbl_sales_sites` (`400 BadRequest` on invalid/foreign site ID). Verified by `Scenario_13_SiteIsolation_And_InvalidSiteValidation`.
- **Input & Output Safety:** All query parameters are validated against strict allow-lists/bounds; `500` responses log internally and return generic French error messages; frontend renders strictly via React JSX auto-escaping and sanitizes CSV export cells against formula injection (`=`, `+`, `-`, `@`).
- **Pre-Existing Security Findings (Reported Separately, Out of Scope):**
  1. Legacy endpoints in `AnalyticsController` (`dashboard`, `monthly-revenue`, `top-subcategories`, `stock-health`) do not currently have `[Authorize]` attributes and return raw `ex.Message` on `BadRequest`. Recommend adding `[Authorize]` and generic error handling in a dedicated hardening pass.
  2. `next build` reported a Next.js security advisory for `16.4.3` (`next upgrade --agent=security`).

---

## 11. Performance Analysis

- Server-side `GROUP BY` in PostgreSQL transfers only 1 lightweight tuple per sold/stocked article rather than raw document line histories.
- Purchase-cost lookup is constrained strictly to `candidateArticleIds` of the filtered unsold set.
- All required PostgreSQL indexes already exist in `full_migration.sql`: `idx_tbl_document_type_deleted_date`, `IX_tbl_document_salessiteid`, `idx_tbl_doc_merch_doc_merch_type`, `IX_tbl_merchandise_articleid`, `IX_tbl_stock_idmerchandise`, `IX_tbl_stock_idsite`, and both sides of `tbl_document_document_relationship`.
- Frontend caches responses for `5 minutes` (`staleTime: 5 * 60 * 1000`) and preserves previous data during filter/page transitions (`placeholderData`).

---

## 12. Tests Executed & Results

Command:
```bash
dotnet test tests/ms.webapp.api.acya.tests.csproj -p:UseArtifactsOutput=true -p:ArtifactsPath=/tmp/wood-artifacts \
  --filter "FullyQualifiedName~UnsoldMerchandiseAnalyticsTests|FullyQualifiedName~ServiceArticleTests|FullyQualifiedName~ApiHealthRegressionTests"
```

| Test Suite | Passed | Failed | Skipped | Coverage |
| :--- | :-: | :-: | :-: | :--- |
| `UnsoldMerchandiseAnalyticsTests` | **6** | 0 | 0 | All 14 mandatory scenarios (never sold, >3m, recent, zero stock, in stock, 30d grace, missing cost, TTC→HT fallback, batch BL↔Invoice, single BL↔Invoice, returned sale preservation, production exclusion, `NotDelivered`/lifecycle, site isolation, tenant isolation, pagination/sorting/exportAll, `[Authorize]` & parameter validation) |
| `ServiceArticleTests` | **5** | 0 | 0 | Existing service/merchandise regression check |
| `ApiHealthRegressionTests` | **3** | 0 | 0 | Existing API health regression check |
| **Total** | **14** | **0** | **0** | **100% Pass** |

---

## 13. Build & Static Analysis Results

| Check | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Backend Build** | `dotnet build ms.webapp.api.acya.sln -p:UseArtifactsOutput=true -p:ArtifactsPath=/tmp/wood-artifacts` | **PASS** (0 errors) | 0 warnings in all new/modified files (used `/tmp/wood-artifacts` because pre-existing `bin/`/`obj/` folders are root-owned) |
| **Next.js Typegen** | `npx next typegen` | **PASS** | Route types generated cleanly |
| **Frontend TypeScript** | `npx tsc --noEmit` | **PASS** (0 errors) | Strict mode verified across entire `elance-app.ui` |
| **Frontend ESLint** | `npx eslint src/types/analytics.ts src/services/components/analytics.service.ts src/hooks/use-analytics-kpis.ts src/components/analytics/unsold-merchandise-section.tsx src/components/analytics/unsold-merchandise-dialog.tsx` | **PASS** (0 errors, 0 warnings) | React 19 hooks rules clean |
| **Frontend `next build`** | `npm run build` | **BLOCKED (Offline Font Fetch)** | Failed only on `next/font/google` fetching `DM Sans` from `fonts.googleapis.com` in offline sandbox; zero code/type/bundler errors |
| **Git Whitespace Check** | `git diff --check` | **PASS** (exit 0) | No whitespace or EOF issues |

---

## 14. Database Migration Status

**No database migrations required.** All queried tables, columns, and performance indexes already exist in `wood-app.api/db/FullDb_Migration/full_migration.sql` and active tenant schemas.

---

## 15. Known Limitations & Unresolved Issues

1. **Offline `next build` Google Fonts fetch:** In environments without outbound access to `fonts.googleapis.com`, `next/font/google` (`DM Sans` in `src/app/layout.tsx`) cannot download font assets. Docker production builds with internet access are unaffected.
2. **Root-owned `bin/`/`obj/` in `wood-app.api`:** Existing build output folders are owned by `root`; local builds as `ubuntu` should pass `-p:UseArtifactsOutput=true -p:ArtifactsPath=/tmp/wood-artifacts` (Docker builds run cleanly in isolated containers).
3. **Pre-existing `AnalyticsController` `[Authorize]` gap:** Only the new `unsold-merchandise` endpoint has `[Authorize]` added to avoid unexpected regressions on existing callers; legacy analytics endpoints should be audited separately.
4. **Next.js Security Advisory:** `next build` flagged Next.js `16.4.3` for a security upgrade (`next upgrade --agent=security`).

---

## 16. Final Git Status

All changes are strictly scoped to the Unsold Merchandise Analytics feature (no commits or pushes executed; pre-existing untracked investigation/infra reports and `docker-compose.yml` modification left untouched):
- **Modified:** `AnalyticsController.cs`, `IAnalyticsService.cs`, `AnalyticsService.cs`, `analytics/page.tsx`, `use-analytics-kpis.ts`, `analytics.service.ts`, `types/analytics.ts`.
- **Created:** `UnsoldMerchandiseDto.cs`, `UnsoldMerchandiseAnalyticsTests.cs`, `unsold-merchandise-section.tsx`, `unsold-merchandise-dialog.tsx`, `ACYA_UNSOLD_MERCHANDISE_ANALYTICS_IMPLEMENTATION_REPORT.md`.

---

## 17. Production Deployment Recommendations

Follow the safe targeted rebuild workflow in `AGENTS.md` (do **not** run `docker compose down` or `--remove-orphans`):

```bash
# 1. Rebuild and restart backend API only
sudo docker compose build --no-cache api
sudo docker compose up -d --no-deps api
sudo docker logs --tail 100 $(sudo docker ps -qf "name=api")

# 2. Rebuild and restart frontend UI only
sudo docker compose build --no-cache elance-app-ui
sudo docker compose up -d --no-deps elance-app-ui
sudo docker logs --tail 100 $(sudo docker ps -qf "name=elance-app-ui")
```

After deployment, verify `https://socofeb.acya.site/analytics` with an authenticated user:
1. Confirm the **Articles sans ventes (Stock Dormant)** card renders below *Santé du Stock par Sous-Catégorie* and before *Activity Log*.
2. Toggle `3 / 6 / 12 mois`, site selector, zero-stock, and new-article switches.
3. Open **Analyse détaillée & Export** and test pagination, sorting, and CSV/Excel download.
