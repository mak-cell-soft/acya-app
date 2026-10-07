# ACYA Élancé — AI Sales Agent Backend API Specification (P0)

This document describes the dedicated backend API under `/api/ai/*` designed for the **SOCOFEB AI Sales Agent** pilot. It provides the secure foundation that orchestrators (such as n8n) consume to answer customer queries regarding product catalog, selling prices, availability, and human handoff.

---

## 1. Architectural Overview

```
                      +-----------------------------+
                      |       n8n Orchestrator      |
                      |   (WhatsApp / Webhooks)     |
                      +--------------+--------------+
                                     |
                                     | HTTPS Request
                                     | Headers:
                                     |   X-AI-Secret: <AIService:Secret>
                                     |   X-Tenant-Slug: socofeb
                                     v
+------------------------------------------------------------------------+
|                             ACYA / Élancé API                          |
|                                                                        |
|  1. SubdomainTenantResolver / TenantMiddleware                         |
|     -> Resolves 'socofeb' -> schema: 'tenant_socofeb'                  |
|                                                                        |
|  2. RequireAiSecretAttribute (Service-to-Service Auth)                  |
|     -> Constant-time verification of X-AI-Secret against config        |
|                                                                        |
|  3. AiSalesController (/api/ai/*)                                      |
|     -> Invokes ArticleRepository, PricingGridService, StockService     |
|     -> Sanitizes into Ai* customer-safe DTOs                           |
|     -> Suppresses purchase costs, margins, suppliers, & accounting     |
|                                                                        |
|  4. WoodAppContext (Scoped Multi-Tenant DbContext)                     |
|     -> Executes queries strictly against 'tenant_socofeb' schema       |
+------------------------------------------------------------------------+
```

---

## 2. Authentication & Tenant Isolation

### Service-to-Service Authentication
- **Header:** `X-AI-Secret: <secret_value>`
- **Validation:**
  - Enforced on all endpoints under `/api/ai/*` via `[RequireAiSecret]`.
  - The secret is resolved from ASP.NET Core configuration key `AIService:Secret` (or environment variable `AI_SERVICE_SECRET`).
  - Compared using constant-time evaluation (`CryptographicOperations.FixedTimeEquals`) to prevent timing side-channel attacks.
  - Returns `401 Unauthorized` if the header is missing, empty, or invalid.
  - The secret is never logged in audit trails or application logs.

### Multi-Tenant Isolation
- **Header:** `X-Tenant-Slug: socofeb` (or proxy subdomain `socofeb.acya.site`).
- **Resolution:**
  - Evaluated by `SubdomainTenantResolver` and `TenantMiddleware` before the controller is invoked.
  - Dynamically routes EF Core entities to `tenant_socofeb` schema.
  - **Zero Parameter Override:** The controller does not accept schema or tenant parameters from the request query or body.

---

## 3. Endpoints Reference

All endpoints are prefixed with `/api/ai`.

### 3.1 Product Search
`GET /api/ai/products/search?query={query}&limit={limit}`

Searches active catalog merchandise by reference or description.

- **Parameters:**
  - `query` (string, required, min length 2, max length 100): Search term.
  - `limit` (int, optional, default `10`, clamped between `1` and `20`).
- **Response:** `200 OK` — `List<AiProductDto>`

```json
[
  {
    "id": 42,
    "reference": "MDF-18-BLANC",
    "name": "MDF Blanc 18mm",
    "category": "Panneaux",
    "subCategory": "MDF",
    "unit": "Pcs",
    "isWood": false,
    "imageUrl": "https://cdn.example.com/images/mdf-18-blanc.jpg"
  }
]
```

---

### 3.2 Product Details
`GET /api/ai/products/{id}`

Returns customer-safe details for a specific product, including dimensional metrics and available wood lengths if applicable.

- **Parameters:**
  - `id` (int, required): Product ID (must be > 0).
- **Response:** `200 OK` — `AiProductDetailDto`

```json
[
  {
    "id": 42,
    "reference": "CHENE-BRUT-27",
    "name": "Chêne Brut 27mm",
    "category": "Bois Dur",
    "subCategory": "Chêne",
    "unit": "m³",
    "isWood": true,
    "imageUrl": null,
    "dimensions": {
      "thickness": 27.0,
      "width": 150.0,
      "length": 300.0,
      "volumeM3": 0.01215
    },
    "availableLengths": [
      "2.4m",
      "3.0m",
      "4.2m"
    ]
  }
]
```

---

### 3.3 Product Price
`GET /api/ai/products/{id}/price?customerPhone={phone}`

Returns the current customer-safe selling price. If `customerPhone` matches an active client in the tenant database, client-negotiated pricing/discounts (pricing grid) are applied. Otherwise, the standard catalog price is returned.

- **Parameters:**
  - `id` (int, required): Product ID.
  - `customerPhone` (string, optional): Customer phone number for identification. Common Tunisian formats are supported (`+21698123456`, `21698123456`, `98 123 456`, `98123456`).
- **Response:** `200 OK` — `AiPriceDto`

```json
{
  "articleId": 42,
  "reference": "MDF-18-BLANC",
  "name": "MDF Blanc 18mm",
  "unit": "Pcs",
  "sellPriceHT": 85.000,
  "tvaRate": 19.0,
  "sellPriceTTC": 101.150,
  "currency": "TND",
  "isCustomerSpecific": true,
  "discountRate": 5.0
}
```

---

### 3.4 Product Availability
`GET /api/ai/products/{id}/availability`

Returns customer-safe stock availability. For wood merchandise with length breakdown, length-specific stock availability is included.

- **Parameters:**
  - `id` (int, required): Product ID.
- **Response:** `200 OK` — `AiAvailabilityDto`

```json
{
  "articleId": 42,
  "reference": "CHENE-BRUT-27",
  "name": "Chêne Brut 27mm",
  "isAvailable": true,
  "stockStatus": "InStock",
  "unit": "m³",
  "depot": "Dépôt Principal",
  "woodLengths": [
    {
      "length": 3.0,
      "packageCount": 4,
      "pieceCount": 120,
      "isAvailable": true
    },
    {
      "length": 4.2,
      "packageCount": 2,
      "pieceCount": 60,
      "isAvailable": true
    }
  ]
}
```

---

### 3.5 Tenant Information
`GET /api/ai/tenant-info`

Returns commercial, public business information for the active tenant (e.g. SOCOFEB).

- **Response:** `200 OK` — `AiTenantInfoDto`

```json
{
  "tenantSlug": "socofeb",
  "companyName": "SOCOFEB Bois et Dérivés",
  "address": "Route de Sousse Km 4, Sfax, Tunisie",
  "phone": "+21674123456",
  "email": "contact@socofeb.tn",
  "currency": "TND",
  "businessType": "Timber & Building Materials",
  "isWoodSpecialist": true
}
```

---

### 3.6 Sales Handoff
`POST /api/ai/handoff`

Triggered when the AI agent determines that a human sales representative must intervene (e.g., custom price quote, large order, negotiation, or complaint). Creates an in-app notification in Élancé assigned to the sales team (`Seller` role).

- **Request Body:** `AiHandoffRequestDto`
```json
{
  "customerPhone": "+21698123456",
  "customerName": "Ali Ben Salem",
  "reason": "Prix sur mesure",
  "summary": "Client souhaite un devis pour 200 panneaux MDF 18mm et négocier une remise."
}
```

- **Response:** `200 OK` — `AiHandoffResponseDto`
```json
{
  "success": true,
  "notificationId": 312,
  "message": "Human sales handoff registered successfully."
}
```

---

## 4. Security Rules & Data Protection

1. **Suppression of Confidential Commercial Data:**
   - Under no circumstances do `/api/ai/*` endpoints expose:
     - Purchase price (`BuyPriceHT`, `BuyPriceTTC`)
     - Profit margins or target margin percentages
     - Supplier identities, supplier codes, or purchase history
     - Accounting codes, journal vouchers, or tax registration IDs of partners
2. **Strict Phone Number Matching:**
   - Phone numbers are matched using the last 8 digits for Tunisian numbers (`+216`, `216`, spaces, and dashes are stripped).
   - If no match or multiple contradictory matches exist, the API securely falls back to the default catalog price without failing or disclosing ambiguity.
3. **Audit Logging & Privacy:**
   - Structured logs capture the endpoint, tenant slug, duration, and HTTP status code.
   - Headers (`X-AI-Secret`, `Authorization`) are strictly redacted.
   - PII is restricted to minimal identifier references necessary for handoff notifications.

---

## 5. Consuming via n8n

When constructing n8n HTTP Request nodes:

1. **HTTP Node Headers:**
   - `X-AI-Secret`: `{{ $env.SOCOFEB_AI_SECRET }}`
   - `X-Tenant-Slug`: `socofeb`
   - `Content-Type`: `application/json`
2. **Search Workflow Pattern:**
   `GET https://api.socofeb.acya.site/api/ai/products/search?query={{ $json.searchTerm }}`
3. **Price Workflow Pattern:**
   `GET https://api.socofeb.acya.site/api/ai/products/{{ $json.productId }}/price?customerPhone={{ $json.waUserPhone }}`
4. **Handoff Workflow Pattern:**
   `POST https://api.socofeb.acya.site/api/ai/handoff` with body:
   ```json
   {
     "customerPhone": "{{ $json.waUserPhone }}",
     "customerName": "{{ $json.waUserName }}",
     "reason": "Escalade commerciale",
     "summary": "{{ $json.aiSummary }}"
   }
   ```
