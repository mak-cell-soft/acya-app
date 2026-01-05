using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Organization
{
    public class AppVariableConfiguration : IEntityTypeConfiguration<AppVariable>
    {
        public void Configure(EntityTypeBuilder<AppVariable> entity)
        {
            entity.ToTable("tbl_appvariable");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Nature).HasColumnName("nature");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Value).HasColumnName("value");
            entity.Property(e => e.isDefault).HasColumnName("isdefault");
            entity.Property(e => e.isActive).HasColumnName("isactive");
            entity.Property(e => e.isEditable).HasColumnName("iseditable");
            entity.Property(e => e.isDeleted).HasColumnName("isdeleted");
        }
    }
}
