using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
  public class DeliveryTrackingConfiguration : IEntityTypeConfiguration<DeliveryTracking>
  {
    public void Configure(EntityTypeBuilder<DeliveryTracking> entity)
    {
      entity.ToTable("tbl_delivery_tracking");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
      entity.Property(e => e.DocumentId).HasColumnName("document_id").IsRequired();
      entity.Property(e => e.VehicleId).HasColumnName("vehicle_id").IsRequired();
      entity.Property(e => e.TransporterId).HasColumnName("transporter_id");
      entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
      entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255);
      entity.Property(e => e.DriverName).HasColumnName("driver_name").HasMaxLength(255);
      entity.Property(e => e.DepartureDate).HasColumnName("departure_date").HasColumnType("timestamp with time zone").IsRequired();
      entity.Property(e => e.ReturnDate).HasColumnName("return_date").HasColumnType("timestamp with time zone");
      entity.Property(e => e.DeliveryAddress).HasColumnName("delivery_address");
      entity.Property(e => e.Status).HasColumnName("status").HasConversion<int>().HasDefaultValue(DeliveryTrackingStatus.InTransit).IsRequired();
      entity.Property(e => e.Notes).HasColumnName("notes");
      entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false).IsRequired();
      entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").IsRequired();
      entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("updated_by_id");

      // Relationships
      entity.HasOne(e => e.Document)
            .WithMany()
            .HasForeignKey(e => e.DocumentId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("fk_tbl_delivery_tracking_tbl_document");

      entity.HasOne(e => e.Vehicle)
            .WithMany()
            .HasForeignKey(e => e.VehicleId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_tbl_delivery_tracking_tbl_vehicle");

      entity.HasOne(e => e.Transporter)
            .WithMany()
            .HasForeignKey(e => e.TransporterId)
            .OnDelete(DeleteBehavior.SetNull)
            .HasConstraintName("fk_tbl_delivery_tracking_tbl_transporter");

      entity.HasOne(e => e.Customer)
            .WithMany()
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_tbl_delivery_tracking_tbl_counter_part");

      entity.HasOne(e => e.UpdatedBy)
            .WithMany()
            .HasForeignKey(e => e.UpdatedById)
            .OnDelete(DeleteBehavior.SetNull)
            .HasConstraintName("fk_tbl_delivery_tracking_tbl_app_user");

      // Indexes
      entity.HasIndex(e => e.DocumentId)
            .HasDatabaseName("idx_tbl_delivery_tracking_doc_active")
            .HasFilter("is_deleted = false")
            .IsUnique();

      entity.HasIndex(e => new { e.VehicleId, e.DepartureDate })
            .HasDatabaseName("idx_tbl_delivery_tracking_vehicle_date");

      entity.HasIndex(e => new { e.CustomerId, e.DepartureDate })
            .HasDatabaseName("idx_tbl_delivery_tracking_customer_date");

      entity.HasIndex(e => e.Status)
            .HasDatabaseName("idx_tbl_delivery_tracking_status")
            .HasFilter("is_deleted = false");
    }
  }
}

