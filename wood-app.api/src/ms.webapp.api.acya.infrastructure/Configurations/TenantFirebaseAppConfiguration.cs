using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class TenantFirebaseAppConfiguration : IEntityTypeConfiguration<TenantFirebaseApp>
    {
        public void Configure(EntityTypeBuilder<TenantFirebaseApp> builder)
        {
            builder.ToTable("bo_tbl_tenant_firebase_apps", "public");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.TenantId).HasColumnName("TenantId").HasMaxLength(100).IsRequired();
            builder.Property(e => e.FirebaseProjectId).HasColumnName("FirebaseProjectId").HasMaxLength(100).IsRequired();
            builder.Property(e => e.FirebaseAppId).HasColumnName("FirebaseAppId").HasMaxLength(100);
            builder.Property(e => e.PackageName).HasColumnName("PackageName").HasMaxLength(200).IsRequired();
            builder.Property(e => e.DisplayName).HasColumnName("DisplayName").HasMaxLength(200).IsRequired();
            builder.Property(e => e.GoogleServicesJson).HasColumnName("GoogleServicesJson");
            builder.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).IsRequired();
            builder.Property(e => e.Sha1Fingerprint).HasColumnName("Sha1Fingerprint").HasMaxLength(100);
            builder.Property(e => e.Sha256Fingerprint).HasColumnName("Sha256Fingerprint").HasMaxLength(100);
            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
            builder.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt");

            // Constraints & Indexes
            builder.HasIndex(e => e.TenantId)
                .IsUnique()
                .HasDatabaseName("uq_bo_tbl_tenant_firebase_apps_tenant");

            builder.HasIndex(e => e.PackageName)
                .IsUnique()
                .HasDatabaseName("uq_bo_tbl_tenant_firebase_apps_package");

            builder.HasIndex(e => e.FirebaseProjectId)
                .HasDatabaseName("idx_bo_tbl_tenant_firebase_apps_project");

            builder.HasIndex(e => e.Status)
                .HasDatabaseName("idx_bo_tbl_tenant_firebase_apps_status");
        }
    }
}
