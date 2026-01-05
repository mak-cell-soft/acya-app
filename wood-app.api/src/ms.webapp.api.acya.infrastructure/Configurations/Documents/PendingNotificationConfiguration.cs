using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class PendingNotificationConfiguration : IEntityTypeConfiguration<PendingNotification>
    {
        public void Configure(EntityTypeBuilder<PendingNotification> entity)
        {
            entity.ToTable("tbl_pending_notification");

            // Primary key
            entity.Property(e => e.Id).HasColumnName("id");

            // Document relationships
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.TargetGroup).HasColumnName("targetgroup").IsRequired().HasMaxLength(100);

            // Transfer details
            entity.Property(e => e.Status).HasColumnName("status").IsRequired();
            entity.Property(e => e.RetryCount).HasColumnName("retry_count").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.LastAttemptAt).HasColumnName("last_attempt_at");
            entity.Property(e => e.DeliveredAt).HasColumnName("delivered_at");
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message").HasMaxLength(500);

            // Index
            entity.HasIndex(p => new { p.TargetGroup, p.Status });
        }
    }
}
