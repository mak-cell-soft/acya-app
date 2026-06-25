namespace ms.webapp.api.acya.infrastructure
{
  /// <summary>
  /// Scoped context containing the multi-tenancy settings for the current request.
  /// </summary>
  public class TenantContext
  {
    // Indicates if multi-tenancy is active and configured for this request
    public bool IsEnabled { get; set; } = false;

    // Tenant identifier slug (e.g. "socobois")
    public string Slug { get; set; } = string.Empty;

    // Resolved PostgreSQL schema name (e.g. "tenant_socobois")
    public string SchemaName { get; set; } = "public";

    // Resolved connection string (if tenant has a dedicated DB, otherwise default)
    public string ConnectionString { get; set; } = string.Empty;

    // Tenant subscription plan tier (e.g. "Trial", "Starter", "Pro", "Enterprise")
    public string Plan { get; set; } = string.Empty;

    // Tenant lifecycle status (e.g. "Active", "Suspended", "Expired")
    public string Status { get; set; } = string.Empty;
  }
}
