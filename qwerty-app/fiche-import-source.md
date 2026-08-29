# Cahier des charges — Webservice source pour import Vente/Achat/Banque/Caisse

Ce document décrit le contrat JSON que **l'application partenaire** doit exposer afin que **QwertyTunisieProduction** puisse récupérer les opérations Vente, Achat, Banque et Caisse et les importer automatiquement, exactement comme le ferait un import Excel.

## 1. Sens du flux

- L'application partenaire **expose** un endpoint HTTP (GET) qui renvoie du JSON.
- QwertyTunisieProduction **consomme** cet endpoint : lorsqu'un utilisateur clique sur "Importer depuis l'application liée" dans une page Vente, Achat, Banque ou Caisse, une requête est envoyée à l'URL configurée pour le dossier, et les opérations reçues sont importées.
- Chaque opération reçue est traitée avec **exactement la même logique métier** qu'une ligne d'import Excel (résolution des paramètres comptables du traitement, résolution/création du client ou fournisseur, calcul des débits/crédits, etc.).

## 2. Authentification

- QwertyTunisieProduction envoie un en-tête `Authorization: Bearer <token>`.
- Le `<token>` est configuré une fois par dossier (voir "Configuration côté QwertyTunisieProduction" plus bas) et doit être vérifié par l'application partenaire.
- L'application partenaire doit répondre `401` si le token est invalide ou manquant.

## 3. Endpoint attendu

`GET {url_configurée}`

### Paramètres de requête (query string) envoyés par QwertyTunisieProduction

| Paramètre | Type | Obligatoire | Description |
|---|---|---|---|
| `type` | string | Oui | `vente`, `achat`, `banque` ou `caisse` |
| `exercice` | int | Oui | Exercice comptable (ex : `2026`) |
| `mois` | int | Oui | Mois comptable (1-12) |
| `num_traitement` | int | Oui | Identifiant du traitement cible (compte de vente/achat, compte bancaire ou caisse) côté QwertyTunisieProduction |
| `identifiant_user` | string | Non (recommandé) | Identifiant de l'utilisateur chez le fournisseur, tel que configuré dans le dossier |
| `identifiant_dossier` | string | Non (recommandé) | Identifiant du dossier / article chez le fournisseur, tel que configuré dans le dossier |

### Réponse attendue (200 OK)

```json
{
  "ok": true,
  "count": 2,
  "operations": [ /* voir sections 4 et 5 */ ]
}
```

- `ok` (bool, requis) : `true` si la requête a été traitée normalement (même si `operations` est vide).
- `count` (int, optionnel) : nombre d'éléments dans `operations`, à titre informatif.
- `operations` (array, requis) : liste des opérations à importer, une par ligne (voir schéma ci-dessous).

### Réponse d'erreur

```json
{
  "ok": false,
  "error": "Message d'erreur lisible"
}
```

QwertyTunisieProduction interrompt l'import et affiche `error` à l'utilisateur. Toute réponse HTTP `>= 400` est aussi traitée comme une erreur bloquante.

## 4. Champs communs à toutes les opérations

Ces clés sont les mêmes que les colonnes d'un import Excel (mêmes règles de parsing des dates : `YYYY-MM-DD` recommandé) :

| Clé JSON | Type | Obligatoire | Équivalent colonne Excel | Description |
|---|---|---|---|---|
| `date_operation` | string (date) | Oui | `date_operation` / `date` | Date de l'opération |
| `date_valeur` | string (date) | Non | `date_valeur` / `valeur` | Date de valeur (banque/caisse) |
| `facture` / `reference` | string | Non | `facture` | Référence pièce/facture |
| `libelle` | string | Non | `libelle` | Libellé de l'opération |
| `bon_commande` | string | Non | `bon_commande` | Référence bon de commande |
| `date_bon_commande` | string (date) | Non | `date_bon_commande` | Date bon de commande |
| `autorisation` | string | Non | `autorisation` | Référence autorisation |
| `date_autorisation` | string (date) | Non | `date_autorisation` | Date autorisation |
| `devise` | string | Non | `devise` | Code devise (si multi-devise) |
| `taux_change` | number | Non | `taux_change` | Taux de change |
| `date_ech` | string (date) | Non | `date_ech` | Date d'échéance |
| `type` | string/int | Non | `type` | Type de retenue le cas échéant |
| `montants` | object | Oui | (une colonne par paramètre) | Voir section 5 |

## 5. `montants` — correspondance avec les paramètres comptables du traitement

Chaque traitement (Vente/Achat/Banque/Caisse) possède, côté QwertyTunisieProduction, une liste de **paramètres** (`fiche_parametre.libelle`) qui deviennent des colonnes dans l'Excel (le libellé est "slugifié" : mis en minuscules, espaces remplacés par `_`). `montants` doit être un objet `{ "<slug_du_parametre>": <valeur numérique> }` reprenant ces mêmes clés.

Paramètres par défaut (une entreprise peut avoir personnalisé les siens — dans ce cas, utiliser exactement les clés issues du même processus de slug) :

- **Vente / Achat** (traitement standard) : `ht1`, `tva1`, `ht2`, `tva2`, `ht3`, `tva3`, `timbre`, `ttc`
  ```json
  "montants": { "ht1": 100.000, "tva1": 19.000, "ttc": 119.000 }
  ```
- **Banque / Caisse** (traitement standard) : `debit`, `credit` (un seul des deux doit être renseigné, l'autre à `0`)
  ```json
  "montants": { "debit": 1500.500, "credit": 0 }
  ```

> Si le dossier utilise un traitement avec des paramètres personnalisés, QwertyTunisieProduction communiquera (hors de ce document, par échange direct entre équipes) la liste exacte des clés attendues pour ce traitement.

## 6. Vente — champs spécifiques

| Clé JSON | Type | Description |
|---|---|---|
| `client` | string | Code, numéro d'ordre ou nom du client (recherche par priorité : code exact, id, num_ordre, puis nom) |
| `client_creation` | object, optionnel | Utilisé **uniquement si `client` n'est pas trouvé** côté QwertyTunisieProduction. Permet de créer réellement le client au lieu de retomber sur un client générique. |

`client_creation` :
```json
{
  "nom": "SOCIETE XYZ",
  "code": "CL00042",
  "matricule_fiscal": "1234567A",
  "adresse": "Rue de la Liberté, Tunis",
  "telephone": "71000000",
  "email": "contact@xyz.tn",
  "compte_auxiliaire": "411042"
}
```
Seul `nom` est requis dans `client_creation` pour qu'une création soit tentée.

### Exemple complet — Vente

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "facture": "F2026-0001",
      "libelle": "Vente marchandises",
      "client": "CL00042",
      "client_creation": {
        "nom": "SOCIETE XYZ",
        "code": "CL00042",
        "matricule_fiscal": "1234567A"
      },
      "devise": null,
      "montants": { "ht1": 100.000, "tva1": 19.000, "ttc": 119.000 }
    }
  ]
}
```

## 7. Achat — champs spécifiques

Identique à Vente, en remplaçant `client`/`client_creation` par `fournisseur`/`fournisseur_creation` :

```json
{
  "fournisseur": "F00012",
  "fournisseur_creation": {
    "nom": "FOURNISSEUR ABC",
    "code": "F00012",
    "matricule_fiscal": "9876543B",
    "adresse": "Zone industrielle, Sfax",
    "telephone": "74000000",
    "email": "contact@abc.tn"
  }
}
```

## 8. Banque / Caisse — champs spécifiques

La contre-partie de l'opération (qui/quoi équilibre le débit ou le crédit) est déterminée par **un seul** des champs suivants (ordre de priorité si plusieurs sont fournis : `client` > `fournisseur` > `employe` > `contre_partie`) :

| Clé JSON | Type | Description |
|---|---|---|
| `client` / `client_creation` | string / object | Contre-partie client (même règles que Vente) |
| `fournisseur` / `fournisseur_creation` | string / object | Contre-partie fournisseur (même règles que Achat) |
| `employe` / `employe_creation` | string / object | Contre-partie employé |
| `contre_partie` | string | Compte comptable direct (ex : `"532000"`), si aucune notion de tiers ne s'applique |
| `montants.debit` | number | Montant au débit (0 si l'opération est un crédit) |
| `montants.credit` | number | Montant au crédit (0 si l'opération est un débit) |

`employe_creation` accepte les mêmes clés que `client_creation`/`fournisseur_creation` (`nom`, `code`, `matricule_fiscal`, `adresse`, `telephone`, `email`, `compte_auxiliaire`).

### Exemple complet — Banque

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "date_valeur": "2026-08-21",
      "libelle": "Virement reçu client XYZ",
      "client": "CL00042",
      "montants": { "debit": 1500.500, "credit": 0 }
    }
  ]
}
```

### Exemple complet — Caisse (dépense fournisseur)

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "libelle": "Paiement espèces fournisseur ABC",
      "fournisseur": "F00012",
      "montants": { "debit": 0, "credit": 250.000 }
    }
  ]
}
```

### Exemple — opération sans tiers (contre-partie directe)

```json
{
  "date_operation": "2026-08-20",
  "libelle": "Frais bancaires",
  "contre_partie": "627000",
  "montants": { "debit": 0, "credit": 15.000 }
}
```

## 9. Règles de résolution des tiers

Pour `client`, `fournisseur` et `employe`, QwertyTunisieProduction recherche un tiers existant dans cet ordre :
1. Code exact (`code`)
2. Numéro d'ordre exact (`num_ordre`)
3. Identifiant/matricule exact (`id`)
4. Nom (recherche partielle, insensible à la casse)

Si aucun tiers n'est trouvé **et** que `*_creation.nom` est fourni, un nouveau tiers est créé avec les informations fournies. Sinon, le comportement standard de l'import Excel s'applique (retombée sur un tiers générique "DIVERS").

## 10. Configuration côté QwertyTunisieProduction

Chaque dossier configure, une fois :
- `webservice_partenaire_actif` : active/désactive le bouton d'import.
- `webservice_partenaire_url` : URL de l'endpoint exposé par l'application partenaire.
- `webservice_partenaire_token` : jeton envoyé en `Authorization: Bearer`.
- `webservice_partenaire_user_id` : identifiant de l'utilisateur chez le fournisseur (envoyé dans `identifiant_user`).
- `webservice_partenaire_dossier_id` : identifiant du dossier / article chez le fournisseur (envoyé dans `identifiant_dossier`).

## 11. Pagination (optionnel)

Si le volume de données est important, l'application partenaire peut renvoyer un champ `next_page` dans sa réponse ; ce cas d'usage n'est pas encore géré par la version actuelle de l'import (une seule page est traitée). À prévoir en évolution si nécessaire — contacter l'équipe QwertyTunisieProduction.

## 12. Codes d'erreur et comportement de QwertyTunisieProduction

| Situation | Comportement QwertyTunisieProduction |
|---|---|
| HTTP `>= 400` | Import interrompu, message d'erreur affiché à l'utilisateur |
| `ok: false` | Import interrompu, `error` affiché |
| Ligne d'`operations` invalide ou en échec (ex : tiers introuvable sans infos de création, mois comptable clôturé) | La ligne est ignorée, les autres continuent d'être traitées ; un résumé des échecs est affiché à l'utilisateur |
| Mois comptable clôturé côté QwertyTunisieProduction | Import refusé avant tout appel au webservice |

## 13. Annexe A — Exemples de requête / réponse

### Requête pour un import Vente (mois d'août 2026)

```http
GET /api/qwerty-import?type=vente&exercice=2026&mois=8&num_traitement=120&identifiant_user=USR_001&identifiant_dossier=DOSSIER_42 HTTP/1.1
Host: partenaire.tn
Accept: application/json
Authorization: Bearer eyJ0b2tlbi1kZS10ZXN0LWR1LWZvdXJuaXNzZXVy
```

### Réponse 200 — Vente avec création client

```json
{
  "ok": true,
  "count": 2,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "facture": "F2026-0001",
      "libelle": "Vente marchandises",
      "client": "CL00042",
      "client_creation": {
        "nom": "SOCIETE XYZ",
        "code": "CL00042",
        "matricule_fiscal": "1234567A"
      },
      "montants": { "ht1": 100.000, "tva1": 19.000, "ttc": 119.000 }
    },
    {
      "date_operation": "2026-08-21",
      "facture": "F2026-0002",
      "libelle": "Prestation de services",
      "client": "CL00043",
      "montants": { "ht1": 500.000, "tva1": 95.000, "ttc": 595.000 }
    }
  ]
}
```

### Réponse 200 — Achat avec création fournisseur

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-15",
      "facture": "FF-2026-88",
      "libelle": "Achat matières premières",
      "fournisseur": "F00012",
      "fournisseur_creation": {
        "nom": "FOURNISSEUR ABC",
        "code": "F00012",
        "matricule_fiscal": "9876543B"
      },
      "montants": { "ht1": 1000.000, "tva1": 190.000, "ttc": 1190.000 }
    }
  ]
}
```

### Réponse 200 — Banque (débit client)

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "date_valeur": "2026-08-21",
      "libelle": "Virement reçu client XYZ",
      "client": "CL00042",
      "montants": { "debit": 1500.500, "credit": 0 }
    }
  ]
}
```

### Réponse 200 — Caisse (crédit fournisseur)

```json
{
  "ok": true,
  "count": 1,
  "operations": [
    {
      "date_operation": "2026-08-20",
      "libelle": "Paiement espèces fournisseur ABC",
      "fournisseur": "F00012",
      "montants": { "debit": 0, "credit": 250.000 }
    }
  ]
}
```

### Réponse 401 — Token invalide

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "ok": false,
  "error": "Token d'authentification invalide ou manquant."
}
```

### Réponse 200 — Aucune opération à importer

```json
{
  "ok": true,
  "count": 0,
  "operations": []
}
```

## 14. Annexe B — Schéma XML (XSD)

Un schéma XML descriptif du contrat est disponible dans le même répertoire :

- Fichier : `docs/webservices/fiche-import-source.xsd`

Il décrit formellement les éléments `request` (paramètres de la requête GET) et `response` (corps de la réponse JSON, modélisé en XML équivalent), ainsi que les blocs `operation`, `client_creation`/`fournisseur_creation`/`employe_creation` et `montants`.

