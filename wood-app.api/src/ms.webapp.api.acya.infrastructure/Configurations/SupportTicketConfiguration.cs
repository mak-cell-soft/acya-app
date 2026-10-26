using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class SupportTicketConfiguration : IEntityTypeConfiguration<SupportTicket>
    {
        public void Configure(EntityTypeBuilder<SupportTicket> builder)
        {
            builder.ToTable("tbl_support_tickets");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.TicketReference).HasColumnName("TicketReference").HasMaxLength(50).IsRequired();
            builder.Property(e => e.UserId).HasColumnName("UserId").IsRequired();
            builder.Property(e => e.UserFullName).HasColumnName("UserFullName").HasMaxLength(150).IsRequired();
            builder.Property(e => e.UserEmail).HasColumnName("UserEmail").HasMaxLength(150).IsRequired();
            builder.Property(e => e.EnterpriseName).HasColumnName("EnterpriseName").HasMaxLength(200).IsRequired();
            builder.Property(e => e.TenantSlug).HasColumnName("TenantSlug").HasMaxLength(100).IsRequired();

            builder.Property(e => e.Category).HasColumnName("Category").HasMaxLength(100).IsRequired();
            builder.Property(e => e.Subcategory).HasColumnName("Subcategory").HasMaxLength(150).IsRequired();
            builder.Property(e => e.Priority).HasColumnName("Priority").HasMaxLength(50).IsRequired();

            builder.Property(e => e.Subject).HasColumnName("Subject").HasMaxLength(255).IsRequired();
            builder.Property(e => e.Description).HasColumnName("Description").IsRequired();

            builder.Property(e => e.CurrentRoute).HasColumnName("CurrentRoute").HasMaxLength(255);
            builder.Property(e => e.AppVersion).HasColumnName("AppVersion").HasMaxLength(50);
            builder.Property(e => e.ContextData).HasColumnName("ContextData");

            builder.Property(e => e.AttachmentFileName).HasColumnName("AttachmentFileName").HasMaxLength(255);
            builder.Property(e => e.AttachmentContentType).HasColumnName("AttachmentContentType").HasMaxLength(100);
            builder.Property(e => e.AttachmentStoragePath).HasColumnName("AttachmentStoragePath").HasMaxLength(500);
            builder.Property(e => e.AttachmentSizeBytes).HasColumnName("AttachmentSizeBytes");

            builder.Property(e => e.IdempotencyKey).HasColumnName("IdempotencyKey").HasMaxLength(100);

            builder.Property(e => e.EmailStatus).HasColumnName("EmailStatus").HasConversion<int>().IsRequired();
            builder.Property(e => e.EmailError).HasColumnName("EmailError").HasMaxLength(1000);

            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt").IsRequired();
            builder.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired();

            // Indexes
            builder.HasIndex(e => e.TicketReference)
                .HasDatabaseName("idx_tbl_support_tickets_reference")
                .IsUnique();

            builder.HasIndex(e => new { e.TenantSlug, e.UserId, e.CreatedAt })
                .HasDatabaseName("idx_tbl_support_tickets_tenant_user");

            builder.HasIndex(e => e.IdempotencyKey)
                .HasDatabaseName("idx_tbl_support_tickets_idempotency");
        }
    }
}
