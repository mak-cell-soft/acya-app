# ACYA Mobile Application Download & Build System

## 1. System Overview

This document details the backend foundation, security policies, and API contracts for the **ACYA Tenant-Specific Mobile Application System**.

```text
admin.acya.site
      │
      │ 1. POST /api/admin/mobile/builds
      ▼
ACYA API (Core Backend)
      │
      │ 2. Trigger Workflow (Future CI/CD)
      ▼
GitHub Actions (mobile-elance-fo)
      │
      │ 3. Build Tenant-Specific APK
      ▼
Private Mobile Artifact Storage (/storage/private/mobile/{tenantId}/{build}/)
      │
      │ 4. User navigates to downloads portal
      ▼
downloads.acya.site/mobile/{tenantId}/
      │
      │ 5. Authenticate via existing ACYA credentials
      ▼
ACYA API (Authentication + Tenant Context + Permissions)
      │
      │ 6. POST /api/mobile/releases/{id}/download
      ▼
Cryptographically Signed Short-Lived Token (HMAC-SHA256, 15 min TTL)
      │
      │ 7. GET /api/mobile/releases/download?token=...
      ▼
Secure APK Stream (application/vnd.android.package-archive)
```

---

## 2. Status: Implemented vs. Planned

### ✅ Implemented (Current Phase)
- **Domain Entities & Tracking:** `MobileBuild` and `MobileBuildStatus` stored in `public.bo_tbl_mobile_builds`.
- **Database Migrations:** SQL script `db/wood/v0.30/V0.30__add_mobile_builds.sql` and updated `db/FullDb_Migration/full_migration.sql`.
- **EF Core Persistence:** Mapped in both `MasterDbContext` and `WoodAppContext`.
- **Strict Tenant Isolation:** Cross-tenant release downloads or queries are verified server-side against the authenticated tenant context and JWT claims; cross-tenant access returns HTTP 403 Forbidden.
- **Permission System Integration:** `MobileAppPermissions` added to `AppPermissionsMap` with policies `MobileApp.CanView`, `MobileApp.CanDownload`, `MobileApp.CanManage`, `MobileApp.CanBuild`.
- **Private Artifact Storage Abstraction:** `IMobileArtifactStorage` and `LocalFileSystemMobileArtifactStorage` with path traversal protection.
- **Short-Lived Signed Download Tokens:** `IMobileDownloadTokenService` generating HMAC-SHA256 tokens with configurable expiration (default 15 minutes).
- **Public & Admin REST API Endpoints:**
  - `GET /api/mobile/releases`
  - `GET /api/mobile/releases/{id}`
  - `POST /api/mobile/releases/{id}/download`
  - `GET /api/mobile/releases/download?token=...`
  - `POST /api/admin/mobile/builds` (creates build + dispatches GitHub Actions workflow)
  - `GET /api/admin/mobile/builds`
  - `GET /api/admin/mobile/builds/{id}`
  - `GET /api/admin/mobile/builds/{id}/config`
  - `PATCH /api/admin/mobile/builds/{id}/status`
  - `POST /api/admin/mobile/builds/{id}/artifact` (secure streaming upload to private storage)
- **Dynamic Tenant Configuration:** `IMobileTenantConfigService` dynamically generating brand colors, package name, logo, currency, and modules from existing enterprise and tenant registry records.
- **GitHub Actions Automation Pipeline:**
  - Workflow file: `.github/workflows/mobile-build.yml` in `mobile-elance-fo`.
  - Automated dispatch via `IGitHubBuildDispatcher` / `GitHubBuildDispatcher` using GitHub REST API `workflow_dispatch`.
  - Least-privilege CI/CD authentication via `AuthorizeAdminOrCiTokenAttribute` (`X-CI-Token` / Bearer token).
  - Dynamic configuration injection: generates `assets/tenant_config.json` and prepares assets without git commits.
  - Strict configuration data validation (tenant ID, package name, URLs, colors).
  - Android release signing configuration from encrypted secrets (`ANDROID_KEYSTORE_BASE64`).
  - Automated APK packaging, SHA-256 calculation, and authenticated upload directly to ACYA private storage.
  - Lifecycle state tracking: `Pending` -> `Building` -> `Succeeded` / `Failed` with sanitized error reporting.
- **Audit Logging:** Integrated with ACYA `IAuditService` recording `MobileBuildCreated` and `MobileReleaseDownloaded` events.
- **Automated Test Suite:** 26 comprehensive test cases verifying build dispatch, status callbacks, CI authentication, artifact upload, SHA-256 checksumming, permissions, tenant isolation, download tokens, path traversal security, and streaming.

### ⏳ Planned (Future Phases)
- **Frontend Download Portal:** Dedicated portal on `downloads.acya.site/mobile/{tenantId}` with QR codes and install guides.
- **Push & WhatsApp Notifications:** Notifying users when a new release is available.

---

## 3. Authentication & Tenant Isolation

1. **Authentication:** The existing ACYA authentication endpoint (`POST /api/account/login`) is used. No secondary credentials or duplicate user tables are created.
2. **Tenant Resolution:** `TenantMiddleware` resolves the tenant slug from `X-Tenant-Slug` header, host subdomain, or query parameter, and cross-validates it against the JWT `tenant_slug` claim.
3. **Defense-in-Depth:**
   - In `MobileReleasesController`, client-provided tenant IDs are ignored.
   - The server inspects the authenticated identity (`User.FindFirst("tenant_slug")` and `TenantContext.Slug`).
   - If an authenticated user from `tenant_a` attempts to access or download a release belonging to `tenant_b`, the API returns HTTP 403 Forbidden without leaking file existence.

---

## 4. Permissions Matrix

| Role / Permission | `MobileApp.CanView` | `MobileApp.CanDownload` | `RequireAdminRole` (`MobileApp.CanBuild`) |
| :--- | :---: | :---: | :---: |
| **SuperAdmin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **User (with `CanDownload: true`)** | ✅ Yes | ✅ Yes | ❌ No |
| **User (default / no explicit grants)**| ❌ No | ❌ No | ❌ No |

---

## 5. Storage Architecture

- Artifacts are stored in private storage outside public web roots.
- Default path: `storage/private/mobile/{tenantId}/{buildNumber}/{fileName}`.
- Path traversal protection validates that all resolved paths are strictly bounded inside `MobileStorage:BasePath`.
- Tokens are short-lived (15 minutes) and signed using HMAC-SHA256 with the application secret key. Direct storage paths are never revealed to clients.
