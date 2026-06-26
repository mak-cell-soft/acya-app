using System;

namespace ms.webapp.api.acya.core.Entities
{
  /// <summary>
  /// Represents a tenant enterprise in the master registry.
  /// Used in multi-tenant mode to resolve and route request schemas.
  /// </summary>
  public class TenantRegistry
  {
    public int Id { get; set; }
    
    // Unique slug for the tenant (e.g. "socobois", "tucobois")
    public string Slug { get; set; } = string.Empty;
    
    // Human-readable enterprise name
    public string Name { get; set; } = string.Empty;
    
    public string? Email { get; set; }
    
    public string? Phone { get; set; }
    
    // PostgreSQL schema name corresponding to this tenant (e.g. "tenant_socobois")
    public string SchemaName { get; set; } = string.Empty;
    
    // Connection string mapping if tenant uses a different DB host, or fallback pattern
    public string ConnectionString { get; set; } = string.Empty;
    
    // Status flag
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Service plan tier
    public string Plan { get; set; } = "Trial";

    public string Status { get; set; } = "Pending";

    public string? Notes { get; set; }
    
    public string? LogoUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? CustomDomain { get; set; }
    public string? Language { get; set; }
    public string? Currency { get; set; }
    public bool CustomDomainConfigured { get; set; }
  }
}
