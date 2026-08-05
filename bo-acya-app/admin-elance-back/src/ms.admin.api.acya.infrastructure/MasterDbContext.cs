using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure.Configurations;

namespace ms.admin.api.acya.infrastructure
{
    public class MasterDbContext : DbContext
    {
        public MasterDbContext(DbContextOptions<MasterDbContext> options) : base(options)
        {
        }

        public DbSet<MasterEnterprise> Enterprises { get; set; } = null!;
        public DbSet<SuperAdminUser> SuperAdminUsers { get; set; } = null!;
        public DbSet<TenantSubscription> TenantSubscriptions { get; set; } = null!;
        public DbSet<TenantInvoice> TenantInvoices { get; set; } = null!;
        public DbSet<TenantPayment> TenantPayments { get; set; } = null!;
        public DbSet<MasterAuditLog> MasterAuditLogs { get; set; } = null!;
        public DbSet<BackupJob> BackupJobs { get; set; } = null!;
        public DbSet<PlatformSetting> PlatformSettings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.ApplyConfiguration(new MasterEnterpriseConfiguration());
            modelBuilder.ApplyConfiguration(new SuperAdminUserConfiguration());
            modelBuilder.ApplyConfiguration(new TenantSubscriptionConfiguration());
            modelBuilder.ApplyConfiguration(new TenantInvoiceConfiguration());
            modelBuilder.ApplyConfiguration(new TenantPaymentConfiguration());
            modelBuilder.ApplyConfiguration(new MasterAuditLogConfiguration());
            modelBuilder.ApplyConfiguration(new BackupJobConfiguration());

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
