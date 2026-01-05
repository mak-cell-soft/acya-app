using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Identity
{
    public class PersonConfiguration : IEntityTypeConfiguration<Person>
    {
        public void Configure(EntityTypeBuilder<Person> entity)
        {
            entity.ToTable("tbl_person");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Guid).HasColumnName("guid");
            entity.Property(e => e.Firstname).HasColumnName("firstname");
            entity.Property(e => e.Lastname).HasColumnName("lastname");
            entity.Property(e => e.FullName).HasColumnName("fullname");
            entity.Property(e => e.BirthDate).HasColumnName("birthdate");
            entity.Property(e => e.Cin).HasColumnName("cin");
            entity.Property(e => e.IdCnss).HasColumnName("idcnss");
            entity.Property(e => e.Role).HasColumnName("idrole");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.BirthTown).HasColumnName("birthtown");
            entity.Property(e => e.BankName).HasColumnName("bankname");
            entity.Property(e => e.BankAccount).HasColumnName("bankaccount");
            entity.Property(e => e.PhoneNumber).HasColumnName("phonenumber");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.IsAppUser).HasColumnName("isappuser");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.HireDate).HasColumnName("hiredate");
            entity.Property(e => e.FireDate).HasColumnName("firedate");
            entity.Property(e => e.UpdadatedById).HasColumnName("idappuser");
        }
    }
}
