using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Identity
{
    public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
    {
        public void Configure(EntityTypeBuilder<AppUser> entity)
        {
            entity.ToTable("tbl_app_user");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Login).HasColumnName("login");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.IsActive).HasColumnName("isactive");
            entity.Property(e => e.PasswordHash).HasColumnName("passwordhash");
            entity.Property(e => e.PasswordSalt).HasColumnName("passwordsalt");
            entity.Property(e => e.IdPerson).HasColumnName("idperson");
            entity.Property(e => e.EnterpriseId).HasColumnName("enterpriseid");
            entity.Property(e => e.IdSalesSite).HasColumnName("idsalessite");


            entity.HasOne(e => e.Persons)
              .WithMany() // Or .WithMany(u => u.Parents) if you have a collection of Parents in AppUser
              .HasForeignKey(e => e.IdPerson)
              .OnDelete(DeleteBehavior.SetNull); // Or your desired delete behavior

            // One-to-One with Enterprise (only on AppUser side)
            entity.HasOne(e => e.Enterprise)
                  .WithOne() // No navigation property needed in Enterprise
                  .HasForeignKey<AppUser>(e => e.EnterpriseId);

            // One-to-One with SalesSite (only on AppUser side)
            entity.HasOne(e => e.SalesSite)
                  .WithOne() // No navigation property needed in SalesSite
                  .HasForeignKey<AppUser>(e => e.IdSalesSite);
        }
    }
}
