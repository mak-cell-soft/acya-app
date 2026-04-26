# WoodApp — Ordre d'Implémentation des Gaps Métier

> **Objectif :** Éviter les conflits de modèle, les réimplementation et les régressions  
> **Principe :** Chaque couche ne peut commencer qu'une fois la couche précédente terminée  
> **Source :** Audit `logic.md` — 20 gaps identifiés  

---

## Graphe de dépendances

```
§5.20 ──────────────────────────────────────────────────────────► toutes
§5.14 ──────────────────────────────────────────────────────────► toutes
§5.7  ──────────────────────► §5.13 · §5.19 · §5.2
§5.19 ──────────────────────► §5.15
│
§5.5  ──────────────────────► §5.4 · §5.13 · §5.1
§5.3  ──────────────────────► §5.9 · §5.8 · §5.2
§5.6  ──────────────────────► §5.12
│
§5.4  ──────────────────────► §5.13 · §5.15 · §5.16 · §5.17 · §5.1 · §5.10
§5.9  ──────────────────────► §5.8 · §5.13 · §5.2 · §5.12 · §5.10
│
§5.13 ──────────────────────► §5.1 · §5.12
§5.8  ──────────────────────► §5.2
§5.15 ──────────► (terminal)
§5.16 ──────────► (terminal)
§5.17 ──────────► (terminal)
│
§5.11 ──────────► (terminal)
§5.10 ──────────► §5.12
│
§5.1  ──────────► §5.12
§5.2  ──────────► (terminal — dashboard)
§5.12 ──────────► (terminal — reporting final)
§5.18 ──────────► (terminal — RH indépendant)
```

---

## 🏗️ Couche 0 — Fondations transversales
> **Dépendances :** Aucune. Doivent être implémentées en premier car elles affectent toute l'application.

---

### ✅ §5.20 — Audit Trail complet *(priorité absolue)*
- **Pourquoi en premier :** AOP cross-cutting — doit être en place avant toute action métier pour capturer les créations/modifications
- **Ce que ça touche :** Un aspect `@Auditable` + table `AuditLog` + migration DB
- **Conflits évités :** Si ajouté plus tard, il faut repasser sur toutes les méthodes existantes

```
Dépend de :  (rien)
Débloque  :  Toutes les fonctionnalités (traçabilité dès le départ)
```

---

### ✅ §5.14 — Numérotation personnalisable
- **Pourquoi en premier :** Le système de numérotation actuel est codé en dur. Tout document créé ensuite (§5.4, §5.13) doit utiliser le nouveau système.
- **Ce que ça touche :** Table `DocumentNumberingConfig` + service de numérotation centralisé + migration DB
- **Conflits évités :** Les numéros générés avant et après la fonctionnalité seraient incohérents

```
Dépend de :  (rien)
Débloque  :  §5.4 · §5.13 · §5.1 (tous les documents)
```

---

### ✅ §5.7 — Alerte de stock bas (seuil minimum)
- **Pourquoi tôt :** Modification du modèle `Stock` (ajout `minimumStock`) — doit être stable avant §5.13 (avoirs remettent du stock) et §5.2 (dashboard affiche les alertes)
- **Ce que ça touche :** Colonne `minimum_stock` sur `stocks`, endpoint `/api/stock/alerts`, badge dashboard
- **Conflits évités :** §5.13 doit déclencher un re-check du stock bas après remise en stock

```
Dépend de :  (rien)
Débloque  :  §5.13 · §5.19 · §5.2
```

---

### ✅ §5.19 — Notifications & rappels *(infrastructure)*
- **Pourquoi tôt :** Canal de livraison des alertes (WebSocket/email). §5.7 produit des alertes, §5.15 envoie des emails d'approbation — ces deux fonctionnalités nécessitent §5.19 en place
- **Ce que ça touche :** Extension SignalR à tous les domaines, configuration email (SMTP), templates de notification
- **Conflits évités :** §5.15 (approbation) ne peut pas envoyer d'emails sans ce canal

```
Dépend de :  §5.7 (premier consommateur des alertes)
Débloque  :  §5.15
```

---

## 🧱 Couche 1 — Modèle de données documents
> **Dépendances :** Couche 0 terminée. Modifications structurelles des entités docuemntaires — doivent précéder toute logique de workflow.

---

### ✅ §5.5 — Gestion des reliquats (quantités partiellement livrées)
- **Pourquoi avant §5.4 :** La conversion BC→BL doit transporter `quantityDelivered` vs `quantityOrdered`. Sans ce champ en base, §5.4 ne peut pas calculer les reliquats lors de la conversion.
- **Ce que ça touche :** Colonne `quantity_delivered` sur `document_lines`, logique de calcul `quantityRemaining = quantityOrdered - quantityDelivered`
- **Migration DB :** `ALTER TABLE document_lines ADD COLUMN quantity_delivered DECIMAL(18,3) DEFAULT 0`
- **Conflits évités :** Si §5.4 est fait avant, les lignes converties n'auront pas la colonne → migration forcée avec données existantes à recalculer

```
Dépend de :  §5.14 (numérotation stable pour les documents générés)
Débloque  :  §5.4 · §5.13 · §5.1
```

---

### ✅ §5.3 — Retenue à la source (RS) — calcul complet
- **Pourquoi avant §5.9 :** Le montant net payable (`totalNetPayable = TTC - RS`) doit être correct avant d'implémenter le suivi du solde restant. Un paiement suivi sur un total erroné fausse la comptabilité.
- **Ce que ça touche :** Calcul `totalNetPayable` côté API, affichage RS côté UI sur les factures fournisseur, mise à jour `AccountLedger`
- **Conflits évités :** §5.9 calculerait `balance = totalTTC - paid` au lieu de `totalNetPayable - paid` → données comptables fausses

```
Dépend de :  (rien — correctif sur modèle existant)
Débloque  :  §5.9 · §5.8 · §5.2
```

---

### ✅ §5.6 — Prix d'achat historique par fournisseur
- **Pourquoi ici :** Modification du modèle `Article` / nouvelle table `purchase_price_history`. Doit être stable avant §5.12 qui l'utilise pour les rapports de rentabilité.
- **Ce que ça touche :** Table `purchase_price_history(articleId, counterPartId, price, date)`, alimentation automatique à chaque BR/FF
- **Conflits évités :** §5.12 ne peut pas générer le rapport rentabilité si la table n'existe pas

```
Dépend de :  (rien — référentiel articles existant)
Débloque  :  §5.12 (rentabilité)
```

---

## ⚙️ Couche 2 — Workflow documentaire
> **Dépendances :** Couches 0 et 1 terminées. Le modèle de données est stable, on implémente la logique de conversion et de suivi.

---

### ✅ §5.4 — Conversion automatique Devis → BC → BL → FA
- **Pourquoi après §5.5 :** La conversion BL hérite des lignes du BC avec la quantité commandée. Sans `quantity_delivered` en base, impossible de calculer le reliquat lors de livraisons partielles.
- **Ce que ça touche :** Endpoint `POST /api/documents/{id}/convert`, UI bouton "Convertir", héritage des lignes, enregistrement `DocumentRelationship`
- **Conflits évités :** Sans §5.5, une conversion partielle génère un BL total sans reliquat → bug silencieux

```
Dépend de :  §5.5 · §5.14 · §5.20
Débloque  :  §5.13 · §5.15 · §5.16 · §5.17 · §5.1 · §5.10
```

---

### ✅ §5.9 — Suivi des paiements liés aux documents
- **Pourquoi après §5.3 :** Le `soldeRestant = totalNetPayable - totalPaid`. Si RS est incorrecte, le solde sera faux.
- **Ce que ça touche :** Vue `document_payment_summary`, colonne `totalPaid` calculée, UI badges "Payé / Restant / Échu", gestion des paiements partiels, système d'alertes relance
- **Conflits évités :** Sans §5.3, un fournisseur avec RS afficherait un solde surévalué → litiges comptables

```
Dépend de :  §5.3 · §5.19 (pour les alertes de relance)
Débloque  :  §5.8 · §5.13 · §5.2 · §5.12 · §5.10
```

---

## 🔄 Couche 3 — Extensions du workflow
> **Dépendances :** Couche 2 terminée. Le cycle documentaire complet est en place, on l'enrichit.

---

### ✅ §5.13 — Gestion des avoirs (retours)
- **Pourquoi ici :** Un avoir annule une facture existante → nécessite §5.4 (chaîne documentaire complète pour cibler la bonne facture parente), §5.9 (lier l'avoir aux paiements existants) et §5.7 (remettre le stock en alerte si seuil bas après réintégration)
- **Ce que ça touche :** Nouveau type `CREDIT_NOTE` dans l'enum `DocumentType`, endpoint `POST /api/documents/{invoiceId}/credit-note`, mouvement stock `+`, entrée `AccountLedger` inversée
- **Conflits évités :** Sans §5.9, l'avoir ne peut pas recalculer le solde restant après annulation partielle

```
Dépend de :  §5.4 · §5.9 · §5.7 · §5.5 · §5.14
Débloque  :  §5.1 · §5.12
```

---

### ✅ §5.8 — Tableau de bord fournisseur
- **Pourquoi après §5.9 :** Le dashboard fournisseur affiche le solde en cours, les paiements effectués et le montant net avec RS. Ces données viennent de §5.9 et §5.3.
- **Ce que ça touche :** Nouvelle vue `/dashboard/suppliers/{id}`, composant Angular, endpoint `/api/counterparts/{id}/supplier-dashboard`
- **Conflits évités :** Sans §5.9, le solde affiché serait incomplet (pas de détail partiel)

```
Dépend de :  §5.9 · §5.3
Débloque  :  §5.2
```

---

### ✅ §5.15 — Workflow d'approbation des documents
- **Pourquoi ici :** Le circuit d'approbation s'insère dans §5.4 (entre création du BC et sa validation). Sans la chaîne de conversion stable, impossible de savoir quel état du document intercepter.
- **Ce que ça touche :** Nouveaux statuts `SUBMITTED` / `PENDING_APPROVAL` / `APPROVED`, table `ApprovalConfig(enterpriseId, thresholdAmount)`, email via §5.19
- **Conflits évités :** Sans §5.4, le statut "soumis" ne serait jamais déclenché dans le bon moment du workflow

```
Dépend de :  §5.4 · §5.19
Débloque  :  (terminal)
```

---

### ✅ §5.16 — Grille tarifaire par client
- **Pourquoi ici :** La remise négociée s'applique à la création d'un document (Devis, BL). §5.4 doit être stable pour que la grille s'applique correctement lors des conversions entre documents.
- **Ce que ça touche :** Table `pricing_grid(counterPartId, articleId, discountRate, validUntil)`, application automatique à `DocumentLine.discount` à la création
- **Conflits évités :** Sans §5.4, les remises appliquées sur le devis ne seraient pas héritées lors de la conversion en BC

```
Dépend de :  §5.4
Débloque  :  (terminal)
```

---

### ✅ §5.17 — Frais de transport
- **Pourquoi ici :** Les frais sont une ligne supplémentaire sur les BL. §5.4 (modèle documentaire complet) doit être stable pour ajouter ce type de ligne sans casser les calculs de totaux.
- **Ce que ça touche :** Type de ligne `TRANSPORT_FEE` dans `DocumentLine`, liaison au `Transporter` sélectionné, calcul inclus dans `totalHT`
- **Conflits évités :** Sans §5.5 (reliquats), les frais de transport pourraient être dupliqués sur des conversions partielles

```
Dépend de :  §5.4 · §5.5
Débloque  :  (terminal)
```

---

## 📥 Couche 4 — Import / Multi-devises
> **Dépendances :** Couche 3 terminée. Le modèle est figé — on peut importer des données sans risquer de migrations destructives.

---

### ✅ §5.11 — Import de données (Excel / CSV)
- **Pourquoi après couche 3 :** Les imports touchent articles, clients/fournisseurs, et potentiellement des documents historiques. Si §5.16 (grille tarifaire) ou §5.14 (numérotation) ne sont pas en place, les données importées seraient incomplètes ou mal formatées.
- **Ce que ça touche :** Endpoint `POST /api/imports/articles` (multipart), `POST /api/imports/counterparts`, parsing Apache POI (Excel) / OpenCSV, validation + rapport d'erreurs
- **Conflits évités :** Un import avant §5.6 ne remplirait pas `purchase_price_history` → données de rentabilité incomplètes

```
Dépend de :  §5.14 · §5.6 · §5.16 (modèle stable)
Débloque  :  (terminal — onboarding)
```

---

### ✅ §5.10 — Gestion multi-devises
- **Pourquoi en dernier parmi les "importantes" :** La devise affecte tous les montants sur tous les documents. Elle doit être ajoutée quand le modèle documentaire est totalement stable (§5.4, §5.9, §5.13 terminés) pour ne pas casser les totaux existants.
- **Ce que ça touche :** Colonne `currency` et `exchangeRate` sur `Document`, service de conversion (`ExchangeRateService` → appel API externe ou table interne), affichage multi-devise dans l'UI
- **Conflits évités :** Ajouter la devise avant §5.9 ou §5.13 forcerait un recalcul de tous les soldes et avoirs avec conversion → migration complexe et risquée

```
Dépend de :  §5.4 · §5.9 · §5.13
Débloque  :  §5.12 (rapports en multi-devises)
```

---

## 📊 Couche 5 — Reporting, PDF & RH
> **Dépendances :** Toutes les couches précédentes. Ces fonctionnalités consomment des données produites par les couches 0→4.

---

### ✅ §5.1 — Génération PDF côté serveur
- **Pourquoi en dernier :** Les templates PDF doivent représenter des documents complets (avec RS §5.3, reliquats §5.5, avoirs §5.13, frais transport §5.17). Si un champ est ajouté après la création du template, il faut refaire les templates.
- **Ce que ça touche :** Intégration `QuestPDF` ou `iText7`, templates pour chaque type : FA, FF, BL, BR, BC, DEV, AV, Bulletins de paie (RH), Relevé de compte — endpoint `GET /api/documents/{id}/pdf`
- **Conflits évités :** Créer le template PDF sans §5.13 obligerait à ajouter un template "avoir" séparé avec une logique différente

```
Dépend de :  §5.3 · §5.4 · §5.5 · §5.13 · §5.17 · §5.14
Débloque  :  §5.12 (rapports incluent PDF exports)
```

---

### ✅ §5.2 — Endpoint de dashboard agrégé
- **Pourquoi ici :** Le dashboard doit afficher ventes, alertes stock (§5.7) et soldes (§5.9). Sans ces données cohérentes, l'endpoint retournerait des agrégats partiels.
- **Ce que ça touche :** Endpoint `GET /api/analytics/dashboard`, KPIs pré-calculés (ventes J/S/M, top clients, documents par type, alertes stock en cours, paiements du jour), vue matérialisée PostgreSQL `v_dashboard_kpis`
- **Conflits évités :** Sans §5.8 (dashboard fournisseur), le dashboard global serait asymétrique (clients mais pas fournisseurs)

```
Dépend de :  §5.7 · §5.9 · §5.3 · §5.8
Débloque  :  (terminal — dashboard production)
```

---

### ✅ §5.12 — Reporting avancé & export Excel
- **Pourquoi en dernier :** Les rapports consomment toutes les données enrichies : historique prix (§5.6), paiements (§5.9), avoirs (§5.13), devises (§5.10), PDF (§5.1 pour impression rapport).
- **Ce que ça touche :** Rapports de ventes par période/client/article/site, rapport rentabilité (`prix_achat vs prix_vente`), export Excel (Apache POI), export CSV — endpoint `GET /api/reports/{type}/export?format={xlsx|csv}`
- **Conflits évités :** Sans §5.10 (devises), les montants agrégés seraient en devise unique et erronés pour les entreprises multi-devises

```
Dépend de :  §5.1 · §5.6 · §5.9 · §5.8 · §5.10 · §5.13
Débloque  :  (terminal)
```

---

### ✅ §5.18 — Modules RH manquants *(parallélisable)*
- **Pourquoi ici :** Le module RH est **indépendant** du workflow commercial. Il peut théoriquement être développé en parallèle dès la couche 0, mais le PDF des bulletins (§5.1) doit être fait en même temps.
- **Ce que ça touche :** Calcul automatique salaire brut → net (cotisations CNSS, IRPP), gestion des heures supplémentaires (`overtime_hours` sur `Employee`), calendrier visuel des congés (Angular Calendar ou FullCalendar)
- **⚠️ Dépendance sur §5.1 :** Le bulletin de paie PDF doit inclure le calcul automatique du salaire

```
Dépend de :  §5.1 (pour PDF bulletin complet) · §5.19 (alertes congés)
Débloque  :  (terminal)
```

---

## 📋 Tableau récapitulatif ordonné

| Ordre | Gap | Priorité originale | Dépendances clés | Durée estimée |
|:---:|---|:---:|---|:---:|
| **1** | §5.20 Audit trail | 🟡 | — | 2j |
| **2** | §5.14 Numérotation personnalisable | 🟠 | — | 3j |
| **3** | §5.7 Alerte stock bas | 🟠 | — | 3j |
| **4** | §5.19 Notifications & rappels | 🟡 | §5.7 | 4j |
| **5** | §5.5 Reliquats | 🔴 | §5.14 | 4j |
| **6** | §5.3 RS calcul complet | 🔴 | — | 2j |
| **7** | §5.6 Prix d'achat historique | 🟠 | — | 3j |
| **8** | §5.4 Conversion Devis→BC→BL | 🔴 | §5.5 · §5.14 | 7j |
| **9** | §5.9 Suivi paiements documents | 🟠 | §5.3 | 5j |
| **10** | §5.13 Gestion des avoirs | 🟠 | §5.4 · §5.9 · §5.7 | 6j |
| **11** | §5.8 Dashboard fournisseur | 🟠 | §5.9 · §5.3 | 4j |
| **12** | §5.15 Workflow approbation | 🟡 | §5.4 · §5.19 | 5j |
| **13** | §5.16 Grille tarifaire | 🟡 | §5.4 | 4j |
| **14** | §5.17 Frais de transport | 🟡 | §5.4 · §5.5 | 2j |
| **15** | §5.11 Import Excel/CSV | 🟠 | §5.14 · §5.6 | 5j |
| **16** | §5.10 Multi-devises | 🟠 | §5.4 · §5.9 · §5.13 | 6j |
| **17** | §5.1 Génération PDF | 🔴 | §5.3 · §5.4 · §5.5 · §5.13 | 8j |
| **18** | §5.2 Dashboard agrégé | 🔴 | §5.7 · §5.9 · §5.3 · §5.8 | 4j |
| **19** | §5.12 Reporting & export Excel | 🟠 | §5.1 · §5.6 · §5.9 · §5.10 | 6j |
| **20** | §5.18 Modules RH | 🟡 | §5.1 · §5.19 | 5j |

**Total estimé : ~97 jours (environ 5 mois en solo, 2-2.5 mois en équipe de 2)**

---

## ⚠️ Conflits majeurs évités par cet ordre

| Conflit potentiel | Gap concernés | Résolu par |
|---|---|---|
| Migration `quantity_delivered` après données existantes | §5.4 avant §5.5 | §5.5 toujours avant §5.4 |
| Soldes comptables incorrects (RS non déduite) | §5.9 avant §5.3 | §5.3 toujours avant §5.9 |
| Templates PDF incomplets (champs ajoutés après) | §5.1 trop tôt | §5.1 en couche 5 (terminal) |
| Avoirs sans remise stock déclenchant alertes | §5.13 avant §5.7 | §5.7 en couche 0 |
| Import de données avec modèle instable | §5.11 trop tôt | §5.11 après couche 3 |
| Approbation sans canal de notification | §5.15 avant §5.19 | §5.19 en couche 0 |
| Dashboard KPIs avec données partielles | §5.2 trop tôt | §5.2 en couche 5 |
| Rapports rentabilité sans historique prix achat | §5.12 avant §5.6 | §5.6 en couche 1 |

---

*Roadmap générée — WoodApp ERP — Avril 2026*
