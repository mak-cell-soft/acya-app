# Élancé AI Sales Agent — n8n Integration Foundation (P1)

## Pilot Tenant: SOCOFEB

This document outlines the n8n integration foundation for the **Élancé AI Sales Agent** pilot. It defines the workflow architecture, security protocols, API endpoints tested, and strict constraints ensuring data isolation and confidentiality.

---

## 1. Architectural Principles

```
  +-----------------------------------------------------------------+
  |                        n8n Instance                             |
  |                   (https://n8n.acya.site)                       |
  |  Workflow: "Élancé AI — SOCOFEB — P1 API Integration Test"      |
  +--------------------------------+--------------------------------+
                                   |
                                   | HTTPS Request
                                   | Headers:
                                   |   X-AI-Secret: <AI_SERVICE_SECRET>
                                   |   X-Tenant-Slug: socofeb
                                   v
  +-----------------------------------------------------------------+
  |                       ACYA / Élancé API                         |
  |                   (/api/ai/* Surface Layer)                     |
  |                                                                 |
  |  1. SubdomainTenantResolver & TenantMiddleware                  |
  |     -> Strict tenant binding to 'socofeb'                       |
  |     -> Schema dynamic resolution to 'tenant_socofeb'            |
  |                                                                 |
  |  2. RequireAiSecret (Constant-time token validation)            |
  |                                                                 |
  |  3. Élancé Domain Services & Repositories                       |
  |     (ArticleRepository, PricingGridService, StockService)       |
  +--------------------------------+--------------------------------+
                                   |
                                   | Scoped EF Core DbContext
                                   v
  +-----------------------------------------------------------------+
  |                      PostgreSQL Database                        |
  |                     Schema: tenant_socofeb                      |
  +-----------------------------------------------------------------+
```

### Core Architecture Guarantees:
- **No Direct Database Access:** n8n **NEVER** connects directly to PostgreSQL. Direct SQL queries from n8n to tenant databases are strictly prohibited.
- **ACYA as the Single Source of Truth:** The Élancé backend API is the only authority for product catalog, dimensional metrics, inventory availability, selling prices, and customer data.

---

## 2. n8n Workflow Specification

- **Workflow Name:** `Élancé AI — SOCOFEB — P1 API Integration Test`
- **Workflow ID:** `SocofebP1ApiTest`
- **Base URL:** `https://socofeb.acya.site/api/ai` (or `https://acya.site/api/ai` with tenant header)
- **Workflow File:** [socofeb_p1_integration_test.json](file:///home/ubuntu/acya-app/scripts/n8n/socofeb_p1_integration_test.json)
- **Triggers:**
  - **Manual Trigger:** Used within the n8n Canvas UI for controlled test runs (`When clicking ‘Execute workflow’`).
  - **Programmatic Webhook:** `POST /webhook/socofeb-p1-test` (for headless integration verification).

---

## 3. Authentication & Tenant Security

### Service-to-Service Secret (`X-AI-Secret`)
- Every HTTP request dispatched by n8n to `/api/ai/*` must supply the header:
  ```http
  X-AI-Secret: <AI_SERVICE_SECRET>
  ```
- **Storage:** The secret must be stored in n8n's secure credential store (type `httpHeaderAuth`) or configuration parameters.
- **Redaction:** The secret must **never** be printed, logged, returned in workflow outputs, or stored in node data.

### Fixed Tenant Isolation (`X-Tenant-Slug`)
- The workflow explicitly and immutably attaches:
  ```http
  X-Tenant-Slug: socofeb
  ```
- **Constraint:** The tenant slug is hardcoded to `socofeb` in this workflow. No dynamic LLM parameter or request input is permitted to override the tenant slug.

---

## 4. Endpoints Tested in Workflow

| Branch / Node | Endpoint | HTTP Method | Expected Customer-Safe Data |
| :--- | :--- | :--- | :--- |
| **A. Tenant Info** | `/api/ai/tenant-info` | `GET` | Company name, address, phone, email, currency. No internal registry or subscription data. |
| **B. Product Search** | `/api/ai/products/search?query=MDF&limit=10` | `GET` | Catalog products (id, reference, name, category, unit, isWood). No purchase costs or margins. |
| **C. Product Details** | `/api/ai/products/{id}` | `GET` | Dimensional metrics (thickness, width, length, volume $m^3$), wood lengths. No supplier data. |
| **D. Product Price** | `/api/ai/products/{id}/price` | `GET` | `SellPriceHT`, `SellPriceTTC`, TVA. No buy price, no margins. Catalog price only (no phone used in P1). |
| **E. Product Availability** | `/api/ai/products/{id}/availability` | `GET` | `InStock` / `OutOfStock`, customer-safe length availability for wood merchandise. No depot bin locations. |

---

## 5. Sequential Controlled Pipeline

The workflow executes a complete end-to-end simulation:
```text
Manual Trigger (Query: "Je cherche du MDF 18mm")
    ↓
Product Search (query: "MDF", limit: 10)
    ↓
Select First Safe Result
    ↓
Product Details (GET /api/ai/products/{id})
    ↓
Product Price (GET /api/ai/products/{id}/price)
    ↓
Product Availability (GET /api/ai/products/{id}/availability)
    ↓
Build Customer-Safe Result
    ↓
Final Test Output
```

### Final Customer-Safe Output Schema:
```json
{
  "tenant": "SOCOFEB",
  "query": "Je cherche du MDF 18mm",
  "product": {
    "id": 42,
    "reference": "MDF-18-BLANC",
    "description": "MDF Blanc 18mm",
    "category": "Panneaux",
    "unit": "Pcs",
    "isWood": false,
    "dimensions": null,
    "availableLengths": null,
    "priceHT": 85.000,
    "tvaRate": 19.0,
    "priceTTC": 101.150,
    "currency": "TND",
    "isAvailable": true,
    "stockStatus": "InStock",
    "woodLengths": null
  }
}
```

---

## 6. Error Handling Architecture

The workflow implements error normalization to prevent leaking technical or sensitive exception details:

| HTTP Status | Normalized Customer-Facing Message | Description |
| :--- | :--- | :--- |
| `401 Unauthorized` | `"AI API authentication failed"` | Secret missing, expired, or invalid. |
| `404 Not Found` | `"Product/resource not found"` | Item does not exist or search returned 0 items. |
| `400 Bad Request` | `"Invalid AI API request"` | Malformed parameters or queries. |
| `5xx Server Error` | `"ACYA AI API unavailable"` | Backend service temporary error. |
| `Timeout / Network`| `"ACYA AI API connection failed"` | Network unreachable. |

---

## 7. Security Negative Tests

Two automated negative test nodes are included in the workflow:
1. **Missing Secret Test:** Dispatches `GET /api/ai/tenant-info` with `X-Tenant-Slug: socofeb` without `X-AI-Secret`. Must receive `401 Unauthorized`.
2. **Invalid Secret Test:** Dispatches `GET /api/ai/tenant-info` with `X-Tenant-Slug: socofeb` and `X-AI-Secret: INTENTIONALLY_INVALID_SECRET_TEST`. Must receive `401 Unauthorized`.

---

## 8. Current Integration & Stop Condition Status

- **Workflow Validation:** The workflow is valid, imported into n8n, published, and active in `https://n8n.acya.site`.
- **Live Endpoint Status:** The live production container (`wood-app-api`) is running the build from 4 days ago prior to P0 backend implementation. Live calls to `/api/ai/*` return `404 Not Found` until the container is updated with the P0 build and `AI_SERVICE_SECRET` is added to production configuration.
- **Strict Compliance:** In accordance with Section 11 & 12 instructions, production infrastructure was **not** silently modified, and deployment is halted for review.
