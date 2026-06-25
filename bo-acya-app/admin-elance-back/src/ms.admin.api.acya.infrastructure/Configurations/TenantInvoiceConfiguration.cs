using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class TenantInvoiceConfiguration : IEntityTypeConfiguration<TenantInvoice>
    {
        public void Configure(EntityTypeBuilder<TenantInvoice> builder)
        {
            builder.ToTable("bo_tbl_tenant_invoices");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.InvoiceNumber)
                .HasMaxLength(100)
                .IsRequired();

            builder.HasIndex(x => x.InvoiceNumber)
                .IsUnique();

            builder.Property(x => x.Amount)
                .HasColumnType("numeric(18,2)")
                .IsRequired();

            builder.Property(x => x.Currency)
                .HasMaxLength(10)
                .IsRequired();

            builder.Property(x => x.Status)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.BillingDate)
                .IsRequired();

            builder.Property(x => x.DueDate)
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
