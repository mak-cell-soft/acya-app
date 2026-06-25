using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class MasterAuditLogConfiguration : IEntityTypeConfiguration<MasterAuditLog>
    {
        public void Configure(EntityTypeBuilder<MasterAuditLog> builder)
        {
            builder.ToTable("bo_tbl_master_audit_logs");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Action)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Details);

            builder.Property(x => x.PerformedBy)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Timestamp)
                .HasDefaultValueSql("NOW()");

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
