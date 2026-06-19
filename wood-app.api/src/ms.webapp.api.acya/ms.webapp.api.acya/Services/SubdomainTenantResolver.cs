using Microsoft.AspNetCore.Http;
using ms.webapp.api.acya.api.Interfaces;

namespace ms.webapp.api.acya.api.Services
{
  /// <summary>
  /// Implementation of ITenantResolver that checks:
  /// 1. HTTP header 'X-Tenant-Slug' (passed by proxy e.g. Nginx).
  /// 2. Host subdomain (e.g. tenant.acya.site -> 'tenant').
  /// 3. Query string parameter 'tenant' (fallback for testing/development).
  /// </summary>
  public class SubdomainTenantResolver : ITenantResolver
  {
    public string? ResolveTenantSlug(HttpContext context)
    {
      if (context == null) return null;

      // 1. Resolve from X-Tenant-Slug header (injected by Nginx)
      if (context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader) && !string.IsNullOrEmpty(slugHeader))
      {
        return slugHeader.ToString().Trim().ToLowerInvariant();
      }

      // 2. Fallback: Host Header Subdomain (e.g. tenant.acya.site)
      var host = context.Request.Host.Host;
      if (!string.IsNullOrEmpty(host))
      {
        var parts = host.Split('.');
        // Host has subdomains (e.g. host: tenant.acya.site or tenant.localhost)
        if (parts.Length >= 3 || (parts.Length == 2 && host.EndsWith(".localhost")))
        {
          var potentialSlug = parts[0].Trim().ToLowerInvariant();
          // Filter out generic subdomains
          if (potentialSlug != "www" && potentialSlug != "api" && potentialSlug != "admin" && potentialSlug != "app")
          {
            return potentialSlug;
          }
        }
      }

      // 3. Fallback: Check Query String parameter for local debugging/client tools
      if (context.Request.Query.TryGetValue("tenant", out var tenantQuery) && !string.IsNullOrEmpty(tenantQuery))
      {
        return tenantQuery.ToString().Trim().ToLowerInvariant();
      }

      return null;
    }
  }
}
