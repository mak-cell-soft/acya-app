using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.core.Entities;

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
          path.StartsWith("/api/apihealth") || 
          path.Contains("/hub/notification") || 
          path.StartsWith("/api/register") || 
          path.StartsWith("/api/tenant/register") ||
          path.Contains("/api/enterprise/register") ||
          path.Contains("/api/enterprise/request-registration"))
      {
        await _next(context);
        return;
      }

      // 2. Resolve the tenant slug
      var slug = resolver.ResolveTenantSlug(context);
      TenantRegistry? tenant = null;

      if (!string.IsNullOrEmpty(slug))
      {
        tenant = await masterDb.TenantRegistries.FirstOrDefaultAsync(t => t.Slug == slug);
      }

      // If not resolved by slug, try resolving by host header matching CustomDomain
      if (tenant == null)
      {
        var host = context.Request.Host.Host;
        if (!string.IsNullOrEmpty(host))
        {
          tenant = await masterDb.TenantRegistries.FirstOrDefaultAsync(t => t.CustomDomain == host);
          if (tenant != null)
          {
            slug = tenant.Slug;
          }
        }
      }

      if (tenant == null)
      {
        _logger.LogWarning("Multi-tenant request failed: tenant '{Slug}' not registered in master database.", slug ?? "unknown");
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { error = $"Tenant '{slug ?? "unknown"}' is not registered." });
        return;
      }

      // Allow access to public configuration endpoint /api/enterprise/config even if inactive/suspended
      if (!tenant.IsActive && path != "/api/enterprise/config")
      {
        _logger.LogWarning("Multi-tenant request failed: tenant '{Slug}' is inactive (Status: {Status}).", tenant.Slug, tenant.Status);
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { error = "your company is disabled contact administrator", status = tenant.Status });
        return;
      }

      // 4. Cross-validate resolved tenant slug with JWT claims (if user is authenticated)
      if (context.User.Identity?.IsAuthenticated == true)
      {
        var jwtTenantSlug = context.User.FindFirst("tenant_slug")?.Value;
        if (!string.Equals(jwtTenantSlug, slug, StringComparison.OrdinalIgnoreCase))
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
      tenantContext.Plan = tenant.Plan;
      tenantContext.Status = tenant.Status;

      // Proceed with pipeline
      await _next(context);
    }
  }
}
