using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class ListOfLengthConfiguration : IEntityTypeConfiguration<ListOfLength>
    {
        public void Configure(EntityTypeBuilder<ListOfLength> entity)
        {
            entity.ToTable("tbl_list_of_lengths");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.NumberOfPieces).HasColumnName("numberofpieces");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.Property(e => e.AppVarLengthId).HasColumnName("lengthappvarid");
            entity.Property(e => e.QuantityMovementId).HasColumnName("quantitymouvementid");

            entity.HasOne(e => e.AppVarLength)
            .WithMany()
            .HasForeignKey(e => e.AppVarLengthId)
            .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.QuantityMovements)
                .WithMany(q => q.ListOfLengths)  // Ensure `ListOfLengths` exists in `QuantityMovement`
                .HasForeignKey(e => e.QuantityMovementId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
