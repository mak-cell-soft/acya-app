# ACYA Architecture Documentation

## 1. System Overview

ACYA is a multi-tenant Enterprise Resource Planning (ERP) platform designed for the timber, wood trade, construction, and workshop manufacturing industries.

### Core Components:
1. **Core Business API (`wood-app.api`):** ASP.NET Core Web API targeting `.NET 7`, using Entity Framework Core 7 and PostgreSQL 15.
2. **Main ERP Web Client (`elance-app.ui`):** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, TanStack Query v5.
3. **Backoffice SaaS Suite (`bo-acya-app`):** Admin portal for super-administrators managing tenant provisioning, subscription tiers, and system monitoring.
4. **Mobile Release & Download Engine:** Secure, tenant-isolated mobile APK build and distribution pipeline.

---

## 2. Multi-Tenant Architecture

ACYA uses a **PostgreSQL Schema-per-Tenant** architecture.

- **Master Database (Public Schema):** Stores central registry `bo_tbl_enterprise` (`TenantRegistry`), global settings, and cross-tenant mobile builds (`bo_tbl_mobile_builds`).
- **Tenant Schemas (`tenant_{slug}`):** Isolated per customer (e.g. `tenant_socobois`, `tenant_piqbit`), housing documents, merchandise, physical stock, cash registers, invoices, and users.
- **Tenant Resolution:** Handled by `TenantMiddleware` using `X-Tenant-Slug`, host headers, and JWT verification.

---

## 3. Security & Permission System

- **Authentication:** Standard JWT Bearer tokens signed with HMAC-SHA256 (`JWTSettings:securityKey`).
- **Authorization:** Policy-based authorization backed by `PermissionHandler` inspecting JSON permissions maps stored in `tbl_user_permissions`.
- **Tenant Isolation:** Enforced both at schema-level by EF Core model caching and at endpoint-level by comparing requested resources with the verified user tenant slug.
- **Short-Lived Signed Tokens:** Used for sensitive transient operations like private mobile artifact streaming.
