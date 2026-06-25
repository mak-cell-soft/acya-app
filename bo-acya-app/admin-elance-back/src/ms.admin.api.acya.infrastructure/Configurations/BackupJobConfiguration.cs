using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class BackupJobConfiguration : IEntityTypeConfiguration<BackupJob>
    {
        public void Configure(EntityTypeBuilder<BackupJob> builder)
        {
            builder.ToTable("bo_tbl_backup_jobs");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Type)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.FilePath)
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.Property(x => x.CompletedAt);

            builder.Property(x => x.ErrorMessage);

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
