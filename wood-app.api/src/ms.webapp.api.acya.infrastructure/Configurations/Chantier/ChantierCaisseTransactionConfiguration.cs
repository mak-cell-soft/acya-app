using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierCaisseTransactionConfiguration : IEntityTypeConfiguration<ChantierCaisseTransaction>
  {
    public void Configure(EntityTypeBuilder<ChantierCaisseTransaction> entity)
    {
      entity.ToTable("chantier_caisse_transactions");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.Type).HasColumnName("Type").HasConversion<short>().IsRequired();
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.Amount).HasColumnName("Amount").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.TransactionDate).HasColumnName("TransactionDate").IsRequired();
      entity.Property(e => e.Reason).HasColumnName("Reason").HasMaxLength(300).IsRequired();
      entity.Property(e => e.Reference).HasColumnName("Reference").HasMaxLength(100);
      entity.Property(e => e.BeneficiaryPersonId).HasColumnName("BeneficiaryPersonId");
      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.ValidatedById).HasColumnName("ValidatedById");
      entity.Property(e => e.ValidationDate).HasColumnName("ValidationDate");
      entity.Property(e => e.Notes).HasColumnName("Notes");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      entity.HasOne(e => e.Chantier)
        .WithMany()
        .HasForeignKey(e => e.ChantierId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(e => e.BeneficiaryPerson)
        .WithMany()
        .HasForeignKey(e => e.BeneficiaryPersonId)
        .OnDelete(DeleteBehavior.SetNull);

      entity.HasIndex(e => new { e.ChantierId, e.Status, e.IsDeleted });
      entity.HasIndex(e => new { e.ChantierId, e.TransactionDate });
    }
  }
}
