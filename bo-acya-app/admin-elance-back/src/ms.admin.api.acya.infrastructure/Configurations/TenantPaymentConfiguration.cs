using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class TenantPaymentConfiguration : IEntityTypeConfiguration<TenantPayment>
    {
        public void Configure(EntityTypeBuilder<TenantPayment> builder)
        {
            builder.ToTable("bo_tbl_tenant_payments");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Amount)
                .HasColumnType("numeric(18,2)")
                .IsRequired();

            builder.Property(x => x.PaymentMethod)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.TransactionId)
                .HasMaxLength(100);

            builder.Property(x => x.Status)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.PaymentDate)
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Invoice)
                .WithMany()
                .HasForeignKey(x => x.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
