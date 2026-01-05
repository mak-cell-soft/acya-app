using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class DocumentMerchandiseConfiguration : IEntityTypeConfiguration<DocumentMerchandise>
    {
        public void Configure(EntityTypeBuilder<DocumentMerchandise> entity)
        {
            entity.ToTable("tbl_document_merchandise");

            // Primary key
            entity.Property(e => e.Id).HasColumnName("id");

            // Moved properties
            entity.Property(e => e.CreationDate).HasColumnName("creation_date");
            entity.Property(e => e.UpdateDate).HasColumnName("update_date");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UnitPriceHT).HasColumnName("unitprice_ht");
            entity.Property(e => e.CostHT).HasColumnName("cost_ht");
            entity.Property(e => e.DiscountPercentage).HasColumnName("discount_percentage");
            entity.Property(e => e.CostNetHT).HasColumnName("cost_net_ht");
            entity.Property(e => e.CostDiscountValue).HasColumnName("cost_discount_value");
            entity.Property(e => e.TvaValue).HasColumnName("tva_value");
            entity.Property(e => e.CostTTC).HasColumnName("cost_ttc");

            // Foreign keys
            entity.Property(e => e.DocumentId).HasColumnName("documentid");
            entity.Property(e => e.MerchandiseId).HasColumnName("merchandiseid");

            // Relationships
            entity.HasOne(dm => dm.Document)
                .WithMany(d => d.DocumentMerchandises)
                .HasForeignKey(dm => dm.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(dm => dm.Merchandise)
                .WithMany(m => m.DocumentMerchandises)
                .HasForeignKey(dm => dm.MerchandiseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Fix the relationship naming (remove the 's' from DocumentMerchandises)
            entity.HasOne(dm => dm.QuantityMovements)
                .WithOne(qm => qm.DocumentMerchandise)
                .HasForeignKey<QuantityMovement>(qm => qm.DocumentMerchandiseId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
