# SOL-TEJ-SSH — Solution Geo-blocking API TEJ via Proxy SSH SOCKS5

**Date :** 2026-06-18  
**Projet :** acya-app (`acya.site`)  
**Contexte :** VPS hors Tunisie → API TEJ refuse les requêtes batch

---

## 📋 Contexte du problème

L'application **ACYA** (stack .NET API + Next.js + PostgreSQL, déployée sur VPS hors Tunisie)
intègre l'API TEJ du Ministère des Finances tunisien pour la déclaration des retenues à la source (RS).

Après correction de la communication TEJ et mise à jour Docker sur le VPS distant :
- ✅ **Authentification** (`login-tej.finances.gov.tn`) → fonctionne depuis l'extérieur
- ✅ **Vérification bénéficiaire** (`GET /taxpayers/search/...`) → fonctionne depuis l'extérieur
- ❌ **Soumission batch** (`POST /batch-file/validate-xml`) → retourne `null` / erreur depuis l'extérieur

---

## 🔍 Diagnostic : Cause racine

L'API TEJ est protégée par un **F5 BIG-IP ASM (Application Security Manager)** avec
**geo-filtering** côté Ministère des Finances. Le WAF applique des règles différentes selon
l'IP source :

| Endpoint | Depuis VPS externe | Raison |
|---|---|---|
| `POST /token` (Auth Keycloak) | ✅ Fonctionne | Keycloak moins restrictif géographiquement |
| `GET /taxpayers/search/...` | ✅ Fonctionne | Lecture légère, moins filtrée |
| `POST /batch-file/validate-xml` | ❌ NULL / Erreur | **Filtré par WAF/F5 pour IPs non-tunisiennes** |

Le code C# concerné : [`TejIntegration.cs`](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/tej/TejIntegration.cs) — méthode `UploadDeclarationAsync()` ligne ~651.

---

## 🎯 Solution retenue : Option 1 — Proxy SOCKS5 via machine en Tunisie

### Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  VPS (hors Tunisie)          Machine (Tunisie)              │
│  ┌──────────────┐            ┌──────────────┐               │
│  │  Docker API  │ ──SSH──▶  │  SOCKS5 1080 │ ──▶ TEJ API   │
│  │  (acya.site) │  tunnel   │  (routeur TN)│               │
│  └──────────────┘            └──────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure disponible côté Tunisie

- ✅ Routeur avec **IP fixe** (toujours allumé)
- OS de la machine proxy : **À confirmer**
- Port SSH à ouvrir sur le routeur : **À configurer** (recommandé : `2222` → `22`)

---

## 📝 Étapes de configuration (À compléter)

### Étape 1 — Machine en Tunisie : installer SSH server

```bash
sudo apt install openssh-server -y
sudo systemctl enable ssh
sudo systemctl start ssh
```

### Étape 2 — Routeur : ouvrir port SSH (NAT/Port Forwarding)

| Paramètre | Valeur |
|---|---|
| Port externe | `2222` (éviter le 22 par défaut) |
| Port interne | `22` |
| IP locale cible | `192.168.1.X` (IP de la machine proxy) |
| Protocole | TCP |

### Étape 3 — VPS : créer le tunnel SSH SOCKS5 permanent

```bash
# Installer autossh pour tunnel persistant
sudo apt install autossh -y

# Créer le service systemd
sudo nano /etc/systemd/system/tej-proxy.service
```

Contenu du service :
```ini
[Unit]
Description=TEJ SOCKS5 Proxy Tunnel
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/autossh -M 20000 -N \
  -D 127.0.0.1:1080 \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=3" \
  -o "StrictHostKeyChecking=no" \
  -p 2222 \
  USER@IP_MACHINE_TUNISIE
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Activer et démarrer
sudo systemctl daemon-reload
sudo systemctl enable tej-proxy
sudo systemctl start tej-proxy
sudo systemctl status tej-proxy
```

### Étape 4 — Code C# : configurer HttpClient avec proxy SOCKS5

Dans [`ApplicationServiceExtentions.cs`](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Extentions/ApplicationServiceExtentions.cs) :

```csharp
services.AddHttpClient<TejApiClient>()
    .ConfigurePrimaryHttpMessageHandler(sp =>
    {
        var config = sp.GetRequiredService<IOptions<TejConfig>>().Value;
        var handler = new HttpClientHandler
        {
            UseCookies = true,
            CookieContainer = new System.Net.CookieContainer()
        };
        if (!string.IsNullOrEmpty(config.ProxyUrl))
        {
            handler.Proxy = new WebProxy(config.ProxyUrl);
            handler.UseProxy = true;
        }
        return handler;
    });
```

Ajouter dans `TejConfig` :
```csharp
public string? ProxyUrl { get; set; } // ex: "socks5://127.0.0.1:1080"
```

### Étape 5 — docker-compose.yml : ajouter la variable d'environnement

```yaml
# Dans le service 'api'
environment:
  - Tej__ProxyUrl=socks5://127.0.0.1:1080
  # ... autres variables existantes
```

> **Note :** Le tunnel autossh tourne sur le VPS lui-même (localhost:1080),
> donc l'API Docker accède au proxy via `127.0.0.1:1080`.
> Il faut utiliser `network_mode: host` ou mapper correctement le port.

### Étape 5b — Alternative avec network Docker

Si le conteneur Docker ne peut pas atteindre `127.0.0.1` de l'hôte :

```yaml
# Option A : network_mode host (plus simple)
api:
  network_mode: host

# Option B : utiliser l'IP du gateway Docker (typiquement 172.17.0.1)
environment:
  - Tej__ProxyUrl=socks5://172.17.0.1:1080
```

---

## 🔄 Autres options envisagées (non retenues)

### Option 2 — Nginx reverse-proxy sur machine tunisienne
Ajouter un reverse proxy nginx sur la machine TN qui forward vers `api-tej.finances.gov.tn`.
→ **Non retenu** : plus complexe, expose l'API TEJ publiquement.

### Option 3 — Whitelisting IP officiel auprès de TEJ
Contacter `contact.tej@finances.gov.tn` pour whitelist de l'IP du VPS.
→ **Non retenu** : délais longs, incertain.

### Option 4 — VPS OVH en Tunisie (~5-10€/mois)
Migrer vers un VPS avec IP tunisienne.
→ **À considérer** si la solution SSH SOCKS5 pose des problèmes de stabilité.

---

## ⏳ Prochaines étapes

- [ ] Confirmer l'OS de la machine en Tunisie
- [ ] Configurer le port forwarding SSH sur le routeur
- [ ] Générer et copier la clé SSH du VPS vers la machine TN
- [ ] Installer et tester `autossh` sur le VPS
- [ ] Modifier `TejConfig` + `ApplicationServiceExtentions.cs`
- [ ] Mettre à jour `docker-compose.yml`
- [ ] Tester le batch TEJ depuis le VPS via le tunnel

---

## 📁 Fichiers concernés

| Fichier | Rôle |
|---|---|
| [`TejIntegration.cs`](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/tej/TejIntegration.cs) | Client API TEJ, méthode `UploadDeclarationAsync` |
| [`TejFacade.cs`](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/tej/TejFacade.cs) | Façade métier pour construction + upload |
| [`ApplicationServiceExtentions.cs`](file:///home/ubuntu/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Extentions/ApplicationServiceExtentions.cs) | Configuration DI / HttpClient |
| [`docker-compose.yml`](file:///home/ubuntu/acya-app/docker-compose.yml) | Variables d'environnement du conteneur API |
