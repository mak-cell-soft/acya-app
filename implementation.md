# Implémentation §5.6 — Historique des Prix (Achat & Vente)

Ce document décrit le plan d'implémentation détaillé pour le point **§5.6 du Gaps Roadmap** : *Prix d'achat historique par fournisseur* ainsi que l'ajout de *l'historique de vente des articles*.

## 1. Objectifs
- Tracer l'évolution du prix d'achat (fournisseurs) pour chaque article lors de la réception.
- Tracer l'évolution du prix de vente transactionnel (clients) pour chaque article lors de la livraison.
- Éviter les doublons lors des conversions documentaires (BC → BL → FA).
- Exposer ces historiques via des requêtes API dédiées pour consommation par les reportings (ex: rentabilité).

## 2. Règle Métier et Design Architecture

Actuellement, `SellPriceHistory` est utilisé pour l'historique du prix unitaire (catalogue) de base. Nous avons besoin de gérer des historiques *transactionnels* reliés au client/fournisseur.

### Entités Proposées :

```csharp
public class PurchasePriceHistory : IEntity
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public Article? Article { get; set; }
    
    public int CounterPartId { get; set; } // Fournisseur
    public CounterPart? Supplier { get; set; }
    
    public double PriceValue { get; set; } // Prix net d'achat convenu (sans taxes/remises complexes, ou avec)
    public DateTime TransactionDate { get; set; }
    
    public int DocumentId { get; set; } // Le document source (BR ou FF directe)
    public Document? Document { get; set; }
    
    public string? DocNumber { get; set; } // Référence de la transaction
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }
}

public class SalesPriceHistory : IEntity
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public Article? Article { get; set; }
    
    public int CounterPartId { get; set; } // Client
    public CounterPart? Customer { get; set; }
    
    public double PriceValue { get; set; } // Prix de vente
    public DateTime TransactionDate { get; set; }
    
    public int DocumentId { get; set; } // Le document source (BL ou FA directe)
    public Document? Document { get; set; }
    
    public string? DocNumber { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }
}
```

## 3. Mise à Jour de l'Infrastructure

- Implémentation de la Fluent API pour configurer le mapping (`IEntityTypeConfiguration`) en évitant les conflits de suppression en cascade sur `Article` et `CounterPart`.
- Ajout à `WoodAppContext` des `DbSet` :
  ```csharp
  public virtual DbSet<PurchasePriceHistory> PurchasePriceHistories { get; set; }
  public virtual DbSet<SalesPriceHistory> SalesPriceHistories { get; set; }
  ```
- Création de la migration Entity Framework pour mettre à jour la base PostgreSQL.

## 4. Logique Backend (Interception lors de la validation des Documents)

Dans `DocumentController.cs` (ou via un Dispatcher/Service séparé si la migration CQRS détaillée dans `logic.md` commence) :

1.  **Déclenchements des hooks :**
    *   `PurchasePriceHistory` est alimenté à la finalisation d'un `supplierReceipt` ou d'une `supplierInvoice` (sans BR parent).
    *   `SalesPriceHistory` est alimenté à la finalisation d'un `customerDeliveryNote` (BL) ou `customerInvoice` (sans BL parent).

2.  **Gestion de l'insertion :**
    Lors de l'enregistrement de `DocumentMerchandises`, pour chaque `Article` présent dans la transaction, générer l'objet historique et la stocker.
    ⚠️ Se baser sur le champ `UnitPriceHT` (ou `CostHT` après remise, dépendamment de la règle comptable voulue).

3.  **Controllers API :**
    Développement de deux nouveaux Endpoints (soit dans `ArticleController` soit dans un `ReportsController`) :
    *   `GET /api/Article/{id}/purchase-history`
    *   `GET /api/Article/{id}/sales-history`

## 5. Interface UI (Frontend)

Étant donné que la règle Angular mentionne "Commit to a bold, intentional aesthetic direction", nous devons afficher ces données proprement.

1.  Mettre à jour l'interface TypeScript des modèles pour inclure `PurchasePriceHistoryDto` et `SalesPriceHistoryDto`.
2.  Ajouter un composant UI dans la fiche détail de l'article (ex. `ArticleHistoryComponent` dans le module Articles) encapsulé dans des **Angular Material Tabs**.
3.  Pour chaque onglet, une **Table Responsive** stylisée affichant :
    *   `Date Transaction`
    *   `Document` (Cliquable pour naviguer vers le document source)
    *   `Contrepartie` (Fournisseur/Client)
    *   `Prix HT`
    *   *Sparkline / Mini-Graph* (Optionnel, affichant la tendance d'évolution du prix).

## Validation et Test
- Compiler et s'assurer du clean start après les modifications `.NET`.
- Saisir un BR (Bon de Réception) => Vérifier le backoffice base de données.
- Saisir une FA (Facture directe) => Vérifier l'insertion de Sales.
- Saisir une création par conversion (BC -> BL) et vérifier qu'aucune duplication illogique ne s'applique.
