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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);

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
        entity.Property(e => e.CustomDomain).HasColumnName("CustomDomain");
        entity.Property(e => e.Language).HasColumnName("Language");
        entity.Property(e => e.Currency).HasColumnName("Currency");
        entity.Property(e => e.CustomDomainConfigured).HasColumnName("CustomDomainConfigured");

        entity.HasIndex(e => e.Slug).IsUnique();
        entity.HasIndex(e => e.SchemaName).IsUnique();
      });
    }
  }
}
