using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Treasury
{
    public class BankDepositConfiguration : IEntityTypeConfiguration<BankDeposit>
    {
        public void Configure(EntityTypeBuilder<BankDeposit> entity)
        {
            entity.ToTable("tbl_bank_deposits");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BankId).HasColumnName("BankId");
            entity.Property(e => e.DepositDate).HasColumnName("DepositDate");
            entity.Property(e => e.DepositType).HasColumnName("DepositType");
            entity.Property(e => e.AmountHT).HasColumnName("AmountHT");
            entity.Property(e => e.FeeHT).HasColumnName("FeeHT");
            entity.Property(e => e.TaxRate).HasColumnName("TaxRate");
            entity.Property(e => e.FeeWithTax).HasColumnName("FeeWithTax");
            entity.Property(e => e.NetAmount).HasColumnName("NetAmount");
            entity.Property(e => e.Reference).HasColumnName("Reference");
            entity.Property(e => e.Notes).HasColumnName("Notes");
            entity.Property(e => e.PaymentInstrumentId).HasColumnName("PaymentInstrumentId");
            entity.Property(e => e.SalesSiteId).HasColumnName("SalesSiteId");
            entity.Property(e => e.CreatedByUserId).HasColumnName("CreatedByUserId");
            entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
            entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted");

            entity.Ignore(e => e.CreatedBy);
            entity.Ignore(e => e.UpdatedAt);

            entity.HasOne(e => e.Bank)
                .WithMany()
                .HasForeignKey(e => e.BankId);

            entity.HasOne(e => e.PaymentInstrument)
                .WithMany()
                .HasForeignKey(e => e.PaymentInstrumentId);

            entity.HasOne(e => e.SalesSite)
                .WithMany()
                .HasForeignKey(e => e.SalesSiteId);
        }
    }
}
