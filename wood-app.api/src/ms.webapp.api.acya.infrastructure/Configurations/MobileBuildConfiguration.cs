using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class MobileBuildConfiguration : IEntityTypeConfiguration<MobileBuild>
    {
        public void Configure(EntityTypeBuilder<MobileBuild> builder)
        {
            builder.ToTable("bo_tbl_mobile_builds", "public");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.TenantId).HasColumnName("TenantId").HasMaxLength(100).IsRequired();
            builder.Property(e => e.Version).HasColumnName("Version").HasMaxLength(50).IsRequired();
            builder.Property(e => e.BuildNumber).HasColumnName("BuildNumber").IsRequired();
            builder.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).IsRequired();
            builder.Property(e => e.ArtifactPath).HasColumnName("ArtifactPath").HasMaxLength(500);
            builder.Property(e => e.ArtifactSize).HasColumnName("ArtifactSize");
            builder.Property(e => e.Sha256).HasColumnName("Sha256").HasMaxLength(128);
            builder.Property(e => e.ReleaseNotes).HasColumnName("ReleaseNotes");
            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
            builder.Property(e => e.StartedAt).HasColumnName("StartedAt");
            builder.Property(e => e.CompletedAt).HasColumnName("CompletedAt");
            builder.Property(e => e.ErrorMessage).HasColumnName("ErrorMessage");
            builder.Property(e => e.CreatedBy).HasColumnName("CreatedBy").HasMaxLength(200);
            builder.Property(e => e.GitCommitHash).HasColumnName("GitCommitHash").HasMaxLength(100);
            builder.Property(e => e.GitBranch).HasColumnName("GitBranch").HasMaxLength(100);
            builder.Property(e => e.WorkflowRunId).HasColumnName("WorkflowRunId").HasMaxLength(100);
            builder.Property(e => e.IsActive).HasColumnName("IsActive");

            builder.HasIndex(e => e.TenantId).HasDatabaseName("idx_bo_tbl_mobile_builds_tenant_id");
            builder.HasIndex(e => new { e.TenantId, e.Status }).HasDatabaseName("idx_bo_tbl_mobile_builds_tenant_status");
            builder.HasIndex(e => new { e.TenantId, e.BuildNumber }).HasDatabaseName("idx_bo_tbl_mobile_builds_tenant_build");
            builder.HasIndex(e => e.TenantId)
                .HasDatabaseName("uq_bo_tbl_mobile_builds_active_tenant")
                .HasFilter("\"Status\" IN ('Pending', 'Building') AND \"IsActive\" = TRUE")
                .IsUnique();
        }
    }
}
