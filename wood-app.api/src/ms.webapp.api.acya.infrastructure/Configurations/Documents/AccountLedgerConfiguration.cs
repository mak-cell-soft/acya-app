using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class AccountLedgerConfiguration : IEntityTypeConfiguration<AccountLedger>
    {
        public void Configure(EntityTypeBuilder<AccountLedger> entity)
        {
            // Added Recently
            entity.ToTable("tbl_account_ledger");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CounterPartId).HasColumnName("counterpartid");
            entity.Property(e => e.TransactionDate).HasColumnName("transactiondate");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.RelatedId).HasColumnName("relatedid");
            entity.Property(e => e.Debit).HasColumnName("debit");
            entity.Property(e => e.Credit).HasColumnName("credit");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("createdat");
            entity.Property(e => e.UpdatedAt).HasColumnName("updatedat");

            // Relationships
            entity.HasOne(e => e.CounterPart)
                .WithMany()
                .HasForeignKey(e => e.CounterPartId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
