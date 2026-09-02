using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierVehicleAssignmentConfiguration : IEntityTypeConfiguration<ChantierVehicleAssignment>
  {
    public void Configure(EntityTypeBuilder<ChantierVehicleAssignment> entity)
    {
      entity.ToTable("chantier_vehicle_assignments");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.VehicleId).HasColumnName("VehicleId").IsRequired();
      entity.Property(e => e.DriverPersonId).HasColumnName("DriverPersonId");
      entity.Property(e => e.AssignedAt).HasColumnName("AssignedAt").IsRequired();
      entity.Property(e => e.ReleasedAt).HasColumnName("ReleasedAt");
      entity.Property(e => e.IsActive).HasColumnName("IsActive").IsRequired();
      entity.Property(e => e.Notes).HasColumnName("Notes");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();

      entity.HasOne(e => e.Vehicle)
            .WithMany()
            .HasForeignKey(e => e.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(e => e.DriverPerson)
            .WithMany()
            .HasForeignKey(e => e.DriverPersonId)
            .OnDelete(DeleteBehavior.SetNull);

      entity.HasIndex(e => e.ChantierId);
      entity.HasIndex(e => e.VehicleId);
    }
  }
}
