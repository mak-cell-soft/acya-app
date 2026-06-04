using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Permissions;

namespace ms.webapp.api.acya.infrastructure.Configurations
{
    public class UserPermissionsConfiguration : IEntityTypeConfiguration<UserPermissions>
    {
        public void Configure(EntityTypeBuilder<UserPermissions> builder)
        {
            builder.ToTable("tbl_user_permissions");
            builder.HasKey(x => x.Id);
            
            builder.HasOne(x => x.AppUser)
                   .WithOne()
                   .HasForeignKey<UserPermissions>(x => x.UserId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Property(x => x.Permissions)
                   .HasColumnType("jsonb")
                   .IsRequired()
                   .HasDefaultValueSql("'{}'::jsonb");

            builder.Property(x => x.UpdatedAt)
                   .HasDefaultValueSql("NOW()");
        }
    }
}
