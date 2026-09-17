# 🌲 ACYA App — WoodApp ERP System

![ACYA App Banner](https://img.shields.io/badge/ACYA-WoodApp--ERP-2e7d32?style=for-the-badge&logo=react&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production--Ready-0284c7?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-.NET%20%7C%20Next.js%2016%20%7C%20React%2019%20%7C%20PostgreSQL-7c3aed?style=for-the-badge)
![Multi-Tenant](https://img.shields.io/badge/Architecture-Schema--per--Tenant-amber?style=for-the-badge)

**ACYA App** is a modern, full-stack Enterprise Resource Planning (ERP) and multi-tenant management system specifically engineered for timber and wood merchandise industries. It combines a high-performance ASP.NET Core backend with a responsive Next.js web application and a dedicated backoffice administration platform.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Nginx Reverse Proxy   │
                                  │   (Wildcard SSL *.acya)│
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             [*.acya.site / UI]                                [admin.acya.site]
                      │                                               │
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │      elance-app.ui      │                     │     admin-elance-front  │
         │ Next.js 16 / React 19   │                     │   Next.js SuperAdmin    │
         │ (Main ERP Application)  │                     │      (bo-acya-app)      │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
             HTTP / Tenant Slug                               HTTP / Admin JWT
                      │                                               │
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │       wood-app.api      │                     │    admin-elance-back    │
         │    ASP.NET Core Web API │                     │   ASP.NET Core API      │
         │  (Core Business Logic)  │                     │  (Tenant Provisioning)  │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │     PostgreSQL 15       │
                                 │  (Schema-per-Tenant)    │
                                 │ wood-app-db / app-db-bo │
                                 └─────────────────────────┘
```

---

## 🧩 Workspace Projects

### 1. 🌐 Main ERP Frontend ([`elance-app.ui`](./elance-app.ui/))
Modern, responsive web client providing day-to-day operations for wood merchandise companies.
- **Framework**: Next.js 16 (App Router) with React 19 & TypeScript
- **Styling & UI**: Tailwind CSS v4, Base UI (`@base-ui/react`), Shadcn UI, Framer Motion, Lucide Icons
- **State & Data Fetching**: TanStack React Query v5, Zustand, Axios
- **Key Modules**:
  - **Ventes (Sales)**: Devis, Bons de Commande, Bons de Livraison, Factures, Retours, Avoirs
  - **Achats (Purchases)**: Commandes Fournisseurs, Réceptions, Factures Fournisseurs, Traites & Échéances
  - **Stocks & Inventaires**: Catalogue Articles & Dimensions, Gestion Multi-Sites, Inventaires Physiques avec filtres par période/statut, Transferts inter-dépôts
  - **Comptabilité & Trésorerie**: Bordereaux, Règlements, Retenues à la source (RS), Rapprochement bancaire
  - **RH / Équipe**: Gestion des employés, Paies, Congés, Avances
  - **Paramétrage**: Sites de vente, Variables applicatives, Règles de numérotation, Modèles d'impression

### 2. ⚙️ Core ERP API ([`wood-app.api`](./wood-app.api/))
Clean Architecture ASP.NET Core Web API powering business logic, calculation engines, and persistence.
- **Framework**: ASP.NET Core (.NET 7 / EF Core)
- **Database**: PostgreSQL with multi-tenant schema isolation (Schema-per-Tenant)
- **Security**: JWT Authentication, Tenant-resolution middleware (`X-Tenant-Slug` or subdomain), Role-based authorization
- **Document & Print Engine**: QuestPDF for custom PDF generation (factures, BL, inventaires, traites), ClosedXML for Excel processing
- **Communication & Real-time**: SignalR hubs for real-time notifications, MailKit for automated transactional emails
- **Documentation**: Swagger / OpenAPI integration

### 3. 🛡️ Backoffice Platform ([`bo-acya-app`](./bo-acya-app/))
Dedicated administrative suite for SaaS owner / super-administrators.
- **`admin-elance-back`**: ASP.NET Core API handling enterprise onboarding, automated PostgreSQL schema creation (`full_migration.sql`), tenant provisioning, and billing webhooks.
- **`admin-elance-front`**: Next.js administrative frontend for monitoring tenants, user quotas, database migrations, and system health.

### 4. 🔄 Integrations & Automations
- **`docker-compose.n8n.yml`**: n8n workflow engine for automated notification and data integration workflows.
- **`qwerty-app/`**: External electronic invoicing and data interchange specifications (XML/XSD).
- **`scripts/`**: Infrastructure, SSL renewals, database migrations, and deployment automation scripts.

---

## 📂 Repository Structure

```text
acya-app/
├── elance-app.ui/             # Main ERP Frontend (Next.js 16 + React 19 + Tailwind v4)
│   ├── src/app/               # Next.js App Router pages (inventory, sales, purchases, stock, etc.)
│   ├── src/components/        # Reusable UI & business domain components
│   ├── src/hooks/             # React Query hooks & permission guards
│   ├── src/services/          # API & server-action clients
│   └── Dockerfile             # Main UI container definition
├── wood-app.api/              # Core Business Backend (.NET Web API + PostgreSQL)
│   ├── src/                   # Multi-tier architecture:
│   │   ├── ms.webapp.api.acya/               # API Controllers & Middlewares
│   │   ├── ms.webapp.api.acya.core/          # Domain Entities, DTOs & Interfaces
│   │   ├── ms.webapp.api.acya.infrastructure/# EF Core DbContext, Repositories, Migrations
│   │   └── ms.webapp.api.acya.common/        # Enums, Helpers, Constants
│   ├── db/                    # PostgreSQL init scripts & incremental SQL migrations
│   └── Dockerfile             # Core API container definition
├── bo-acya-app/               # Backoffice Administration Suite
│   ├── admin-elance-back/     # Backoffice API (Tenant management, migrations)
│   └── admin-elance-front/    # Backoffice Admin UI (Next.js)
├── qwerty-app/                # E-Invoicing / Qwerty integration schemas
├── scripts/                   # Deployment, Nginx, SSL, and migration utility scripts
├── docker-compose.yml         # Main orchestration (postgres, api, migration-ui, admin-api, admin-ui)
├── docker-compose.n8n.yml     # Workflow automation engine (n8n)
└── DEPLOYMENT.md              # Production deployment & Nginx wildcard guide
```

---

## 🚀 Quick Start with Docker

The entire stack can be launched locally or on staging using Docker Compose:

### 🛠️ Common Docker Commands

| Action | Command |
| :--- | :--- |
| **Start Entire Stack** | `docker compose up -d` |
| **Full Rebuild & Start** | `docker compose up -d --build` |
| **Restart Core API** | `docker compose up -d --build api` |
| **Restart Main ERP UI** | `docker compose up -d --build migration-ui` |
| **Restart Backoffice API** | `docker compose up -d --build admin-api` |
| **Restart Backoffice UI** | `docker compose up -d --build admin-ui` |
| **Stop All Containers** | `docker compose down` |
| **Follow Logs** | `docker compose logs -f` |

### 🌐 Default Exposed Ports (Docker)

| Service | Container Name | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `wood-app-postgres` | `5432` | `5432` | Core & Backoffice Database |
| **Core API** | `wood-app-api` | `8080` | `80` | ASP.NET Core Business API |
| **Main ERP UI** | `migration-ui` | `5000` | `3000` | Next.js Main ERP Web App |
| **Admin API** | `admin-elance-back` | `8082` | `80` | Backoffice Management API |
| **Admin UI** | `admin-elance-front` | `5002` | `3000` | Backoffice Web Client |

---

## 💻 Local Development Setup

### 1. Database (PostgreSQL)
Ensure a PostgreSQL 15 instance is running with `wood-app-db` and `app-db-bo` databases, or start the database container alone:
```bash
docker compose up -d postgres
```

### 2. Core Backend API (`wood-app.api`)
```bash
cd wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya
dotnet restore
dotnet run
```
* API available at: `http://localhost:5068` (or `https://localhost:7142`)
* Swagger UI available at: `http://localhost:5068/swagger`

### 3. Main ERP Frontend (`elance-app.ui`)
```bash
cd elance-app.ui
npm install
npm run dev
```
* Accessible at: `http://localhost:3000`

### 4. Backoffice Suite (`bo-acya-app`)
* **Admin Frontend**:
  ```bash
  cd bo-acya-app/admin-elance-front
  npm install
  npm run dev
  ```
  * Accessible at: `http://localhost:3001`
* **Admin Backend**:
  ```bash
  cd bo-acya-app/admin-elance-back/src/ms.admin.api.acya/ms.admin.api.acya
  dotnet run
  ```

---

## 📑 Detailed Documentation

- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) — Production Multi-Tenant (Schema-per-Tenant) guide, Nginx reverse proxy configuration & wildcard SSL setup.
- 📐 [Conception.md](./Conception.md) — ERP system conception and business model specifications.
- 🔍 [logic.md](./logic.md) — Functional audit and exhaustive domain mapping.
- 🔐 [SOL-TEJ-SSH.md](./SOL-TEJ-SSH.md) — TEJ server integration, SSH tunnel setup and configuration.
- 🖥️ [elance-app.ui/README.md](./elance-app.ui/README.md) — UI architecture, component guidelines, and client-side setup.
- ⚙️ [wood-app.api/README.md](./wood-app.api/README.md) — API architecture and package specifications.

---

*Maintained by the ACYA App Engineering Team.*
