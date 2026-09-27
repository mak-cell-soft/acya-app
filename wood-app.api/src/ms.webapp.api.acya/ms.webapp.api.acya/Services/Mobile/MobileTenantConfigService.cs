using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

        public MobileTenantConfigService(MasterDbContext masterDb, WoodAppContext woodAppDb, IConfiguration configuration)
        {
            _masterDb = masterDb;
            _woodAppDb = woodAppDb;
            _configuration = configuration;
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

            // 2. Fetch enterprise modules flags if accessible from tenant context
            bool hasChantier = false;
            bool hasProduction = false;
            try
            {
                var enterprise = await _woodAppDb.Enterprises
                    .AsNoTracking()
                    .FirstOrDefaultAsync(cancellationToken);

                if (enterprise != null)
                {
                    hasChantier = enterprise.IsManagingConstructions ?? false;
                    hasProduction = enterprise.IsManagingProduction ?? false;
                }
            }
            catch
            {
                // Fallback gracefully if tenant schema is unreachable from current connection
            }

            // Clean slug for package name (alphanumeric only)
            var alphanumericSlug = Regex.Replace(cleanSlug, @"[^a-z0-9]", "");
            if (string.IsNullOrEmpty(alphanumericSlug))
            {
                alphanumericSlug = "tenant";
            }

            var baseUrlConfig = _configuration["MobileApp:BaseUrlTemplate"] ?? "https://{slug}.acya.site/api/";
            var dynamicBaseUrl = baseUrlConfig.Replace("{slug}", cleanSlug);

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
                HasProductionModule = hasProduction
            };
        }
    }
}
