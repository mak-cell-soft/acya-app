using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
    public class CounterPartConfiguration : IEntityTypeConfiguration<CounterPart>
    {
        public void Configure(EntityTypeBuilder<CounterPart> entity)
        {
            entity.ToTable("tbl_counter_part");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Guid).HasColumnName("guid");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Prefix).HasColumnName("prefix");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.FirstName).HasColumnName("firstname");
            entity.Property(e => e.LastName).HasColumnName("lastname");
            entity.Property(e => e.IdentityCardNumber).HasColumnName("identitycardnumber");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.TaxRegistrationNumber).HasColumnName("taxregistrationnumber");
            entity.Property(e => e.PatenteCode).HasColumnName("patentecode");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Gouvernorate).HasColumnName("gouvernorate");
            entity.Property(e => e.MaximumDiscount).HasColumnName("maximumdiscount");
            entity.Property(e => e.MaximumSalesBar).HasColumnName("maximumsalesbar");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PhoneNumberOne).HasColumnName("phonenumberone");
            entity.Property(e => e.PhoneNumberTwo).HasColumnName("phonenumbertwo");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.JobTitle).HasColumnName("jobtitle");
            entity.Property(e => e.BankName).HasColumnName("bankname");
            entity.Property(e => e.BankAccountNumber).HasColumnName("bankaccountnumber");
            entity.Property(e => e.IsActive).HasColumnName("isactive");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.UpdatedById).HasColumnName("updatedby");
            entity.Property(e => e.TransporterId).HasColumnName("transporterid");

            entity.HasOne(e => e.AppUsers)
               .WithMany()
               .HasForeignKey(e => e.UpdatedById);

            entity.HasOne(e => e.Transporter)
                  .WithMany()
                  .HasForeignKey(e => e.TransporterId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("fk_tbl_counter_part_tbl_transporter");
        }
    }
}
