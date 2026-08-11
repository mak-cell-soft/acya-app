using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class EmailLogConfiguration : IEntityTypeConfiguration<EmailLog>
    {
        public void Configure(EntityTypeBuilder<EmailLog> builder)
        {
            builder.ToTable("bo_tbl_email_logs");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("id");
            builder.Property(x => x.TenantId).HasColumnName("tenant_id");
            builder.Property(x => x.RegistrationId).HasColumnName("registration_id");
            builder.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(64);
            builder.Property(x => x.MessageId).HasColumnName("message_id").HasMaxLength(255);
            builder.Property(x => x.Recipient).HasColumnName("recipient").HasMaxLength(255).IsRequired();
            builder.Property(x => x.Template).HasColumnName("template").HasMaxLength(50).IsRequired();
            builder.Property(x => x.CurrentStatus).HasColumnName("current_status").HasMaxLength(50).IsRequired();
            builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            builder.HasIndex(x => x.MessageId).HasDatabaseName("idx_bo_tbl_email_logs_message_id");
            builder.HasIndex(x => x.TenantId).HasDatabaseName("idx_bo_tbl_email_logs_tenant_id");

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
