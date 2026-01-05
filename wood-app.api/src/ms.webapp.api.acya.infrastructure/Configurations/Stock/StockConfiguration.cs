using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class StockConfiguration : IEntityTypeConfiguration<core.Entities.Stock>
    {
        public void Configure(EntityTypeBuilder<core.Entities.Stock> entity)
        {
            entity.ToTable("tbl_stock");

            // Properties
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.MerchandiseId).HasColumnName("idmerchandise");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");
            entity.Property(e => e.SalesSiteId).HasColumnName("idsite");
            
            // Concurrency Token
            entity.Property(e => e.RowVersion)
                  .HasColumnName("xmin") // For PostgreSQL system column
                  .HasColumnType("xid")
                  .IsRowVersion();

            // Relationships
            entity.HasOne(e => e.AppUsers)
                  .WithMany()
                  .HasForeignKey(e => e.UpdatedById)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_tbl_stock_tbl_app_user");

            entity.HasOne(e => e.SalesSites)
                  .WithMany()
                  .HasForeignKey(e => e.SalesSiteId);

            entity.HasOne(e => e.Merchandises)
                  .WithMany()
                  .HasForeignKey(e => e.MerchandiseId);
        }
    }
}
