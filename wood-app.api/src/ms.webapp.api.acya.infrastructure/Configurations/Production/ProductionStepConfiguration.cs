using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionStepConfiguration : IEntityTypeConfiguration<ProductionStep>
  {
    public void Configure(EntityTypeBuilder<ProductionStep> entity)
    {
      entity.ToTable("production_steps");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.ProductionOrderId).HasColumnName("ProductionOrderId").IsRequired();
      entity.Property(e => e.StepNumber).HasColumnName("StepNumber").IsRequired();
      entity.Property(e => e.Name).HasColumnName("Name").HasMaxLength(255).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.StartDate).HasColumnName("StartDate");
      entity.Property(e => e.EndDate).HasColumnName("EndDate");
      entity.Property(e => e.LaborCost).HasColumnName("LaborCost").HasPrecision(18, 3);
      entity.Property(e => e.OtherCost).HasColumnName("OtherCost").HasPrecision(18, 3);

      entity.Property(e => e.OutputMerchandiseId).HasColumnName("OutputMerchandiseId");
      entity.Property(e => e.PlannedOutputQuantity).HasColumnName("PlannedOutputQuantity").IsRequired();
      entity.Property(e => e.ActualOutputQuantity).HasColumnName("ActualOutputQuantity");

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");

      // Optional link to output merchandise (catalog)
      entity.HasOne(e => e.OutputMerchandise)
            .WithMany()
            .HasForeignKey(e => e.OutputMerchandiseId)
            .OnDelete(DeleteBehavior.SetNull);

      // Cascading relation with ProductionInput
      entity.HasMany(e => e.Inputs)
            .WithOne(i => i.ProductionStep)
            .HasForeignKey(i => i.ProductionStepId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(e => new { e.ProductionOrderId, e.StepNumber });
      entity.HasIndex(e => e.Status);
      entity.HasIndex(e => e.OutputMerchandiseId);
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
