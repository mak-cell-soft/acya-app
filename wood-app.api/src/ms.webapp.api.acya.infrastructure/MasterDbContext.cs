using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure
{
  /// <summary>
  /// Database context for the central registry that manages tenant domains and schemas.
  /// Always operates in the public schema of the master database.
  /// </summary>
  public class MasterDbContext : DbContext
  {
    public MasterDbContext(DbContextOptions<MasterDbContext> options) : base(options)
    {
    }

    public DbSet<TenantRegistry> TenantRegistries { get; set; }
    public DbSet<PlatformSetting> PlatformSettings { get; set; }
    public DbSet<MobileBuild> MobileBuilds { get; set; }
    public DbSet<MobileRelease> MobileReleases { get; set; }
    public DbSet<TenantFirebaseApp> TenantFirebaseApps { get; set; }
    public DbSet<TenantActiveSession> TenantActiveSessions { get; set; }
    public DbSet<MasterTenantSubscription> TenantSubscriptions { get; set; }
    public DbSet<MasterTenantInvoice> TenantInvoices { get; set; }
    public DbSet<MasterTenantPayment> TenantPayments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);

      modelBuilder.ApplyConfiguration(new Configurations.MobileBuildConfiguration());
      modelBuilder.ApplyConfiguration(new Configurations.MobileReleaseConfiguration());
      modelBuilder.ApplyConfiguration(new Configurations.TenantFirebaseAppConfiguration());

      // Force Master Registry to map explicitly to the public schema and bo_tbl_enterprise
      modelBuilder.Entity<TenantRegistry>(entity =>
      {
        entity.ToTable("bo_tbl_enterprise", "public");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("Id");
        entity.Property(e => e.Slug).HasColumnName("Slug");
        entity.Property(e => e.Name).HasColumnName("Name");
        entity.Property(e => e.Email).HasColumnName("Email");
        entity.Property(e => e.Phone).HasColumnName("Phone");
        entity.Property(e => e.SchemaName).HasColumnName("SchemaName");
        entity.Property(e => e.ConnectionString).HasColumnName("ConnectionString");
        entity.Property(e => e.IsActive).HasColumnName("IsActive");
        entity.Property(e => e.Plan).HasColumnName("Plan");
        entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
        entity.Property(e => e.Status).HasColumnName("Status");
        entity.Property(e => e.Notes).HasColumnName("Notes");
        entity.Property(e => e.LogoUrl).HasColumnName("LogoUrl");
        entity.Property(e => e.FaviconUrl).HasColumnName("FaviconUrl");
        entity.Property(e => e.PrimaryColor).HasColumnName("PrimaryColor");
        entity.Property(e => e.SecondaryColor).HasColumnName("SecondaryColor");
        entity.Property(e => e.CustomDomain).HasColumnName("CustomDomain");
        entity.Property(e => e.Language).HasColumnName("Language");
        entity.Property(e => e.Currency).HasColumnName("Currency");
        entity.Property(e => e.CustomDomainConfigured).HasColumnName("CustomDomainConfigured");
        entity.Property(e => e.IsSalingWood).HasColumnName("IsSalingWood");
        entity.Property(e => e.IsManagingConstructions).HasColumnName("IsManagingConstructions");
        entity.Property(e => e.IsManagingProduction).HasColumnName("IsManagingProduction");
        entity.Property(e => e.RneDocumentUrl).HasColumnName("RneDocumentUrl");
        entity.Property(e => e.MaxConnectedUsers).HasColumnName("MaxConnectedUsers").HasDefaultValue(5);

        entity.HasIndex(e => e.Slug).IsUnique();
        entity.HasIndex(e => e.SchemaName).IsUnique();
      });

      modelBuilder.Entity<TenantActiveSession>(entity =>
      {
        entity.ToTable("bo_tbl_tenant_active_sessions", "public");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.SessionId).HasMaxLength(100).IsRequired();
        entity.HasIndex(e => e.SessionId).IsUnique();
        entity.Property(e => e.TenantSlug).HasMaxLength(100).IsRequired();
        entity.Property(e => e.Username).HasMaxLength(150).IsRequired();
        entity.HasIndex(e => new { e.TenantId, e.IsRevoked, e.ExpiresAt });
        entity.HasIndex(e => new { e.TenantSlug, e.IsRevoked, e.ExpiresAt });
      });

      modelBuilder.Entity<MasterTenantSubscription>(entity =>
      {
        entity.ToTable("bo_tbl_tenant_subscriptions", "public");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Price).HasColumnType("numeric(18,2)");
      });

      modelBuilder.Entity<MasterTenantInvoice>(entity =>
      {
        entity.ToTable("bo_tbl_tenant_invoices", "public");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Amount).HasColumnType("numeric(18,2)");
      });

      modelBuilder.Entity<MasterTenantPayment>(entity =>
      {
        entity.ToTable("bo_tbl_tenant_payments", "public");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Amount).HasColumnType("numeric(18,2)");
      });

      modelBuilder.Entity<PlatformSetting>(entity =>
      {
        entity.ToTable("bo_tbl_platform_settings", "public");
        entity.HasKey(e => e.Key);
        entity.Property(e => e.Key).HasColumnName("Key").HasMaxLength(100);
        entity.Property(e => e.Value).HasColumnName("Value");
        entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt");
      });
    }
  }
}
