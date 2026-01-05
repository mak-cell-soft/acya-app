using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class QuantityMovementConfiguration : IEntityTypeConfiguration<QuantityMovement>
    {
        public void Configure(EntityTypeBuilder<QuantityMovement> entity)
        {
            entity.ToTable("tbl_quantity_mouvements");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.LengthIds).HasColumnName("lengthids");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");

            // Foreign key should point to DocumentMerchandise, not Merchandise
            entity.Property(e => e.DocumentMerchandiseId).HasColumnName("document_merchandise_id");

            // Relationship
            entity.HasOne(qm => qm.DocumentMerchandise)
                .WithOne(dm => dm.QuantityMovements)
                .HasForeignKey<QuantityMovement>(qm => qm.DocumentMerchandiseId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
