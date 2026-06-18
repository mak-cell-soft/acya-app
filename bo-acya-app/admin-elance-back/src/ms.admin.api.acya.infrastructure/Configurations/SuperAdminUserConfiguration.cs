using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class SuperAdminUserConfiguration : IEntityTypeConfiguration<SuperAdminUser>
    {
        public void Configure(EntityTypeBuilder<SuperAdminUser> builder)
        {
            builder.ToTable("bo_tbl_super_admin_users");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Username)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(x => x.Username).IsUnique();

            builder.Property(x => x.PasswordHash)
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(x => x.Email)
                .HasMaxLength(255);

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");
        }
    }
}
