using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class MobileReleaseConfiguration : IEntityTypeConfiguration<MobileRelease>
    {
        public void Configure(EntityTypeBuilder<MobileRelease> builder)
        {
            builder.ToTable("bo_tbl_mobile_releases", "public");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.TenantId).HasColumnName("TenantId").HasMaxLength(100).IsRequired();
            builder.Property(e => e.MobileBuildId).HasColumnName("MobileBuildId").IsRequired();
            builder.Property(e => e.Version).HasColumnName("Version").HasMaxLength(50).IsRequired();
            builder.Property(e => e.BuildNumber).HasColumnName("BuildNumber").IsRequired();
            builder.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).IsRequired();
            builder.Property(e => e.IsCurrent).HasColumnName("IsCurrent").IsRequired();
            builder.Property(e => e.PublishedAt).HasColumnName("PublishedAt").IsRequired();
            builder.Property(e => e.PublishedBy).HasColumnName("PublishedBy").HasMaxLength(200);
            builder.Property(e => e.ReleaseNotes).HasColumnName("ReleaseNotes");
            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt").IsRequired();
            builder.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt");

            builder.HasOne(e => e.MobileBuild)
                .WithMany()
                .HasForeignKey(e => e.MobileBuildId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(e => e.TenantId).HasDatabaseName("idx_bo_tbl_mobile_releases_tenant_id");
            builder.HasIndex(e => e.MobileBuildId).HasDatabaseName("idx_bo_tbl_mobile_releases_build_id");
            builder.HasIndex(e => new { e.TenantId, e.IsCurrent }).HasDatabaseName("idx_bo_tbl_mobile_releases_tenant_current");

            // Strictly enforce ONE current release per tenant
            builder.HasIndex(e => e.TenantId)
                .HasDatabaseName("uq_bo_tbl_mobile_releases_current_tenant")
                .HasFilter("\"IsCurrent\" = TRUE")
                .IsUnique();
        }
    }
}
