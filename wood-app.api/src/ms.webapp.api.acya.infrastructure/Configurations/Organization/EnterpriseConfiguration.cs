using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Organization
{
    public class EnterpriseConfiguration : IEntityTypeConfiguration<Enterprise>
    {
        public void Configure(EntityTypeBuilder<Enterprise> entity)
        {
            entity.ToTable("tbl_enterprise");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.MobileOne).HasColumnName("mobileone");
            entity.Property(e => e.MobileTwo).HasColumnName("mobiletwo");
            entity.Property(e => e.Guid).HasColumnName("enterpriseguid");
            entity.Property(e => e.SiegeAddress).HasColumnName("siegeaddress");
            entity.Property(e => e.Capital).HasColumnName("capital");
            entity.Property(e => e.MatriculeFiscal).HasColumnName("matriculefiscal");
            entity.Property(e => e.CommercialRegister).HasColumnName("commercialregister");
            entity.Property(e => e.Devise).HasColumnName("devise");
            entity.Property(e => e.NameResponsable).HasColumnName("nameresponsable");
            entity.Property(e => e.SurnameResponsable).HasColumnName("surnameresponsable");
            entity.Property(e => e.PositionResponsable).HasColumnName("positionresponsable");
            entity.Property(e => e.IsSalingWood).HasColumnName("issalingwood");

            // Configure one-to-many relationship with SalesSite
            entity.HasMany(e => e.Sites)
                  .WithOne(s => s.Enterprise)
                  .HasForeignKey(s => s.EnterpriseId);
        }
    }
}
