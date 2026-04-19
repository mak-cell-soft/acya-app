using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Product
{
    public class PurchasePriceHistoryConfiguration : IEntityTypeConfiguration<PurchasePriceHistory>
    {
        public void Configure(EntityTypeBuilder<PurchasePriceHistory> entity)
        {
            entity.ToTable("tbl_purchase_price_history");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ArticleId).HasColumnName("idarticle");
            entity.Property(e => e.CounterPartId).HasColumnName("idcounterpart");
            entity.Property(e => e.PriceValue).HasColumnName("pricevalue").IsRequired();
            entity.Property(e => e.TransactionDate).HasColumnName("transactiondate").IsRequired();
            entity.Property(e => e.DocumentId).HasColumnName("iddocument");
            entity.Property(e => e.DocNumber).HasColumnName("docnumber").HasMaxLength(50);
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");

            entity.HasOne(e => e.Article)
                .WithMany(a => a.PurchasePriceHistories)
                .HasForeignKey(e => e.ArticleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.CounterPartId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Document)
                .WithMany()
                .HasForeignKey(e => e.DocumentId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
