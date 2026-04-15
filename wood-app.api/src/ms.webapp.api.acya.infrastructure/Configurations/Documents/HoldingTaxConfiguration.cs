using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class HoldingTaxConfiguration : IEntityTypeConfiguration<HoldingTax>
    {
        public void Configure(EntityTypeBuilder<HoldingTax> entity)
        {
            entity.ToTable("tbl_holding_tax");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.TaxPercentage).HasColumnName("taxpercentage");
            entity.Property(e => e.TaxValue).HasColumnName("taxvalue");
            entity.Property(e => e.isSigned).HasColumnName("issigned");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.NewAmountDocValue).HasColumnName("newamountdocvalue");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted").HasDefaultValue(false);
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");
            
            // AppUsers Relationship
            entity.HasOne(e => e.AppUsers)
                  .WithMany()
                  .HasForeignKey(e => e.UpdatedById)
                  .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
