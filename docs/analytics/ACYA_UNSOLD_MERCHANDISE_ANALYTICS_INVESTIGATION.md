# ACYA Élancé — Unsold Merchandise Analytics Investigation

**Feature Under Evaluation:** Unsold Merchandise / *Articles sans ventes* (Dormant Stock Analytics)  
**Date:** 2026-11-26  
**Scope:** Read-only architectural, functional, and technical investigation across `elance-app.ui` (Next.js 16) and `wood-app.api` (.NET 7 / PostgreSQL 15 multi-tenant)  
**Status:** Investigation Complete — Ready for Functional & Technical Approval

---

## Legend & Evidence Classification

Throughout this report, every finding is explicitly categorized to support approval decisions:

| Tag | Meaning |
| :--- | :--- |
| **[Confirmed Implementation]** | Directly observed and verified in current repository source code or database schema. |
| **[Code-Backed Finding]** | Analytical conclusion or pitfall directly evidenced by source files and line references. |
| **[Business Validation Required]** | Functional rule or edge-case policy requiring stakeholder sign-off before implementation. |
| **[Recommendation]** | Proposed architecture, data model, query strategy, or UI integration for the implementation phase. |

---

## Executive Summary

Introducing **Unsold Merchandise / *Articles sans ventes*** (3, 6, and 12-month windows) into the existing ACYA Élancé Analytics module is **highly feasible, low-risk, and requires zero blocking database schema migrations**.

### Key Highlights
1. **Frontend Readiness:** The `/analytics` page (`elance-app.ui/src/app/analytics/page.tsx`) already uses Recharts 3.8, TanStack Query v5, Shadcn/Base UI, and an established `3 | 6 | 12 mois` segmented period selector pattern (used in *Top Ventes par Sous-Catégorie*) as well as a Card + Deep-Dive Modal + CSV Export pattern (used in *Suivi des Créances Clients*).
2. **Backend & Multi-Tenant Readiness:** `AnalyticsController` and `AnalyticsService` use pure EF Core LINQ via tenant-scoped `WoodAppContext` (`modelBuilder.HasDefaultSchema(SchemaName)`), automatically guaranteeing PostgreSQL schema-per-tenant isolation without raw SQL.
3. **Critical Business-Rule Discovery (Double-Counting Risk):** Code inspection of `DocumentController.cs` revealed **two opposite parent/child link directions** between Delivery Notes (`customerDeliveryNote = 5`) and Invoices (`customerInvoice = 6`) in `tbl_document_document_relationship`:
   - Batch invoicing (`createinvoice`) stores `Parent = Invoice, Child = BL`.
   - Single-document conversion (`/{parentId}/convert`) stores `Parent = BL, Child = Invoice`.
   - **Impact:** Any sales activity query *must* deduplicate in **both** directions, combining all active BLs with only *unlinked* (direct) customer invoices.
4. **Index Readiness:** `full_migration.sql` already includes `idx_tbl_document_type_deleted_date`, `idx_tbl_doc_merch_doc_merch_type`, `IX_tbl_merchandise_articleid`, `IX_tbl_stock_idmerchandise`, `IX_tbl_stock_idsite`, and indexes on both columns of `tbl_document_document_relationship`.

---

## Phase 1 — Frontend Investigation (`elance-app.ui`)

### 1.1 Analytics Routes & Component Structure `[Confirmed Implementation]`

- **Primary Route:** `elance-app.ui/src/app/analytics/page.tsx` (2,038 lines, `'use client'`, `AnalyticsPage`) and `elance-app.ui/src/app/analytics/layout.tsx` (private `noindex` metadata).
- **Existing Modular Analytics Components (`elance-app.ui/src/components/analytics/`):**
  - `analytics-report.tsx` (`AnalyticsReport`, 336 lines) — Printable HTML report modal ("Rapport Complet").
  - `activity-log-section.tsx` (`ActivityLogSection`, 466 lines) — Embedded audit trail at the bottom of `/analytics`.
  - `pending-bordereaux.tsx` (`PendingBordereauxSection`, 295 lines) — Located in `components/analytics/` but mounted in `treasury-dashboard.tsx`, not on `/analytics`.
- **Page Layout:** Wrapped in `<DashboardLayout>` (`p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto`). Sections are stacked vertically inside `space-y-8` without page-level tabs:
  1. **Header & Global Filter Toolbar** (`page.tsx` L1029–L1080): `chartYear`, `chartMonth` (`ALL` or `1..12`), and `"Rapport Complet"` print button.
  2. **Error Banner** (L1082–L1087): Inline rose alert banner when `useAnalyticsKpis` errors.
  3. **5 Top KPI Cards** (`grid gap-4 sm:grid-cols-2 lg:grid-cols-5`, L1090–L1167): *CA Aujourd'hui*, *CA Semaine*, *CA Mois*, *CA Mois Achat*, *Alertes Stock*.
  4. **12-Column Analytics Grid** (`grid gap-6 lg:grid-cols-12`, L1169–L1468): Treasury projection (`60|90|120|150 jours`), Supplier Purchases vs Payments, Profit Margins (`lastPrice` vs `cmp`), Revenue & Margin Evolution (`6 mois`), Activity by Document (Donut).
  5. **Top Clients & Partners Row** (`grid gap-6 md:grid-cols-2`, L1471–L1533).
  6. **Suivi des Créances Clients + Deep-Dive Modal** (L1536–L1837): Summary card + full-screen `Dialog` with search, range filters, segmented pills, sort dropdown, sticky table, and UTF-8 BOM CSV export (`exportToCSV`, L245–L271).
  7. **Stock Health & Top Sub-Categories Row** (`grid gap-6 lg:grid-cols-3`, L1840–L1937):
     - *Santé du Stock* (`lg:col-span-1`, Donut: `Bon`, `Bas`, `Rupture`).
     - *Top Ventes par Sous-Catégorie* (`lg:col-span-2`, sub-category `<select>` + **`3 | 6 | 12 mois`** segmented buttons + Recharts `PieChart`).
  8. **Santé du Stock par Sous-Catégorie** (L1940–L1974): Sub-category `<select>`, site `<select>`, Recharts `BarChart` (`currentStock` vs `minimumStock`), and low-stock pill strip.
  9. **Activity Log Section** (L1977): `<ActivityLogSection />`.

### 1.2 Date-Range & Filter Mechanisms `[Confirmed Implementation]`

- **State Management:** All filters on `/analytics` use local React `useState` (no URL search params).
- **Period Selector Precedent:** *Top Ventes par Sous-Catégorie* (`page.tsx` L274, L1914–L1929) already implements the exact `3 | 6 | 12 mois` segmented control:
  ```tsx
  <div className="inline-flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
    {[3, 6, 12].map((m) => ( /* 3 mois, 6 mois, 12 mois */ ))}
  </div>
  ```
- **Site Selector Pitfall `[Code-Backed Finding]`:** In `page.tsx` L1959–L1967, the site selector for *Santé du Stock par Sous-Catégorie* hardcodes `<option value="1">Site Principal</option>` and `<option value="2">Dépôt Secondaire</option>`. The codebase already provides `useSites()` (`src/hooks/use-enterprise.ts` L71–L77 → `GET /SalesSites`), which **must** be used for the new Unsold Merchandise site filter so multi-tenant site IDs and names are always accurate.

### 1.3 Existing Analytics Hooks, Services & TanStack Query Conventions `[Confirmed Implementation]`

- **HTTP Client:** `elance-app.ui/src/lib/axios.ts` — automatically attaches `Authorization: Bearer <token>` and `X-Tenant-Slug: <slug>`.
- **Analytics Service (`src/services/components/analytics.service.ts` L1–L33):**
  - `getDashboardKpis(enterpriseId?, month?, year?)` → `GET /Analytics/dashboard`
  - `getMonthlyRevenue(months = 6)` → `GET /Analytics/monthly-revenue`
  - `getTopSubCategories(months = 6)` → `GET /Analytics/top-subcategories`
  - `getStockHealthBySubCategory(siteId?)` → `GET /Analytics/stock-health`
- **Analytics Hooks (`src/hooks/use-analytics-kpis.ts` L1–L39):**
  - Hierarchical query keys: `['analytics', '<resource>', ...params]`.
  - `staleTime`: `2–10 min` (`5 * 60 * 1000` is the standard for non-realtime analytics).
  - Global `QueryClient` (`src/components/providers.tsx` L12–L24): `staleTime: 60_000`, skips retry on `401`/`403`, max 3 retries otherwise.
  - Pagination/filter smoothness (`src/hooks/use-documents.ts` L62): `placeholderData: (previousData) => previousData` (TanStack Query v5 replacement for `keepPreviousData`).
- **Types:** `src/types/analytics.ts` (L1–L69).

### 1.4 UI, Charting, Loading/Error/Empty States & Design Conventions `[Confirmed Implementation]`

- **Charts:** `recharts` `^3.8.1` inside `<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>` guarded by an `isMounted` state flag.
- **UI Primitives:** Shadcn UI / Base UI (`Card`, `Dialog`, `Select`, `Input`, `Badge`, `Skeleton`, `Tooltip`, `Table`), `lucide-react` icons, `framer-motion` animations, `sonner` toasts, `TablePagination` (`src/components/shared/table-pagination.tsx`), and `xlsx` (`0.20.3`) + UTF-8 BOM CSV export.
- **Loading States:** `<Skeleton>` blocks for KPI cards/rows; `h-[360px] w-full bg-slate-100/70 animate-pulse rounded-xl` with `"Chargement des données..."` for charts.
- **Error States:** `bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl` with `AlertCircle`.
- **Empty States:** `bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500`.
- **Formatting & Typography:**
  - All UI copy in **French**.
  - Currency: Tunisian Dinar with 3 decimals (`1 234,500 DT`), always rendered with `font-mono tabular-nums`.
  - Wood quantities: `fr-FR`, 3 fixed decimals when `unit === 'M3'` (`m³`).
  - Corporate palette (`globals.css`): `--corp-blue-600`, `--corp-navy`, `--timber-400/600`, `--sand-50/100`. Light theme forced (`forcedTheme="light"`).
- **Permissions & Navigation:**
  - Permission module: `analytics` (`usePermissionGuard().hasAnyPermission('analytics')`, `page.tsx` L391–L396). No tenant feature flag gates `analytics` (available to all tenants).
  - Sidebar (`sidebar.tsx` L70): Listed under `saleNavGroups` (`Général > Analyses`); excluded from `depotNavGroups`.
- **Drill-Down Note `[Code-Backed Finding]`:** There are no `/articles/[id]` or `/stock/[id]` detail routes in `elance-app.ui`. Item inspection is handled via modals (`ArticleHistoryDialog` in `src/components/articles/article-history-dialog.tsx` or `WoodStockDetailsDialog`) or navigation to `/articles` / `/stock?tab=list`.

### 1.5 Best Frontend Integration Point `[Recommendation]`

- **Do NOT add more inline JSX into the 2,038-line `src/app/analytics/page.tsx`.**
- Extract a dedicated, self-contained component **`src/components/analytics/unsold-merchandise-section.tsx`** and mount it directly below **Santé du Stock par Sous-Catégorie** (immediately before `<ActivityLogSection />` at `page.tsx` L1975). This groups all inventory/catalog performance analytics together (*Santé du Stock* → *Top Ventes* → *Stock vs Seuil* → *Articles sans ventes / Stock Dormant*).
- Pair it with a dedicated **`src/components/analytics/unsold-merchandise-dialog.tsx`** (mirroring *Suivi des Créances Clients*) for full paginated exploration, category/site/status filtering, sorting, and CSV/Excel export.
- Optionally, add a clickable badge or compact summary metric in the existing *Santé du Stock* card or section header linking down to the *Articles sans ventes* section (avoiding overcrowding the existing 5-column top KPI row).

---

## Phase 2 — Backend Investigation (`wood-app.api`)

### 2.1 Existing Analytics Architecture `[Confirmed Implementation]`

- **Controller:** `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/AnalyticsController.cs` (L13–99), inherits `BaseApiController` (`[ApiController]`, `[Route("api/[controller]")]`).
  - Existing endpoints: `GET /api/Analytics/dashboard`, `monthly-revenue`, `top-subcategories`, `stock-health`.
  - **Security Finding `[Code-Backed Finding]`:** `AnalyticsController` currently lacks an `[Authorize]` attribute (unlike newer controllers such as `ProductionController` or `ApprovalController`). The new endpoint should include `[Authorize]` (and existing endpoints should be reviewed separately).
- **Service & DI:** `IAnalyticsService` (`Interfaces/IAnalyticsService.cs`) → `AnalyticsService` (`Services/AnalyticsService.cs` L17–303), registered as Scoped in `ApplicationServiceExtentions.cs` (L76).
- **Query Style & Multi-Tenancy:**
  - Uses **pure EF Core LINQ** with `.AsNoTracking()` against injected `WoodAppContext`.
  - `WoodAppContext.cs` (L13–39, L130–138) dynamically applies `modelBuilder.HasDefaultSchema(SchemaName)` where `SchemaName` resolves to `tenant_{slug}` from `TenantContext`, isolated via `TenantModelCacheKeyFactory`.
  - Zero raw SQL is used in Analytics, Reports, or Stock services.

### 2.2 Existing Sales & Stock Query Pitfalls `[Code-Backed Finding]`

Inspecting existing analytics/report code revealed two critical limitations we must avoid replicating:
1. **`AnalyticsService.GetTopSubCategoriesAsync` (`AnalyticsService.cs` L196–247):** Queries only `DocumentTypes.customerInvoice` (Type=6), completely missing uninvoiced delivery notes (`customerDeliveryNote = 5`) and loading all matching lines into memory before grouping.
2. **`ReportService.GetSalesReportData` (`ReportService.cs` L47–75):** Queries both `customerInvoice` and `customerDeliveryNote` **without deduplicating** invoices generated from delivery notes, causing double-counting whenever a BL is invoiced.

### 2.3 Core Entities & Schema Mapping `[Confirmed Implementation]`

| Domain Concept | C# Entity & File | PostgreSQL Table | Key Columns |
| :--- | :--- | :--- | :--- |
| **Article** | `Article` (`Entities/Product/Article.cs`) | `tbl_article` | `id`, `reference`, `description`, `articletype` (`0=Merchandise, 1=Service`), `iswood`, `isdeleted`, `creationdate`, `updatedate`, `unit`, `minquantity`, `sellprice_ht`, `sellprice_ttc`, `lastpurchaseprice_ttc`, `idtva`, `idcategory`, `idsubcategory` |
| **Category / SubCategory** | `Parent`, `FirstChild` (`Entities/Categories/`) | `tbl_parent`, `tbl_first_child` | `id`, `reference`, `description`, `idparent`, `isdeleted` |
| **Merchandise (Lot/Pkg)** | `Merchandise` (`Entities/Merchandise.cs`) | `tbl_merchandise` | `id`, `articleid` (FK), `packagereference`, `isdeleted`, `allownegativstock` (1 `Article` → N `Merchandise` rows, especially for wood packages) |
| **Stock** | `Stock` (`Entities/Stock.cs`) | `tbl_stock` | `id`, `idmerchandise` (FK), `idsite` (FK), `quantity` (`double`), `minimumstock`, `updatedate` — **1 row per `(MerchandiseId, SalesSiteId)`** |
| **Sales Site** | `SalesSite` (`Entities/SalesSite.cs`) | `tbl_sales_sites` | `id`, `gouvernorate`, `address`, `isforsale`, `isdeleted`, `enterpriseid` |
| **Document** | `Document` (`Entities/Document.cs`) | `tbl_document` | `id`, `type` (`DocumentTypes`), `docnumber`, `creationdate` (`timestamp without time zone`), `isinvoiced`, `isdeleted`, `salessiteid`, `docstatus`, `billingstatus`, `isservice` |
| **Document Line** | `DocumentMerchandise` (`Entities/DocumentMerchandise.cs`) | `tbl_document_merchandise` | `id`, `documentid` (FK), `merchandiseid` (FK, nullable), `line_type` (`1=Merchandise, 2=TransportFee`), `quantity` (already in $m^3$ for wood or unit), `unitprice_ht`, `cost_net_ht`, `cost_ttc` |
| **Document Link** | `DocumentDocumentRelationship` (`Entities/DocumentDocumentRelationship.cs`) | `tbl_document_document_relationship` | Composite PK `(parent_document_id, child_document_id)` |
| **TVA Rate** | `AppVariable` (`Entities/AppVariable.cs`) | `tbl_app_variable` | `id`, `nature`, `name`, `value` (`double?`, e.g., `19`, `7`, `0`) |

### 2.4 Relevant Enum Values `[Confirmed Implementation]`

- **`DocumentTypes`** (`common/DocumentTypes.cs` L3–19):
  - `supplierReceipt = 2`, `supplierInvoice = 3`
  - `customerOrder = 4` (BC Client — order only, not a completed sale)
  - **`customerDeliveryNote = 5`** (BL Client — actual physical delivery / stock OUT)
  - **`customerInvoice = 6`** (Facture Client — direct sale OR billed from BL)
  - `stockTransfer = 7`, `inventory = 10`, `customerQuote = 11` (Devis — not a sale)
  - **`customerInvoiceReturn = 9`** (Avoir / Retour Client)
  - `productionConsumption = 13`, `productionOutput = 14`
- **`ArticleType`** (`common/ArticleType.cs` L3–7): `Merchandise = 0`, `Service = 1`.
- **`LineType`** (`common/LineType.cs` L3–7): `Merchandise = 1`, `TransportFee = 2`.
- **`DocStatus`** (`common/DocStatus.cs` L3–21): `Delivered = 1`, `Abandoned = 2`, `Created = 3`, `Deleted = 4`, `NotDelivered = 5`, `NotConfirmed = 6`, `Confirmed = 7`, `Completed = 8`, `Pending = 9`, `Sent = 10`, `PartiallyDelivered = 11`, `Validated = 12`, `Submitted = 13`, `PendingApproval = 14`, `Approved = 15`, `Rejected = 16`.

---

## Phase 3 — Business Rules Validation

### 3.1 Verification of All 7 Domain Rules `[Confirmed Implementation]` & `[Code-Backed Finding]`

| # | Business Rule Area | Confirmed Codebase Behavior | Source Reference | Impact on Unsold Merchandise Calculation |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Delivery Notes (BL)** | `DocumentTypes.customerDeliveryNote` (`5`). Decrements stock on creation. May stay uninvoiced (`IsInvoiced = false`) or later be invoiced (`IsInvoiced = true`). | `DocumentTypes.cs` L9; `DocumentController.cs` L911+ | **Primary source of truth** for delivered merchandise sales. Always include non-deleted BLs (excluding `Deleted`/`Abandoned`/`Rejected`). |
| **2** | **Direct Sales Invoices** | `DocumentTypes.customerInvoice` (`6`) created via `POST api/Document` with `bypassStockUpdate = false`. Decrements stock directly and has **no** row in `tbl_document_document_relationship` linking to a BL. | `DocumentController.cs` L911 | **Include** all non-deleted `customerInvoice` documents that have **no** link to a `customerDeliveryNote`. |
| **3** | **Invoices Generated from Delivery Notes** | **Dual-direction linking discovered:**<br>• **Batch Invoice** (`POST api/Document/createinvoice`, L1788–1793): clones BL lines onto Invoice, sets `ParentDocumentId = invoice.Id, ChildDocumentId = bl.Id`.<br>• **Single Conversion** (`POST api/Document/{parentId}/convert`, L2492–2496): creates Invoice with `bypassStockUpdate: true`, sets `ParentDocumentId = bl.Id, ChildDocumentId = invoice.Id`.<br>*(Confirmed by `DeleteSoft` L1470–1471 which checks both `ParentDocuments` and `ChildDocuments`.)* | `DocumentController.cs` L1470–1471, L1567–1884, L2430–2563 | **Exclude** any `customerInvoice` linked to a non-deleted `customerDeliveryNote` in **either** `ParentDocuments` or `ChildDocuments`. This guarantees zero double-counting while capturing 100% of actual sales (both invoiced and uninvoiced BLs + direct invoices). |
| **4** | **Sales Returns / Credit Notes** | `DocumentTypes.customerInvoiceReturn` (`9`), created via `POST api/Document/{parentId}/credit-note` (`ParentDocumentId = parentId, ChildDocumentId = creditNoteId`). | `DocumentController.cs` L2572–2624 | A return does not constitute a sale. Exclude Type `9` from positive sale events. *(See Business Validation item #3 regarding net-zero returned sales.)* |
| **5** | **Service Articles** | Distinguished explicitly by `Article.Type == ArticleType.Service` (`articletype = 1`) vs `ArticleType.Merchandise` (`articletype = 0`). Additionally, document lines have `DocumentMerchandise.Type == LineType.TransportFee` (`2`) with `MerchandiseId == null`. | `Article.cs` L12; `ArticleType.cs` L3–7; `DocumentMerchandise.cs` L79–81 | **Strictly filter** `a.Type == ArticleType.Merchandise` on `tbl_article` and `dm.Type == LineType.Merchandise && dm.MerchandiseId != null` on `tbl_document_merchandise`. |
| **6** | **Archived / Deleted Articles** | There is **no** `IsArchived` column on `tbl_article`. Soft-deletion/archival uses `Article.IsDeleted = true` (and `Merchandise.IsDeleted = true`). | `Article.cs` L18; `full_migration.sql` L352–383 | **Exclude** `a.IsDeleted == true` from the active catalog scope. |
| **7** | **Stock Availability & Inventory Valuation** | • `tbl_stock` stores 1 row per `(MerchandiseId, SalesSiteId)`.<br>• `StockRepository.UpdateStock` (L220–223) **physically deletes** the `tbl_stock` row when `Quantity == 0`. Articles with zero stock therefore have no `tbl_stock` row.<br>• For wood, `Stock.Quantity` and `DocumentMerchandise.Quantity` are already expressed in $m^3$.<br>• `StockService.GetGlobalStockValuationAsync` (L1696–1815) computes CMP HT and Last Purchase Price HT from `supplierReceipt` (2) and unlinked `supplierInvoice` (3) lines, but scopes to a single `year`.<br>• `Article.LastPurchasePriceTTC` is stored on `tbl_article` (NOT NULL, defaults to `0`), with TVA rate in `Article.TVAs.Value`. | `StockRepository.cs` L220–223; `StockService.cs` L1696–1815; `Article.cs` L23, L37–38 | • Aggregate stock at the `Article` level via `LEFT JOIN` through `tbl_merchandise` (`!m.IsDeleted`) to `tbl_stock` (optionally filtered by `siteId`), defaulting missing rows to `0`.<br>• Value stock at **Estimated Cost HT** using latest historical purchase unit cost HT (across all years, not just current year!), falling back to `LastPurchasePriceTTC / (1 + tvaRate / 100)` when no purchase document exists. Also expose `PotentialSellValueHT = CurrentStock * (SellPriceHT ?? 0)`. |

### 3.2 Source of Truth for Merchandise Sales Activity `[Recommendation]`

An **Effective Sale Event** for an article `A` is defined as any `DocumentMerchandise` row where:
1. `dm.Type == LineType.Merchandise && dm.MerchandiseId != null && dm.Quantity > 0`
2. `dm.Merchandise.ArticleId == A.Id`
3. `dm.Document.IsDeleted == false`
4. `dm.Document.DocStatus` is **not** in `{ DocStatus.Deleted (4), DocStatus.Abandoned (2), DocStatus.Rejected (16) }`
5. `(dm.Document.Type == DocumentTypes.customerDeliveryNote (5))` **OR** `(dm.Document.Type == DocumentTypes.customerInvoice (6) AND NOT linked to any non-deleted customerDeliveryNote in either direction of tbl_document_document_relationship)`
6. If `siteId` is specified: `dm.Document.SalesSiteId == siteId.Value`

> **Why this is exact:**
> - An uninvoiced BL is counted once (on the BL's `CreationDate`).
> - An invoiced BL (whether batch-invoiced or single-converted) is counted once (on the BL's `CreationDate`, because the linked Invoice is excluded).
> - A direct sales invoice (without a BL) is counted once (on the Invoice's `CreationDate`).
> - Quotes (`11`), Orders (`4`), Transfers (`7`), Inventory counts (`10`), Production (`13`, `14`), and Returns (`9`) are excluded.

### 3.3 Assumptions Requiring Business Validation `[Business Validation Required]`

Before starting implementation, product/business stakeholders should confirm the following 6 policy decisions:

1. **Default Stock Filter (`onlyWithStock`):** Should the primary KPI count **only articles currently in stock (`currentStock > 0`)** (true *immobilized/dormant stock*), or **all active catalog articles** including those at `0` stock?
   - *Recommended default:* `onlyWithStock = true` for the main "Stock Dormant" KPI & valuation, with a quick toggle `"Inclure stock = 0"` to inspect inactive catalog references as well.
2. **Newly Created Articles Grace Period:** If an article was created 10 days ago and has no sales yet, should it be flagged as "unsold over the last 6 months"?
   - *Recommended default:* Separate newly created articles (`CreationDate >= cutoffDate` or within a configurable grace period such as `30 days`) into an explicit `isNewlyCreated` flag/badge, with a toggle `"Exclure nouveaux articles"` (default `true` for the KPI count so newly added items don't distort dormant stock alerts).
3. **Fully Returned Sales:** If an article was sold once in the last 3 months (e.g., 10 units on a BL) and 100% returned via a `customerInvoiceReturn` (Type=9), should it be treated as *unsold* (net qty ≤ 0) or as *having had sales activity*?
   - *Recommended default:* Evaluate net quantity (`SUM(sales) - SUM(returns) <= 0`) OR flag `hasReturnedSalesOnly = true`. Needs stakeholder preference.
4. **Inventory Valuation Basis:** Should "Current Estimated Stock Value" display **Purchase Cost HT** (accounting/immobilized capital view, consistent with `StockService.GetGlobalStockValuationAsync`), **Purchase Cost TTC**, or **Potential Retail Value HT/TTC** (`SellPriceHT`)?
   - *Recommended default:* Display **Valeur Stock (Coût HT)** as the primary KPI, with `potentialSellValueHT` available as a secondary column/tooltip.
5. **Production Consumption (`DocumentTypes.productionConsumption = 13`):** For tenants with the *Production* module (`isManagingProduction`), raw timber consumed in workshop manufacturing is not sold directly as a raw article. Should raw materials consumed in production during the period still be listed as "unsold", or optionally flagged/excluded?
   - *Recommended default:* Keep standard sales definition in Phase 1, and optionally add a note/badge if the tenant uses Production (or confirm with timber workshop clients).
6. **Delivery Note `DocStatus.NotDelivered` (5):** Should BLs with status `NotDelivered` count as a sale, or only `Delivered`/`Confirmed`/`Validated`/`Completed`/`Created`?
   - *Recommended default:* Include all non-deleted, non-abandoned, non-rejected BLs (matching `StockRepository` which already decremented stock on BL creation).

---

## Phase 4 — Proposed Data Model & Calculations

### 4.1 Core Metric Definitions `[Recommendation]`

Let `cutoffDate = DateTime.UtcNow.AddMonths(-months)` where `months ∈ {3, 6, 12}` (validated on backend), and `graceCutoffDate = DateTime.UtcNow.AddDays(-newArticleGraceDays)` (e.g., 30 days).

For every active merchandise article `a` in `tbl_article` (`!a.IsDeleted && a.Type == ArticleType.Merchandise`):

1. **Sales Activity Aggregation (per `ArticleId`, optionally scoped by `siteId`):**
   - `LastSaleDate` (`DateTime?`): `MAX(d.CreationDate)` across all **Effective Sale Events** (all-time, not truncated to `cutoffDate`!).
   - `HasSaleInPeriod` (`bool`): `LastSaleDate.HasValue && LastSaleDate.Value >= cutoffDate`.
   - `DaysSinceLastSale` (`int?`): `LastSaleDate.HasValue ? (int)(DateTime.UtcNow.Date - LastSaleDate.Value.Date).TotalDays : null`.
   - **Article is Unsold in Period** iff `!HasSaleInPeriod`.
2. **Current Stock Quantity (per `ArticleId`, optionally scoped by `siteId`):**
   - `CurrentStock` (`double`): `SUM(s.Quantity)` across `tbl_stock` joined via `tbl_merchandise` (`m.ArticleId == a.Id && !m.IsDeleted`), defaulting to `0` when no `tbl_stock` row exists.
   - **Unit Aggregation Caution `[Code-Backed Finding]`:** Timber businesses mix units (`M3` for wood, `Pcs`, `Kg`, `Ml`, `M2` for panels/hardware). Summing raw `CurrentStock` across mixed units in a single KPI number is misleading. Therefore, expose:
     - `TotalUnsoldStockWoodM3` (sum of `CurrentStock` where `IsWood == true` or `Unit == "M3"`),
     - `TotalUnsoldStockOtherUnits` (sum of non-wood units, or breakdown by `Unit`), AND
     - `TotalEstimatedStockValueHT` (universal monetary metric in `DT` that aggregates cleanly across all units!).
3. **Estimated Stock Valuation (HT, rounded to 3 decimals — Tunisian millimes):**
   - Resolve `EstimatedUnitCostHT` in priority order:
     1. Latest purchase unit cost HT from non-deleted `supplierReceipt` (`2`) or unlinked `supplierInvoice` (`3`) lines where `Quantity > 0`: `CostNetHT / Quantity` (all-time latest, not limited to current year).
     2. Fallback: `a.LastPurchasePriceTTC > 0` → `a.LastPurchasePriceTTC / (1 + (tvaRate / 100.0))` where `tvaRate = a.TVAs?.Value ?? 0`.
     3. Fallback: `0` (mark `ValuationSource = "MissingCost"` so managers know cost data is missing).
   - `EstimatedStockValueHT = Math.Round((decimal)Math.Max(0, CurrentStock) * EstimatedUnitCostHT, 3)`.
   - `PotentialSellValueHT = Math.Round((decimal)Math.Max(0, CurrentStock) * (decimal)(a.SellPriceHT ?? 0), 3)`.

### 4.2 Clear State Taxonomy (Orthogonal Flags + Status Classification) `[Recommendation]`

To prevent ambiguity between **no sales activity**, **no current stock**, and **newly created articles**, every returned article carries explicit orthogonal flags alongside a primary classification enum:

| Dimension | Field | Values / Formula | Meaning |
| :--- | :--- | :--- | :--- |
| **Sales Activity** | `SalesInactivityType` | `"NeverSold"` (`LastSaleDate == null`)<br>`"NoRecentSales"` (`LastSaleDate < cutoffDate`) | Distinguishes articles that have **never** generated a sale from previously active articles that went dormant. |
| **Stock Presence** | `StockAvailability` | `"InStock"` (`CurrentStock > 0`)<br>`"OutOfStock"` (`CurrentStock == 0`)<br>`"NegativeStock"` (`CurrentStock < 0`) | Distinguishes immobilized capital (`InStock`) from dead/empty catalog items (`OutOfStock`) or inventory anomalies (`NegativeStock`). |
| **Article Age** | `IsNewlyCreated` | `a.CreationDate >= graceCutoffDate` (and `ArticleAgeDays = (Now - CreationDate).Days`) | Prevents brand-new catalog items from being misclassified as stagnant/dormant inventory. |
| **Valuation Quality** | `ValuationSource` | `"LastPurchaseDoc"` \| `"ArticleLastPurchasePrice"` \| `"MissingCost"` | Gives full transparency when an article's cost value falls back or is `0 DT`. |

### 4.3 Multi-Tenant Isolation Guarantee `[Confirmed Implementation]`

- All queries run exclusively through `WoodAppContext` (scoped per request via `TenantContext`).
- `WoodAppContext.OnModelCreating` enforces `modelBuilder.HasDefaultSchema(SchemaName)` and `TenantModelCacheKeyFactory` caches EF models per schema.
- No hardcoded schema names, no cross-schema joins, and no raw SQL bypassing EF Core schema routing.
- Site filtering (`siteId`) operates strictly within the tenant's own `tbl_sales_sites`.

---

## Phase 5 — Technical Recommendations

### 5.1 Recommended Backend Endpoint & Request Parameters `[Recommendation]`

Add a single, cohesive endpoint to `AnalyticsController`:

```http
GET /api/Analytics/unsold-merchandise
Authorization: Bearer <JWT>
X-Tenant-Slug: <tenant-slug>
```

*(Apply `[Authorize]` on the action and verify tenant context.)*

| Query Parameter | Type | Default | Validation / Purpose |
| :--- | :--- | :--- | :--- |
| `months` | `int` | `6` | Allowed values: `3`, `6`, `12` (return `400 BadRequest` otherwise). |
| `siteId` | `int?` | `null` | Optional `SalesSiteId`. When set, scopes both stock quantity and sales activity to that site. |
| `categoryId` | `int?` | `null` | Optional `Article.ParentId` filter. |
| `subCategoryId` | `int?` | `null` | Optional `Article.FirstChildId` filter. |
| `onlyWithStock` | `bool` | `true` | When `true`, returns only articles with `CurrentStock > 0`. |
| `excludeNewArticles` | `bool` | `true` | When `true`, excludes articles created within `newArticleGraceDays`. |
| `newArticleGraceDays` | `int` | `30` | Grace period in days (`0..365`) for `IsNewlyCreated` classification. |
| `inactivityType` | `string?` | `null` | Optional filter: `"NeverSold"` or `"NoRecentSales"`. |
| `search` | `string?` | `null` | Case-insensitive filter on `Reference` or `Description`. |
| `sortBy` | `string` | `"stockValue"` | `"stockValue"` \| `"currentStock"` \| `"lastSaleDate"` \| `"daysSinceLastSale"` \| `"reference"`. |
| `sortDir` | `string` | `"desc"` | `"asc"` \| `"desc"`. |
| `page` | `int` | `1` | 1-based page number. |
| `pageSize` | `int` | `20` | Clamped to `1..100` (or `500` for export, or provide a separate export flag/limit). |

### 5.2 Proposed Response DTOs `[Recommendation]`

Location: `wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/Analytics/UnsoldMerchandiseDto.cs`

```csharp
public class UnsoldMerchandiseResponseDto
{
    public int PeriodMonths { get; set; }
    public DateTime CutoffDate { get; set; }
    public int? SiteId { get; set; }
    public UnsoldMerchandiseSummaryDto Summary { get; set; } = new();
    public List<UnsoldMerchandiseCategoryBreakdownDto> BySubCategory { get; set; } = new();
    public List<UnsoldMerchandiseItemDto> Items { get; set; } = new();
    public int TotalItemsCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class UnsoldMerchandiseSummaryDto
{
    public int TotalActiveMerchandiseArticles { get; set; }   // Denominator for % share
    public int UnsoldArticlesCount { get; set; }              // Matching active filters
    public double UnsoldPercentage { get; set; }              // Unsold / TotalActive * 100
    public int NeverSoldCount { get; set; }                   // LastSaleDate == null
    public int NoRecentSalesCount { get; set; }               // LastSaleDate < CutoffDate
    public int UnsoldWithStockCount { get; set; }             // CurrentStock > 0
    public int UnsoldWithoutStockCount { get; set; }          // CurrentStock <= 0 (always computed for context)
    public int NewlyCreatedExcludedCount { get; set; }        // Created within grace period
    public double TotalUnsoldWoodVolumeM3 { get; set; }       // Sum of CurrentStock for IsWood == true
    public double TotalUnsoldNonWoodQuantity { get; set; }    // Sum of CurrentStock for IsWood == false
    public decimal TotalEstimatedStockValueHT { get; set; }   // Primary monetary KPI (DT HT, 3 decimals)
    public decimal TotalPotentialSellValueHT { get; set; }    // Secondary monetary metric (DT HT)
    public int MissingCostArticlesCount { get; set; }         // Articles valued at 0 due to missing cost
}

public class UnsoldMerchandiseCategoryBreakdownDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int SubCategoryId { get; set; }
    public string SubCategoryName { get; set; } = string.Empty;
    public int UnsoldArticlesCount { get; set; }
    public int NeverSoldCount { get; set; }
    public decimal EstimatedStockValueHT { get; set; }
}

public class UnsoldMerchandiseItemDto
{
    public int ArticleId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string SubCategoryName { get; set; } = string.Empty;
    public bool IsWood { get; set; }
    public string? Unit { get; set; }
    public double CurrentStock { get; set; }
    public decimal EstimatedUnitCostHT { get; set; }
    public decimal EstimatedStockValueHT { get; set; }
    public decimal PotentialSellValueHT { get; set; }
    public string ValuationSource { get; set; } = string.Empty; // "LastPurchaseDoc" | "ArticleLastPurchasePrice" | "MissingCost"
    public DateTime CreationDate { get; set; }
    public int ArticleAgeDays { get; set; }
    public DateTime? LastSaleDate { get; set; }
    public int? DaysSinceLastSale { get; set; }
    public string SalesInactivityType { get; set; } = string.Empty; // "NeverSold" | "NoRecentSales"
    public string StockAvailability { get; set; } = string.Empty;   // "InStock" | "OutOfStock" | "NegativeStock"
    public bool IsNewlyCreated { get; set; }
}
```

### 5.3 SQL / EF Core Query Strategy `[Recommendation]`

Use **4 small, set-based, server-side aggregated EF Core LINQ queries** (all `.AsNoTracking()`, zero N+1 loops, no raw SQL):

1. **Query 1 — Active Merchandise Articles (Projected):**
   - Query `_context.Articles.AsNoTracking()` where `!a.IsDeleted && a.Type == ArticleType.Merchandise` (plus optional `categoryId` / `subCategoryId` / `search`).
   - Project only needed scalar columns (`Id`, `Reference`, `Description`, `IsWood`, `Unit`, `CreationDate`, `SellPriceHT`, `LastPurchasePriceTTC`, `TvaRate = a.TVAs != null ? a.TVAs.Value : 0`, `ParentId`, `CategoryName`, `FirstChildId`, `SubCategoryName`).
2. **Query 2 — Server-Side Last Sale Date per Article (Deduplicated):**
   - Build an `IQueryable<Document>` for effective sales documents:
     ```csharp
     var effectiveSaleLines = _context.DocumentMerchandises
         .AsNoTracking()
         .Where(dm =>
             dm.Type == LineType.Merchandise &&
             dm.MerchandiseId != null &&
             dm.Quantity > 0 &&
             dm.Merchandise != null &&
             dm.Document != null &&
             !dm.Document.IsDeleted &&
             dm.Document.DocStatus != DocStatus.Deleted &&
             dm.Document.DocStatus != DocStatus.Abandoned &&
             dm.Document.DocStatus != DocStatus.Rejected &&
             (siteId == null || dm.Document.SalesSiteId == siteId.Value) &&
             (
                 dm.Document.Type == DocumentTypes.customerDeliveryNote ||
                 (
                     dm.Document.Type == DocumentTypes.customerInvoice &&
                     !dm.Document.ChildDocuments.Any(r =>
                         r.ChildDocument != null &&
                         !r.ChildDocument.IsDeleted &&
                         r.ChildDocument.Type == DocumentTypes.customerDeliveryNote) &&
                     !dm.Document.ParentDocuments.Any(r =>
                         r.ParentDocument != null &&
                         !r.ParentDocument.IsDeleted &&
                         r.ParentDocument.Type == DocumentTypes.customerDeliveryNote)
                 )
             ))
         .GroupBy(dm => dm.Merchandise!.ArticleId)
         .Select(g => new { ArticleId = g.Key, LastSaleDate = g.Max(x => x.Document!.CreationDate) });
     ```
   - Translates cleanly to a single SQL `GROUP BY` with `NOT EXISTS` anti-joins using existing indexes! Returns at most 1 lightweight row per sold article.
3. **Query 3 — Server-Side Current Stock per Article:**
   - Query `_context.Stocks.AsNoTracking()` where `s.Merchandises != null && !s.Merchandises.IsDeleted && (siteId == null || s.SalesSiteId == siteId.Value)`, grouped server-side by `s.Merchandises.ArticleId` → `SUM(s.Quantity)`.
4. **Query 4 — Latest Purchase Unit Cost HT (Only for Unsold In-Stock Article IDs):**
   - After identifying the unsold article IDs with `CurrentStock > 0` in memory (joining the 3 small dictionaries in $O(N)$), run 1 targeted query against `_context.DocumentMerchandises` filtered by `unsoldWithStockArticleIds.Contains(dm.Merchandise!.ArticleId)` for `supplierReceipt` (`2`) and unlinked `supplierInvoice` (`3`) where `dm.Quantity > 0`, fetching the latest `CostNetHT / Quantity` per article.
   - This avoids scanning purchase history for articles that *were* sold or have `0` stock.

### 5.4 Recommended Frontend Components & Integration `[Recommendation]`

| Layer | Proposed File | Responsibility |
| :--- | :--- | :--- |
| **Types** | `elance-app.ui/src/types/analytics.ts` | Add `UnsoldMerchandiseResponseDto`, `UnsoldMerchandiseSummaryDto`, `UnsoldMerchandiseCategoryBreakdownDto`, `UnsoldMerchandiseItemDto`, `UnsoldMerchandiseParams`. |
| **Service** | `elance-app.ui/src/services/components/analytics.service.ts` | Add `getUnsoldMerchandise(params: UnsoldMerchandiseParams)` → `GET /Analytics/unsold-merchandise`. |
| **Hook** | `elance-app.ui/src/hooks/use-analytics-kpis.ts` | Add `useUnsoldMerchandise(params)` with `queryKey: ['analytics', 'unsold-merchandise', params]`, `staleTime: 5 * 60 * 1000`, `placeholderData: (prev) => prev`. |
| **Section Card** | `elance-app.ui/src/components/analytics/unsold-merchandise-section.tsx` | Mounted in `src/app/analytics/page.tsx` right below *Santé du Stock par Sous-Catégorie*. Contains:<br>• Header with segmented **`3 | 6 | 12 mois`** buttons, dynamic `useSites()` dropdown, `"Stock > 0 uniquement"` toggle, and `"Voir tout / Exporter"` button.<br>• **4 Mini KPI Tiles:** *Articles sans ventes* (+ `%` du catalogue), *Valeur Stock Immobilisé (HT)*, *Jamais vendus* vs *Sans vente récente*, *Volume Bois Dormant ($m^3$)*.<br>• **2-Column Content Grid:** Left = Recharts horizontal `BarChart` of top 8 sub-categories by immobilized stock value (`DT`); Right = Compact top-10 highest-value unsold articles table with status badges (`Jamais vendu` / `Dormant` / `Nouveau`) and last sale date. |
| **Deep-Dive Modal** | `elance-app.ui/src/components/analytics/unsold-merchandise-dialog.tsx` | Full exploration `Dialog` (matching *Suivi des Créances Clients*): search input, category/sub-category filter, inactivity type pills (`Tous` / `Jamais vendus` / `Sans vente récente`), stock toggle (`Stock > 0` / `Tous`), new-article toggle, sort selector, `TablePagination`, and UTF-8 BOM CSV / Excel (`xlsx`) export. |

### 5.5 Performance Considerations `[Recommendation]`

- **Server-Side Grouping:** Unlike `GetTopSubCategoriesAsync` (which materializes every document line into C# memory), the proposed `GroupBy(dm => dm.Merchandise.ArticleId)` + `Max(CreationDate)` executes entirely in PostgreSQL, transferring only `~100–5,000` tiny `{ ArticleId, LastSaleDate }` pairs instead of hundreds of thousands of document lines.
- **Scoped Cost Lookup:** Query 4 restricts purchase-cost lookup strictly to `unsoldWithStockArticleIds`, keeping memory and I/O minimal.
- **Frontend Caching:** `staleTime: 5 * 60 * 1000` + `placeholderData: (prev) => prev` prevents redundant refetches and eliminates UI flicker when switching between `3`, `6`, and `12` months or paginating.

### 5.6 Indexing Recommendations `[Confirmed Implementation]` & `[Recommendation]`

**Already Present in `wood-app.api/db/FullDb_Migration/full_migration.sql` (Sufficient for MVP):**
- `idx_tbl_document_type_deleted_date` on `tbl_document (type, isdeleted, creationdate DESC)`
- `IX_tbl_document_salessiteid` on `tbl_document (salessiteid)`
- `idx_tbl_doc_merch_doc_merch_type` on `tbl_document_merchandise (documentid, line_type, merchandiseid)`
- `IX_tbl_merchandise_articleid` on `tbl_merchandise (articleid)`
- `IX_tbl_stock_idmerchandise` and `IX_tbl_stock_idsite` on `tbl_stock`
- PK `(parent_document_id, child_document_id)` and `IX_tbl_document_document_relationship_child_document_id` on `tbl_document_document_relationship`

**Optional Non-Blocking Performance Indexes (Only if a tenant exceeds >100k document lines / >10k articles):**
- Partial index on `tbl_article (idcategory, idsubcategory) WHERE isdeleted = false AND articletype = 0`
- Composite index on `tbl_stock (idsite, idmerchandise) WHERE quantity > 0`
- *(If ever added, must follow the multi-tenant schema-loop migration pattern in `db/wood/v0.XX/` and update `full_migration.sql`.)*

### 5.7 Potential Risks & Edge Cases `[Code-Backed Finding]`

| Risk / Edge Case | Technical Cause | Mitigation |
| :--- | :--- | :--- |
| **1. Double-counting / missed deduplication on BL ↔ Invoice** | `DocumentController.cs` inserts opposite parent/child directions in `createinvoice` vs `/convert`. | Check **both** `ChildDocuments` and `ParentDocuments` in the `customerInvoice` exclusion predicate, and cover both paths with xUnit tests. |
| **2. Timestamp Kind Mismatch (`timestamp without time zone`)** | `tbl_document.creationdate` and `tbl_article.creationdate` are PostgreSQL `timestamp without time zone`, while `AnalyticsService` uses `DateTime.UtcNow`. Npgsql 7 throws if `DateTimeKind.Utc` is compared against `timestamp without time zone` unless legacy timestamp behavior is enabled or `DateTime.SpecifyKind(..., DateTimeKind.Unspecified)` is used. | Match existing `AnalyticsService.cs` behavior (verify `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` in `Program.cs`) and test against real PostgreSQL. |
| **3. Missing Purchase Cost (Zero Valuation)** | Articles entered via opening inventory (`DocumentTypes.inventory = 10`) without a supplier receipt and with `LastPurchasePriceTTC == 0` will evaluate to `0 DT`. | Expose `ValuationSource = "MissingCost"` and `MissingCostArticlesCount` in the summary so managers see an explicit indicator rather than a silently underestimated total. |
| **4. Mixed Measurement Units ($m^3$ vs Pcs/Kg)** | Timber tenants mix cubic-meter wood articles with unit-based hardware/panels. | Never sum raw quantities across incompatible units in a headline KPI; split `TotalUnsoldWoodVolumeM3` vs `TotalUnsoldNonWoodQuantity` and lead with monetary valuation (`DT HT`). |
| **5. Multi-Site Transfers vs Sales** | When filtering by `siteId`, an article may have stock on Site B (transferred from Site A) and sales only on Site A. | Clearly label the site filter tooltip: *"Filtre le stock actuel et les ventes enregistrées sur le site sélectionné"*. |
| **6. Negative Stock Rows** | Articles with `AllowNegativStock = true` can have `CurrentStock < 0`. | Clamp valuation to `Math.Max(0, CurrentStock)` so negative stock never artificially reduces total immobilized stock value, and tag `StockAvailability = "NegativeStock"`. |
| **7. Missing `[Authorize]` on `AnalyticsController`** | Existing `AnalyticsController` omits `[Authorize]`. | Add `[Authorize]` to the new `GetUnsoldMerchandise` action (and align with JWT tenant verification). |

---

## Approval Checklist for Implementation Phase

Before proceeding to implementation, please confirm:
1. **Default filter behavior:** `onlyWithStock = true` and `excludeNewArticles = true` (30-day grace period), both toggleable in the UI?
2. **Valuation metric:** Primary KPI in **Purchase Cost HT (`DT`)**, with optional Potential Sell Value HT?
3. **Returns handling:** Count any positive sale line as sales activity, or require net quantity `(sales - returns) > 0`?
4. **UI placement:** Modular `UnsoldMerchandiseSection` below *Santé du Stock par Sous-Catégorie* + full deep-dive modal with CSV/Excel export?
