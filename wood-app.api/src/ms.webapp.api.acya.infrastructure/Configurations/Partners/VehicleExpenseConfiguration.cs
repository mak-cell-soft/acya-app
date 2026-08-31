using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
  public class VehicleExpenseConfiguration : IEntityTypeConfiguration<VehicleExpense>
  {
    public void Configure(EntityTypeBuilder<VehicleExpense> entity)
    {
      entity.ToTable("tbl_vehicle_expense");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
      entity.Property(e => e.VehicleId).HasColumnName("vehicleid").IsRequired();
      entity.Property(e => e.Date).HasColumnName("date").IsRequired();
      entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
      entity.Property(e => e.Mileage).HasColumnName("mileage").HasPrecision(18, 2);
      entity.Property(e => e.Liters).HasColumnName("liters").HasPrecision(18, 2);
      entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.DriverName).HasColumnName("drivername").HasMaxLength(255);
      entity.Property(e => e.StationOrProvider).HasColumnName("stationorprovider").HasMaxLength(255);
      entity.Property(e => e.Notes).HasColumnName("notes");
      entity.Property(e => e.CreatedAt).HasColumnName("createdat").IsRequired();
      entity.Property(e => e.CreatedBy).HasColumnName("createdby").HasMaxLength(255);

      entity.HasOne(e => e.Vehicle)
            .WithMany()
            .HasForeignKey(e => e.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(e => e.VehicleId);
      entity.HasIndex(e => e.Date);
    }
  }
}
