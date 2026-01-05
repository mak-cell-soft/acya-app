using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Organization
{
    public class SalesSiteConfiguration : IEntityTypeConfiguration<SalesSite>
    {
        public void Configure(EntityTypeBuilder<SalesSite> entity)
        {
            entity.ToTable("tbl_sales_sites");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IsForSale).HasColumnName("isforsale");
            entity.Property(e => e.Gouvernorate).HasColumnName("gouvernorate");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.CodePost).HasColumnName("codepost");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");

            entity.Property(e => e.EnterpriseId).HasColumnName("enterpriseid");

            entity.HasOne(e => e.Enterprise)
                  .WithMany(e => e.Sites)
                  .HasForeignKey(e => e.EnterpriseId);
        }
    }
}
