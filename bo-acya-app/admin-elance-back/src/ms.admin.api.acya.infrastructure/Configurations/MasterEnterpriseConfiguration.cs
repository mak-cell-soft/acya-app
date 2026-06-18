using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class MasterEnterpriseConfiguration : IEntityTypeConfiguration<MasterEnterprise>
    {
        public void Configure(EntityTypeBuilder<MasterEnterprise> builder)
        {
            builder.ToTable("bo_tbl_enterprise");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Slug)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(x => x.Slug).IsUnique();

            builder.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(x => x.SchemaName)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(x => x.SchemaName).IsUnique();

            builder.Property(x => x.ConnectionString)
                .IsRequired();

            builder.Property(x => x.Email)
                .HasMaxLength(255);

            builder.Property(x => x.Phone)
                .HasMaxLength(50);

            builder.Property(x => x.Plan)
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(x => x.Status)
                .HasConversion<string>()
                .HasMaxLength(50);

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");
        }
    }
}
