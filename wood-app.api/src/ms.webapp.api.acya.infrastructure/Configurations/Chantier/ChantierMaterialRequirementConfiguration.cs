using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierMaterialRequirementConfiguration : IEntityTypeConfiguration<ChantierMaterialRequirement>
  {
    public void Configure(EntityTypeBuilder<ChantierMaterialRequirement> entity)
    {
      entity.ToTable("chantier_material_requirements");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.MerchandiseId).HasColumnName("MerchandiseId").IsRequired();
      entity.Property(e => e.MerchandiseRef).HasColumnName("MerchandiseRef").HasMaxLength(100).IsRequired();
      entity.Property(e => e.MerchandiseDesignation).HasColumnName("MerchandiseDesignation").HasMaxLength(500).IsRequired();
      entity.Property(e => e.Category).HasColumnName("Category").HasMaxLength(100).IsRequired();
      entity.Property(e => e.MaterialType).HasColumnName("MaterialType").HasMaxLength(50).IsRequired();
      entity.Property(e => e.RequiredQty).HasColumnName("RequiredQty").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.Unit).HasColumnName("Unit").HasMaxLength(50).IsRequired();
      entity.Property(e => e.MinimumQty).HasColumnName("MinimumQty").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      entity.HasOne(e => e.Merchandise)
            .WithMany()
            .HasForeignKey(e => e.MerchandiseId)
            .OnDelete(DeleteBehavior.Restrict);

      entity.HasIndex(e => new { e.ChantierId, e.IsDeleted });
    }
  }
}
