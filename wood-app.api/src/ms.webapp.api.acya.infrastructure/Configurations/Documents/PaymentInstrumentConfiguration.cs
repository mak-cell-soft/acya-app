using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class PaymentInstrumentConfiguration : IEntityTypeConfiguration<PaymentInstrument>
    {
        public void Configure(EntityTypeBuilder<PaymentInstrument> entity)
        {
            entity.ToTable("tbl_payment_instrument");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PaymentId).HasColumnName("paymentid");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20).HasDefaultValue("TRAITE");
            entity.Property(e => e.InstrumentNumber).HasColumnName("instrumentnumber").HasMaxLength(100);
            entity.Property(e => e.Bank).HasColumnName("bank").HasMaxLength(200);
            entity.Property(e => e.Owner).HasColumnName("owner").HasMaxLength(200);
            entity.Property(e => e.Porter).HasColumnName("porter").HasMaxLength(200);
            entity.Property(e => e.IssueDate).HasColumnName("issuedate");
            entity.Property(e => e.DueDate).HasColumnName("duedate");
            entity.Property(e => e.ExpirationDate).HasColumnName("expirationdate");
            entity.Property(e => e.BankSettlementStatus).HasColumnName("banksettlementstatus").HasMaxLength(30).HasDefaultValue("PENDING");
            entity.Property(e => e.PaidAtBankDate).HasColumnName("paidatbankdate");
            entity.Property(e => e.IsPaidAtBank).HasColumnName("ispaidatbank").IsRequired().HasDefaultValue(false);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("createdat").HasDefaultValueSql("NOW()");
            entity.Property(e => e.CreatedBy).HasColumnName("createdby").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updatedat");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");

            // Relationships
            entity.HasOne(e => e.Payment)
                  .WithOne(p => p.PaymentInstrument)
                  .HasForeignKey<PaymentInstrument>(e => e.PaymentId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("fk_tbl_payment_instrument_tbl_payments");
        }
    }
}
