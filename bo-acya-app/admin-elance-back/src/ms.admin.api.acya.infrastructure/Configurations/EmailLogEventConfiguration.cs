using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class EmailLogEventConfiguration : IEntityTypeConfiguration<EmailLogEvent>
    {
        public void Configure(EntityTypeBuilder<EmailLogEvent> builder)
        {
            builder.ToTable("bo_tbl_email_log_events");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("id");
            builder.Property(x => x.EmailLogId).HasColumnName("email_log_id");
            builder.Property(x => x.EventId).HasColumnName("event_id").HasMaxLength(255).IsRequired();
            builder.Property(x => x.EventType).HasColumnName("event_type").HasMaxLength(50).IsRequired();
            builder.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            builder.Property(x => x.Timestamp).HasColumnName("timestamp");
            builder.Property(x => x.Reason).HasColumnName("reason");
            builder.Property(x => x.Severity).HasColumnName("severity").HasMaxLength(50);
            builder.Property(x => x.Code).HasColumnName("code");
            builder.Property(x => x.Description).HasColumnName("description");
            builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            builder.HasIndex(x => x.EventId)
                .IsUnique()
                .HasDatabaseName("idx_bo_tbl_email_log_events_event_id");

            builder.HasOne(x => x.EmailLog)
                .WithMany(x => x.Events)
                .HasForeignKey(x => x.EmailLogId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
