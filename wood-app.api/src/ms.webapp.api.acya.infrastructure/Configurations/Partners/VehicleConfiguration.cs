using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
    public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
    {
        public void Configure(EntityTypeBuilder<Vehicle> entity)
        {
            entity.ToTable("tbl_vehicle");

            // Properties
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SerialNumber).HasColumnName("serialnumber");
            entity.Property(e => e.Brand).HasColumnName("brand");
            entity.Property(e => e.InsuranceDate).HasColumnName("insurancedate");
            entity.Property(e => e.TechnicalVisitDate).HasColumnName("technicalvisitdate");
            entity.Property(e => e.Mileage).HasColumnName("mileage");
            entity.Property(e => e.Draining).HasColumnName("draining");
            entity.Property(e => e.DrainingDate).HasColumnName("drainingdate");
            entity.Property(e => e.IsOwned).HasColumnName("isowned");
            entity.Property(e => e.FuelCardEnterprise).HasColumnName("fuelcardenterprise");
            entity.Property(e => e.FuelCardConductor).HasColumnName("fuelcardconductor");
            entity.Property(e => e.FuelCardMatricule).HasColumnName("fuelcardmatricule");
            entity.Property(e => e.FuelCardAmount).HasColumnName("fuelcardamount");
            entity.Property(e => e.FuelCardType).HasColumnName("fuelcardtype");
            entity.Property(e => e.FuelCardNumber).HasColumnName("fuelcardnumber");
        }
    }
}
