using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
    public class ProviderConfiguration : IEntityTypeConfiguration<Provider>
    {
        public void Configure(EntityTypeBuilder<Provider> entity)
        {
            entity.ToTable("tbl_provider");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Prefix).HasColumnName("prefix");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.RepresentedByName).HasColumnName("representedbyname");
            entity.Property(e => e.RepresentedBySurname).HasColumnName("representedbysurname");
            entity.Property(e => e.RepresentedByFullname).HasColumnName("representedbyfullname");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.TaxRegistrationNumber).HasColumnName("taxregistrationnumber");
            entity.Property(e => e.PhoneNumberOne).HasColumnName("phonenumberone");
            entity.Property(e => e.PhoneNumberTwo).HasColumnName("phonenumbertwo");
            entity.Property(e => e.BankName).HasColumnName("bankname");
            entity.Property(e => e.BankAccountNumber).HasColumnName("bankaccountnumber");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.UpdatedById).HasColumnName("idappuser");
            entity.Property(e => e.IsActive).HasColumnName("isactive");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");

            entity.HasOne(e => e.AppUsers)
                  .WithMany()
                  .HasForeignKey(e => e.UpdatedById);

        }
    }
}
