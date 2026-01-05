using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
    public class TransporterConfiguration : IEntityTypeConfiguration<Transporter>
    {
        public void Configure(EntityTypeBuilder<Transporter> entity)
        {
            entity.ToTable("tbl_transporter");

            // Properties
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FirstName).HasColumnName("firstname");
            entity.Property(e => e.LastName).HasColumnName("lastname");
            entity.Property(e => e.FullName).HasColumnName("fullname");
            //entity.Property(e => e.VehicleId).HasColumnName("vehicleid");

            // Explicitly configure the FK property
            entity.Property(e => e.VehicleId)
                  .HasColumnName("vehicleid")
                  .IsRequired(false); // If it's nullable

            // Relationships
            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("fk_tbl_transporter_tbl_vehicle");
        }
    }
}
