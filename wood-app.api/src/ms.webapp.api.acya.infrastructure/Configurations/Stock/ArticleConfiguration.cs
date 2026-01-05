using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class ArticleConfiguration : IEntityTypeConfiguration<Article>
    {
        public void Configure(EntityTypeBuilder<Article> entity)
        {
            entity.ToTable("tbl_article");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsWood).HasColumnName("iswood");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.MinQuantity).HasColumnName("minquantity");
            entity.Property(e => e.Unit).HasColumnName("unit");
            entity.Property(e => e.SellPriceHT).HasColumnName("sellprice_ht");
            entity.Property(e => e.SellPriceTTC).HasColumnName("sellprice_ttc");
            entity.Property(e => e.LastPurchasePriceTTC).HasColumnName("lastpurchaseprice_ttc");
            entity.Property(e => e.ProfitMarginPercentage).HasColumnName("profitmarginpercentage");
            entity.Property(e => e.Lengths).HasColumnName("lengths");

            entity.Property(e => e.TvaId).HasColumnName("idtva");
            entity.Property(e => e.ParentId).HasColumnName("idcategory");
            entity.Property(e => e.FirstChildId).HasColumnName("idsubcategory");
            entity.Property(e => e.UpdatedBy).HasColumnName("idappuser");
            entity.Property(e => e.ThicknessId).HasColumnName("idthickness");
            entity.Property(e => e.WidthId).HasColumnName("idwidth");
            entity.Property(e => e.SellHistoryId).HasColumnName("idsellhistory");

            entity.HasOne(e => e.TVAs).WithMany().HasForeignKey(e => e.TvaId);
            entity.HasOne(e => e.Parents).WithMany().HasForeignKey(e => e.ParentId);
            entity.HasOne(e => e.FirstChildren).WithMany().HasForeignKey(e => e.FirstChildId);
            entity.HasOne(e => e.AppUsers).WithMany().HasForeignKey(e => e.UpdatedBy);
            entity.HasOne(e => e.Thicknesses).WithMany().HasForeignKey(e => e.ThicknessId).IsRequired(false);
            entity.HasOne(e => e.Widths).WithMany().HasForeignKey(e => e.WidthId).IsRequired(false);
            entity.HasOne(e => e.SellHistories).WithMany().HasForeignKey(e => e.SellHistoryId);
        }
    }
}
