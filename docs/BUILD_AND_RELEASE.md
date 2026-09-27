# ACYA Build & Release Pipeline

## 1. Overview

The ACYA Mobile Release pipeline builds custom, tenant-branded Android APKs from a single unified codebase (`mobile-elance-fo`).

```text
admin.acya.site
      │
      │ 1. POST /api/admin/mobile/builds
      ▼
ACYA API
      │
      │ 2. Dispatches workflow via GitHub REST API (workflow_dispatch)
      ▼
GitHub Actions Workflow (.github/workflows/mobile-build.yml)
      │
      │ 3. Fetches dynamic tenant config: GET /api/admin/mobile/builds/{id}/config
      │ 4. Updates status to Building: PATCH /api/admin/mobile/builds/{id}/status
      │ 5. Validates data & injects runtime config & assets
      │ 6. Signs with Android release keystore from secrets
      │ 7. Compiles signed release APK: flutter build apk --release
      │ 8. Computes exact SHA-256 and byte size
      │ 9. Uploads APK to private storage: POST /api/admin/mobile/builds/{id}/artifact
      │ 10. Reports completion: PATCH /api/admin/mobile/builds/{id}/status (Succeeded)
      ▼
Private Mobile Artifact Storage (/storage/private/mobile/{tenantId}/{build}/)
      │
      ▼
Release Available for Secure Tenant Downloads
```

---

## 2. GitHub Actions Integration Pipeline (Implemented)

### Workflow Specification:
* **Workflow file:** `.github/workflows/mobile-build.yml` in `mak-cell-soft/mobile-elance-fo`
* **Trigger:** `workflow_dispatch` with input `buildId` (and optional `apiEnvironment`, `apiBaseUrl`).
* **Permissions:** `contents: read` (least privilege; runner never writes or commits back to Git).
* **CI/CD Authentication:** Dedicated pre-shared token configured via GitHub Secret `ACYA_CI_TOKEN` and backend setting `MobileBuild:CiToken`. Authenticates via `X-CI-Token` / `Bearer` token; runner only has access to config, status, and artifact upload endpoints.
* **Config Data Validation:** Strict regex enforcement on tenant ID (`^[a-zA-Z0-9_-]+$`), package name (`^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$`), brand colors, and URL schemas. Configuration is treated as pure DATA, never executable shell script.
* **Release Signing:** Keystore injected dynamically from GitHub Secret `ANDROID_KEYSTORE_BASE64` into an isolated runner temporary file and cleaned up upon job completion. Falls back gracefully to debug keys for local development.
* **Artifact Upload:** Directly streamed to `POST /api/admin/mobile/builds/{id}/artifact` with `X-Artifact-Sha256` header validation, avoiding public GitHub release publication.
* **Traceability:** Workflow captures `gitCommitHash`, `gitBranch`, and `workflowRunId` for production traceability.

---

## 3. Storage Security Rules

1. **Private Roots:** APKs must never be stored inside web-accessible document roots (e.g. `wwwroot`).
2. **Isolation:** Each tenant's binaries are partitioned by folder: `{tenantId}/{buildNumber}/{fileName}`.
3. **No Direct Links:** Direct filesystem paths are never returned to clients.
4. **Token Verification:** Downloads require cryptographically signed, short-lived HMAC-SHA256 tokens expiring in 15 minutes.
