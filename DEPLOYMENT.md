# 🚀 Guide de Déploiement & Configuration Multi-Tenant (ACYA App)

Ce document décrit comment déployer l'architecture multi-tenant (Schema-per-Tenant) en production et configurer les noms de domaine, le serveur Nginx, et le certificat SSL wildcard, sans perturber ou casser vos environnements actuels de **préproduction** (preprod) ou l'instance principale de **acya.site**.

---

## 🔒 1. Préservation de l'environnement de Préproduction

Pour éviter toute régression sur la préproduction ou vos déploiements existants, la multi-tenancy utilise un drapeau d'activation désactivé par défaut.

Dans le fichier `appsettings.json` ou vos variables d'environnement de **préproduction**, conservez/définissez la configuration suivante :
```json
"MultiTenancy": {
  "Enabled": false
}
```
### Comportement en mode désactivé :
- L'application ignore le routage par sous-domaine/headers.
- Le middleware de filtrage de tenant est désactivé.
- Elle se connecte à la base de données par défaut via `WoodAppContextConnection` sur le schéma par défaut (`public`).
- **Aucun risque de cassure pour la préproduction.**

En **Production**, vous activerez le mode multi-tenant en définissant `"Enabled": true` une fois la base de données de registre (Master Registry) configurée.

---

## 🌐 2. Configuration DNS & Routage de Domaines

Pour rediriger dynamiquement toutes les entreprises (ex: `socobois.acya.site`, `tucobois.acya.site`) vers votre application, configurez les enregistrements DNS suivants :

| Type | Nom de domaine | Cible/Valeur | Description |
| :--- | :--- | :--- | :--- |
| **A** | `acya.site` | `IP_DU_SERVEUR_PROD` | Site principal d'atterrissage |
| **A** | `*.acya.site` | `IP_DU_SERVEUR_PROD` | Wildcard redirigeant tous les sous-domaines vers la prod |
| **A** | `preprod.acya.site` | `IP_DU_SERVEUR_PREPROD` | **Fixe** : redirige vers le serveur de préproduction distinct |

*Note: En déclarant explicitement le sous-domaine `preprod.acya.site`, les serveurs DNS résoudront ce domaine en priorité par rapport au wildcard `*.acya.site`.*

---

## 🔀 3. Configuration Nginx (Routage et Headers)

Votre serveur Nginx de production doit capturer le sous-domaine et le transmettre à l'API via le header HTTP `X-Tenant-Slug`.

### ⚠️ Règle d'or : Isolation des blocs serveurs
Pour ne pas perturber les autres sous-domaines d'administration ou fixes, structurez vos fichiers Nginx comme suit :

#### A. Bloc pour le site principal & sous-domaines dynamiques (Multi-Tenant)
Ce bloc intercepte tous les sous-domaines à l'exception des sous-domaines réservés (ex: `api`, `preprod`).

```nginx
server {
    listen 443 ssl;
    server_name ~^(?<tenant>[^.]+)\.acya\.site$;

    ssl_certificate /etc/letsencrypt/live/acya.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/acya.site/privkey.pem;

    # Exclure explicitement les sous-domaines techniques de la multi-tenancy
    if ($tenant ~* "^(api|admin|preprod|mail|www)$") {
        return 404;
    }

    location / {
        # proxy vers le frontend React (Next.js)
        proxy_pass http://localhost:3000; 
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        # proxy vers l'API .NET
        proxy_pass http://localhost:5068;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 🔑 TRANSCRIPTION DU TENANT SLUG
        proxy_set_header X-Tenant-Slug $tenant;
    }
}
```

#### B. Bloc pour l'API générale (si exposée sur un domaine fixe, ex: `api.acya.site`)
```nginx
server {
    listen 443 ssl;
    server_name api.acya.site;

    ssl_certificate /etc/letsencrypt/live/acya.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/acya.site/privkey.pem;

    location / {
        proxy_pass http://localhost:5068;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # En direct sur api.acya.site, le client Web injectera le header X-Tenant-Slug
        # directement via l'intercepteur Axios de Next.js.
        proxy_pass_request_headers on;
    }
}
```

---

## 🔑 4. Génération du Certificat SSL Wildcard (Let's Encrypt)

Un certificat SSL standard ne couvre pas les sous-domaines dynamiques (`*.acya.site`). Vous devez utiliser un **certificat Wildcard** via un défi DNS (DNS Challenge).

### Procédure via Certbot (exemple avec Cloudflare DNS) :

1. Installez le plugin DNS de votre hébergeur (ex: Cloudflare) :
   ```bash
   sudo apt install python3-certbot-nginx python3-certbot-dns-cloudflare
   ```
2. Créez un fichier de credentials API Cloudflare `/etc/cloudflare.ini` contenant :
   ```ini
   dns_cloudflare_api_token = VOTRE_TOKEN_API_CLOUDFLARE
   ```
3. Sécurisez le fichier :
   ```bash
   chmod 600 /etc/cloudflare.ini
   ```
4. Lancez la génération du certificat :
   ```bash
   sudo certbot certonly \
     --dns-cloudflare \
     --dns-cloudflare-credentials /etc/cloudflare.ini \
     -d "acya.site" \
     -d "*.acya.site" \
     --preferred-challenges dns-01
   ```
5. Configurez le renouvellement automatique (cron certbot) qui s'occupera de mettre à jour le certificat tous les 3 mois en tâche de fond.

---

## 🗄️ 5. Initialisation de la Base de Données Master

Avant d'activer `"Enabled": true` en production, la table de registre des tenants doit exister dans la base de données master.

1. **Exécution du script SQL** :
   Exécutez le script d'initialisation sur votre base de données de production principale (schéma `public`) pour créer la table `bo_tbl_enterprise` :
   ```sql
   CREATE TABLE IF NOT EXISTS public.bo_tbl_enterprise (
       "Id" BIGSERIAL PRIMARY KEY,
       "Slug" VARCHAR(100) UNIQUE NOT NULL,
       "Name" VARCHAR(255) NOT NULL,
       "Email" VARCHAR(255),
       "Phone" VARCHAR(50),
       "SchemaName" VARCHAR(100) UNIQUE NOT NULL,
       "ConnectionString" TEXT NOT NULL,
       "IsActive" BOOLEAN DEFAULT FALSE,
       "Plan" VARCHAR(50) DEFAULT 'Trial',
       "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Création du premier Tenant** :
   Insérez les informations de connexion pour votre premier client (ex: `socobois`) :
   ```sql
   INSERT INTO public.bo_tbl_enterprise ("Slug", "Name", "SchemaName", "ConnectionString", "IsActive")
   VALUES (
       'socobois', 
       'Socobois France', 
       'tenant_socobois', 
       'Host=localhost;Port=5432;Database=wood-app-db_prod;Username=postgres;Password=MotDePasseProd;', 
       true
   );
   ```

3. **Démarrage de l'API** :
   Activez le drapeau `"Enabled": true` dans le fichier `appsettings.json` ou la variable d'environnement de production. Au lancement, l'API détectera le tenant `socobois`, créera son schéma `tenant_socobois` s'il n'existe pas, et appliquera automatiquement toutes les migrations de structure sur ce schéma.
