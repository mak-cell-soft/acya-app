# 🏢 Faisabilité Multi-Tenant — ACYA App

> **Contexte :** Stack actuelle — .NET 8 · ASP.NET Core · EF Core · PostgreSQL  
> **Objectif :** Permettre à plusieurs entreprises d'utiliser ACYA App avec isolation des données  
> **URLs cibles :** `socobois.acya.site/login` · `tucobois.acya.site/login` · `wellness-medical.acya.site/login`

---

## ✅ Verdict : FAISABLE — et bien adapté à votre stack

La multi-tenancy est un pattern éprouvé, et votre stack (.NET 8 + EF Core + PostgreSQL) dispose de tous les outils nécessaires. Voici l'analyse complète.

---

## Les 3 Stratégies d'Isolation — Comparatif

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STRATÉGIE 1 : SILO (Database-per-Tenant)                                   │
│  Une base de données PostgreSQL dédiée par entreprise                        │
│                                                                             │
│  acya_db_socobois   acya_db_tucobois   acya_db_wellness_medical             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐            │
│  │  tbl_users   │   │  tbl_users   │   │  tbl_users           │            │
│  │  tbl_docs    │   │  tbl_docs    │   │  tbl_docs            │            │
│  │  tbl_stock   │   │  tbl_stock   │   │  tbl_stock           │            │
│  └──────────────┘   └──────────────┘   └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STRATÉGIE 2 : SCHEMA-per-Tenant (PostgreSQL Schemas)                       │
│  Un seul PostgreSQL, chaque tenant dans son propre schema                   │
│                                                                             │
│  Database: acya_app                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐  │
│  │ schema: socobois   │  │ schema: tucobois   │  │ schema: wellness     │  │
│  │  tbl_users         │  │  tbl_users         │  │  tbl_users           │  │
│  │  tbl_docs          │  │  tbl_docs          │  │  tbl_docs            │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────────┘  │
│                                                                             │
│  + Table centrale: public.tbl_enterprise (registre de tous les tenants)     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STRATÉGIE 3 : POOL (Shared Database, tenant_id column)                     │
│  Toutes les tables ont une colonne tenant_id                                │
│                                                                             │
│  tbl_documents                                                               │
│  ┌──────────┬────────────┬──────────┐                                       │
│  │ id       │ tenant_id  │ data ... │                                       │
│  │ 1        │ socobois   │ ...      │                                       │
│  │ 2        │ tucobois   │ ...      │                                       │
│  │ 3        │ socobois   │ ...      │                                       │
│  └──────────┴────────────┴──────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Recommandation pour ACYA App : **Stratégie Hybride (Schema + Silo léger)**

### Pourquoi pas le Pool (Stratégie 3) ?
- Risque de **fuite de données** entre tenants si un filtre est oublié
- Toutes vos tables devront avoir `tenant_id` → refactoring massif
- Un bug de requête expose les données d'une autre entreprise
- **Non recommandé pour un ERP financier**

### Pourquoi pas le full Silo (Stratégie 1) ?
- Maintenance lourde : chaque migration SQL doit être rejouée sur N bases
- Coût infrastructure élevé pour de nombreux tenants
- Complexité du monitoring (N bases à surveiller)

### ✅ Recommandation : Schema-per-Tenant + Master Registry

```
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Server (unique)                     │
│                                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │  schema: public (Master Registry)        │                    │
│  │  ┌──────────────────────────────────┐    │                    │
│  │  │ tbl_enterprise                    │    │                    │
│  │  │ id | slug       | schema_name    │    │                    │
│  │  │  1 | socobois   | tenant_socobois│    │                    │
│  │  │  2 | tucobois   | tenant_tucobois│    │                    │
│  │  │  3 | wellness   | tenant_wellness│    │                    │
│  │  └──────────────────────────────────┘    │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ schema:           │  │ schema:           │                     │
│  │ tenant_socobois   │  │ tenant_tucobois   │  ...               │
│  │ (copie complète)  │  │ (copie complète)  │                     │
│  │  tbl_users        │  │  tbl_users        │                     │
│  │  tbl_documents    │  │  tbl_documents    │                     │
│  │  tbl_stock        │  │  tbl_stock        │                     │
│  │  tbl_enterprise   │  │  tbl_enterprise   │                     │
│  │  ...              │  │  ...              │                     │
│  └──────────────────┘  └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Routage par Sous-domaine

### Infrastructure DNS/Nginx

```nginx
# Configuration Nginx — Wildcard subdomain routing
server {
    listen 443 ssl;
    server_name ~^(?<tenant>[^.]+)\.acya\.site$;

    # Le sous-domaine capturé est passé comme header à l'API
    proxy_set_header X-Tenant-Slug $tenant;
    proxy_pass http://acya-api:5068;
}
```

### Wildcard SSL Certificate
```bash
# Certificat wildcard *.acya.site via Let's Encrypt + Cloudflare DNS
certbot certonly --dns-cloudflare -d "*.acya.site" -d "acya.site"
```

---

## ⚙️ Implémentation .NET 8 — Comment ça marche

### 1. TenantResolver — Résolution du tenant depuis la requête

```csharp
// Résout le tenant depuis : sous-domaine, header, ou path segment
// Ex: socobois.acya.site → slug = "socobois"
public interface ITenantResolver
{
    string? ResolveTenantSlug(HttpContext context);
}

public class SubdomainTenantResolver : ITenantResolver
{
    public string? ResolveTenantSlug(HttpContext context)
    {
        // Depuis le header injecté par Nginx
        if (context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slug))
            return slug.ToString().ToLowerInvariant();

        // Fallback: depuis le Host header directement
        var host = context.Request.Host.Host; // ex: "socobois.acya.site"
        var parts = host.Split('.');
        return parts.Length >= 3 ? parts[0] : null; // "socobois"
    }
}
```

### 2. TenantContext — Contexte partagé par requête (Scoped)

```csharp
// Ce service est injecté partout où on a besoin du tenant courant
public class TenantContext
{
    public string Slug { get; set; } = string.Empty;
    public string SchemaName => $"tenant_{Slug}";
    public string ConnectionString { get; set; } = string.Empty;
}
```

### 3. TenantMiddleware — Middleware ASP.NET Core

```csharp
public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;

    public TenantMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context, ITenantResolver resolver, TenantContext tenantContext)
    {
        var slug = resolver.ResolveTenantSlug(context);

        if (slug is null)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant non identifié" });
            return;
        }

        // Charger les infos depuis la table master (public.tbl_enterprise)
        using var scope = _scopeFactory.CreateScope();
        var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
        var enterprise = await masterDb.Enterprises
            .FirstOrDefaultAsync(e => e.Slug == slug && e.IsActive);

        if (enterprise is null)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = $"Entreprise '{slug}' non trouvée" });
            return;
        }

        // Alimenter le contexte du tenant pour cette requête
        tenantContext.Slug = enterprise.Slug;
        tenantContext.ConnectionString = enterprise.ConnectionString;

        await _next(context);
    }
}
```

### 4. WoodAppContext — DbContext qui change de schema dynamiquement

```csharp
// Le DbContext principal est configuré dynamiquement selon le tenant
public class WoodAppContext : DbContext
{
    private readonly TenantContext _tenantContext;

    public WoodAppContext(DbContextOptions<WoodAppContext> options, TenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    // DbSets existants — AUCUN changement requis
    public DbSet<Document> Documents { get; set; }
    public DbSet<AppUser> AppUsers { get; set; }
    public DbSet<Enterprise> Enterprises { get; set; }
    // ...

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 🔑 La clé : tous les modèles utilisent le schema du tenant courant
        modelBuilder.HasDefaultSchema(_tenantContext.SchemaName);

        // Configurations existantes inchangées
        base.OnModelCreating(modelBuilder);
    }
}
```

### 5. Registration dans Program.cs

```csharp
// Program.cs — Configuration multi-tenant

builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<ITenantResolver, SubdomainTenantResolver>();

// MasterDbContext : connexion fixe à la base de registre
builder.Services.AddDbContext<MasterDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MasterDb")));

// WoodAppContext : connexion dynamique selon le tenant
builder.Services.AddDbContext<WoodAppContext>((serviceProvider, options) =>
{
    var tenantContext = serviceProvider.GetRequiredService<TenantContext>();
    
    // La connection string est résolue dynamiquement par requête
    var connectionString = string.IsNullOrEmpty(tenantContext.ConnectionString)
        ? builder.Configuration.GetConnectionString("DefaultConnection")
        : tenantContext.ConnectionString;

    options.UseNpgsql(connectionString);
});

// ...

app.UseMiddleware<TenantMiddleware>(); // Avant UseAuthorization
app.UseAuthentication();
app.UseAuthorization();
```

---

## 🗄️ Table de Registre des Entreprises (Master Schema)

```sql
-- Schema public — Table maître de toutes les entreprises
CREATE TABLE public.tbl_enterprise (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(100) UNIQUE NOT NULL,  -- "socobois", "tucobois"
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    schema_name     VARCHAR(100) UNIQUE NOT NULL,  -- "tenant_socobois"
    connection_string TEXT NOT NULL,               -- Chaîne de connexion PostgreSQL
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    plan            VARCHAR(50) DEFAULT 'standard' -- 'trial' | 'standard' | 'enterprise'
);

-- Index pour lookup rapide par slug (utilisé à chaque requête)
CREATE UNIQUE INDEX idx_enterprise_slug ON public.tbl_enterprise(slug) WHERE is_active = TRUE;
```

---

## 🔄 Flux de Création d'un Nouveau Tenant

```
Nouvelle entreprise "wellness-medical" s'enregistre
              │
              ▼
1. [POST] /api/register (endpoint public, pas de middleware tenant)
   Body: { name: "Wellness Medical", slug: "wellness-medical" }
              │
              ▼
2. TenantProvisioningService.ProvisionTenant()
   ├── Génère un slug unique et validé
   ├── Crée le schema PostgreSQL: CREATE SCHEMA tenant_wellness_medical
   ├── Exécute les migrations sur ce schema (via Flyway ou EF Core)
   ├── Insère les données de seed initiales (articles par défaut, etc.)
   ├── Crée le user admin initial
   └── Insère l'enregistrement dans public.tbl_enterprise
              │
              ▼
3. DNS wildcard *.acya.site est déjà actif → immédiatement opérationnel
              │
              ▼
4. L'entreprise accède à wellness-medical.acya.site/login ✅
```

### Code de provisioning

```csharp
public class TenantProvisioningService
{
    private readonly MasterDbContext _masterDb;
    private readonly IConfiguration _config;

    public async Task<Enterprise> ProvisionTenantAsync(RegisterEnterpriseRequest request)
    {
        var slug = GenerateSlug(request.Name);
        var schemaName = $"tenant_{slug.Replace("-", "_")}";
        
        // Vérification unicité du slug
        if (await _masterDb.Enterprises.AnyAsync(e => e.Slug == slug))
            throw new ConflictException($"Le nom '{slug}' est déjà pris");

        // 1. Créer le schema PostgreSQL
        await _masterDb.Database.ExecuteSqlRawAsync($"CREATE SCHEMA IF NOT EXISTS {schemaName}");

        // 2. Appliquer les migrations sur ce schema
        var tenantConnectionString = BuildConnectionString(schemaName);
        await ApplyMigrationsAsync(tenantConnectionString, schemaName);

        // 3. Créer le tenant dans le registre master
        var enterprise = new Enterprise
        {
            Slug = slug,
            Name = request.Name,
            SchemaName = schemaName,
            ConnectionString = tenantConnectionString,
            IsActive = true,
            Plan = "trial"
        };

        _masterDb.Enterprises.Add(enterprise);
        await _masterDb.SaveChangesAsync();

        // 4. Seed les données initiales du tenant
        await SeedTenantDataAsync(enterprise);

        return enterprise;
    }

    private async Task ApplyMigrationsAsync(string connectionString, string schemaName)
    {
        var optionsBuilder = new DbContextOptionsBuilder<WoodAppContext>();
        optionsBuilder.UseNpgsql(connectionString);

        // Crée un TenantContext temporaire pour les migrations
        var tempTenantContext = new TenantContext { Slug = schemaName };

        await using var ctx = new WoodAppContext(optionsBuilder.Options, tempTenantContext);
        await ctx.Database.MigrateAsync();
    }
}
```

---

## 🔐 JWT et Multi-Tenant

Le token JWT doit embarquer le `slug` du tenant pour qu'un utilisateur ne puisse pas accéder aux données d'un autre tenant même avec un token valide.

```csharp
// Claims dans le JWT
public class TokenService
{
    public string GenerateToken(AppUser user, string tenantSlug)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("tenant_slug", tenantSlug),  // 🔑 Claim tenant
            new Claim("enterprise_id", user.EnterpriseId.ToString())
        };
        // ... génération JWT habituelle
    }
}

// Dans le middleware, validation croisée :
// Le tenant du JWT doit correspondre au tenant du sous-domaine
if (jwtTenantSlug != subdomainTenantSlug)
{
    context.Response.StatusCode = 403;
    return; // Accès refusé : token d'un autre tenant
}
```

---

## 📊 Comparatif des Approches

| Critère | Pool (tenant_id) | Schema-per-Tenant ✅ | Silo (DB dédiée) |
|---|---|---|---|
| **Isolation des données** | ⚠️ Faible | ✅ Haute | ✅ Totale |
| **Risque de fuite** | 🔴 Élevé | 🟢 Faible | 🟢 Nul |
| **Refactoring requis** | 🔴 Massif | 🟡 Modéré | 🟡 Modéré |
| **Migrations SQL** | ✅ Une seule fois | 🟡 Appliquées par schema | 🔴 Par base |
| **Performance** | ✅ Optimale | ✅ Très bonne | ✅ Maximale |
| **Coût infra** | 💚 Minimal | 💚 Faible | 🔴 Élevé |
| **Monitoring** | 💚 Simple | 🟡 Modéré | 🔴 Complexe |
| **Scalabilité** | ✅ Illimitée | ✅ ~1000 tenants/server | 🟡 Limitée |
| **Compliance/RGPD** | 🟡 Complexe | ✅ Facile | ✅ Trivial |

---

## 🚀 Roadmap d'Implémentation (Phases)

### Phase 1 — Foundation (2-3 semaines)
- [ ] Créer la table `public.tbl_enterprise` (master registry)
- [ ] Implémenter `TenantContext`, `ITenantResolver`, `TenantMiddleware`
- [ ] Modifier `WoodAppContext` pour utiliser le schema dynamique
- [ ] Créer `MasterDbContext` pour le registre central
- [ ] Configuration Nginx wildcard `*.acya.site`
- [ ] Certificat SSL wildcard `*.acya.site`

### Phase 2 — Provisioning (1-2 semaines)
- [ ] Implémenter `TenantProvisioningService`
- [ ] Endpoint d'enregistrement `/api/register` (public)
- [ ] Script de migration par schema
- [ ] Seed des données initiales par tenant

### Phase 3 — Sécurité (1 semaine)
- [ ] Ajouter `tenant_slug` dans les claims JWT
- [ ] Validation croisée sous-domaine ↔ JWT claim
- [ ] Audit logs par tenant

### Phase 4 — Backoffice Super-Admin (2 semaines)
- [ ] Interface admin `admin.acya.site` pour gérer tous les tenants
- [ ] Dashboard : liste entreprises, statuts, plans
- [ ] Gestion des plans (trial/standard/enterprise)
- [ ] Métriques d'utilisation par tenant

### Phase 5 — Frontend Angular (1-2 semaines)
- [ ] Détection du tenant depuis l'URL au démarrage de l'app
- [ ] Branding dynamique par tenant (logo, couleurs)
- [ ] Page d'onboarding (`acya.site/register`)

---

## ⚠️ Points d'Attention Critiques

> [!WARNING]
> **Migrations SQL** : Lorsque vous ajoutez une nouvelle migration EF Core, elle doit être appliquée sur **tous les schemas existants**. Planifiez une commande batch pour cela.

> [!IMPORTANT]
> **Connection Pool** : Avec le schema-per-tenant, la connection string peut être identique (même PostgreSQL), seul le `search_path` change. Utilisez `PgBouncer` pour mutualiser le pool de connexions.

> [!NOTE]
> **Slug validation** : Les slugs doivent être sanitisés (lettres, chiffres, tirets uniquement) et réservés (admin, api, www, mail ne peuvent pas être des slugs de tenant).

> [!CAUTION]
> **Isolation JWT** : Ne jamais faire confiance uniquement au sous-domaine. Le JWT DOIT contenir le `tenant_slug` et la validation croisée DOIT être faite à chaque requête.

---

## 🏗️ Architecture Finale Cible

```
                    Internet
                       │
              ┌────────▼────────┐
              │   Cloudflare    │
              │  *.acya.site    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │     Nginx       │
              │  Wildcard DNS   │
              │  X-Tenant-Slug  │─────────┐
              └────────┬────────┘         │
                       │                  │
         ┌─────────────┼─────────────┐    │
         ▼             ▼             ▼    │
  socobois.*    tucobois.*    wellness.*  │
                                          │
              ┌───────────────────────────┘
              │
     ┌────────▼─────────────────────────────────┐
     │          ASP.NET Core API (.NET 8)         │
     │                                            │
     │  TenantMiddleware                          │
     │  ┌────────────────────────────────────┐   │
     │  │ 1. Résout slug depuis X-Tenant-Slug │   │
     │  │ 2. Lookup dans MasterDbContext      │   │
     │  │ 3. Alimente TenantContext (Scoped)  │   │
     │  └────────────────────────────────────┘   │
     │                                            │
     │  WoodAppContext (schema dynamique)          │
     └──────────────────┬─────────────────────────┘
                        │
              ┌─────────▼──────────────────────────┐
              │         PostgreSQL Server            │
              │                                      │
              │  public.tbl_enterprise (master)      │
              │  tenant_socobois.* (schéma)          │
              │  tenant_tucobois.* (schéma)          │
              │  tenant_wellness_medical.* (schéma)  │
              └──────────────────────────────────────┘
```
