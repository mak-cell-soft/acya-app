using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services.Mobile
{
    /// <summary>
    /// Service to dynamically generate mobile application configuration
    /// for any tenant using existing database configuration.
    /// </summary>
    public class MobileTenantConfigService : IMobileTenantConfigService
    {
        private readonly MasterDbContext _masterDb;
        private readonly WoodAppContext _woodAppDb;
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider? _serviceProvider;
        private readonly ILogger<MobileTenantConfigService>? _logger;
        private readonly ms.webapp.api.acya.core.Interfaces.IFirebaseAppManagementService? _firebaseAppService;

        // NOTE: Backward-compatible constructor for in-memory unit tests and simple DI scenarios.
        public MobileTenantConfigService(
            MasterDbContext masterDb,
            WoodAppContext woodAppDb,
            IConfiguration configuration)
            : this(masterDb, woodAppDb, configuration, null, null, null)
        {
        }

        public MobileTenantConfigService(
            MasterDbContext masterDb,
            WoodAppContext woodAppDb,
            IConfiguration configuration,
            IServiceProvider? serviceProvider,
            ILogger<MobileTenantConfigService>? logger)
            : this(masterDb, woodAppDb, configuration, serviceProvider, logger, null)
        {
        }

        // NOTE: Primary DI constructor. Injects IServiceProvider, ILogger, and IFirebaseAppManagementService.
        public MobileTenantConfigService(
            MasterDbContext masterDb,
            WoodAppContext woodAppDb,
            IConfiguration configuration,
            IServiceProvider? serviceProvider,
            ILogger<MobileTenantConfigService>? logger,
            ms.webapp.api.acya.core.Interfaces.IFirebaseAppManagementService? firebaseAppService)
        {
            _masterDb = masterDb;
            _woodAppDb = woodAppDb;
            _configuration = configuration;
            _serviceProvider = serviceProvider;
            _logger = logger;
            _firebaseAppService = firebaseAppService;
        }

        public async Task<MobileTenantConfigDto?> GenerateConfigForTenantAsync(string tenantSlug, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(tenantSlug))
            {
                return null;
            }

            var cleanSlug = tenantSlug.Trim().ToLowerInvariant();

            // 1. Fetch tenant registry from master database
            var tenant = await _masterDb.TenantRegistries
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug.ToLower() == cleanSlug, cancellationToken);

            if (tenant == null)
            {
                return null;
            }

            // 2. Fetch enterprise module flags from the tenant's isolated PostgreSQL schema
            // NOTE: In multi-tenant production mode, the caller (e.g., admin endpoint GET /api/admin/mobile/builds/{id}/config)
            // runs outside the tenant HTTP context. We must dynamically resolve a tenant-scoped WoodAppContext
            // with TenantContext.SchemaName and ConnectionString populated, matching the pattern in MobileBuildService.cs.
            bool hasChantier = false;
            bool hasProduction = false;
            try
            {
                Enterprise? enterprise;
                if (_serviceProvider != null && _woodAppDb.Database.ProviderName != "Microsoft.EntityFrameworkCore.InMemory")
                {
                    using var scope = _serviceProvider.CreateScope();
                    var tenantCtx = scope.ServiceProvider.GetRequiredService<TenantContext>();
                    tenantCtx.IsEnabled = true;
                    tenantCtx.Slug = tenant.Slug;
                    tenantCtx.SchemaName = tenant.SchemaName;
                    tenantCtx.ConnectionString = (!string.IsNullOrEmpty(tenant.ConnectionString)
                        ? tenant.ConnectionString
                        : _configuration.GetConnectionString("WoodAppContextConnection")) ?? "";

                    var scopedDb = scope.ServiceProvider.GetRequiredService<WoodAppContext>();
                    enterprise = await scopedDb.Enterprises
                        .AsNoTracking()
                        .FirstOrDefaultAsync(cancellationToken);
                }
                else
                {
                    // Fallback for in-memory testing or non-scoped execution
                    enterprise = await _woodAppDb.Enterprises
                        .AsNoTracking()
                        .FirstOrDefaultAsync(cancellationToken);
                }

                if (enterprise != null)
                {
                    hasChantier = enterprise.IsManagingConstructions ?? false;
                    hasProduction = enterprise.IsManagingProduction ?? false;
                }
            }
            catch (Exception ex)
            {
                // NOTE: Do not silently swallow schema or database connectivity failures, which would corrupt
                // build configs by falsely indicating modules are disabled. Log details and fail explicitly.
                _logger?.LogError(ex, "Failed to resolve enterprise module configuration for tenant '{TenantSlug}' in schema '{Schema}'", cleanSlug, tenant.SchemaName);
                throw new InvalidOperationException($"Failed to resolve enterprise module configuration for tenant '{cleanSlug}' in schema '{tenant.SchemaName}': {ex.Message}", ex);
            }

            // Clean slug for package name (alphanumeric only)
            var alphanumericSlug = Regex.Replace(cleanSlug, @"[^a-z0-9]", "");
            if (string.IsNullOrEmpty(alphanumericSlug))
            {
                alphanumericSlug = "tenant";
            }

            var baseUrlConfig = _configuration["MobileApp:BaseUrlTemplate"] ?? "https://{slug}.acya.site/api/";
            var dynamicBaseUrl = baseUrlConfig.Replace("{slug}", cleanSlug);

            var canonicalPackageName = $"com.{alphanumericSlug}.woodapp";

            // Fetch Base64-encoded Firebase client configuration if provisioned
            string? googleServicesBase64 = null;
            if (_firebaseAppService != null)
            {
                googleServicesBase64 = await _firebaseAppService.GetTenantFirebaseConfigBase64Async(cleanSlug, canonicalPackageName, cancellationToken);
            }
            else
            {
                var fbApp = await _masterDb.TenantFirebaseApps
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.TenantId == cleanSlug && a.Status == "Active", cancellationToken);
                if (fbApp != null &&
                    string.Equals(fbApp.PackageName, canonicalPackageName, StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(fbApp.GoogleServicesJson))
                {
                    var trimmed = fbApp.GoogleServicesJson.Trim();
                    if (FirebaseAppManagementService.ValidateGoogleServicesJson(trimmed, canonicalPackageName))
                    {
                        googleServicesBase64 = IsBase64String(trimmed)
                            ? trimmed
                            : Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(trimmed));
                    }
                    else
                    {
                        _logger?.LogWarning("Fallback Firebase configuration for tenant '{TenantSlug}' failed validation for package '{CanonicalPackage}'. Configuration rejected.", cleanSlug, canonicalPackageName);
                    }
                }
            }

            return new MobileTenantConfigDto
            {
                TenantId = cleanSlug,
                CompanyName = tenant.Name ?? cleanSlug.ToUpperInvariant(),
                AppName = tenant.Name ?? cleanSlug.ToUpperInvariant(),
                PackageName = $"com.{alphanumericSlug}.woodapp",
                Logo = !string.IsNullOrWhiteSpace(tenant.LogoUrl) 
                    ? tenant.LogoUrl 
                    : $"assets/tenants/{cleanSlug}/logo.svg",
                PrimaryColor = !string.IsNullOrWhiteSpace(tenant.PrimaryColor) ? tenant.PrimaryColor : "#1E3A8A",
                SecondaryColor = !string.IsNullOrWhiteSpace(tenant.SecondaryColor) ? tenant.SecondaryColor : "#3B82F6",
                BaseUrl = dynamicBaseUrl,
                Environment = _configuration["ASPNETCORE_ENVIRONMENT"]?.ToLowerInvariant() ?? "production",
                Language = !string.IsNullOrWhiteSpace(tenant.Language) ? tenant.Language : "fr",
                Currency = !string.IsNullOrWhiteSpace(tenant.Currency) ? tenant.Currency : "TND",
                HasChantierModule = hasChantier,
                HasProductionModule = hasProduction,
                GoogleServicesJsonBase64 = googleServicesBase64
            };
        }

        private static bool IsBase64String(string base64)
        {
            if (string.IsNullOrWhiteSpace(base64) || base64.Contains("{"))
            {
                return false;
            }

            var buffer = new Span<byte>(new byte[base64.Length]);
            return Convert.TryFromBase64String(base64, buffer, out _);
        }
    }
}
