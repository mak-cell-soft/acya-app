using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Treasury
{
    public class BankTransactionConfiguration : IEntityTypeConfiguration<BankTransaction>
    {
        public void Configure(EntityTypeBuilder<BankTransaction> builder)
        {
            builder.ToTable("tbl_bank_transaction");
            
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Debit)
                .HasColumnType("decimal(18, 3)");

            builder.Property(x => x.Credit)
                .HasColumnType("decimal(18, 3)");

            builder.HasOne(x => x.AppUser)
                .WithMany()
                .HasForeignKey(x => x.UpdatedBy)
                .IsRequired(false);

            builder.HasOne(x => x.Bank)
                .WithMany()
                .HasForeignKey(x => x.BankId)
                .IsRequired(true);
        }
    }
}
