using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionInputConfiguration : IEntityTypeConfiguration<ProductionInput>
  {
    public void Configure(EntityTypeBuilder<ProductionInput> entity)
    {
      entity.ToTable("production_inputs");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.ProductionStepId).HasColumnName("ProductionStepId").IsRequired();
      entity.Property(e => e.MerchandiseId).HasColumnName("MerchandiseId").IsRequired();
      entity.Property(e => e.MerchandiseRef).HasColumnName("MerchandiseRef").HasMaxLength(100);
      entity.Property(e => e.MerchandiseDesignation).HasColumnName("MerchandiseDesignation").HasMaxLength(255);
      entity.Property(e => e.Unit).HasColumnName("Unit").HasMaxLength(50);
      entity.Property(e => e.PlannedQuantity).HasColumnName("PlannedQuantity").IsRequired();
      entity.Property(e => e.ActualQuantity).HasColumnName("ActualQuantity");
      entity.Property(e => e.UnitCost).HasColumnName("UnitCost").HasPrecision(18, 3);
      entity.Property(e => e.TotalCost).HasColumnName("TotalCost").HasPrecision(18, 3);

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();

      // Relation to Merchandise
      entity.HasOne(e => e.Merchandise)
            .WithMany()
            .HasForeignKey(e => e.MerchandiseId)
            .OnDelete(DeleteBehavior.Restrict);

      entity.HasIndex(e => e.ProductionStepId);
      entity.HasIndex(e => e.MerchandiseId);
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
