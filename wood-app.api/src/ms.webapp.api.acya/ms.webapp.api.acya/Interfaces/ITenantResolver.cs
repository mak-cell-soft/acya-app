using Microsoft.AspNetCore.Http;

namespace ms.webapp.api.acya.api.Interfaces
{
  /// <summary>
  /// Abstraction for resolving tenant slug from HttpContext.
  /// </summary>
  public interface ITenantResolver
  {
    string? ResolveTenantSlug(HttpContext context);
  }
}
