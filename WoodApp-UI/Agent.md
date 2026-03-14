# Frontend Agent Context (WoodApp-UI)

## 1. Project Overview
- **Project Name:** wood-app-ui
- **Type:** Frontend Application
- **Tech Stack:** Angular 18 (with SSR), TypeScript, RxJS
- **Architecture:** Feature-based Modular Architecture (Domain-Driven Design)
- **State Management:** NgRx (Store, Effects, Entity)
- **UI Frameworks:** Angular Material, FontAwesome, Chart.js
- **Primary Purpose:** A comprehensive web-based ERP for wood/merchandise handling, covering stock, articles, customers, providers, billing, and system configuration.

## 2. Folder Structure (New Architectural Layout)
- `src/app/` - Main application source code
  - **`features/`** - Domain-driven feature modules (All are Lazy Loaded)
    - `auth/` - Authentication logic and login views.
    - `dashboard/` - Main application shell (Home layout, Header, Footer) and Dashboard variants (Home, Admin).
    - `articles/` - Article management and dimension tracking.
    - `customers/` - Customer management and related account modals.
    - `providers/` - Provider management and coordination.
    - `merchandise/` - Documents workflow (Receptions, Deliveries, Invoices, Supplier Orders).
    - `stock/` - Inventories, movements, and stock transfers.
    - `inventory/` - Periodic physical inventory management.
  - `core/` - Global singleton services, guards, and interceptors.
  - `shared/` - Truly generic UI components (Shared Modals), models, constants, and validators.
  - `store/` - Global NgRx implementation (shared state like App Variables, Banks).
  - `services/` - API communication services (grouped by feature/entity).
  - `models/` - TypeScript interfaces, DTOs, and print templates.

## 3. Key Files & Entry Points
- **`src/app/app.module.ts`**: The root module. Now kept slim; handles global infrastructure and boots the app.
- **`src/app/app-routing.module.ts`**: Definition of the main routes using `loadChildren` for lazy loading features.
- **`src/app/features/*/`**: Each feature folder contains its own `.module.ts` and `-routing.module.ts`.
- **`src/app/shared/components/modals/`**: Holds modals used across multiple features (e.g., `ConfirmDeleteModalComponent`, `PaymentModalComponent`).

## 4. Architecture & Patterns
- **Feature Encapsulation:** Components are private to their feature modules unless exported.
- **Lazy Loading Implementation:** All major route branches are lazy-loaded via `loadChildren` in the root router.
- **OnPush Change Detection:** Recommended for all components to ensure optimal performance in high-data dashboards.
- **Smart/Dumb Component Separation:**
  - **Smart (Container):** Handles data fetching, NgRx interaction, and routing.
  - **Dumb (Presentational):** Receives data via `@Input` and communicates via `@Output`.
- **Reactive State Management:** Global entities are managed via NgRx to maintain a single source of truth.

## 5. Conventions & Rules
- **Component Naming:** PascalCase for class names, kebab-case for file names and selectors.
- **Module Registration:** New components must be declared in THEIR respective feature module, not `AppModule`.
- **Routing:** Feature-specific routes should be defined in the feature's `*-routing.module.ts`.
- **Comments Required:** Always explain the "Why" and "Angular-specific" patterns (Lifecycle, DI, Signals).
- **Aesthetics (Premium):** Commit to a bold aesthetic direction before coding. Use meaningful motion and distinctive typography.

## 6. Component Tree (Summary)

```text
src/app/
├── app.component.ts                # App Shell
├── features/
│   ├── auth/                       # SignInComponent
│   ├── dashboard/                  # HomeComponent (Shell), Header, Footer, Dashboards, Config
│   ├── articles/                   # AddArticle, ListArticle
│   ├── customers/                  # AddCustomer, ListCustomers, Account Modals
│   ├── providers/                  # AddProvider, ListProvider, Details
│   ├── merchandise/                # Reception, Delivery, Invoices, Supplier Orders
│   ├── stock/                      # StockList, Movement, Transfer
│   └── inventory/                  # AddInventory, ListInventory
├── shared/
│   └── components/modals/           # Generic Confirmation, Payment, Delete Modals
└── ...
```

## 7. Major Components & Routing Table

| Component | Type | Module (Lazy) | Routed? | Description |
|-----------|------|---------------|---------|-------------|
| `AppComponent` | Smart | `AppModule` | ❌ | Root anchor for the whole application. |
| `SignInComponent` | Smart | `AuthModule` | ✅ | Handles login logic and JWT storage. |
| `HomeComponent` | Smart | `DashboardModule` | ✅ | The main Layout Shell (Sidenav + Header). |
| `HomeDashboardComponent` | Smart | `DashboardModule` | ✅ | Visual KPI dashboard for standard users. |
| `AdminDashboardComponent` | Smart | `DashboardModule` | ✅ | High-level business overview for administrators. |
| `ConfigurationComponent` | Smart | `DashboardModule` | ✅ | System variables, banks, categories, and employees. |
| `ListArticleComponent` | Smart | `ArticlesModule` | ✅ | Searchable grid for wood articles. |
| `ListCustomersComponent`| Smart | `CustomersModule` | ✅ | Customer CRM and balances. |
| `StockListComponent` | Smart | `StockModule` | ✅ | Real-time stock counts grouped by category. |
| `ListDocumentsComponent`| Smart | `MerchandiseModule`| ✅ | Supplier reception documents (BR). |
| `ListCustomerInvoices` | Smart | `MerchandiseModule`| ✅ | Customer billing history. |

## 8. Quick Context Tags
#angular18 #lazy-loading #feature-modules #ngrx #domain-driven #erp #wood-management #premium-ui
