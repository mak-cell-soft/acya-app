using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.infrastructure.Configurations
{
    public class TenantActiveSessionConfiguration : IEntityTypeConfiguration<TenantActiveSession>
    {
        public void Configure(EntityTypeBuilder<TenantActiveSession> builder)
        {
            builder.ToTable("bo_tbl_tenant_active_sessions", "public");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.SessionId)
                .HasMaxLength(100)
                .IsRequired();

            builder.HasIndex(x => x.SessionId)
                .IsUnique();

            builder.Property(x => x.TenantSlug)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.UserId)
                .IsRequired();

            builder.Property(x => x.Username)
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.Property(x => x.ExpiresAt)
                .IsRequired();

            builder.Property(x => x.LastActivityAt)
                .HasDefaultValueSql("NOW()");

            builder.Property(x => x.IsRevoked)
                .HasDefaultValue(false);

            builder.HasIndex(x => new { x.TenantId, x.IsRevoked, x.ExpiresAt });
            builder.HasIndex(x => new { x.TenantSlug, x.IsRevoked, x.ExpiresAt });

            builder.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
