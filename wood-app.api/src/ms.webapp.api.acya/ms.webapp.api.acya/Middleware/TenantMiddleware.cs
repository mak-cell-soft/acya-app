using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Middleware
{
  /// <summary>
  /// Middleware to resolve the current tenant from the HTTP request, populate the TenantContext,
  /// and perform security cross-validation against the user's JWT claims.
  /// </summary>
  public class TenantMiddleware
  {
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
      _next = next;
      _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantResolver resolver, TenantContext tenantContext, MasterDbContext masterDb)
    {
      var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

      // 1. Bypass tenant resolution for system/public endpoints
      if (path.StartsWith("/swagger") || 
          path.StartsWith("/api/health") || 
          path.Contains("/hub/notification") || 
          path.StartsWith("/api/register") || 
          path.StartsWith("/api/tenant/register"))
      {
        await _next(context);
        return;
      }

      // 2. Resolve the tenant slug
      var slug = resolver.ResolveTenantSlug(context);

      if (string.IsNullOrEmpty(slug))
      {
        _logger.LogWarning("Multi-tenant request failed: no tenant slug found in request headers, subdomain, or query string for path '{Path}'", path);
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "Tenant identification is required (subdomain, query param 'tenant', or X-Tenant-Slug header)." });
        return;
      }

      // 3. Look up tenant in the Master Registry database
      var tenant = await masterDb.TenantRegistries
        .FirstOrDefaultAsync(t => t.Slug == slug);

      if (tenant == null)
      {
        _logger.LogWarning("Multi-tenant request failed: tenant '{Slug}' not registered in master database.", slug);
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { error = $"Tenant '{slug}' is not registered." });
        return;
      }

      if (!tenant.IsActive)
      {
        _logger.LogWarning("Multi-tenant request failed: tenant '{Slug}' is inactive.", slug);
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { error = $"Tenant '{slug}' is inactive." });
        return;
      }

      // 4. Cross-validate resolved tenant slug with JWT claims (if user is authenticated)
      if (context.User.Identity?.IsAuthenticated == true)
      {
        var jwtTenantSlug = context.User.FindFirst("tenant_slug")?.Value;
        if (!string.IsNullOrEmpty(jwtTenantSlug) && !string.Equals(jwtTenantSlug, slug, StringComparison.OrdinalIgnoreCase))
        {
          _logger.LogWarning("Security Violation: Authenticated user with token for tenant '{JwtTenant}' attempted to access tenant '{RequestTenant}'", jwtTenantSlug, slug);
          context.Response.StatusCode = StatusCodes.Status403Forbidden;
          await context.Response.WriteAsJsonAsync(new { error = "Access denied: Tenant mismatch." });
          return;
        }
      }

      // 5. Set TenantContext for the scoped request lifetime
      tenantContext.IsEnabled = true;
      tenantContext.Slug = tenant.Slug;
      tenantContext.SchemaName = tenant.SchemaName;
      tenantContext.ConnectionString = tenant.ConnectionString;

      // Proceed with pipeline
      await _next(context);
    }
  }
}
