# WoodApp ERP — Architecture Microservices Spring Boot

> **Référence :** Audit Fonctionnel `logic.md` (Avril 2026)  
> **Cible :** Architecture production — Spring Boot 3.x · Java 21 · PostgreSQL · Kafka · Kubernetes  
> **Principe :** Un domaine métier = un service indépendant = une base de données isolée  

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Décomposition en domaines (Bounded Contexts)](#2-décomposition-en-domaines-bounded-contexts)
3. [Vue d'architecture globale](#3-vue-darchitecture-globale)
4. [Catalogue des microservices](#4-catalogue-des-microservices)
5. [Infrastructure transversale](#5-infrastructure-transversale)
6. [Communication inter-services (Event-Driven)](#6-communication-inter-services-event-driven)
7. [Sécurité & IAM](#7-sécurité--iam)
8. [Observabilité & Monitoring](#8-observabilité--monitoring)
9. [Structure de projet Spring Boot (par service)](#9-structure-de-projet-spring-boot-par-service)
10. [Docker Compose — Développement local](#10-docker-compose--développement-local)
11. [Kubernetes — Production](#11-kubernetes--production)
12. [Migration depuis le monolithe .NET](#12-migration-depuis-le-monolithe-net)
13. [Roadmap d'implémentation](#13-roadmap-dimplémentation)

---

## 1. Vue d'ensemble

### Philosophie de conception

| Principe | Application dans WoodApp |
|---|---|
| **Database per Service** | Chaque microservice possède son propre schéma PostgreSQL isolé |
| **Single Responsibility** | Chaque service maîtrise un seul bounded context métier |
| **Async-First** | Communication inter-domaines via événements Kafka (Saga Pattern) |
| **API Composition** | Agrégation des données via API Gateway + BFF pour le frontend Angular |
| **Resilience** | Circuit Breaker (Resilience4j), retry, fallback sur chaque appel externe |
| **Observabilité** | Traces distribuées (Micrometer + Zipkin), métriques (Prometheus), logs (ELK) |

### Stack technique principale

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (conservé)                      │
│              Angular 18 · NgRx · Angular Material               │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Spring Cloud Gateway)           │
│            Rate Limiting · Auth JWT · Load Balancing            │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
   ┌──────┘       ┌──────┘       ┌──────┘       ┌──────┘
   ▼              ▼              ▼              ▼
[Service]     [Service]     [Service]     [Service]  ...×9
Spring Boot 3  Spring Boot 3  Spring Boot 3  Spring Boot 3
Java 21 GraalVM  PostgreSQL   Redis Cache   Kafka Events
```

---

## 2. Décomposition en domaines (Bounded Contexts)

Basé sur l'audit `logic.md`, les 9 bounded contexts identifiés sont :

```
┌────────────────────────────────────────────────────────────────────┐
│                     WoodApp ERP — Domaines                         │
├──────────────────────┬─────────────────────────────────────────────┤
│  Domain              │  Bounded Context                            │
├──────────────────────┼─────────────────────────────────────────────┤
│  IAM                 │  Authentification, Utilisateurs, Entreprise  │
│  Catalogue           │  Articles, Catégories, Dimensions, Prix      │
│  Counterpart         │  Clients, Fournisseurs, Transporteurs        │
│  Commercial          │  Documents, workflow Devis→BC→BL→FA          │
│  Stock               │  Stock multi-sites, Transferts, Inventaire   │
│  Accounting          │  Grand livre, Soldes, Paiements              │
│  HR                  │  Employés, Congés, Avances, Bulletins        │
│  Logistics           │  Véhicules, Sites de vente                   │
│  Analytics           │  Dashboard KPIs, Reporting, Alertes          │
└──────────────────────┴─────────────────────────────────────────────┘
```

**Règle de découpage :** Les domaines qui se croisent fréquemment (Commercial ↔ Stock ↔ Accounting) communiquent via Kafka pour éviter le couplage synchrone.

---

## 3. Vue d'architecture globale

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CLIENTS EXTERNES                                    │
│        Angular 18 SPA          ·         Mobile (futur)                     │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ HTTPS / WSS
                    ┌────────────▼───────────────┐
                    │     CLOUDFLARE (CDN/WAF)    │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────▼───────────────┐
                    │   SPRING CLOUD GATEWAY      │
                    │  ┌─────────────────────┐   │
                    │  │  JWT Validation      │   │
                    │  │  Rate Limiting       │   │
                    │  │  CORS               │   │
                    │  │  Request Logging     │   │
                    │  └─────────────────────┘   │
                    └────────────────────────────┘
                          │              │
          ┌───────────────┘              └───────────────────┐
          │                                                   │
┌─────────▼────────┐                              ┌──────────▼─────────┐
│   SERVICE MESH   │                              │   SERVICE REGISTRY  │
│  (Istio / Linkerd)│                             │  (Eureka / Consul)  │
└─────────┬────────┘                              └────────────────────┘
          │
┌─────────┴──────────────────────────────────────────────────────────┐
│                     MICROSERVICES LAYER                             │
│                                                                     │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │  iam-service │  │catalog-service │  │ counterpart-service  │   │
│  │  :8081       │  │  :8082         │  │  :8083               │   │
│  └──────────────┘  └────────────────┘  └──────────────────────┘   │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │ commercial-service│  │ stock-service  │  │accounting-service │  │
│  │  :8084            │  │  :8085         │  │  :8086            │  │
│  └───────────────────┘  └───────────────┘  └───────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐    │
│  │  hr-service  │  │ logistics-service  │  │analytics-service │    │
│  │  :8087       │  │  :8088             │  │  :8089           │    │
│  └──────────────┘  └───────────────────┘  └──────────────────┘    │
│                                                                     │
│  ┌─────────────────────┐                                           │
│  │  notification-service│                                          │
│  │  :8090 (WebSocket)   │                                          │
│  └─────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
          │                              │
┌─────────▼────────┐         ┌──────────▼─────────┐
│   KAFKA CLUSTER  │         │   REDIS CLUSTER     │
│  (Event Bus)     │         │  (Cache / Sessions) │
└──────────────────┘         └────────────────────┘
          │
┌─────────▼──────────────────────────────────┐
│         DATABASES (Database-per-service)    │
│  iam_db  catalog_db  counterpart_db  ...   │
│         PostgreSQL 16 (PgBouncer pooling)   │
└────────────────────────────────────────────┘
```

---

## 4. Catalogue des microservices

### 4.1 `iam-service` — Identité & Accès
**Port :** 8081  
**Base de données :** `iam_db`  
**Responsabilités :** Authentification JWT, gestion utilisateurs, rôles, entreprises, sites

#### Endpoints REST
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/enterprises/register
GET    /api/v1/enterprises/{id}
PUT    /api/v1/enterprises/{id}
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/{id}
PUT    /api/v1/users/{id}/permissions
DELETE /api/v1/users/{id}
GET    /api/v1/sites
POST   /api/v1/sites
```

#### Entités JPA
```java
@Entity @Table(name = "enterprises")
public class Enterprise {
    @Id @GeneratedValue Long id;
    String guid; // UUID
    String name;
    String matriculeFiscal;
    String email;
    String phone;
    String devise;          // TND, EUR, USD
    String nameResponsable;
    String commercialRegister;
    Boolean isSalingWood;   // Active le seed catalogue bois
    @OneToMany List<SalesSite> sites;
    @OneToMany List<AppUser>   users;
}

@Entity @Table(name = "app_users")
public class AppUser {
    @Id @GeneratedValue Long id;
    String login;
    String passwordHash;    // BCrypt
    String refreshToken;
    Instant tokenExpiry;
    Role   role;            // ADMIN, EMPLOYEE, MANAGER
    Boolean isActive;
    @ManyToOne SalesSite defaultSite;
    @ManyToOne Enterprise enterprise;
    @OneToOne Person person;
}

@Entity @Table(name = "sales_sites")
public class SalesSite {
    @Id @GeneratedValue Long id;
    String number;
    String address;
    String governorate;
    Boolean isForSale;
    @ManyToOne Enterprise enterprise;
}
```

#### Technologies spécifiques
- **Spring Security 6** + JWT (JJWT library)
- **BCryptPasswordEncoder** pour les mots de passe
- **Spring Data JPA** + Flyway migrations
- Événement Kafka publié : `EnterpriseRegisteredEvent` → déclenche le seed catalogue dans `catalog-service`

---

### 4.2 `catalog-service` — Catalogue Articles
**Port :** 8082  
**Base de données :** `catalog_db`  
**Responsabilités :** Articles, catégories, dimensions (épaisseur/largeur/longueur), TVA, taxes, historique prix

#### Endpoints REST
```
GET    /api/v1/articles
POST   /api/v1/articles
GET    /api/v1/articles/{id}
PUT    /api/v1/articles/{id}
DELETE /api/v1/articles/{id}      (soft delete)
GET    /api/v1/articles/{id}/price-history
GET    /api/v1/articles/{id}/last-purchase-price
GET    /api/v1/articles/generate-reference/{articleId}

GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}

GET    /api/v1/app-variables?nature={Tva|Taxe|thickness|width|length}
POST   /api/v1/app-variables
PUT    /api/v1/app-variables/{id}
DELETE /api/v1/app-variables/{id}

GET    /api/v1/merchandises
GET    /api/v1/merchandises/generate-reference/{articleId}
```

#### Entités JPA clés
```java
@Entity @Table(name = "articles")
public class Article {
    @Id @GeneratedValue Long id;
    String reference;
    String designation;
    Boolean isWood;
    Boolean isActive;
    Boolean isDeleted;
    @ManyToOne Category    category;
    @ManyToOne AppVariable thickness;   // Épaisseur (bois uniquement)
    @ManyToOne AppVariable width;       // Largeur (bois uniquement)
    @OneToMany List<SellPriceHistory> priceHistory;
}

@Entity @Table(name = "app_variables")
public class AppVariable {
    @Id @GeneratedValue Long id;
    String name;
    Double value;
    String nature;   // Tva | Taxe | thickness | width | length
    Boolean isActive;
    Boolean isDefault;
    Boolean isEditable;
}
```

#### Logique métier critique
```java
// Génération de référence pour un article bois
// Pattern: {CatRef}-{Épaisseur}{Largeur}-{AAMM}-{N++}
// Exemple: BR-38115-2502-14

// Génération pour article standard
// Pattern: {CatRef}-{AAMM}-{N++}

// Historique de prix automatique à chaque mise à jour
```

#### Cache Redis
- Clé : `catalog:articles:all` → TTL 10 min
- Clé : `catalog:appvariables:{nature}` → TTL 30 min
- Invalidation sur PUT/DELETE

---

### 4.3 `counterpart-service` — Clients & Fournisseurs
**Port :** 8083  
**Base de données :** `counterpart_db`  
**Responsabilités :** Clients, fournisseurs, transporteurs, gestion du registre des contreparties

#### Endpoints REST
```
GET    /api/v1/counterparts?type={Customer|Provider}
POST   /api/v1/counterparts
GET    /api/v1/counterparts/{id}
PUT    /api/v1/counterparts/{id}
DELETE /api/v1/counterparts/{id}      (soft delete)
GET    /api/v1/counterparts/{id}/balance   (query accounting-service)

GET    /api/v1/transporters
POST   /api/v1/transporters
PUT    /api/v1/transporters/{id}
DELETE /api/v1/transporters/{id}
```

#### Entités JPA
```java
@Entity @Table(name = "counterparts")
public class CounterPart {
    @Id @GeneratedValue Long id;
    @Column(unique = true) String guid;
    String fullname;
    String email;
    String phone;
    String address;
    CounterPartType type;   // CUSTOMER | PROVIDER
    Boolean isDeleted;
    Long enterpriseId;      // Référence FK inter-service (pas de join!)
}

@Entity @Table(name = "transporters")
public class Transporter {
    @Id @GeneratedValue Long id;
    String fullname;
    String carRegistration;
    Long   enterpriseId;
}
```

#### Communication inter-service
- `accounting-service` est appelé via **Feign Client** avec Circuit Breaker pour obtenir le solde
- Fallback : retourne `balance = null` avec un message d'avertissement

---

### 4.4 `commercial-service` — Documents Commerciaux ⭐ Service Central
**Port :** 8084  
**Base de données :** `commercial_db`  
**Responsabilités :** Cycle documentaire complet : Devis, BC, BL, Factures, Bons de réception, Avoirs

#### Endpoints REST
```
# Documents génériques
GET    /api/v1/documents?type={}&month={}&year={}
POST   /api/v1/documents
GET    /api/v1/documents/{id}
PUT    /api/v1/documents/{id}
PUT    /api/v1/documents/{id}/status
DELETE /api/v1/documents/{id}

# Workflow de conversion
POST   /api/v1/documents/{parentId}/convert   (Devis→BC, BC→BL, BL→FA)
POST   /api/v1/documents/{parentId}/invoice    (BR→FF, BL→FA groupé)

# Reliquats (nouveau gap §5.5)
GET    /api/v1/documents/{id}/backorder

# Avoirs (nouveau gap §5.13)
POST   /api/v1/documents/{invoiceId}/credit-note

# Numérotation
GET    /api/v1/documents/next-number?type={}
```

#### Types de documents
```java
public enum DocumentType {
    SUPPLIER_ORDER,      // BC-F — Bon de Commande Fournisseur
    SUPPLIER_RECEIPT,    // BR   — Bon de Réception
    SUPPLIER_INVOICE,    // FF   — Facture Fournisseur
    CUSTOMER_QUOTE,      // DEV  — Devis
    CUSTOMER_ORDER,      // BC-C — Bon de Commande Client
    CUSTOMER_DELIVERY,   // BL   — Bon de Livraison
    CUSTOMER_INVOICE,    // FA   — Facture Client
    CREDIT_NOTE,         // AV   — Avoir (nouveau)
    INVENTORY            // INV  — Inventaire
}
```

#### Entités JPA clés
```java
@Entity @Table(name = "documents")
public class Document {
    @Id @GeneratedValue Long id;
    String docNumber;                       // FA-2026-0001
    DocumentType  type;
    DocStatus     status;                   // PENDING | VALIDATED | CANCELLED
    BillingStatus billingStatus;

    Long counterPartId;                     // FK logique (inter-service)
    Long transporterId;                     // FK logique
    Long salesSiteId;                       // FK logique

    BigDecimal totalHT;
    BigDecimal discountPercentage;
    BigDecimal tvaRate;
    BigDecimal totalTTC;
    BigDecimal withHoldingTaxRate;          // Retenue à la source
    BigDecimal totalNetPayable;             // TTC - RS

    Boolean isInvoiced;
    Boolean isService;
    String  supplierRefNumber;              // Unicité ref fournisseur

    LocalDateTime creationDate;
    Long createdById;

    @OneToMany(cascade = CascadeType.ALL)
    List<DocumentLine> lines;

    @OneToMany
    List<DocumentRelationship> parentDocs;

    @OneToMany
    List<DocumentRelationship> childDocs;
}

@Entity @Table(name = "document_lines")
public class DocumentLine {
    @Id @GeneratedValue Long id;
    Long   merchandiseId;                   // FK logique vers catalog-service
    String merchandiseRef;                  // Dénormalisé pour performance
    String merchandiseDesignation;          // Dénormalisé
    BigDecimal quantity;
    BigDecimal quantityDelivered;           // Pour gestion reliquats (§5.5)
    BigDecimal unitPrice;
    BigDecimal discount;
    BigDecimal totalHT;
    String     lengthDetail;               // JSON: [{length: 3.5, qty: 2}, ...]
}

@Entity @Table(name = "document_relationships")
public class DocumentRelationship {
    @Id @GeneratedValue Long id;
    Long parentDocumentId;
    Long childDocumentId;
    String relationshipType;               // CONVERTED_FROM | INVOICED_FROM
}
```

#### Événements Kafka publiés
```java
// Stock affected by document
StockMovementRequestedEvent {
    documentId, documentType, salesSiteId,
    lines: [{merchandiseId, quantity, direction: IN|OUT}]
}

// Accounting entry triggered
AccountingEntryRequestedEvent {
    documentId, documentType, counterPartId,
    amount, tvaAmount, withholdingTax, direction: DEBIT|CREDIT
}

// Notification
DocumentStatusChangedEvent {
    documentId, documentType, newStatus, userId
}
```

#### Saga Pattern — Création d'un Bon de Livraison
```
1. commercial-service → crée Document BL (status=PENDING)
2. commercial-service → publie StockMovementRequestedEvent
3. stock-service       → vérifie/déduit le stock → publie StockMovementConfirmedEvent
4. commercial-service  → reçoit confirmation → status=VALIDATED
5. commercial-service  → publie AccountingEntryRequestedEvent
6. accounting-service  → crée entrée grand livre → publie AccountingEntryCreatedEvent
7. commercial-service  → BL finalisé (status=POSTED)

Si étape 3 échoue (stock insuffisant):
3b. stock-service      → publie StockMovementFailedEvent
4b. commercial-service → reçoit échec → status=CANCELLED → rollback
```

---

### 4.5 `stock-service` — Gestion des Stocks
**Port :** 8085  
**Base de données :** `stock_db`  
**Responsabilités :** Stocks par site, transferts inter-sites, inventaires physiques, timeline de mouvements

#### Endpoints REST
```
GET    /api/v1/stocks?siteId={}
GET    /api/v1/stocks/all
GET    /api/v1/stocks/wood-details?siteId={}    (détail bois par longueur)
GET    /api/v1/stocks/{merchandiseId}/{siteId}/summary
GET    /api/v1/stocks/alerts                     (stock bas — §5.7 nouveau)
PUT    /api/v1/stocks/{merchandiseId}/{siteId}/minimum  (seuil min — §5.7)

# Mouvements
GET    /api/v1/movements/timeline?merchandiseId={}&siteId={}&from={}&to={}
GET    /api/v1/movements/timeline/by-package?packageNumber={}&siteId={}
GET    /api/v1/movements/reconciliation?merchandiseId={}&siteId={}

# Transferts
POST   /api/v1/transfers
PUT    /api/v1/transfers/{id}/process
PUT    /api/v1/transfers/{id}/confirm          (code de confirmation)
PUT    /api/v1/transfers/{id}/reject
GET    /api/v1/transfers?status={}&siteId={}
GET    /api/v1/transfers/missed-notifications

# Inventaires
GET    /api/v1/inventories
POST   /api/v1/inventories
PUT    /api/v1/inventories/{id}/validate
```

#### Entités JPA clés
```java
@Entity @Table(name = "stocks")
public class Stock {
    @Id @GeneratedValue Long id;
    Long merchandiseId;             // FK logique vers catalog-service
    String merchandiseRef;          // Dénormalisé
    Long salesSiteId;               // FK logique vers iam-service
    BigDecimal quantity;
    BigDecimal minimumStock;        // Seuil d'alerte (§5.7)
    LocalDateTime lastUpdated;
}

@Entity @Table(name = "stock_movements")
public class StockMovement {
    @Id @GeneratedValue Long id;
    Long stockId;
    MovementType type;             // IN | OUT | TRANSFER | INVENTORY_ADJUSTMENT
    BigDecimal quantity;
    BigDecimal balanceAfter;
    String packageNumber;
    String lengthDetail;           // JSON pour bois
    Long sourceDocumentId;         // Référence au document déclencheur
    String sourceDocumentNumber;   // Dénormalisé pour affichage
    Long sourceDocumentType;
    LocalDateTime createdAt;
    Long createdById;
}

@Entity @Table(name = "stock_transfers")
public class StockTransfer {
    @Id @GeneratedValue Long id;
    Long fromSiteId;
    Long toSiteId;
    Long merchandiseId;
    BigDecimal quantity;
    TransferStatus status;         // PENDING | CONFIRMED | REJECTED | PROCESSING
    String confirmationCode;       // Code à 6 chiffres
    String notes;
    LocalDateTime createdAt;
    LocalDateTime confirmedAt;
}
```

#### Événements Kafka consommés
- `StockMovementRequestedEvent` → déclenche la mise à jour du stock + publie `StockMovementConfirmedEvent` ou `StockMovementFailedEvent`
- `InventoryValidatedEvent` → écrasement du stock avec les quantités inventoriées

#### Événements Kafka publiés
- `StockMovementConfirmedEvent`
- `StockMovementFailedEvent`
- `StockLowAlertEvent` → consommé par `notification-service`
- `StockTransferRequestedEvent` → WebSocket push via `notification-service`

---

### 4.6 `accounting-service` — Comptabilité & Paiements
**Port :** 8086  
**Base de données :** `accounting_db`  
**Responsabilités :** Grand livre, soldes clients/fournisseurs, paiements, retenue à la source

#### Endpoints REST
```
# Comptabilité
GET    /api/v1/accounting/{counterPartId}/balance
GET    /api/v1/accounting/{counterPartId}/statement?from={}&to={}
POST   /api/v1/accounting/refresh-balances    (batch recalcul)

# Paiements
GET    /api/v1/payments?counterPartId={}&documentId={}&page={}&size={}
POST   /api/v1/payments
GET    /api/v1/payments/{id}
PUT    /api/v1/payments/{id}
DELETE /api/v1/payments/{id}
POST   /api/v1/payments/{id}/link-to-invoice
GET    /api/v1/payments/dashboard?date={}&userId={}

# Admin dashboard
GET    /api/v1/balances/customers
GET    /api/v1/balances/suppliers
```

#### Entités JPA clés
```java
@Entity @Table(name = "account_ledger")
public class AccountLedger {
    @Id @GeneratedValue Long id;
    Long counterPartId;             // FK logique
    CounterPartType counterPartType;
    LedgerEntryType entryType;      // INVOICE | PAYMENT | CREDIT_NOTE
    BigDecimal debitAmount;
    BigDecimal creditAmount;
    BigDecimal balanceAfter;
    Long        sourceDocumentId;   // FK logique
    String      sourceDocumentNumber;
    LocalDateTime entryDate;
    String description;
}

@Entity @Table(name = "payments")
public class Payment {
    @Id @GeneratedValue Long id;
    Long counterPartId;
    Long documentId;
    BigDecimal amount;
    PaymentMethod method;         // CASH | CHEQUE | VIREMENT | CARTE | TRAITE
    LocalDate paymentDate;
    String reference;
    String bankReference;
    Long createdById;
    Long salesSiteId;
}
```

#### Calcul automatique Retenue à la Source (RS) — Gap §5.3
```java
// Sur chaque facture fournisseur :
// Net payable = TTC - (TTC × withHoldingTaxRate / 100)
// Entrée grand livre : DEBIT fournisseur du montant TTC
//                       CREDIT retenue au compte 4453 (RS État)
```

#### Événements Kafka consommés
- `AccountingEntryRequestedEvent` → crée entrée dans `account_ledger` + met à jour le solde

#### Événements Kafka publiés  
- `AccountingEntryCreatedEvent`
- `PaymentDueAlertEvent` → factures impayées > seuil configuré (gap §5.19)

---

### 4.7 `hr-service` — Ressources Humaines
**Port :** 8087  
**Base de données :** `hr_db`  
**Responsabilités :** Employés, congés, avances, bulletins de paie, génération PDF (JasperReports)

#### Endpoints REST
```
GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/{id}
PUT    /api/v1/employees/{id}
DELETE /api/v1/employees/{id}

GET    /api/v1/employees/{id}/leaves
POST   /api/v1/leaves
PUT    /api/v1/leaves/{id}
DELETE /api/v1/leaves/{id}

GET    /api/v1/employees/{id}/advances
POST   /api/v1/advances
PUT    /api/v1/advances/{id}
DELETE /api/v1/advances/{id}

GET    /api/v1/employees/{id}/payslips
POST   /api/v1/payslips/generate
GET    /api/v1/payslips/{id}/download   # PDF réel (JasperReports)
```

#### Entités JPA clés
```java
@Entity @Table(name = "employees")
public class Employee {
    @Id @GeneratedValue Long id;
    String firstname;
    String lastname;
    String cin;                // Carte d'identité nationale
    String idCnss;             // CNSS
    String jobTitle;
    BigDecimal baseSalary;
    LocalDate hireDate;
    Boolean isActive;
    Long enterpriseId;
    Long appUserId;            // FK logique si employé est aussi utilisateur
}

@Entity @Table(name = "payslips")
public class Payslip {
    @Id @GeneratedValue Long id;
    Long employeeId;
    Integer month;
    Integer year;
    BigDecimal baseSalary;
    BigDecimal advances;       // Déduction des avances
    BigDecimal cnssAmount;     // Cotisations CNSS
    BigDecimal irppAmount;     // IRPP
    BigDecimal netSalary;
    LocalDateTime generatedAt;
    String    pdfPath;         // Chemin MinIO/S3
}
```

#### Génération PDF — JasperReports
```java
// Résolution du gap §5.1 dans le contexte Spring Boot
@Service
public class PayslipPdfService {
    // JasperReports compile un template .jrxml
    // Rempli avec les données de l'employé
    // Stocké dans MinIO, URL signée retournée au client
}
```

---

### 4.8 `logistics-service` — Logistique
**Port :** 8088  
**Base de données :** `logistics_db`  
**Responsabilités :** Véhicules, gestion des sites (complémentaire à iam-service pour les données de configuration)

#### Endpoints REST
```
GET    /api/v1/vehicles
POST   /api/v1/vehicles
GET    /api/v1/vehicles/{id}
PUT    /api/v1/vehicles/{id}
DELETE /api/v1/vehicles/{id}

GET    /api/v1/banks
POST   /api/v1/banks
PUT    /api/v1/banks/{id}
DELETE /api/v1/banks/{id}
```

---

### 4.9 `analytics-service` — Reporting & KPIs
**Port :** 8089  
**Base de données :** Vues matérialisées + lecture sur replicas PostgreSQL  
**Responsabilités :** Dashboard agrégé, alertes de stock, rapports de vente, export Excel  

> ⚠️ Ce service est **read-only**. Il consomme les événements Kafka pour maintenir ses agrégats à jour — jamais d'appels synchrones vers les autres services.

#### Endpoints REST
```
GET    /api/v1/analytics/dashboard?enterpriseId={}
GET    /api/v1/analytics/sales?from={}&to={}&groupBy={day|week|month}
GET    /api/v1/analytics/top-customers?limit=10&from={}
GET    /api/v1/analytics/top-articles?limit=10&from={}
GET    /api/v1/analytics/profitability?articleId={}   # Prix achat vs vente
GET    /api/v1/analytics/stock-alerts
GET    /api/v1/reports/sales/export?format={xlsx|csv}
GET    /api/v1/reports/counterpart-statement/{id}/export
```

#### Architecture interne (CQRS Read Side)
```java
// Les projections sont maintenues par des Kafka consumers
// Chaque événement de domaine met à jour les tables de reporting

@KafkaListener(topics = "document.events")
void onDocumentEvent(DocumentCreatedEvent event) {
    // Met à jour les agrégats dashboard en temps réel
    dashboardAggregateRepository.updateDailySales(event);
}

@KafkaListener(topics = "stock.events")
void onStockEvent(StockMovementConfirmedEvent event) {
    // Met à jour les alertes de stock
    stockAlertRepository.refreshAlerts(event);
}
```

#### Export Excel — Apache POI
```java
@Service
public class ExcelExportService {
    // Apache POI XSSF pour générer des .xlsx
    // Templates avec styles WoodApp (couleurs, en-tête)
    // Stocké temporairement dans MinIO, URL signée (TTL 5min)
}
```

---

### 4.10 `notification-service` — Notifications Temps Réel
**Port :** 8090 (WebSocket)  
**Responsabilités :** WebSocket push, alertes stock, confirmations transfert (remplace SignalR du backend .NET)

#### Technologies
- **Spring WebSocket** + STOMP
- **SockJS** côté Angular (conservé)
- Consomme les topics Kafka et broadcaste aux clients connectés

```java
@EventListener
@KafkaListener(topics = {"stock.alerts", "transfer.events", "payment.due"})
void onAlert(Object event) {
    // Broadcast via WebSocket au bon topic STOMP
    messagingTemplate.convertAndSendToUser(
        userId, "/queue/notifications", notification
    );
}
```

---

## 5. Infrastructure transversale

### 5.1 Spring Cloud Gateway — Configuration
```yaml
# application.yml du gateway
spring:
  cloud:
    gateway:
      routes:
        - id: iam-service
          uri: lb://iam-service
          predicates:
            - Path=/api/v1/auth/**, /api/v1/enterprises/**, /api/v1/users/**
          filters:
            - name: CircuitBreaker
              args:
                name: iam-cb
                fallbackUri: forward:/fallback/iam

        - id: commercial-service
          uri: lb://commercial-service
          predicates:
            - Path=/api/v1/documents/**
          filters:
            - AuthenticationFilter   # Valide JWT
            - RateLimiter=10,1       # 10 req/s par user

      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "https://woodapp.example.com"
            allowedMethods: [GET, POST, PUT, DELETE, OPTIONS]
```

### 5.2 Service Registry — Spring Cloud Eureka
```yaml
# eureka-server
server:
  port: 8761
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

### 5.3 Config Server — Spring Cloud Config
```yaml
# Centralise les configurations de tous les services
# Sources : Git repo (configs versionnées)
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/woodapp/config-repo
          search-paths: '{application}'
```

### 5.4 Kafka — Topics et partitions

| Topic | Producteur | Consommateurs | Partitions | Rétention |
|---|---|---|---|---|
| `enterprise.events` | iam-service | catalog-service | 3 | 7 jours |
| `document.events` | commercial-service | accounting-service, analytics-service | 6 | 30 jours |
| `stock.events` | stock-service | commercial-service, analytics-service, notification-service | 6 | 30 jours |
| `accounting.events` | accounting-service | commercial-service | 3 | 30 jours |
| `payment.events` | accounting-service | notification-service, analytics-service | 3 | 30 jours |
| `stock.alerts` | stock-service | notification-service, analytics-service | 3 | 7 jours |
| `transfer.events` | stock-service | notification-service | 3 | 7 jours |
| `hr.events` | hr-service | notification-service | 3 | 7 jours |

### 5.5 Redis — Stratégie de cache

| Service | Clé | TTL | Stratégie |
|---|---|---|---|
| catalog-service | `catalog:articles:all` | 10 min | Cache-Aside |
| catalog-service | `catalog:appvariables:{nature}` | 30 min | Cache-Aside |
| iam-service | `iam:user:{userId}` | 15 min | Cache-Aside |
| counterpart-service | `counterpart:list:{type}` | 5 min | Cache-Aside |
| stock-service | `stock:site:{siteId}` | 1 min | Write-Through |
| analytics-service | `analytics:dashboard:{enterpriseId}` | 2 min | Read-Through |

### 5.6 Stockage fichiers — MinIO (S3-compatible)

| Bucket | Contenu | Accès |
|---|---|---|
| `woodapp-pdfs` | Factures, BL, bulletins de paie | URL signées (TTL 10min) |
| `woodapp-exports` | Fichiers Excel exportés | URL signées (TTL 5min) |
| `woodapp-imports` | Fichiers Excel à importer | URL signées (TTL 1h) |
| `woodapp-logos` | Logo entreprise | Public |

---

## 6. Communication inter-services (Event-Driven)

### 6.1 Contrats d'événements (Event Schemas)

```json
// EnterpriseRegisteredEvent
{
  "eventId": "uuid",
  "eventType": "EnterpriseRegisteredEvent",
  "enterpriseId": 1,
  "isSalingWood": true,
  "seedUserId": 42,
  "occurredAt": "2026-04-12T20:00:00Z"
}

// StockMovementRequestedEvent
{
  "eventId": "uuid",
  "correlationId": "saga-uuid",
  "documentId": 101,
  "documentType": "CUSTOMER_DELIVERY",
  "salesSiteId": 1,
  "lines": [
    { "merchandiseId": 55, "quantity": 10.5, "direction": "OUT" }
  ],
  "occurredAt": "2026-04-12T20:00:00Z"
}

// AccountingEntryRequestedEvent
{
  "eventId": "uuid",
  "correlationId": "saga-uuid",
  "documentId": 101,
  "documentType": "CUSTOMER_DELIVERY",
  "counterPartId": 22,
  "counterPartType": "CUSTOMER",
  "totalHT": 1500.00,
  "tvaAmount": 285.00,
  "totalTTC": 1785.00,
  "withholdingTax": 0.00,
  "direction": "DEBIT",
  "occurredAt": "2026-04-12T20:00:00Z"
}
```

### 6.2 Appels synchrones (Feign Client) — Données de référence uniquement

```java
// Dans commercial-service: récupération des données article pour dénormalisation
@FeignClient(name = "catalog-service", fallback = CatalogFallback.class)
public interface CatalogClient {
    @GetMapping("/api/v1/articles/{id}")
    ArticleDto getArticle(@PathVariable Long id);
}

// Fallback en cas d'indisponibilité
class CatalogFallback implements CatalogClient {
    public ArticleDto getArticle(Long id) {
        return ArticleDto.unknown(id); // Données minimales depuis cache local
    }
}
```

**Règle :** Les Feign Clients ne sont utilisés que pour lire des données de référence (article, contrepartie) lors de la création d'un document, afin de **dénormaliser** les données clés dans la table `document_lines`. Après dénormalisation, plus aucune dépendance synchrone.

---

## 7. Sécurité & IAM

### 7.1 Architecture JWT

```
┌─────────────────┐         ┌──────────────┐
│   Angular SPA   │  POST   │ iam-service  │
│                 │ ──────► │ /auth/login  │
│                 │ ◄────── │              │
│  Store tokens:  │  {      │  Génère:     │
│  AccessToken    │   AT,   │  AT (15 min) │
│  RefreshToken   │   RT    │  RT (7 jours)│
│                 │  }      │              │
└─────────────────┘         └──────────────┘
         │
         │ Authorization: Bearer {AT}
         ▼
┌─────────────────┐
│  Spring Cloud   │  Valide signature JWT (clé publique)
│  Gateway        │  Extrait userId, role, enterpriseId
│                 │  Ajoute headers X-User-Id, X-Role
└────────┬────────┘
         │ Propagation des headers (pas du token)
         ▼
┌─────────────────┐
│  Microservice   │  Lit X-User-Id, X-Role depuis headers
│  (Spring Sec.)  │  Pas de validation JWT répétée
└─────────────────┘
```

### 7.2 Configuration Spring Security par service

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/**").hasAnyRole("ADMIN", "EMPLOYEE")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(new GatewayHeaderAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}

// Filtre : lit les headers injectés par le Gateway au lieu de re-valider JWT
@Component
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) {
        String userId = request.getHeader("X-User-Id");
        String role   = request.getHeader("X-Role");
        // Construit l'Authentication et le met dans le SecurityContext
    }
}
```

### 7.3 Audit Trail — Aspect AOP

```java
// Résolution du gap §5.20 — Audit Log complet
@Aspect @Component
public class AuditAspect {

    @AfterReturning("@annotation(Auditable)")
    public void auditAction(JoinPoint jp, Object result) {
        AuditLog log = AuditLog.builder()
            .userId(SecurityUtils.getCurrentUserId())
            .action(jp.getSignature().getName())
            .entityClass(jp.getArgs()[0].getClass().getSimpleName())
            .entityId(extractId(result))
            .occurredAt(Instant.now())
            .build();
        auditLogRepository.save(log);
        // Publié aussi sur Kafka topic `audit.events`
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {}
```

---

## 8. Observabilité & Monitoring

### 8.1 Stack d'observabilité

```
┌───────────────────────────────────────────────────────────────┐
│                    OBSERVABILITÉ (3 pilliers)                 │
├─────────────────┬─────────────────────┬────────────────────── │
│     TRACES      │      MÉTRIQUES      │        LOGS           │
│  Micrometer     │    Micrometer +     │   Logback +           │
│  + Zipkin       │    Prometheus       │   ELK Stack           │
│                 │    + Grafana        │   (Elasticsearch,     │
│                 │                     │    Logstash, Kibana)  │
└─────────────────┴─────────────────────┴───────────────────────┘
```

### 8.2 Configuration Micrometer + Prometheus (par service)

```yaml
# application.yml — commun à tous les services
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
  tracing:
    sampling:
      probability: 1.0   # 100% en dev, 10% en prod
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

### 8.3 Dashboards Grafana — Panels configurés

| Dashboard | Métriques clés |
|---|---|
| **WoodApp Overview** | Req/s par service, taux d'erreur, latence p99 |
| **Commercial Service** | Documents créés/heure, taux de conversion Devis→FA |
| **Stock Service** | Articles en stock bas, transferts en attente |
| **Accounting Service** | Paiements traités/jour, soldes anormaux |
| **Kafka** | Lag des consommateurs, throughput par topic |
| **JVM** | Heap, GC, threads par service |
| **PostgreSQL** | Connexions actives (PgBouncer), slow queries |

### 8.4 Alertes Prometheus

```yaml
# alerting rules
groups:
  - name: woodapp
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        annotations:
          summary: "Service {{ $labels.job }} est DOWN"

      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status="5xx"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "Taux d'erreur élevé sur {{ $labels.job }}"

      - alert: KafkaConsumerLag
        expr: kafka_consumer_group_lag > 1000
        for: 10m
        annotations:
          summary: "Kafka consumer lag critique sur {{ $labels.topic }}"
```

---

## 9. Structure de projet Spring Boot (par service)

### Structure type — `commercial-service`

```
commercial-service/
├── src/
│   ├── main/
│   │   ├── java/com/woodapp/commercial/
│   │   │   ├── CommercialServiceApplication.java
│   │   │   │
│   │   │   ├── api/                         # Couche REST (Controllers)
│   │   │   │   ├── DocumentController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── request/
│   │   │   │   │   │   ├── CreateDocumentRequest.java
│   │   │   │   │   │   └── ConvertDocumentRequest.java
│   │   │   │   │   └── response/
│   │   │   │   │       ├── DocumentResponse.java
│   │   │   │   │       └── DocumentSummaryResponse.java
│   │   │   │   └── mapper/
│   │   │   │       └── DocumentMapper.java      # MapStruct
│   │   │   │
│   │   │   ├── domain/                      # Cœur métier (pur Java, sans Spring)
│   │   │   │   ├── model/
│   │   │   │   │   ├── Document.java
│   │   │   │   │   ├── DocumentLine.java
│   │   │   │   │   ├── DocumentRelationship.java
│   │   │   │   │   └── enums/
│   │   │   │   │       ├── DocumentType.java
│   │   │   │   │       ├── DocStatus.java
│   │   │   │   │       └── BillingStatus.java
│   │   │   │   ├── service/
│   │   │   │   │   ├── DocumentService.java
│   │   │   │   │   ├── DocumentWorkflowService.java  # Conversions, Sagas
│   │   │   │   │   ├── DocumentNumberingService.java # Numérotation thread-safe
│   │   │   │   │   └── CreditNoteService.java        # Avoirs §5.13
│   │   │   │   ├── port/
│   │   │   │   │   ├── out/
│   │   │   │   │   │   ├── DocumentRepository.java   # Interface (pas JPA)
│   │   │   │   │   │   └── DocumentEventPublisher.java
│   │   │   │   │   └── in/
│   │   │   │   │       └── StockEventConsumer.java
│   │   │   │   └── event/
│   │   │   │       ├── DocumentCreatedEvent.java
│   │   │   │       └── StockMovementRequestedEvent.java
│   │   │   │
│   │   │   ├── infrastructure/              # Adaptateurs (Spring + JPA)
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── DocumentJpaEntity.java
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   └── DocumentJpaRepository.java  # Spring Data JPA
│   │   │   │   │   └── adapter/
│   │   │   │   │       └── DocumentRepositoryAdapter.java
│   │   │   │   ├── messaging/
│   │   │   │   │   ├── KafkaDocumentEventPublisher.java
│   │   │   │   │   └── KafkaStockEventConsumer.java
│   │   │   │   ├── client/
│   │   │   │   │   ├── CatalogClient.java           # Feign
│   │   │   │   │   └── CounterPartClient.java       # Feign
│   │   │   │   └── pdf/
│   │   │   │       └── DocumentPdfService.java      # JasperReports / iText
│   │   │   │
│   │   │   └── config/
│   │   │       ├── SecurityConfig.java
│   │   │       ├── KafkaConfig.java
│   │   │       ├── RedisConfig.java
│   │   │       ├── FeignConfig.java
│   │   │       └── OpenApiConfig.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/migration/               # Flyway SQL
│   │           ├── V1__create_documents.sql
│   │           ├── V2__add_document_lines.sql
│   │           └── V3__add_credit_notes.sql
│   │
│   └── test/
│       ├── java/com/woodapp/commercial/
│       │   ├── api/DocumentControllerTest.java    # MockMvc
│       │   ├── domain/DocumentServiceTest.java    # Unit tests
│       │   └── integration/DocumentIntegrationTest.java  # Testcontainers
│       └── resources/
│           └── application-test.yml
│
├── Dockerfile
├── pom.xml
└── README.md
```

### `pom.xml` — Dépendances communes

```xml
<dependencies>
    <!-- Spring Boot -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>

    <!-- Spring Cloud -->
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-circuitbreaker-resilience4j</artifactId>
    </dependency>

    <!-- Kafka -->
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <!-- Cache -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!-- Observabilité -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-brave</artifactId>
    </dependency>
    <dependency>
        <groupId>io.zipkin.reporter2</groupId>
        <artifactId>zipkin-reporter-brave</artifactId>
    </dependency>

    <!-- MapStruct (mapping DTO) -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.5.5.Final</version>
    </dependency>

    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- OpenAPI -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.4.0</version>
    </dependency>

    <!-- PDF (hr-service et commercial-service) -->
    <dependency>
        <groupId>net.sf.jasperreports</groupId>
        <artifactId>jasperreports</artifactId>
        <version>6.21.3</version>
    </dependency>

    <!-- Tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>kafka</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## 10. Docker Compose — Développement local

```yaml
# docker-compose.yml
version: "3.9"

services:

  # ─── Infrastructure ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: woodapp
      POSTGRES_PASSWORD: woodapp_secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-databases.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U woodapp"]
      interval: 10s

  pgbouncer:
    image: bitnami/pgbouncer:latest
    environment:
      PGBOUNCER_DATABASE: "*"
      PGBOUNCER_POOL_MODE: transaction
      POSTGRESQL_HOST: postgres
    ports:
      - "6432:6432"
    depends_on:
      postgres:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on: [zookeeper]
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 1

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8888:8080"
    environment:
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: woodapp
      MINIO_ROOT_PASSWORD: woodapp_secret
    volumes:
      - minio_data:/data

  zipkin:
    image: openzipkin/zipkin:latest
    ports:
      - "9411:9411"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: woodapp
    volumes:
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards

  # ─── Service Registry & Gateway ─────────────────────────────────
  eureka-server:
    build: ./eureka-server
    ports:
      - "8761:8761"

  config-server:
    build: ./config-server
    ports:
      - "8888:8888"
    depends_on: [eureka-server]

  api-gateway:
    build: ./api-gateway
    ports:
      - "8080:8080"
    depends_on: [eureka-server, redis]
    environment:
      SPRING_PROFILES_ACTIVE: dev
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://eureka-server:8761/eureka

  # ─── Microservices ───────────────────────────────────────────────
  iam-service:
    build: ./iam-service
    ports:
      - "8081:8081"
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/iam_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
      SPRING_DATA_REDIS_HOST: redis
    depends_on: [pgbouncer, kafka, eureka-server]

  catalog-service:
    build: ./catalog-service
    ports:
      - "8082:8082"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/catalog_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [pgbouncer, kafka, eureka-server]

  counterpart-service:
    build: ./counterpart-service
    ports:
      - "8083:8083"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/counterpart_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [pgbouncer, kafka, eureka-server]

  commercial-service:
    build: ./commercial-service
    ports:
      - "8084:8084"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/commercial_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
      MINIO_ENDPOINT: http://minio:9000
    depends_on: [pgbouncer, kafka, eureka-server, minio]

  stock-service:
    build: ./stock-service
    ports:
      - "8085:8085"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/stock_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [pgbouncer, kafka, eureka-server]

  accounting-service:
    build: ./accounting-service
    ports:
      - "8086:8086"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/accounting_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [pgbouncer, kafka, eureka-server]

  hr-service:
    build: ./hr-service
    ports:
      - "8087:8087"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/hr_db
      MINIO_ENDPOINT: http://minio:9000
    depends_on: [pgbouncer, kafka, eureka-server, minio]

  analytics-service:
    build: ./analytics-service
    ports:
      - "8089:8089"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://pgbouncer:6432/analytics_db
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
      SPRING_DATA_REDIS_HOST: redis
    depends_on: [pgbouncer, kafka, eureka-server, redis]

  notification-service:
    build: ./notification-service
    ports:
      - "8090:8090"
    environment:
      SPRING_KAFKA_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [kafka, eureka-server]

volumes:
  postgres_data:
  minio_data:
```

---

## 11. Kubernetes — Production

### 11.1 Structure des manifests

```
k8s/
├── namespace.yaml
├── infrastructure/
│   ├── postgres-statefulset.yaml
│   ├── pgbouncer-deployment.yaml
│   ├── redis-statefulset.yaml
│   ├── kafka-statefulset.yaml          # Strimzi Operator
│   ├── minio-statefulset.yaml
│   ├── prometheus-deployment.yaml
│   └── grafana-deployment.yaml
├── services/
│   ├── iam-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml                    # HorizontalPodAutoscaler
│   │   └── configmap.yaml
│   ├── commercial-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   └── ...
└── ingress/
    └── nginx-ingress.yaml
```

### 11.2 Deployment type — `commercial-service`

```yaml
# commercial-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: commercial-service
  namespace: woodapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: commercial-service
  template:
    metadata:
      labels:
        app: commercial-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/actuator/prometheus"
        prometheus.io/port: "8084"
    spec:
      containers:
        - name: commercial-service
          image: woodapp/commercial-service:latest
          ports:
            - containerPort: 8084
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                secretKeyRef:
                  name: commercial-db-secret
                  key: datasource-url
            - name: SPRING_KAFKA_BOOTSTRAPSERVERS
              value: "kafka:9092"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8084
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8084
            initialDelaySeconds: 20
            periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: commercial-service-hpa
  namespace: woodapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: commercial-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 12. Migration depuis le monolithe .NET

### 12.1 Stratégie — Strangler Fig Pattern

```
Phase actuelle : Monolithe .NET unique
Phase cible    : 10 microservices Spring Boot indépendants

Approche : Ne pas tout réécrire d'un coup.
Extraire service par service, en commençant par les moins couplés.
```

### 12.2 Ordre de migration recommandé

```
Étape 1 — Independants (0 dépendances inter-service)
  ✅ iam-service          (Auth/Users — pivot de tout le système)
  ✅ catalog-service      (Articles/Dimensions — référentiel pur)
  ✅ logistics-service    (Véhicules/Banques — très isolé)

Étape 2 — Dépendants simples
  ✅ counterpart-service  (Clients/Fournisseurs — lit iam pour enterprise)
  ✅ hr-service           (RH — lit iam pour employee/user link)

Étape 3 — Domaines complexes (Saga Pattern requis)
  ✅ stock-service        (Stock — écoute commercial)
  ✅ accounting-service   (Comptabilité — écoute commercial et payments)
  ✅ commercial-service   (Documents — orchestre stock + accounting)

Étape 4 — Services analytiques (lecture seule)
  ✅ analytics-service    (KPIs — projections depuis Kafka)
  ✅ notification-service (WebSocket — remplace SignalR)
```

### 12.3 Mapping .NET → Spring Boot

| Concept .NET actuel | Équivalent Spring Boot |
|---|---|
| `BaseApiController` | `@RestController` + `ResponseEntity<>` |
| `Repository<T>` | `JpaRepository<T, Long>` (Spring Data) |
| `IDocumentWorkflowService` | `@Service DocumentWorkflowService` |
| `AccountLedger` | `@Entity AccountLedger` + `JpaRepository` |
| `SignalR Hub` | `@MessageMapping` (Spring WebSocket + STOMP) |
| `Entity.MoveToDto()` | `@Mapper` MapStruct interface |
| `EF Core AsNoTracking()` | `@Transactional(readOnly = true)` |
| `EF Core SaveChanges()` | `repository.save(entity)` |
| `lock(_lockObj)` | `@Lock(PESSIMISTIC_WRITE)` sur JPA |
| Flyway (déjà utilisé) | Flyway (même outil, même concept) |
| `IConfiguration` | `@ConfigurationProperties` |
| `ILogger<T>` | `Slf4j` via Lombok `@Slf4j` |

---

## 13. Roadmap d'implémentation

### Sprint 1 — Infrastructure (2 semaines)
```
□ Mise en place du monorepo (Maven multi-module ou Gradle composite)
□ Eureka Server + Config Server
□ API Gateway (Spring Cloud Gateway)
□ Docker Compose complet (infra + services stub)
□ CI/CD GitHub Actions : build + test + Docker push
□ Cluster Kafka (3 brokers, topics créés)
```

### Sprint 2 — Services référentiels (3 semaines)
```
□ iam-service : Auth JWT, Enterprise, Users, Sites
□ catalog-service : Articles, Catégories, AppVariables, cache Redis
□ logistics-service : Véhicules, Banques
□ Flyway migrations pour les 3 bases
□ Tests unitaires + Testcontainers
```

### Sprint 3 — Contreparties & RH (2 semaines)
```
□ counterpart-service : Clients, Fournisseurs, Transporteurs
□ hr-service : Employés, Congés, Avances, Bulletins (JasperReports PDF)
□ MinIO : upload & URL signées pour PDF bulletins (résout gap §5.1)
```

### Sprint 4 — Stock & Comptabilité (3 semaines)
```
□ stock-service : Stock multi-sites, Transferts, Inventaires, Alertes (§5.7)
□ accounting-service : Grand livre, Soldes, Paiements, RS complète (§5.3)
□ Saga de base : StockMovementRequestedEvent ↔ StockMovementConfirmedEvent
```

### Sprint 5 — Commercial (4 semaines) ⭐ Sprint le plus complexe
```
□ commercial-service : Tous les types de documents
□ Saga complète BL → Stock → Accounting
□ Conversion automatique Devis→BC→BL→FA (§5.4)
□ Gestion des reliquats — quantités partiellement livrées (§5.5)
□ Avoirs / Credit Notes (§5.13)
□ PDF Factures/BL/BR via JasperReports (§5.1)
□ Retenue à la source complète (§5.3)
```

### Sprint 6 — Analytics & Notifications (2 semaines)
```
□ analytics-service : Dashboard KPIs agrégés (résout §5.2)
□ analytics-service : Export Excel Apache POI (§5.12)
□ notification-service : WebSocket STOMP, alertes stock, transferts
□ Dashboards Grafana + alertes Prometheus
```

### Sprint 7 — Polish & Production (2 semaines)
```
□ Audit Trail complet via AOP (§5.20)
□ Numérotation personnalisable (§5.14)
□ Import Excel catalogue et contreparties (§5.11)
□ Kubernetes manifests (HPA, probes, secrets)
□ Tests d'intégration bout-en-bout
□ Documentation OpenAPI publiée
□ Load testing (k6) — objectif : 500 req/s sur commercial-service
```

---

## Résumé de la valeur apportée

| Dimension | Monolithe .NET actuel | Microservices Spring Boot cible |
|---|---|---|
| **Déploiement** | Tout ou rien | Service par service, zéro downtime |
| **Scalabilité** | Verticale uniquement | Horizontale par service (HPA Kubernetes) |
| **Performance** | 1 DB, pas de cache | Cache Redis L2, connexions PgBouncer |
| **Observabilité** | Console logs uniquement | Prometheus + Grafana + Zipkin |
| **Résilience** | SPOF unique | Circuit Breaker + retry + fallback |
| **Tests** | Intégration couplée | Unit + Integration par service (Testcontainers) |
| **PDF** | Stub non fonctionnel | JasperReports + MinIO (URL signées) |
| **Temps réel** | SignalR partiel (Stock) | Spring WebSocket STOMP (tous domaines) |
| **KPIs dashboard** | Chargement de toutes les factures | Projections Kafka + cache Redis 2min |
| **Audit** | Absent | AOP @Auditable + Kafka topic `audit.events` |

---

*Document généré — WoodApp ERP — Migration vers Architecture Microservices Spring Boot — Avril 2026*
