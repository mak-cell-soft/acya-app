using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class MerchandiseConfiguration : IEntityTypeConfiguration<Merchandise>
    {
        public void Configure(EntityTypeBuilder<Merchandise> entity)
        {
            entity.ToTable("tbl_merchandise");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PackageReference).HasColumnName("packagereference");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsInvoicible).HasColumnName("isinvoicible");
            entity.Property(e => e.AllowNegativStock).HasColumnName("allownegativstock");
            entity.Property(e => e.IsMergedWith).HasColumnName("ismergedwith");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.ArticleId).HasColumnName("articleid");
            entity.Property(e => e.IdMergedMerchandise).HasColumnName("idmergedmerchandise");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");

            entity.HasOne(e => e.AppUsers)
               .WithMany()
               .HasForeignKey(e => e.UpdatedById);

            entity.HasOne(e => e.Articles)
                  .WithMany()
                  .HasForeignKey(e => e.ArticleId)
                  .OnDelete(DeleteBehavior.Restrict); // Prevent cascading delete
        }
    }
}
