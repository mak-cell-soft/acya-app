# ACYA Mobile API Reference

## Mobile Releases API (Tenant Users)

Base Route: `/api/mobile/releases`

### 1. List Tenant Releases
- **Method:** `GET`
- **Route:** `/api/mobile/releases`
- **Authorization:** Bearer JWT with `MobileApp.CanView` policy
- **Description:** Returns all succeeded releases for the authenticated user's tenant.
- **Response:**
  ```json
  {
    "items": [
      {
        "id": 142,
        "tenantId": "socofeb",
        "version": "1.4.2",
        "buildNumber": 142,
        "status": "Succeeded",
        "createdAt": "2026-09-27T10:00:00Z",
        "completedAt": "2026-09-27T10:05:00Z",
        "artifactSize": 52428800,
        "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
        "releaseNotes": "Nouvelle version avec lecteur de code-barres"
      }
    ],
    "totalCount": 1
  }
  ```

### 2. Get Release Details
- **Method:** `GET`
- **Route:** `/api/mobile/releases/{id}`
- **Authorization:** Bearer JWT with `MobileApp.CanView` policy
- **Description:** Retrieves details for a specific release ID belonging to the user's tenant. Returns 403/404 if the ID belongs to another tenant.

### 3. Request Authorized Download
- **Method:** `POST`
- **Route:** `/api/mobile/releases/{id}/download`
- **Authorization:** Bearer JWT with `MobileApp.CanDownload` policy
- **Description:** Validates tenant ownership and permissions, and returns a short-lived signed download URL (15 minutes expiration).
- **Response:**
  ```json
  {
    "releaseId": 142,
    "tenantId": "socofeb",
    "version": "1.4.2",
    "fileName": "acya-socofeb-1.4.2.apk",
    "downloadUrl": "/api/mobile/releases/download?token=...",
    "expiresAt": "2026-09-27T13:30:00Z"
  }
  ```

### 4. Stream APK Binary
- **Method:** `GET`
- **Route:** `/api/mobile/releases/download?token={token}`
- **Authorization:** Anonymous (bearer cryptographic signature in query parameter)
- **Content-Type:** `application/vnd.android.package-archive`
- **Description:** Validates HMAC-SHA256 signature and expiration, streams APK artifact, and logs audit event.

---

## Mobile Builds Admin API (SuperAdmin / Admin)

Base Route: `/api/admin/mobile/builds`

### 1. Initiate Build
- **Method:** `POST`
- **Route:** `/api/admin/mobile/builds`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy
- **Request Body:**
  ```json
  {
    "tenantId": "socofeb",
    "version": "1.4.2",
    "buildNumber": 142,
    "releaseNotes": "Version avec gestion des chantiers",
    "gitBranch": "main"
  }
  ```

### 2. List Builds
- **Method:** `GET`
- **Route:** `/api/admin/mobile/builds?tenantId=socofeb&status=Pending&page=1&pageSize=50`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy

### 3. Get Build by ID
- **Method:** `GET`
- **Route:** `/api/admin/mobile/builds/{id}`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy

### 4. Get Dynamic Tenant Configuration for Build
- **Method:** `GET`
- **Route:** `/api/admin/mobile/builds/{id}/config`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy OR CI Service Token (`X-CI-Token: {token}`)
- **Response:**
  ```json
  {
    "tenantId": "socofeb",
    "companyName": "SOCOFEB",
    "appName": "SOCOFEB",
    "packageName": "com.socofeb.woodapp",
    "logo": "assets/tenants/socofeb/logo.svg",
    "primaryColor": "#1E3A8A",
    "secondaryColor": "#3B82F6",
    "baseUrl": "https://socofeb.acya.site/api/",
    "environment": "production",
    "language": "fr",
    "currency": "TND",
    "hasChantierModule": true,
    "hasProductionModule": false
  }
  ```

### 5. Update Build Status (CI/CD Callback)
- **Method:** `PATCH`
- **Route:** `/api/admin/mobile/builds/{id}/status`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy OR CI Service Token (`X-CI-Token: {token}`)
- **Request Body:**
  ```json
  {
    "status": "Succeeded",
    "artifactPath": "socofeb/142/app.apk",
    "artifactSize": 52428800,
    "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    "gitCommitHash": "e28d8b1",
    "workflowRunId": "123456789"
  }
  ```

### 6. Upload Build Artifact (CI/CD Binary Transfer)
- **Method:** `POST`
- **Route:** `/api/admin/mobile/builds/{id}/artifact`
- **Authorization:** Bearer JWT with `RequireAdminRole` policy OR CI Service Token (`X-CI-Token: {token}`)
- **Headers:** `X-Artifact-Sha256: {sha256}` (optional verification header)
- **Content-Type:** `multipart/form-data`
- **Request Body:** `file: [binary .apk or .aab]`
- **Description:** Streams binary directly into private storage (`storage/private/mobile/{tenantId}/{buildNumber}/{fileName}`), computes/verifies SHA-256 and byte length, and updates the `MobileBuild` record.
- **Response:**
  ```json
  {
    "id": 142,
    "tenantId": "socofeb",
    "version": "1.4.2",
    "buildNumber": 142,
    "status": "Building",
    "artifactPath": "socofeb/142/SOCOFEB-1.4.2-142.apk",
    "artifactSize": 58698741,
    "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b"
  }
  ```
