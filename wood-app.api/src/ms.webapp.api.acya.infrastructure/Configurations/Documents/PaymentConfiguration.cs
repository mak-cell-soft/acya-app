using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> entity)
        {
            entity.ToTable("tbl_payments");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DocumentId).HasColumnName("documentid");
            entity.Property(e => e.CustomerId).HasColumnName("customerid");
            entity.Property(e => e.PaymentDate).HasColumnName("paymentdate");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.PaymentMethod).HasColumnName("paymentmethod");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("createdat");
            entity.Property(e => e.CreatedBy).HasColumnName("createdby");
            entity.Property(e => e.UpdatedAt).HasColumnName("updatedat");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedbyid");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted").HasDefaultValue(false);

            // Relationships
            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_tbl_payments_tbl_document");

            entity.HasOne(e => e.Customer)
                  .WithMany()
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_tbl_payments_tbl_counter_part");

            entity.HasOne(e => e.AppUser)
                  .WithMany()
                  .HasForeignKey(e => e.UpdatedById)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_tbl_payments_tbl_app_user");
        }
    }
}
