# Main ERP Frontend Agent Instructions (elance-app.ui)

This document provides specialized guidelines for AI agents working on the **ACYA App Main ERP Frontend**.

---

## 1. Technology Stack

- **Framework:** Next.js 16.2.4 (App Router)
- **Core Library:** React 19.2.4
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS 4 + Shadcn UI + Base UI (`@base-ui/react`) + `tw-animate-css`
- **Animation:** Framer Motion
- **Data Fetching & Server Cache:** TanStack React Query v5
- **HTTP Client:** Axios with custom interceptors
- **Global Client State:** Zustand (with localStorage persistence)
- **Form Handling & Validation:** React Hook Form + Zod
- **Real-time:** `@microsoft/signalr`
- **Notifications:** Sonner (`toast`)
- **Data Export:** `xlsx` for Excel, custom print layouts for documents

---

## 2. Directory Structure & Architecture

```text
elance-app.ui/
├── src/
│   ├── app/                 # Next.js App Router (pages, layouts, route handlers)
│   │   ├── (auth)/          # Authentication flows (login, forgot-password)
│   │   ├── (dashboard)/     # Main authenticated ERP layout and modules
│   │   │   ├── sales/       # Devis, BC, BL, Factures, Retours, Avoirs
│   │   │   ├── purchases/   # Commandes Fournisseurs, Réceptions, Factures Fournisseurs
│   │   │   ├── inventory/   # Physical inventory, counts, stock reconciliation
│   │   │   ├── stock/       # Stock catalog, movements, multi-site warehouse transfers
│   │   │   ├── treasury/    # Bordereaux, cheques, traites, cashbox (caisse), bank reconciliation
│   │   │   ├── chantier/    # Construction project tracking (conditional module)
│   │   │   ├── production/  # Wood processing & manufacturing (conditional module)
│   │   │   ├── team/        # Employees, roles, permissions, payroll, leaves
│   │   │   └── settings/    # Enterprise profile, printing templates, app variables
│   │   └── globals.css      # Core design tokens, corporate color palette, fonts
│   ├── components/          # React components
│   │   ├── ui/              # Primitive Shadcn / Base UI components (buttons, dialogs, inputs)
│   │   ├── shared/          # Shared domain UI (navbar, sidebar, data-table, metric-cards)
│   │   └── [feature]/       # Feature-specific dialogs, forms, and tables
│   ├── hooks/               # Custom React Query hooks (useDocuments, useArticles, useStock, etc.)
│   ├── services/            # Axios API wrappers (document.service.ts, article.service.ts, etc.)
│   ├── store/               # Zustand stores (use-tenant-store.ts, use-auth-store.ts)
│   ├── types/               # TypeScript domain interfaces (must match backend DTOs)
│   └── lib/                 # Utility helpers, date formatting, and configured Axios instance
```

---

## 3. Multi-Tenant Integration & HTTP Client

All API communication is routed through the central Axios instance in [src/lib/axios.ts](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/lib/axios.ts).

### Tenant Slug Resolution
The Axios request interceptor automatically resolves the tenant slug:
1. Subdomain from `window.location.hostname` (e.g., `socobois.acya.site` $\rightarrow$ `socobois`).
2. Query parameter `?tenant=socobois` (used in development or testing).
3. Injects the HTTP header `X-Tenant-Slug: {slug}` on every outgoing request.

### Tenant State & Feature Gating
- **Branding & Tenant Context:** Handled by [TenantProvider.tsx](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/components/TenantProvider.tsx) and [use-tenant-store.ts](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/store/use-tenant-store.ts). Unregistered or disabled tenants are redirected to `/tenant-not-found`.
- **Feature Flags:** Enterprise tenants subscribe to different modules (e.g. *Chantier*, *Production*).
  - Use [useTenantFeatures()](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/hooks/use-tenant-features.ts) to check module availability (`isModuleAvailable('chantiers')`).
  - Use [usePermissionGuard()](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/hooks/use-permission-guard.ts) before rendering sensitive action buttons or pages.
  - **Rule:** Never display UI or execute actions for an unsubscribed module.

---

## 4. Coding Conventions & Best Practices

Derived from [docs/coding-rules.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/docs/coding-rules.md):

### General Rules
- ✅ **Do** use TypeScript's strict mode.
- ✅ **Do** use absolute imports via `@/*`.
- ❌ **Don't** use `any`. Use `unknown` or define an explicit interface in `src/types/`.
- ✅ **Do** use `kebab-case` for file/folder names (except React components).
- ✅ **Do** use `PascalCase` for React components.
- ✅ **Do** add `'use client'` explicitly to components that use React hooks, Zustand, React Query, or browser DOM events.

### Data Fetching Pattern
Always wrap API calls in a TanStack React Query hook under `src/hooks/`:

```tsx
// Pattern: Custom React Query Hook (src/hooks/use-articles.ts)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/components/article.service';
import { Article } from '@/types/article';

export function useArticles() {
  return useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: () => articleService.getAll(),
  });
}
```

### Aesthetic & Design Guidelines
- **Typography:** Display font is Sentient; primary body font is DM Sans (`--font-sans`).
- **Color System:** Use CSS variables defined in [src/app/globals.css](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/app/globals.css):
  - Primary corporate blues: `var(--corp-blue-600)`, `var(--corp-navy)`
  - Timber accents: `var(--timber-400)`, `var(--timber-600)`
  - Background neutrals: `var(--sand-50)`, `var(--sand-100)`
- **Dynamic Tenant Branding:** Respect tenant-customized brand colors (`primaryColor`, `secondaryColor`) exposed by `useTenantStore()`.

---

## 5. Critical Gotchas

> [!WARNING]
> **Turbopack Configuration in `next.config.ts`:**
> Do **NOT** set `turbopack.root` in `next.config.ts`. It causes `@import "tailwindcss"` to be resolved from the monorepo root instead of `elance-app.ui/node_modules/`, resulting in CSS build failures.

> [!NOTE]
> **Next.js 16 Dynamic Parameters:**
> In Next.js 16 Server Components, `params` and `searchParams` are Promises (`params: Promise<{ id: string }>`). Await them before reading properties.

---

## 6. Development & Validation Commands

All commands must be executed within `elance-app.ui/`:

| Task | Command |
| :--- | :--- |
| **Start Dev Server** | `npm run dev` (starts on port 3000) |
| **Type-Check** | `npx tsc --noEmit` |
| **Lint** | `npm run lint` |
| **Production Build** | `npm run build` |
