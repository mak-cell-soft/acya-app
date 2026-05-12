using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Treasury
{
    public class CaisseMovementConfiguration : IEntityTypeConfiguration<CaisseMovement>
    {
        public void Configure(EntityTypeBuilder<CaisseMovement> entity)
        {
            entity.ToTable("tbl_caisse_movements");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SalesSiteId).HasColumnName("SalesSiteId");
            entity.Property(e => e.MovementDate).HasColumnName("MovementDate");
            entity.Property(e => e.Type).HasColumnName("Type");
            entity.Property(e => e.Reason).HasColumnName("Reason");
            entity.Property(e => e.Amount).HasColumnName("Amount");
            entity.Property(e => e.Reference).HasColumnName("Reference");
            entity.Property(e => e.Notes).HasColumnName("Notes");
            entity.Property(e => e.BankDepositId).HasColumnName("BankDepositId");
            entity.Property(e => e.PaymentId).HasColumnName("PaymentId");
            entity.Property(e => e.CreatedByUserId).HasColumnName("CreatedByUserId");
            entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
            entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted");
            
            entity.Ignore(e => e.CreatedBy);
            entity.Ignore(e => e.UpdatedAt);

            entity.HasOne(e => e.SalesSite)
                .WithMany()
                .HasForeignKey(e => e.SalesSiteId);

            entity.HasOne(e => e.BankDeposit)
                .WithMany()
                .HasForeignKey(e => e.BankDepositId);

            entity.HasOne(e => e.Payment)
                .WithMany()
                .HasForeignKey(e => e.PaymentId);
        }
    }
}
