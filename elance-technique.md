# eLance — Documentation Technique Complète

> **Version :** Production  
> **Dernière mise à jour :** Juin 2026  
> **Périmètre :** Front-Office (elance-app.ui) · API Principale (wood-app.api) · Back-Office SaaS (bo-acya-app)

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Front-Office — elance-app.ui](#2-front-office--elance-appui)
3. [API Principale — wood-app.api](#3-api-principale--wood-appapi)
4. [Back-Office SaaS — bo-acya-app](#4-back-office-saas--bo-acya-app)
5. [Multi-Tenancy](#5-multi-tenancy)
6. [Modèle de données](#6-modèle-de-données)
7. [Infrastructure & Déploiement](#7-infrastructure--déploiement)
8. [Sécurité](#8-sécurité)

---

## 1. Vue d'ensemble de l'architecture

### Topologie globale

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            INTERNET (HTTPS)                                   │
└─────────────────────┬────────────────────────────────┬───────────────────────┘
                      │                                │
              ┌───────▼───────┐               ┌────────▼───────┐
              │  Nginx (TLS)  │               │  Nginx (TLS)   │
              │  acya.site    │               │ admin.acya.site │
              │  *.acya.site  │               │                │
              └───────┬───────┘               └────────┬───────┘
                      │                                │
        ┌─────────────┼──────────────┐        ┌────────┴────────┐
        │             │              │        │                 │
┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ │ ┌─────────────┐ │
│ elance-app.ui│ │ wood-app │ │  (tenant   │ │ │admin-elance │ │
│ Next.js 16   │ │   .api   │ │  subdom.)  │ │ │   -front    │ │
│ port 5000    │ │ .NET 7   │ │            │ │ │ Next.js     │ │
└──────────────┘ │ port 8080│ └────────────┘ │ │ port 5002   │ │
                 └──────────┘                │ └──────┬──────┘ │
                      │                      │        │        │
                      │                      │ ┌──────▼──────┐ │
              ┌───────▼────────┐             │ │admin-elance │ │
              │  PostgreSQL 15 │             │ │    -back    │ │
              │  Multi-Schema  │◄────────────┤ │ .NET 8      │ │
              │  port 5432     │             │ │ port 8082   │ │
              └────────────────┘             │ └─────────────┘ │
                                             └─────────────────┘
```

### Résumé des services

| Service | Technologie | Port | Rôle |
|---|---|---|---|
| `elance-app.ui` | Next.js 16 / React 19 | 5000 | Front-office SaaS (clients tenants) |
| `wood-app.api` | ASP.NET Core 7 / C# | 8080 | API REST principale multi-tenant |
| `admin-elance-front` | Next.js / React | 5002 | Interface back-office SaaS (admin global) |
| `admin-elance-back` | ASP.NET Core 8 / C# | 8082 | API back-office (gestion tenants, billing) |
| `postgres` | PostgreSQL 15-alpine | 5432 | Base de données (multi-schéma par tenant) |

---

## 2. Front-Office — elance-app.ui

### 2.1 Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | 16.2.4 |
| Runtime UI | **React** | 19.2.4 |
| Langage | **TypeScript** | 5.x |
| Styling | **TailwindCSS** | 4.x |
| Composants UI | **shadcn/ui** + **Radix UI** | 4.5.0 |
| État global | **Zustand** | 5.0.12 |
| Requêtes serveur | **TanStack React Query** | 5.100.5 |
| HTTP client | **Axios** | 1.15.2 |
| Animations | **Framer Motion** | 12.38.0 |
| Graphiques | **Recharts** | 3.8.1 |
| WebSocket temps réel | **@microsoft/signalr** | 10.0.0 |
| Formulaires | **React Hook Form** + **Zod** | 7.74.0 / 4.4.3 |
| Export Excel | **xlsx (SheetJS)** | 0.18.5 |
| PDF (impression) | Via API (QuestPDF côté serveur) | — |
| Toast/Notifications | **Sonner** | 2.0.7 |
| JWT decode | **jwt-decode** | 4.0.0 |
| Tests | **Vitest** + **@testing-library** | 4.x |

### 2.2 Architecture de fichiers

```
elance-app.ui/
└── src/
    ├── app/                    # Pages (App Router Next.js)
    │   ├── dashboard/          # Tableau de bord (point de vente & dépôt)
    │   ├── sales/              # Ventes : Devis, Commandes, BL, Factures
    │   │   ├── quote/          # Création/édition devis
    │   │   ├── order/          # Création/édition commande
    │   │   ├── bl/             # Création/édition bon de livraison
    │   │   ├── invoice/        # Création/édition facture
    │   │   └── deep-search/    # Recherche approfondie documents
    │   ├── purchases/          # Achats : Commandes, BR, Factures, Avoirs
    │   │   ├── order/          # Commande fournisseur
    │   │   ├── receipt/        # Bon de réception
    │   │   ├── payments/       # Règlements fournisseurs
    │   │   └── approvals/      # Circuit d'approbation achats
    │   ├── articles/           # Catalogue articles
    │   ├── customers/          # CRM clients
    │   ├── suppliers/          # Gestion fournisseurs
    │   ├── stock/              # Stocks multi-sites & transferts
    │   ├── inventory/          # Inventaire
    │   ├── accounting/         # Trésorerie & comptabilité
    │   │   └── treasury/       # Mouvements caisse & banque
    │   ├── analytics/          # Analytics & KPIs business
    │   ├── settings/           # Paramètres entreprise
    │   ├── team/               # Gestion équipe / utilisateurs
    │   ├── chantiers/          # Gestion chantiers
    │   ├── vehicles/           # Gestion véhicules
    │   ├── contact/            # Formulaire contact
    │   ├── login/              # Authentification
    │   ├── forgot-password/    # Réinitialisation mot de passe
    │   ├── enterprise-registration/ # Inscription tenant
    │   ├── suspended/          # Page tenant suspendu
    │   ├── mentions-legales/   # Mentions légales
    │   └── privacy/            # Politique de confidentialité
    ├── components/             # Composants réutilisables
    │   ├── shared/             # Layout, navigation, communs
    │   ├── ui/                 # Composants primitifs (shadcn/ui)
    │   ├── sales/              # Modaux et drawers ventes
    │   ├── purchases/          # Composants achats
    │   ├── articles/           # Filtres, formulaires articles
    │   ├── customers/          # Fiches, comptes, recouvrement
    │   ├── suppliers/          # Composants fournisseurs
    │   ├── stock/              # Composants stock
    │   ├── dashboard/          # Widgets dashboard
    │   ├── analytics/          # Journal d'activité
    │   ├── inventory/          # Inventaire
    │   ├── settings/           # Formulaires paramètres
    │   ├── print/              # Déclencheurs impression PDF
    │   └── tej/                # Module TéJ (Transferts)
    ├── hooks/                  # Custom React Query hooks
    ├── services/               # Couche API (Axios)
    ├── store/                  # Zustand stores (auth, tenant, app)
    ├── types/                  # Types TypeScript (DTOs)
    ├── lib/                    # Utilitaires (cn, formatters)
    └── constants/              # Constantes globales
```

### 2.3 Gestion de l'état

#### Zustand Stores

| Store | Fichier | Responsabilité |
|---|---|---|
| `useAuthStore` | `use-auth-store.ts` | JWT, user courant, rôle, site par défaut |
| `useTenantStore` | `use-tenant-store.ts` | Slug tenant, branding, plan |
| `useAppStore` | `use-app-store.ts` | État global applicatif |

#### TanStack React Query

- Toutes les requêtes API passent par des **hooks personnalisés** (`use-documents`, `use-customers`, `use-articles`, etc.)
- Cache automatique et invalidation intelligente après mutations
- Chaque hook utilise `queryKey` pour le cache et `staleTime` configuré par domaine

### 2.4 Architecture de communication

```
Composant React
     │
     ▼
Custom Hook (useXxx)          ← React Query
     │
     ▼
Service Layer (xxxService)    ← Axios instance
     │
     ▼
API Base URL                  ← NEXT_PUBLIC_API_URL
(https://acya.site/api/)
     │
     ▼
wood-app.api (.NET 7)
```

#### Headers envoyés automatiquement :
- `Authorization: Bearer <JWT>` — Authentication
- `X-Tenant-Slug: <slug>` — Résolution du tenant (multi-tenancy)
- `Content-Type: application/json`

### 2.5 Notifications temps réel

Le front-office se connecte via **SignalR WebSocket** au hub `/api/notificationHub` pour recevoir :
- Alertes stock en temps réel
- Notifications de documents créés
- Alertes système tenant

### 2.6 Modules applicatifs détaillés

#### Module Ventes (`/sales`)
- **Workflow** : `Devis → Commande → BL → Facture`
- Conversion individuelle (1 doc → 1 doc) ou en masse (N BLs → 1 Facture)
- Navigation journalière sur les BLs et factures
- Calcul KPI temps réel : CA HT, TTC, nombre de documents
- Retenue à la source (RS) sur factures clients
- Suivi paiements : montant payé, reste à régler
- Impression via PDF généré côté API (QuestPDF)
- Recherche approfondie multi-critères (`/sales/deep-search`)

#### Module Achats (`/purchases`)
- **Workflow** : `Commande → BR → Facture → Avoir`
- Sélection multiple de BRs pour facturation groupée par fournisseur
- Panel Retenues à la source fournisseurs
- Circuit d'approbation configurable (`/purchases/approvals`)
- Règlements fournisseurs (`/purchases/payments`)

#### Module Articles (`/articles`)
- Catalogue avec catégories et sous-catégories (arborescence 3 niveaux)
- Propriétés spécifiques bois : épaisseur, largeur, longueurs
- Prix HT/TTC, TVA par article, marge bénéficiaire en %
- Stock en temps réel décomposé par site
- Import/Export Excel massif (SheetJS)
- Historique des prix de vente par article

#### Module Clients (`/customers`)
- Fiche complète : raison sociale, MF, CIN, gouvernorat, coordonnées
- Solde client en temps réel (TND)
- Plafond de crédit et remise maximale configurables
- État de compte (historique des transactions)
- Recouvrement : suivi créances avec ancienneté (< 30j / 30-90j / > 90j)
- Import/Export Excel

#### Module Stock (`/stock`)
- Inventaire multi-sites avec quantités par site
- Transferts inter-sites avec traçabilité complète
- Dashboard Dépôt distinct du Dashboard Point de Vente

#### Module Analytics (`/analytics`)
- KPIs temps réel : CA jour, semaine, mois, achats, alertes stock
- Graphique évolution CA (6 mois) — AreaChart Recharts
- Répartition documents par type — PieChart Recharts
- Top articles vendus par sous-catégorie
- Santé du stock par article (OK / Alerte / Critique) — BarChart
- Achats vs Règlements fournisseurs — BarChart comparatif
- Créances clients avec ancienneté — BarChart horizontal
- Journal d'activité audit complet

#### Dashboard (`/dashboard`)
- Vue adaptée au profil : Point de Vente ou Dépôt
- Les admins ont un toggle pour basculer entre les deux vues
- Détection automatique du `defaultSiteIsForSale` depuis le JWT

---

## 3. API Principale — wood-app.api

### 3.1 Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Framework | **ASP.NET Core** | .NET 7.0 |
| Langage | **C#** | 11 |
| ORM | **Entity Framework Core** | 7.0.20 |
| Base de données | **PostgreSQL 15** via Npgsql | 7.0.18 |
| Authentification | **JWT Bearer** | 7.0.20 |
| API Docs | **Swagger / OpenAPI** (Swashbuckle) | 6.4.0 |
| WebSocket | **ASP.NET Core SignalR** | intégré |
| PDF | **QuestPDF** | 2026.2.4 |
| Email | **MailKit** | 4.4.0 |
| Excel | **ClosedXML** | 0.105.0 |
| CSV | **CsvHelper** | 33.1.0 |
| JSON | **System.Text.Json** + Newtonsoft.Json | 13.0.3 |

### 3.2 Architecture en couches (Clean Architecture)

```
ms.webapp.api.acya/         ← Couche Présentation (Controllers, Middleware, Services)
ms.webapp.api.acya.core/    ← Couche Domaine (Entities, Interfaces, Permissions)
ms.webapp.api.acya.infrastructure/  ← Couche Infrastructure (DbContext, Repos, Migrations)
ms.webapp.api.acya.common/  ← Utilitaires partagés
```

#### Flux de dépendances :
```
Controllers → Interfaces (Core) → Repositories (Infrastructure) → WoodAppContext (EF Core) → PostgreSQL
```

### 3.3 Catalogue des controllers API

#### Gestion documentaire (Commercial)
| Controller | Endpoints principaux | Description |
|---|---|---|
| `DocumentController` | GET/POST/PUT `/api/Document` | CRUD complet documents (81KB — le plus volumineux) |
| `DocumentController` | POST `/api/Document/createinvoice` | Conversion BL → Facture (simple et groupée) |
| `DocumentController` | POST `/api/Document/createbatchinvoice` | Facturation groupée multi-BLs |
| `DeepSearchController` | GET `/api/DeepSearch` | Recherche full-text multi-critères |
| `ApprovalController` | GET/POST `/api/Approval` | Circuit d'approbation documents achats |

#### Articles & Catalogue
| Controller | Endpoints principaux | Description |
|---|---|---|
| `ArticleController` | GET/POST/PUT/DELETE `/api/Article` | Gestion catalogue articles |
| `MerchandiseController` | GET/POST `/api/Merchandise` | Gestion marchandises |
| `ImportsController` | POST `/api/Imports` | Import Excel massif articles |

#### Contreparties (Clients / Fournisseurs)
| Controller | Endpoints principaux | Description |
|---|---|---|
| `CounterPartController` | CRUD `/api/CounterPart` | Clients et fournisseurs unifiés |
| `TransporterController` | CRUD `/api/Transporter` | Gestion transporteurs |

#### Stock & Logistique
| Controller | Endpoints principaux | Description |
|---|---|---|
| `StockController` | GET/POST `/api/Stock` | Consultation et mise à jour stocks |
| `StockMovementController` | GET `/api/StockMovement` | Journal des mouvements de stock |
| `InventoryController` | CRUD `/api/Inventory` | Inventaires physiques |
| `SalesSitesController` | CRUD `/api/SalesSites` | Sites de vente et dépôts |
| `VehicleController` | CRUD `/api/Vehicle` | Flotte de véhicules |

#### Financier & Comptable
| Controller | Endpoints principaux | Description |
|---|---|---|
| `PaymentsController` | GET/POST `/api/Payments` | Règlements clients et fournisseurs |
| `HoldingTaxController` | GET/POST `/api/HoldingTax` | Retenues à la source |
| `AccountingController` | GET `/api/Accounting` | Grand livre, soldes |
| `BankDepositController` | CRUD `/api/BankDeposit` | Dépôts bancaires |
| `BankTransactionsController` | CRUD `/api/BankTransactions` | Transactions bancaires |
| `CaisseController` | CRUD `/api/Caisse` | Mouvements de caisse |
| `ExchangeRateController` | GET `/api/ExchangeRate` | Taux de change |

#### Analytique & Reporting
| Controller | Endpoints principaux | Description |
|---|---|---|
| `AnalyticsController` | GET `/api/Analytics/kpis` | KPIs business (CA, alertes, top clients) |
| `AnalyticsController` | GET `/api/Analytics/monthly-revenue` | CA mensuel sur N mois |
| `AnalyticsController` | GET `/api/Analytics/top-subcategories` | Top ventes par sous-catégorie |
| `Charts/` | GET `/api/Charts/supplier-chart` | Données graphique achats fournisseurs |
| `ReportsController` | GET `/api/Reports` | Génération rapports |

#### IAM & Configuration
| Controller | Endpoints principaux | Description |
|---|---|---|
| `Authentication/` | POST `/api/login` | Authentification JWT |
| `EnterpriseController` | GET/PUT `/api/Enterprise` | Configuration entreprise/tenant |
| `EnterpriseController` | GET `/api/Enterprise/config` | Config publique (branding, plan) |
| `PersonController` | CRUD `/api/Person` | Gestion des personnes |
| `PermissionsController` | GET/PUT `/api/Permissions` | Permissions granulaires par utilisateur |
| `AppConfiguration/` | GET/PUT `/api/AppConfiguration` | Variables système |

#### Notifications & Audit
| Controller | Endpoints principaux | Description |
|---|---|---|
| `NotificationsController` | GET `/api/Notifications` | Notifications applicatives |
| `AuditController` | GET `/api/Audit` | Journal d'audit complet |
| `ApiHealthController` | GET `/api/ApiHealth` | Health check |

#### RH & Paie
| Controller | Endpoints principaux | Description |
|---|---|---|
| `LeaveController` | CRUD `/api/Leave` | Congés employés |
| `AdvanceController` | CRUD `/api/Advance` | Avances sur salaire |
| `PayslipController` | CRUD `/api/Payslip` | Bulletins de paie |

#### Grilles tarifaires
| Controller | Endpoints principaux | Description |
|---|---|---|
| `PricingGridController` | CRUD `/api/PricingGrid` | Grilles de prix par client |
| `ProviderController` | CRUD `/api/Provider` | Fournisseurs de services |

### 3.4 Services background

| Service | Rôle |
|---|---|
| `NotificationRetryService` | Renvoi automatique des notifications échouées (IHostedService) |
| `AuditCleanupBackgroundService` | Purge automatique des logs d'audit anciens |

### 3.5 Hub SignalR

- **Endpoint** : `/api/notificationHub`
- **Protocole** : WebSocket (fallback SSE / Long-polling)
- **Usage** : Push de notifications temps réel vers les clients connectés

### 3.6 Middleware multi-tenancy

```
TenantMiddleware (pipeline ASP.NET Core)
    │
    ├─ 1. Bypass routes publiques (/swagger, /api/health, /hub/...)
    │
    ├─ 2. Résolution du slug tenant :
    │      a. Header X-Tenant-Slug
    │      b. Sous-domaine Host (xxx.acya.site)
    │      c. CustomDomain (domaine personnalisé client)
    │
    ├─ 3. Lookup dans MasterDbContext.TenantRegistries
    │
    ├─ 4. Validation IsActive (403 si suspendu/expiré)
    │      Exception : /api/enterprise/config (toujours accessible)
    │
    ├─ 5. Cross-validation JWT claim "tenant_slug" vs. slug résolu (403 si mismatch)
    │
    └─ 6. Population du TenantContext (scoped DI)
           → Slug, SchemaName, ConnectionString, Plan, Status
```

### 3.7 Configuration multi-tenancy

```json
{
  "MultiTenancy": {
    "Enabled": true
  },
  "ConnectionStrings": {
    "WoodAppContextConnection": "Host=postgres;Database=wood-app-db;...",
    "MasterConnection": "Host=postgres;Database=wood-app-db;..."
  }
}
```

- **Mode Single-tenant** : `MultiTenancy__Enabled=false` → schéma `public` par défaut
- **Mode Multi-tenant** : `MultiTenancy__Enabled=true` → schéma dynamique par tenant (ex: `tenant_socobois`)

### 3.8 Génération PDF

- Bibliothèque : **QuestPDF** (License Community)
- Service : `IPdfGenerationService` / `PdfGenerationService`
- Documents générables : BL, Factures clients, Factures fournisseurs, Listes
- Déclenchement : via endpoints `GET /api/Document/{id}/pdf` ou impression depuis l'UI

---

## 4. Back-Office SaaS — bo-acya-app

Le back-office est l'interface de **gestion globale de la plateforme SaaS** (super-admin uniquement).

### 4.1 Architecture

```
bo-acya-app/
├── admin-elance-front/    # Interface Next.js (admin SaaS)
└── admin-elance-back/     # API ASP.NET Core 8 (gestion tenants)
    └── src/
        ├── ms.admin.api.acya/             # Couche Présentation
        ├── ms.admin.api.acya.core/        # Couche Domaine
        ├── ms.admin.api.acya.infrastructure/  # Couche Infrastructure
        └── ms.admin.api.acya.common/      # Utilitaires communs
```

### 4.2 Stack technique Back-Office API

| Composant | Technologie | Version |
|---|---|---|
| Framework | **ASP.NET Core** | **.NET 8.0** (vs .NET 7 pour le FO) |
| Authentification | **JWT Bearer** | 8.0.10 |
| ORM | Entity Framework Core | 8.0.10 |
| Connexion | **MasterDbContext** → `wood-app-db` | PostgreSQL |
| API Docs | Swashbuckle | 6.6.2 |

### 4.3 Controllers Back-Office

| Controller | Endpoints | Rôle |
|---|---|---|
| `AuthController` | POST `/api/auth/login` | Authentification super-admin (JWT séparé) |
| `EnterpriseController` | CRUD `/api/enterprise` | Gestion complète des tenants (20KB — le plus volumineux) |
| `ProvisioningController` | POST `/api/provisioning` | Provisionnement initial d'un nouveau tenant |
| `BillingController` | GET/POST `/api/billing` | Gestion abonnements, plans, historique factures |
| `BackupController` | POST `/api/backup` | Sauvegardes bases de données tenant |
| `MonitoringController` | GET `/api/monitoring` | Supervision santé des tenants |
| `DashboardController` | GET `/api/dashboard` | KPIs globaux plateforme |
| `AuditLogsController` | GET `/api/auditlogs` | Journal d'audit global cross-tenant |

### 4.4 Fonctionnalités Back-Office

#### Gestion du cycle de vie tenant
```
Inscription
    ↓
Pending (en attente validation admin)
    ↓
Trial (30 jours gratuits)
    ↓
Active (abonnement payant)
    ↓
Suspended (impayé / violation)
    ↓
Expired / Archived / Deleted
```

#### Gestion des abonnements (BillingController)
- Plans disponibles : `Trial` · `Starter` · `Pro` · `Enterprise`
- Génération de factures abonnement
- Historique des paiements
- Gestion des renouvellements
- Gestion des impayés → suspension automatique

#### Provisionnement (ProvisioningController)
- Création du schéma PostgreSQL tenant (`tenant_<slug>`)
- Exécution des migrations EF Core dans le schéma isolé
- Création du compte administrateur tenant
- Initialisation des données par défaut (categories, variables)
- Envoi d'email de bienvenue (MailKit)
- Génération SSL (intégré au processus d'onboarding)

#### Monitoring (MonitoringController)
- Vérification health check par tenant
- Métriques d'utilisation
- Alertes performance

#### Sauvegardes (BackupController)
- Backup `pg_dump` par schéma tenant
- Planification de sauvegardes automatiques
- Restauration sur demande

### 4.5 Front-Office Back-Office (admin-elance-front)

```
bo-acya-app/admin-elance-front/
    Framework : Next.js (App Router)
    API cible : https://admin.acya.site/api/
    Authentification : JWT super-admin (scope séparé)
```

---

## 5. Multi-Tenancy

### 5.1 Modèle d'isolation des données

eLance utilise le modèle **Schema-per-Tenant** sur PostgreSQL :

```
wood-app-db (base PostgreSQL unique)
├── public              → Schéma par défaut (mono-tenant legacy)
├── master              → TenantRegistry (liste des tenants)
├── tenant_socobois     → Données exclusives du tenant "socobois"
├── tenant_boistech     → Données exclusives du tenant "boistech"
└── tenant_xxx          → ...
```

**Avantages :**
- Isolation forte des données (pas de cross-contamination)
- Migrations indépendantes par tenant
- Possibilité de connexion dédiée par tenant (ConnectionString par tenant)

### 5.2 Résolution du tenant (résolution au runtime)

```
Requête HTTP entrante
        │
        ▼
TenantMiddleware
        │
        ├── Header: X-Tenant-Slug: socobois
        │        OU
        ├── Host: socobois.acya.site → extraction du slug
        │        OU
        └── CustomDomain: www.socobois.com → lookup par domaine
                │
                ▼
        MasterDbContext.TenantRegistries
                │
                ▼
        TenantContext (scope DI)
        { Slug, SchemaName, ConnectionString, Plan, Status }
                │
                ▼
        WoodAppContext.HasDefaultSchema(SchemaName)
                │
                ▼
        EF Core → PostgreSQL schema: tenant_socobois
```

### 5.3 JWT et sécurité tenant

Le token JWT contient les claims suivants :

```json
{
  "sub": "42",
  "login": "user@socobois.com",
  "role": "10",
  "tenant_slug": "socobois",
  "isForSale": "true",
  "site_id": "3",
  "enterprise_id": "1",
  "exp": 1735689600
}
```

- `tenant_slug` : validé par le `TenantMiddleware` à chaque requête
- Cross-validation : si le slug JWT ≠ slug résolu → `403 Forbidden`

### 5.4 TenantRegistry (modèle Master)

```csharp
public class TenantRegistry
{
    public string Slug { get; set; }           // Identifiant unique (ex: "socobois")
    public string SchemaName { get; set; }     // Schéma PG (ex: "tenant_socobois")
    public string? ConnectionString { get; set; } // Null = connexion partagée
    public string? CustomDomain { get; set; }  // Domaine personnalisé client
    public string Plan { get; set; }           // Trial / Starter / Pro / Enterprise
    public string Status { get; set; }         // Active / Suspended / Expired
    public bool IsActive { get; set; }         // Calculé depuis Status
}
```

---

## 6. Modèle de données

### 6.1 Entités principales (WoodAppContext)

| Entité | Table | Description |
|---|---|---|
| `Enterprise` | `Enterprises` | Configuration de l'entreprise tenant |
| `AppUser` | `AppUsers` | Utilisateurs du tenant |
| `Person` | `Persons` | Personnes physiques (employés, contacts) |
| `CounterPart` | `CounterParts` | Clients ET fournisseurs (tiers unifiés) |
| `Article` | `Articles` | Catalogue produits |
| `Merchandise` | `Merchandises` | Articles × attributs (dimensions bois) |
| `Document` | `Documents` | **Entité centrale** : tous types de documents commerciaux |
| `DocumentMerchandise` | `DocumentMerchandises` | Lignes de document (articles × quantités × prix) |
| `DocumentDocumentRelationship` | `DocumentDocumentRelationships` | Relations parent-enfant entre documents (ex: BL → Facture) |
| `Stock` | `Stocks` | Quantités par article × site |
| `StockMovement` | `StockMovements` | Journal des mouvements de stock |
| `StockTransfer` | `StockTransfers` | Transferts inter-sites |
| `Payment` | `Payments` | Règlements (clients et fournisseurs) |
| `PaymentInstrument` | `PaymentInstruments` | Moyens de paiement (chèque, virement, espèces) |
| `HoldingTax` | `HoldingTaxes` | Retenues à la source |
| `AccountLedger` | `AccountLedgers` | Grand livre comptable |
| `AuditLog` | `AuditLogs` | Journal d'audit |
| `ApprovalConfig` | `ApprovalConfigs` | Configuration circuit d'approbation |
| `DocumentApproval` | `DocumentApprovals` | Statuts d'approbation |
| `SalesSite` | `SalesSites` | Sites de vente et dépôts |
| `Vehicle` | `Vehicles` | Véhicules de livraison |
| `Transporter` | `Transporters` | Transporteurs |
| `PricingGrid` | `PricingGrids` | Grilles tarifaires par client |
| `Bank` | `Banks` | Comptes bancaires |
| `BankDeposit` | `BankDeposits` | Dépôts bancaires |
| `BankTransaction` | `BankTransactions` | Transactions bancaires |
| `CaisseMovement` | `CaisseMovements` | Mouvements de caisse |
| `PendingNotification` | `PendingNotifications` | File des notifications à envoyer |
| `AppNotification` | `AppNotifications` | Notifications applicatives |
| `UserPermissions` | `UserPermissions` | Permissions granulaires par utilisateur |
| `EmployeeLeave` | `EmployeeLeaves` | Congés employés |
| `EmployeePayslip` | `EmployeePayslips` | Bulletins de paie |
| `EmployeeAdvance` | `EmployeeAdvances` | Avances sur salaire |

### 6.2 Types de documents (DocumentTypes)

```
Ventes :
  customerQuote          → Devis client
  customerOrder          → Commande client
  customerDeliveryNote   → Bon de Livraison (BL)
  customerInvoice        → Facture client

Achats :
  supplierOrder          → Commande fournisseur
  supplierReceipt        → Bon de Réception (BR)
  supplierInvoice        → Facture fournisseur
  supplierInvoiceReturn  → Avoir fournisseur

Stock :
  stockTransfer          → Transfert de stock inter-sites
```

### 6.3 Statuts document

```
DocStatus:
  Created    → Créé (brouillon)
  Confirmed  → Confirmé
  Validated  → Validé

BillingStatus (pour BLs et Factures):
  NotBilled       → Non payé / À facturer
  PartiallyBilled → Partiellement payé
  Billed          → Payé / Facturé
```

### 6.4 Catégories articles (arborescence 3 niveaux)

```
Categories/
├── Parent    (niveau 1 — ex: "Bois")
├── FirstChild (niveau 2 — ex: "Chêne")
└── SecondChild (niveau 3 / sous-catégorie — ex: "Chêne Massif")
```

---

## 7. Infrastructure & Déploiement

### 7.1 Orchestration Docker

```yaml
# 5 services Docker en production :
postgres:        # PostgreSQL 15-alpine (healthcheck intégré)
api:             # wood-app.api .NET 7 — port 8080
migration-ui:    # elance-app.ui Next.js — port 5000
admin-api:       # admin-elance-back .NET 8 — port 8082
admin-ui:        # admin-elance-front Next.js — port 5002
```

Tous les services partagent le réseau `wood-app-network` (bridge Docker).

### 7.2 Nginx (Reverse Proxy)

```
acya.site           → migration-ui (port 5000)
acya.site/api/      → api (port 8080)
admin.acya.site     → admin-ui (port 5002)
admin.acya.site/api → admin-api (port 8082)
*.acya.site         → api (port 8080) via X-Tenant-Slug header
```

### 7.3 SSL / TLS

- **Certificats** : Let's Encrypt via `certbot`
- **Automatisation** : script `/scripts/sync_ssl.sh` exécuté via cron host (toutes les 2 minutes)
- **Stratégie** : certificat multi-domaine couvrant `acya.site`, `*.acya.site`, `admin.acya.site`
- **Génération à l'onboarding** : chaque nouveau tenant déclenche une régénération automatique du certificat SSL

### 7.4 Base de données

| Paramètre | Valeur |
|---|---|
| Moteur | PostgreSQL 15 (alpine) |
| Stratégie migration | EF Core Code-First (`Database.Migrate()`) |
| Migration au démarrage | Auto-migration de tous les schémas actifs au boot de l'API |
| Pooling | PgBouncer (si charge élevée) |
| Volumes Docker | Persistance sur host (`postgres-data-new_2026_04_22`) |

### 7.5 Variables d'environnement clés

| Variable | Service | Description |
|---|---|---|
| `ConnectionStrings__WoodAppContextConnection` | api | Connexion PostgreSQL principale |
| `ConnectionStrings__MasterConnection` | api, admin-api | Connexion master (TenantRegistry) |
| `MultiTenancy__Enabled` | api | Activation mode multi-tenant |
| `TokenKey` / `JWTSettings__securityKey` | api | Clé de signature JWT |
| `JWTSettings__ValidAudience` | api | Audience JWT (`https://acya.site`) |
| `AllowedOrigins` | api | CORS autorisés |
| `NEXT_PUBLIC_API_URL` | migration-ui | URL API pour le frontend |
| `JwtSettings__Secret` | admin-api | Clé JWT back-office (distincte) |
| `MigrationScriptPath` | admin-api | Chemin script SQL migration complète |

---

## 8. Sécurité

### 8.1 Authentification JWT

**Front-Office** :
- Endpoint : `POST /api/login`
- Token signé avec `JWTSettings__securityKey`
- Durée : configurable (défaut 24h)
- Claims embarqués : `sub`, `login`, `role`, `tenant_slug`, `isForSale`, `site_id`, `enterprise_id`

**Back-Office** :
- Endpoint : `POST /api/auth/login` (API séparée)
- Token signé avec `JwtSettings__Secret` distinct (clé SHA-512)
- Audience : `acya-bo-ui`
- Durée : 1440 minutes (24h)

### 8.2 Autorisation granulaire

Chaque utilisateur tenant dispose de permissions configurées par module :

```
Modules : sales | purchases | articles | customers | suppliers | stock | analytics | team
Actions : canView | canAdd | canUpdate | canDelete
```

Implémenté côté frontend via `usePermissionGuard` :
```typescript
const { hasPermission } = usePermissionGuard();
// Exemple : n'afficher le bouton "Nouveau Document" que si l'utilisateur a canAdd sur sales
{hasPermission('sales', 'canAdd') && <Button>Nouveau Document</Button>}
```

### 8.3 Isolation tenant (défense en profondeur)

1. **Résolution réseau** : sous-domaine ou header résolu à la couche Nginx
2. **Middleware** : `TenantMiddleware` valide le tenant et son statut
3. **Cross-validation JWT** : le claim `tenant_slug` du token doit correspondre au tenant résolu
4. **Isolation DB** : chaque requête EF Core opère sur le schéma du tenant actif
5. **Status check** : tenant suspendu/expiré → `403 Forbidden` systématique

### 8.4 CORS

Origines autorisées configurées via `AllowedOrigins` :
```
https://acya.site
https://www.acya.site
https://migration.acya.site
```

SignalR dispose d'une policy CORS dédiée (`SignalRCors`) permettant les connexions WebSocket.

### 8.5 Audit & Traçabilité

- Toutes les actions utilisateurs sont enregistrées dans `AuditLog`
- Purge automatique via `AuditCleanupBackgroundService`
- Journal consultable depuis le module Analytics et le Back-Office

---

## Annexe A — Flux d'onboarding tenant complet

```
1. Utilisateur soumet le formulaire d'inscription (/enterprise-registration)
2. POST /api/tenant/register → Création TenantRegistry (Status: Pending)
3. Super-admin valide depuis le BO admin
4. ProvisioningController :
   a. Création schéma PostgreSQL : tenant_<slug>
   b. Migration EF Core dans le nouveau schéma
   c. Seed données initiales (catégories, TVAs, variables)
   d. Création AppUser administrateur
   e. Email de bienvenue (MailKit)
5. sync_ssl.sh (cron 2min) → Régénération certificat SSL
6. Nginx reloaded → Sous-domaine tenant.acya.site opérationnel
7. Status: Trial (30 jours)
```

## Annexe B — Flux document commercial complet

```
Devis (customerQuote)
    ↓ Conversion
Commande (customerOrder)
    ↓ Conversion
Bon de Livraison (customerDeliveryNote)
    ↓ [Simple] POST /api/Document/createinvoice
    ↓ [Groupé] POST /api/Document/createbatchinvoice
Facture (customerInvoice)
    ↓
Paiement (POST /api/Payments)
    ↓
BillingStatus: Billed
```

Chaque conversion crée une entrée `DocumentDocumentRelationship` (parent ↔ enfant).

## Annexe C — Technologies par couche (synthèse)

```
┌─────────────────────────────────────────────────────────────────┐
│ PRÉSENTATION                                                     │
│  Next.js 16 · React 19 · TypeScript · TailwindCSS · shadcn/ui  │
│  Framer Motion · Recharts · Radix UI · Zustand · React Query   │
├─────────────────────────────────────────────────────────────────┤
│ API / BACKEND                                                    │
│  ASP.NET Core 7 (.NET 7) · C# · JWT Bearer · SignalR           │
│  QuestPDF · MailKit · ClosedXML · Swashbuckle                  │
├─────────────────────────────────────────────────────────────────┤
│ ORM / DONNÉES                                                    │
│  Entity Framework Core 7 · Npgsql · Code-First Migrations       │
│  Multi-Schema PostgreSQL (Schema-per-Tenant)                    │
├─────────────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE                                                   │
│  Docker Compose · PostgreSQL 15 · Nginx (Reverse Proxy)        │
│  Let's Encrypt (SSL) · Certbot · Cron (auto-SSL)               │
└─────────────────────────────────────────────────────────────────┘
```
