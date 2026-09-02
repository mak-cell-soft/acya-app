using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierMaterialConsumptionConfiguration : IEntityTypeConfiguration<ChantierMaterialConsumption>
  {
    public void Configure(EntityTypeBuilder<ChantierMaterialConsumption> entity)
    {
      entity.ToTable("chantier_material_consumptions");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.MerchandiseId).HasColumnName("MerchandiseId").IsRequired();
      entity.Property(e => e.SourceStockMovementId).HasColumnName("SourceStockMovementId");
      entity.Property(e => e.ChantierTaskId).HasColumnName("ChantierTaskId");
      entity.Property(e => e.ConsumedQty).HasColumnName("ConsumedQty").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.Unit).HasColumnName("Unit").HasMaxLength(50).IsRequired();
      entity.Property(e => e.Notes).HasColumnName("Notes");
      entity.Property(e => e.ConsumedAt).HasColumnName("ConsumedAt").IsRequired();
      entity.Property(e => e.RecordedById).HasColumnName("RecordedById").IsRequired();

      entity.HasOne(e => e.Merchandise)
            .WithMany()
            .HasForeignKey(e => e.MerchandiseId)
            .OnDelete(DeleteBehavior.Restrict);

      entity.HasOne(e => e.ChantierTask)
            .WithMany()
            .HasForeignKey(e => e.ChantierTaskId)
            .OnDelete(DeleteBehavior.SetNull);

      entity.HasIndex(e => e.ChantierId);
      entity.HasIndex(e => e.MerchandiseId);
    }
  }
}
