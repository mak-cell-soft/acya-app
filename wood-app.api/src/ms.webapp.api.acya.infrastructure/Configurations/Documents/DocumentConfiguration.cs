using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class DocumentConfiguration : IEntityTypeConfiguration<Document>
    {
        public void Configure(EntityTypeBuilder<Document> entity)
        {
            entity.ToTable("tbl_document");

            // Properties
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.StockTransactionType).HasColumnName("stocktransactiontype");
            entity.Property(e => e.DocNumber).HasColumnName("docnumber");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.SupplierReference).HasColumnName("supplierreference");
            entity.Property(e => e.IsInvoiced).HasColumnName("isinvoiced");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.WithHoldingTax).HasColumnName("withholdingtax");
            entity.Property(e => e.DocStatus).HasColumnName("docstatus");
            // Cost Doc Details
            entity.Property(e => e.TotalCostHTNetDoc).HasColumnName("totalcostpriceht");
            entity.Property(e => e.TotalCostNetTTCDoc).HasColumnName("totalcostpricettc");
            entity.Property(e => e.TotalCostTvaDoc).HasColumnName("totalcosttva");
            entity.Property(e => e.TotalCostDiscountDoc).HasColumnName("totalcostdiscount");
            // End Cost Doc Details
            entity.Property(e => e.HoldingTaxId).HasColumnName("holdingtaxid");
            entity.Property(e => e.TaxeId).HasColumnName("taxeid");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");
            entity.Property(e => e.CounterPartId).HasColumnName("counterpartid");
            entity.Property(e => e.SalesSiteId).HasColumnName("salessiteid");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted").HasDefaultValue(false);

            // Relationships
            entity.HasOne(e => e.AppUsers) // Navigation property to AppUser
                  .WithMany()              // Assuming no inverse navigation property
                  .HasForeignKey(e => e.UpdatedById)
                  .OnDelete(DeleteBehavior.Restrict) // Prevent cascade delete
                  .HasConstraintName("fk_tbl_document_tbl_app_user");
            // Holding Tax Relationship
            entity.HasOne(e => e.HoldingTaxes)
                  .WithMany()
                  .HasForeignKey(e => e.HoldingTaxId)
                  .OnDelete(DeleteBehavior.SetNull) // Ensure this matches your database constraint
                  .HasConstraintName("fk_tbl_document_tbl_holding_tax");

            // CounterPart Relationship
            entity.HasOne(e => e.CounterPart)
                  .WithMany()
                  .HasForeignKey(e => e.CounterPartId);

            entity.HasOne(e => e.SalesSite)
                  .WithMany()
                  .HasForeignKey(e => e.SalesSiteId);

            entity.HasOne(e => e.Taxes)
                  .WithMany()
                  .HasForeignKey(e => e.TaxeId);
        }
    }
}
