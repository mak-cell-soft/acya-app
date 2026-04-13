# WoodApp — Audit Fonctionnel Complet

> **Scope :** `wood-app.api` (ASP.NET Core 8 + PostgreSQL) × `WoodApp-UI` (Angular 18 + NgRx)  
> **Date :** Avril 2026 — Révision automatique via scan de code  

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Fonctionnalités implémentées — Backend (API)](#2-fonctionnalités-implémentées--backend-api)
3. [Fonctionnalités implémentées — Frontend (UI)](#3-fonctionnalités-implémentées--frontend-ui)
4. [Matrice de couverture fonctionnelle](#4-matrice-de-couverture-fonctionnelle)
5. [Fonctionnalités manquantes — Gaps métier](#5-fonctionnalités-manquantes--gaps-métier)
6. [Proposition de stack production optimisée](#6-proposition-de-stack-production-optimisée)

---

## 1. Architecture générale

```
acya-app/
├── wood-app.api/           # Backend (.NET 8 · EF Core · PostgreSQL)
│   └── src/
│       ├── ms.webapp.api.acya/              # Couche API (Controllers, Services)
│       ├── ms.webapp.api.acya.core/         # Domaine (Entities, DTOs, Interfaces)
│       ├── ms.webapp.api.acya.infrastructure/  # Data (EF Context, Repositories)
│       └── ms.webapp.api.acya.common/       # Enums, Helpers, Constants
└── WoodApp-UI/             # Frontend (Angular 18 · NgRx · Angular Material)
    └── src/app/
        ├── features/        # Modules lazy-loadés par domaine
        ├── services/        # Services HTTP par entité
        ├── models/          # Interfaces TypeScript (DTOs miroir)
        ├── store/           # NgRx (State, Actions, Reducers, Selectors)
        └── shared/          # Modales génériques, constantes, guards
```

---

## 2. Fonctionnalités implémentées — Backend (API)

### 2.1 Authentification & Utilisateurs
| Controller | Méthodes | Description |
|---|---|---|
| `AccountController` | login, register | JWT Auth, gestion de session |
| `AppUserController` | CRUD, GetAll, permissions | Gestion des utilisateurs applicatifs |
| `EnterpriseController` | register, Get, GetById | Enregistrement entreprise + seed initial |

**Entités :** `AppUser`, `Person`, `Enterprise`, `SalesSite` (site de vente)

**Remarques métier :**
- Système de rôles (Admin / Employé / autre via `Roles` enum)
- Seed automatique des données bois (`ExecuteSeedWoodScript`) à l'enregistrement
- Multi-site : chaque utilisateur est rattaché à un `SalesSite`

---

### 2.2 Catalogue Articles
| Controller | Méthodes | Description |
|---|---|---|
| `ArticleController` | Add, GetAll, Get(id), Put, DeleteSoft | Gestion catalogue articles |
| `AppVariableController` | CRUD | Dimensions (épaisseur / largeur) |
| `CategoryController` | CRUD | Catégories et sous-catégories |
| `FirstChildController` | CRUD | Nœuds 1er niveau de la hiérarchie articles |

**Logique métier :**
- Article **Bois** (IsWood=true) : référence composite `{Catégorie}-{Épaisseur}{Largeur}-{AAMM}-{N°}`
- Article **Standard** : référence `{Catégorie}-{AAMM}-{N°}`
- Historique de prix de vente (`SellPriceHistory`) automatiquement créé à l'ajout
- Dernier prix d'achat récupérable (`GetLastPurchasePrice`)

---

### 2.3 Contreparties (Clients & Fournisseurs)
| Controller | Méthodes | Description |
|---|---|---|
| `CounterPartController` | Add, Get, Put, GetAll(_type), DeleteSoft | Clients & Fournisseurs unifiés |
| `TransporterController` | CRUD + GetAll | Transporteurs |

**Entités :** `CounterPart` (type : `Customer` ou `Provider`), `Customer`, `Provider`, `Transporter`

**Logique métier :**
- GUID unique par contrepartie
- Association possible à un transporteur
- Soft delete (IsDeleted = true)

---

### 2.4 Documents Commerciaux (Workflow central)
| Controller | Méthodes clés | Description |
|---|---|---|
| `DocumentController` | GetByType, GetByTypeByMonth, Add, UpdateStatus, CreateInvoice, EditDocument, Delete, GenerateChildDocument | Moteur documentaire central |

**Types de documents gérés (`DocumentTypes` enum) :**

| Type | Code | Description | Cycle de vie |
|---|---|---|---|
| `supplierReceipt` | BR | Bon de Réception fournisseur | Affecte le stock (+) |
| `supplierInvoice` | FF | Facture fournisseur | Agrège les BR, comptabilité |
| `supplierOrder` | BC-F | Bon de Commande fournisseur | Ne touche pas le stock |
| `customerDeliveryNote` | BL | Bon de Livraison client | Affecte le stock (-) |
| `customerInvoice` | FA | Facture client | Agrège les BL, comptabilité |
| `customerQuote` | DEV | Devis client | Ne touche pas le stock |
| `customerOrder` | BC-C | Bon de Commande client | Ne touche pas le stock |
| `inventory` | INV | Inventaire physique | Écrasement du stock |

**Workflow de conversion parent→enfant :**
```
Fournisseur :  Bon Commande → Réception (BR) → Facture Fournisseur (FF)
Client :       Devis → Bon de Commande → Bon de Livraison (BL) → Facture Client (FA)
```

**Logique métier documentaire :**
- Numérotation automatique avec préfixe par type et verrou thread-safe
- Vérification unicité référence fournisseur
- Relation `DocumentDocumentRelationship` (parent ↔ enfant) pour traçabilité
- Flag `IsInvoiced` propagé aux documents enfants lors de la facturation
- Support remise (`DiscountPercentage`), TVA, TTC, Retenue à la source
- Champ `IsService` pour documents de prestation
- `BillingStatus` pour suivi facturation
- `DocStatus` : Pending / Validated / etc.

**Mouvements de stock déclenchés :**
- Réception fournisseur (BR) → `+` stock
- Livraison client (BL) → `-` stock
- Facture client directe (FA sans BL) → `-` stock
- Commandes, devis → aucun mouvement stock

**Comptabilité intégrée :**
- Entrée Grand livre (`AccountLedger`) automatique à chaque facture/livraison
- Mise à jour du solde client/fournisseur après chaque transaction

---

### 2.5 Gestion des Paiements
| Controller | Méthodes | Description |
|---|---|---|
| `PaymentsController` | GetById, Search, GetByCustomer, GetByDocument, Create, Update, Delete, GetDashboardPayments, LinkToInvoice | Paiements complets |

**Méthodes de paiement gérées :** Espèces, Chèque, Virement, Carte, Traite

**Logique métier :**
- Liaison paiement → document (peut être redirigé BL → FA)
- Dashboard paiements filtrés par date et utilisateur
- Recherche paginée (`PagedResult`)

---

### 2.6 Stock & Inventaire
| Controller | Méthodes | Description |
|---|---|---|
| `StockController` | GetBySite, GetAllStocks, transfer, process-transfer, confirm-transfer, reject-transfer, UpdateTransfer, GetStockTransfersInfos, GetFilteredStockTransfersInfos, GetWoodStockWithLengthDetails, GetMissedNotifications, GetConfirmationCode | Gestion complète du stock |
| `StockMovementController` | GetTimeline, GetTimelineByPackage, GetSummary, Reconcile, GetSites | Historique mouvements |
| `InventoryController` | GetInventories, AddInventory, ValidateInventory | Inventaire physique |

**Logique métier Stock :**
- Stock par `Merchandise` + `SalesSite` (multi-dépôt)
- **Transfert standard** : direct sans confirmation
- **Transfert avec confirmation** : 3 étapes (initiation → code de confirmation → validation/rejet)
- Notifications en temps réel (SignalR) pour les transferts en attente
- Détail de stock bois par longueur de pièces
- Timeline de mouvement par merchandise ou par référence colis
- Réconciliation stock (différence théorique/réel)
- Inventaire physique : création en statut Pending, validation → écrasement stock

---

### 2.7 Comptabilité & Soldes
| Controller | Méthodes | Description |
|---|---|---|
| `AccountingController` | GetBalance, GetStatement | Solde et relevé de compte |
| `AdminDashController` | GetCustomerBalances, GetSupplierBalances, RefreshBalances | Dashboard financier admin |

**Logique métier :**
- `AccountLedger` : journal comptable par contrepartie
- Solde calculé en temps réel
- Relevé de compte sur période
- Refresh global des soldes (recalcul batch)

---

### 2.8 RH — Gestion des Employés
| Controller | Méthodes | Description |
|---|---|---|
| `PersonController` | CRUD, GetAll | Gestion des personnes/employés |
| `AdvanceController` | CRUD + GetByEmployee | Avances sur salaire |
| `LeaveController` | CRUD + GetByEmployee | Congés |
| `PayslipController` | Generate, GetAll, GetByEmployee, DownloadPdf | Bulletins de paie |

**Remarques :**
- `DownloadPdf` : stub présent, intégration PDF réelle non implémentée (commentaire TODO)

---

### 2.9 Logistique & Maintenance
| Controller | Méthodes | Description |
|---|---|---|
| `VehicleController` | CRUD | Gestion du parc véhicules |
| `SalesSitesController` | GetAll, Get | Sites de vente |
| `MerchandiseController` | GetAll, GenerateReferenceForMerchandise | Catalogue marchandises |

---

### 2.10 Configuration Système
| Controller | Méthodes | Description |
|---|---|---|
| `AppVariableController` | CRUD | Variables : TVA, Taxes, Longueurs, Dimensions |
| `BankController` | CRUD | Comptes bancaires |
| `CategoryController` + `FirstChildController` | CRUD | Hiérarchie des catégories |
| `NotificationsController` | Get | Notifications système |
| `ApiHealthController` | HealthCheck | Santé de l'API |

---

## 3. Fonctionnalités implémentées — Frontend (UI)

### 3.1 Module Auth
| Composant | Description |
|---|---|
| `SignInComponent` | Login avec JWT, stockage token |
| `EnterpriseRegistrationComponent` | Onboarding — enregistrement entreprise + admin |

---

### 3.2 Module Dashboard (Shell)
| Composant | Route | Description |
|---|---|---|
| `DashboardShellComponent` | `/` | Layout principal (Sidenav + Header + Footer) |
| `DashboardOverviewComponent` | `/dashboard` | KPIs : clients, fournisseurs, ventes du jour, graphiques Chart.js, paiements par méthode |
| `AccountingBalanceDashboardComponent` | `/admin-dashboard` | Vue admin : balance clients & fournisseurs |
| `ConfigurationComponent` | `/config` | Config complète |

---

### 3.3 Module Articles
| Composant | Description |
|---|---|
| `ListArticleComponent` | Liste paginée, recherche, suppression douce |
| `AddArticleComponent` | Formulaire ajout article avec dimensions bois |

---

### 3.4 Module Clients (Customers)
| Composant | Description |
|---|---|
| `ListCustomersComponent` | Liste clients avec recherche et actions |
| `AddCustomerComponent` | Formulaire ajout client |
| `CustomerDetailsModalComponent` | Modale détail client |
| `CustomerEditModalComponent` | Modale édition client |
| `CustomerAccountModalComponent` | Relevé de compte / solde client |

---

### 3.5 Module Fournisseurs (Providers)
| Composant | Description |
|---|---|
| `ListSuppliersComponent` | Liste fournisseurs |
| `AddProviderComponent` | Formulaire ajout fournisseur |
| `ProviderDetailsModalComponent` | Détail fournisseur |
| `ProviderEditModalComponent` | Édition fournisseur |

---

### 3.6 Module Merchandise (Documents commerciaux)

#### Côté Fournisseur
| Composant | Route | Description |
|---|---|---|
| `AddSupplierReceiptComponent` | `/merchandise/reception` | Saisie BR avec gestion longueurs bois, remises, TVA |
| `EditSupplierReceiptComponent` | `/merchandise/reception/edit/:id` | Édition BR (Admin) |
| `ListSupplierReceiptsComponent` | `/merchandise/reception/list` | Liste BRs avec filtres, statuts, child documents |
| `AddSupplierOrderComponent` | `/merchandise/supplierorder/add` | Saisie bon de commande fournisseur |
| `ListSupplierOrderComponent` | `/merchandise/supplierorder/list` | Liste BC fournisseur avec lifecycle stepper |
| `ListSupplierInvoicesComponent` | `/merchandise/sinvoices` | Liste factures fournisseur avec child docs |

#### Côté Client
| Composant | Route | Description |
|---|---|---|
| `CustomerAddDocumentComponent` | `/merchandise/customerdelivery/add` | Saisie BL avec sélecteur client/transporteur |
| `EditCustomerDocumentComponent` | `/merchandise/customerdelivery/edit/:id` | Édition BL (Admin) |
| `ListCustomerDocumentsComponent` | `/merchandise/customerdelivery` | Liste BL avec stepper lifecycle |
| `AddInvoiceComponent` | `/merchandise/customerinvoices/add` | Génération facture depuis BL |
| `ListCustomerInvoicesComponent` | `/merchandise/customerinvoices` | Liste factures avec child docs |
| `ListCustomerQuotesComponent` | `/merchandise/devis/list` | Liste devis |
| `AddCustomerQuoteComponent` | `/merchandise/devis/add` | Saisie devis |
| `ListCustomerOrdersComponent` | `/merchandise/bc/list` | Liste bons de commande client |
| `AddCustomerOrderComponent` | `/merchandise/bc/add` | Saisie bon de commande client |

---

### 3.7 Module Stock
| Composant | Description |
|---|---|
| `StockListComponent` | Stock en temps réel par site, groupé par catégorie |
| `StockInventoryComponent` | Vue inventaire du stock |
| `StockMovementTimelineComponent` | Historique mouvements par merchandise/package |
| `StockTransferFormComponent` | Formulaire transfert inter-sites |
| `StockTransferListComponent` | Liste historique des transferts |
| `TransferConfirmCodeDialogComponent` | Saisie code de confirmation |
| `TransferConfirmationComponent` | Validation/rejet des transferts en attente |
| `TransferDetailsDialogComponent` | Détail d'un transfert |

---

### 3.8 Module Inventaire
| Composant | Description |
|---|---|
| `AddInventoryComponent` | Saisie inventaire physique |
| `ListInventoryComponent` | Liste des inventaires + validation |

---

### 3.9 Configuration (Admin Only)
Gérée dans un seul `ConfigurationComponent` avec onglets :

| Onglet | Contenu |
|---|---|
| **Entreprise** | Infos entreprise, mise à jour, devise, MF, responsable |
| **Sites** | Gestion des sites de vente (ajout/édition/suppression) |
| **Paramètres** | Catégories, sous-catégories, dimensions (épaisseur/largeur), longueurs |
| **Taxes** | TVA, Droit de Timbre (AppVariables par nature) |
| **Banques** | Comptes bancaires (nom, agence, RIB, IBAN) |
| **Employés / Utilisateurs** | Personnes, AppUsers, permissions par rôle |
| **Transporteurs** | Gestion des transporteurs |

---

### 3.10 Modales partagées (Shared)
| Modale | Description |
|---|---|
| `ConfirmDeleteModalComponent` | Confirmation suppression générique |
| `PaymentModalComponent` | Saisie/édition paiement |
| `AddBankModalComponent` | Ajout compte bancaire |
| `AddSalesSiteModalComponent` | Ajout site de vente |
| `AddCategoriesModalComponent` | Ajout catégorie |
| `AddSubCategoriesModalComponent` | Ajout sous-catégorie |
| `AddAppVariableModalComponent` | Ajout TVA/Taxe/Dimension |
| `AddEmployeesModalComponent` | Ajout employé |
| `PermissionsModalComponent` | Gestion permissions utilisateur |
| `LeaveManagementModalComponent` | Gestion congés |
| `PayslipModalComponent` | Fiche de paie |
| `AdvanceManagementModalComponent` | Avances sur salaire |
| `AddTransporterModalComponent` | Ajout transporteur |

---

## 4. Matrice de couverture fonctionnelle

| Domaine métier | Backend | Frontend | Commentaire |
|---|:---:|:---:|---|
| Authentification / JWT | ✅ | ✅ | Complet |
| Inscription entreprise | ✅ | ✅ | Complet |
| Catalogue articles | ✅ | ✅ | Historique prix partiellement exposé |
| Clients / Fournisseurs | ✅ | ✅ | Complet |
| Devis client | ✅ | ✅ | Complet |
| Bon de Commande client | ✅ | ✅ | Complet |
| BL (livraison) client | ✅ | ✅ | Complet |
| Facture client | ✅ | ✅ | Complet |
| Bon de Commande fournisseur | ✅ | ✅ | Complet |
| Réception fournisseur (BR) | ✅ | ✅ | Complet |
| Facture fournisseur | ✅ | ✅ | Complet |
| Paiements (multi-méthodes) | ✅ | ✅ | Complet |
| Stock multi-sites | ✅ | ✅ | Complet |
| Transferts inter-sites (avec confirmation) | ✅ | ✅ | Complet |
| Inventaire physique | ✅ | ✅ | Complet |
| Timeline mouvements stock | ✅ | ✅ | Complet |
| Grand livre / Relevé compte | ✅ | ✅ | Complet |
| Soldes clients/fournisseurs | ✅ | ✅ | Dashboard admin |
| Dashboard KPIs | Partiel | ✅ | Manque endpoint agrégé côté API |
| Configuration système | ✅ | ✅ | Complet |
| Gestion employés & RH | ✅ | ✅ | Incomplet (PDF payslip stub) |
| Véhicules / parc auto | ✅ | ✅ | Basique |
| Transporteurs | ✅ | ✅ | Basique |
| Notifications temps réel | ✅ (SignalR) | Partiel | Uniquement transferts stock |
| Impression / PDF | ❌ | Partiel | Templates HTML présents, pas de rendu serveur |
| Retenue à la source (RS) | ✅ API | Partiel UI | Flag présent, calcul incomplet côté UI |

---

## 5. Fonctionnalités manquantes — Gaps métier

### 🔴 Critiques (bloquent la complétion du workflow)

#### 5.1 Génération PDF côté serveur
- **Problème :** `PayslipController.DownloadPdf()` retourne un PDF factice. Aucune bibliothèque PDF n'est intégrée.
- **Impact :** Impossibilité d'imprimer bulletins de paie, factures, bons de livraison.
- **Solution :** Intégrer **QuestPDF** ou **iText7** côté API pour toutes les entités imprimables.
- **Entités concernées :** Facture client/fournisseur, BL, BR, BC, Devis, Bulletin de paie, Relevé de compte.

#### 5.2 Endpoint de dashboard agrégé
- **Problème :** `DashboardOverviewComponent` charge la liste entière des factures pour calculer les KPIs du jour — scalabilité nulle.
- **Solution :** Créer `/api/analytics/dashboard` retournant des KPIs pré-calculés (ventes jour/semaine/mois, nombre documents par type, top clients).

#### 5.3 Retenue à la source (RS) — calcul complet
- **Problème :** `WithHoldingTax` et l'entité `HoldingTax` existent mais la déduction n'est pas intégrée dans les totaux côté UI.
- **Solution :** Afficher et déduire la RS du montant net à payer sur les factures fournisseur.

#### 5.4 Conversion automatique Devis → BC → BL en cascade
- **Problème :** Chaque document est créé manuellement. La relation parent→enfant existe mais n'est pas exploitée côté UI pour la conversion.
- **Solution :** Bouton "Convertir en BC" depuis le devis, "Convertir en BL" depuis le BC, avec héritage des lignes et enregistrement de la relation.

#### 5.5 Gestion des reliquats (quantités partiellement livrées)
- **Problème :** Aucune gestion des quantités restantes à livrer sur un BC ou commande.
- **Solution :** Tracker `quantité commandée` vs `quantité livrée` sur les lignes de document pour afficher le reliquat.

---

### 🟠 Importantes (complètent le métier bois)

#### 5.6 Prix d'achat historique par fournisseur
- Créer un `PurchasePriceHistory` par article.
- Afficher la comparaison multi-fournisseurs pour le même article.

#### 5.7 Alerte de stock bas (seuil minimum)
- Ajouter `MinimumStock` sur `Merchandise` ou `Stock`.
- Générer une alerte (notification + badge dashboard) quand `Quantity <= MinimumStock`.
- Endpoint : `/api/stock/alerts`.

#### 5.8 Tableau de bord fournisseur
- Vue détaillée par fournisseur : commandes en cours, réceptions en attente, solde, historique.
- Actuellement seul le client a un relevé de compte accessible.

#### 5.9 Suivi des paiements liés aux documents
- Afficher sur chaque facture : montant payé, solde restant, échéances.
- Gérer les paiements partiels et les relances.

#### 5.10 Gestion multi-devises
- Le champ `Devise` existe sur l'entreprise mais aucune conversion n'est implémentée.
- Ajouter un taux de change et permettre la saisie de documents en devises étrangères.

#### 5.11 Import de données (Excel / CSV)
- Importer catalogue articles, clients/fournisseurs depuis Excel.
- Critique pour l'onboarding avec des données existantes.

#### 5.12 Reporting avancé & export Excel
- Rapport de ventes par période, client, article, site.
- Rapport de rentabilité : prix d'achat vs prix de vente.
- Export Excel des listes (absent partout dans l'UI).

#### 5.13 Gestion des avoirs (retours)
- Document "Avoir" pour retours clients ou fournisseurs.
- Doit annuler partiellement/totalement une facture et remettre le stock.

#### 5.14 Numérotation personnalisable
- Permettre à l'entreprise de configurer les préfixes de numérotation (FA-, BL-, BR-...).

---

### 🟡 Souhaitables (amélioration métier)

#### 5.15 Workflow d'approbation des documents
- Ajouter une étape "Soumis → En attente → Approuvé" pour les commandes au-delà d'un seuil.
- Notifications email/push au validateur.

#### 5.16 Grille tarifaire par client
- Remises négociées par client stockées et appliquées automatiquement.

#### 5.17 Frais de transport
- Ligne de coût transport sur les documents de livraison, associée au transporteur.

#### 5.18 Modules RH manquants
- Calcul automatique salaire brut/net.
- Gestion des heures supplémentaires.
- Calendrier des congés visuel.

#### 5.19 Notifications et rappels
- Rappel de paiement client (factures impayées > X jours).
- Extension du système SignalR au-delà des transferts stock.

#### 5.20 Audit trail complet
- Logger toutes les actions sensibles avec utilisateur, horodatage, valeurs avant/après.
- Table `AuditLog` en base.

---

## 6. Proposition de stack production optimisée

> **Objectif :** Passer d'un ERP mono-serveur à une architecture résiliente, maintenable et évolutive, tout en gardant la continuité technologique (.NET + Angular).

---

### 6.1 Backend — Évolutions clés

| Composant actuel | Problème | Proposition | Gain |
|---|---|---|---|
| Controllers avec logique métier directe | Couplage fort | **CQRS avec MediatR** (Commands/Queries séparés) | Testabilité, lisibilité |
| EF Core sans cache | Queries N+1, chargement massif | **Redis** pour cache distribué des données froides | -70% requêtes DB |
| DocumentController monolithique (1199 lignes) | Maintenabilité difficile | Découper en services spécialisés + `IDocumentWorkflowService` | Séparation préoccupations |
| PDF stub (bytes bruts) | Non fonctionnel | **QuestPDF** (FOSS, .NET natif) | PDF réels côté serveur |
| Pas de queue de tâches | Opérations longues bloquent l'API | **Hangfire** (jobs background) pour refresh soldes, exports, emails | API non-bloquante |
| Logs Console uniquement | Pas d'observabilité | **Serilog** + **Seq** ou **OpenTelemetry** → Grafana | Debugging production |
| Pas de rate limiting | Sécurité API | `AspNetCoreRateLimit` + JWT refresh tokens | Sécurité renforcée |
| Pas de versioning API | Breaking changes risqués | `/api/v1/` avec `Asp.Versioning` | Évolutivité |

**Stack Backend recommandée**
```
ASP.NET Core 8
  ├── MediatR (CQRS)
  ├── FluentValidation (validation centralisée)
  ├── EF Core 8 + PostgreSQL 16
  ├── Redis 7 (cache L2)
  ├── Hangfire (background jobs)
  ├── SignalR (temps réel — déjà présent, à étendre)
  ├── QuestPDF (génération PDF)
  ├── Serilog + OpenTelemetry
  └── Swagger/OpenAPI 3.1
```

---

### 6.2 Base de données — Optimisations

| Action | Description | Impact |
|---|---|---|
| **Index sur colonnes filtrées** | `Documents.Type`, `Documents.CreationDate`, `Documents.CounterPartId`, `Stocks.MerchandiseId+SalesSiteId` | Requêtes 5-10× plus rapides |
| **Partitionnement temporel** | Partitionner `Documents` et `AccountLedger` par année | Scalabilité données historiques |
| **Vue matérialisée** | `v_counterpart_balances` rafraîchie via Hangfire | Dashboard sans recalcul temps réel |
| **Connection pooling** | **PgBouncer** devant PostgreSQL | Gestion charge concurrente |
| **Backup automatisé** | `pg_dump` via cron + stockage S3/Minio | Sécurité données |

---

### 6.3 Frontend — Évolutions clés

| Composant actuel | Problème | Proposition | Gain |
|---|---|---|---|
| NgRx partiel (AppVariables, Banks, Categories) | État inconsistant | Étendre NgRx à `Documents`, `Payments`, `Stock` | Cohérence état global |
| Chargement massif pour KPIs | Lent, scalabilité nulle | Endpoints agrégés + pagination serveur systématique | UX, performance |
| Pas d'export Excel | Manque fonctionnel | `SheetJS (xlsx)` côté client | Fonctionnalité critique |
| Pas de PWA | Web-only | `@angular/pwa` + Service Worker | Usage hors-ligne partiel |
| Charts.js basique | Dashboard peu riche | Ajouter `ApexCharts` pour sparklines et gauges | Meilleure lisibilité KPI |
| SSR Angular (server.ts) non exploité | Complexité inutile pour ERP | Désactiver SSR | Réduction complexité |

**Stack Frontend recommandée**
```
Angular 18+
  ├── NgRx 18 (store global complet)
  ├── Angular Material 18
  ├── Chart.js + ApexCharts
  ├── SheetJS (export Excel)
  ├── ng2-pdf-viewer (lecture PDF)
  ├── ngx-toastr (déjà présent)
  ├── @angular/pwa (offline)
  └── Angular Standalone Components (migration progressive)
```

---

### 6.4 Infrastructure & DevOps

| Composant | Actuel | Recommandé |
|---|---|---|
| **Conteneurisation** | Dockerfile présent | `docker-compose` production avec `nginx` reverse proxy + TLS |
| **Reverse Proxy** | nginx.conf présent | **Caddy** (TLS automatique Let's Encrypt) |
| **CI/CD** | Absent | **GitHub Actions** : lint → test → build → deploy |
| **Secrets** | `.env` files | GitHub Secrets ou **HashiCorp Vault** |
| **Monitoring** | Absent | **Grafana + Prometheus** (métriques) + **Seq** (logs) |
| **CDN** | Absent | **Cloudflare** (cache statique Angular) |

---

### 6.5 Sécurité

| Lacune | Solution |
|---|---|
| Tokens JWT sans rotation | Refresh Tokens (7j) + Access Tokens (15min) |
| Pas de rate limiting | `AspNetCoreRateLimit` sur les endpoints auth |
| CORS ouvert en dev | Configurer origines explicites en production |
| Pas d'audit log | Table `AuditLog` + middleware ASP.NET Core |

---

### 6.6 Roadmap technique recommandée

```
Phase 1 — Urgent (1-2 mois)
  ✅ QuestPDF : PDF factures, BL, BR, bulletins de paie
  ✅ Endpoint /api/analytics/dashboard (KPIs pré-calculés)
  ✅ NgRx pour Documents + Payments
  ✅ Index DB critiques + PgBouncer

Phase 2 — Court terme (3-4 mois)
  ✅ MediatR / CQRS + découpage DocumentController
  ✅ Redis cache
  ✅ Hangfire (background jobs)
  ✅ Export Excel (SheetJS)
  ✅ Gestion reliquats & avoirs

Phase 3 — Moyen terme (5-6 mois)
  ✅ Refresh Tokens / sécurité renforcée
  ✅ CI/CD GitHub Actions
  ✅ Grafana + Prometheus
  ✅ Alerte stock bas
  ✅ Import Excel catalogue
  ✅ Workflow approbation documents
```

---

*Document généré par audit de code automatique — WoodApp ERP v0.x — Avril 2026*
