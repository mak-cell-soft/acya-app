using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionOrderConfiguration : IEntityTypeConfiguration<ProductionOrder>
  {
    public void Configure(EntityTypeBuilder<ProductionOrder> entity)
    {
      entity.ToTable("production_orders");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.Reference).HasColumnName("Reference").HasMaxLength(50).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.Notes).HasColumnName("Notes");
      entity.Property(e => e.SalesSiteId).HasColumnName("SalesSiteId").IsRequired();
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.PlannedStartDate).HasColumnName("PlannedStartDate").IsRequired();
      entity.Property(e => e.PlannedEndDate).HasColumnName("PlannedEndDate");
      entity.Property(e => e.ActualStartDate).HasColumnName("ActualStartDate");
      entity.Property(e => e.ActualEndDate).HasColumnName("ActualEndDate");
      
      entity.Property(e => e.TotalMaterialCost).HasColumnName("TotalMaterialCost").HasPrecision(18, 3);
      entity.Property(e => e.TotalLaborCost).HasColumnName("TotalLaborCost").HasPrecision(18, 3);
      entity.Property(e => e.TotalOtherCost).HasColumnName("TotalOtherCost").HasPrecision(18, 3);
      entity.Property(e => e.TotalProductionCost).HasColumnName("TotalProductionCost").HasPrecision(18, 3);
      entity.Property(e => e.UnitProductionCost).HasColumnName("UnitProductionCost").HasPrecision(18, 3);

      entity.Property(e => e.PlannedOutputQuantity).HasColumnName("PlannedOutputQuantity").IsRequired();
      entity.Property(e => e.ActualOutputQuantity).HasColumnName("ActualOutputQuantity");

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      // Foreign key to SalesSite
      entity.HasOne(e => e.SalesSite)
            .WithMany()
            .HasForeignKey(e => e.SalesSiteId)
            .OnDelete(DeleteBehavior.Restrict);

      // Cascading relation with ProductionStep
      entity.HasMany(e => e.Steps)
            .WithOne(s => s.ProductionOrder)
            .HasForeignKey(s => s.ProductionOrderId)
            .OnDelete(DeleteBehavior.Cascade);

      // Indexes for performance
      entity.HasIndex(e => new { e.Status, e.IsDeleted });
      entity.HasIndex(e => e.SalesSiteId);
      entity.HasIndex(e => e.Guid).IsUnique();
      entity.HasIndex(e => e.Reference);
    }
  }
}
