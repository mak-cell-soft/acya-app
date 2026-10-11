using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class InboundQuoteRequestConfiguration : IEntityTypeConfiguration<InboundQuoteRequest>
    {
        public void Configure(EntityTypeBuilder<InboundQuoteRequest> builder)
        {
            builder.ToTable("tbl_inbound_quote_requests");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.TrackingNumber).HasColumnName("TrackingNumber").HasMaxLength(50).IsRequired();
            builder.Property(e => e.Product).HasColumnName("Product").HasMaxLength(255).IsRequired();
            builder.Property(e => e.Quantity).HasColumnName("Quantity").HasMaxLength(100).IsRequired();
            builder.Property(e => e.CustomerName).HasColumnName("CustomerName").HasMaxLength(150).IsRequired();
            builder.Property(e => e.CustomerEmail).HasColumnName("CustomerEmail").HasMaxLength(150).IsRequired();
            builder.Property(e => e.CustomerPhone).HasColumnName("CustomerPhone").HasMaxLength(50);
            builder.Property(e => e.Message).HasColumnName("Message").HasMaxLength(2000);
            builder.Property(e => e.Source).HasColumnName("Source").HasMaxLength(100).IsRequired();
            builder.Property(e => e.IdempotencyKey).HasColumnName("IdempotencyKey").HasMaxLength(100).IsRequired();

            // Lease and delivery status
            builder.Property(e => e.EnterpriseStatus).HasColumnName("EnterpriseStatus").HasConversion<int>().IsRequired();
            builder.Property(e => e.EnterpriseLeaseExpiresAt).HasColumnName("EnterpriseLeaseExpiresAt");
            builder.Property(e => e.EnterpriseMessageId).HasColumnName("EnterpriseMessageId").HasMaxLength(150);
            builder.Property(e => e.EnterpriseRetryCount).HasColumnName("EnterpriseRetryCount").IsRequired();

            builder.Property(e => e.CustomerStatus).HasColumnName("CustomerStatus").HasConversion<int>().IsRequired();
            builder.Property(e => e.CustomerLeaseExpiresAt).HasColumnName("CustomerLeaseExpiresAt");
            builder.Property(e => e.CustomerMessageId).HasColumnName("CustomerMessageId").HasMaxLength(150);
            builder.Property(e => e.CustomerRetryCount).HasColumnName("CustomerRetryCount").IsRequired();

            builder.Property(e => e.NextRetryAt).HasColumnName("NextRetryAt");
            builder.Property(e => e.LastError).HasColumnName("LastError").HasMaxLength(1000);
            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt").IsRequired();
            builder.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired();

            // Unique index for IdempotencyKey within the tenant schema
            builder.HasIndex(e => e.IdempotencyKey)
                .HasDatabaseName("idx_tbl_inbound_quote_requests_idempotency_key")
                .IsUnique();

            // Unique index for TrackingNumber
            builder.HasIndex(e => e.TrackingNumber)
                .HasDatabaseName("idx_tbl_inbound_quote_requests_tracking_number")
                .IsUnique();

            // Indexes for recovery worker queries
            builder.HasIndex(e => new { e.EnterpriseStatus, e.EnterpriseRetryCount, e.NextRetryAt })
                .HasDatabaseName("idx_tbl_inbound_quote_requests_enterprise_status");

            builder.HasIndex(e => new { e.CustomerStatus, e.CustomerRetryCount, e.NextRetryAt })
                .HasDatabaseName("idx_tbl_inbound_quote_requests_customer_status");
        }
    }
}
