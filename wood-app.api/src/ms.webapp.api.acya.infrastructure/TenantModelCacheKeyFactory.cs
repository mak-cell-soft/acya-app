using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace ms.webapp.api.acya.infrastructure
{
  /// <summary>
  /// Custom model cache key factory that includes the database schema name in the cache key.
  /// Prevents EF Core from serving a cached model pointing to a different tenant's schema.
  /// </summary>
  public class TenantModelCacheKeyFactory : IModelCacheKeyFactory
  {
    public object Create(DbContext context, bool designTime)
    {
      if (context is WoodAppContext woodContext)
      {
        // Return a tuple of DB Context Type, target schema name, and design-time mode.
        // C# tuples have value-based structural equality out-of-the-box.
        return (context.GetType(), woodContext.SchemaName, designTime);
      }
      
      return (context.GetType(), designTime);
    }
  }
}
