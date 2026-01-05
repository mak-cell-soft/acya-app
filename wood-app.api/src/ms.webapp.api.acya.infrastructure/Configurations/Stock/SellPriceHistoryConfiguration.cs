using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class SellPriceHistoryConfiguration : IEntityTypeConfiguration<SellPriceHistory>
    {
        public void Configure(EntityTypeBuilder<SellPriceHistory> entity)
        {
            entity.ToTable("tbl_sell_history");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PriceValue).HasColumnName("pricevalue");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.ArticleId).HasColumnName("idarticle");
            entity.Property(e => e.UpdatedBy).HasColumnName("idappuser");
        }
    }
}
