using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class StockTransferConfiguration : IEntityTypeConfiguration<StockTransfer>
    {
        public void Configure(EntityTypeBuilder<StockTransfer> entity)
        {
            entity.ToTable("tbl_stock_transfer");

            // Primary key
            entity.Property(e => e.Id).HasColumnName("id");
            // Document relationships
            entity.Property(e => e.ExitDocumentId).HasColumnName("exitdocumentid");
            entity.Property(e => e.ReceiptDocumentId).HasColumnName("receiptdocumentid");
            // Transfer details
            entity.Property(e => e.TransferDate).HasColumnName("transferdate");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Notes).HasColumnName("notes");
            // Transporter (optional)
            entity.Property(e => e.TransporterId).HasColumnName("transporterid");
            // Audit fields
            entity.Property(e => e.CreatedById).HasColumnName("createdbyid");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate")
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");
            // Transfer Confirmation
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.ConfirmedById).HasColumnName("confirmedbyid");
            entity.Property(e => e.ConfirmationDate).HasColumnName("confirmationdate");
            entity.Property(e => e.RejectionReason).HasColumnName("rejectionreason");
            entity.Property(e => e.ConfirmationCode)
                  .HasColumnName("confirmationcode")
                  .HasMaxLength(10);
            // Relationships
            entity.HasOne(e => e.ExitDocument)
                  .WithMany()
                  .HasForeignKey(e => e.ExitDocumentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReceiptDocument)
                  .WithMany()
                  .HasForeignKey(e => e.ReceiptDocumentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Transporter)
                  .WithMany()
                  .HasForeignKey(e => e.TransporterId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedBy)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);

            // Indexes
            entity.HasIndex(e => e.TransferDate)
                  .HasDatabaseName("ix_tbl_stock_transfer_transferdate");

            entity.HasIndex(e => e.Reference)
                  .HasDatabaseName("ix_tbl_stock_transfer_reference")
                  .HasFilter("reference IS NOT NULL");
        }
    }
}
