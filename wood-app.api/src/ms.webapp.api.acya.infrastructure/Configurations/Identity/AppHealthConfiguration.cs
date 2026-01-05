using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Identity
{
    public class AppHealthConfiguration : IEntityTypeConfiguration<AppHealth>
    {
        public void Configure(EntityTypeBuilder<AppHealth> entity)
        {
            entity.ToTable("tbl_app_health");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Value).HasColumnName("value");
            entity.Property(e => e.Iscr).HasColumnName("iscr");
        }
    }
}
