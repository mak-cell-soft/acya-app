using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Notifications;

namespace ms.webapp.api.acya.infrastructure.Configurations.Notifications
{
    public class DevicePushTokenConfiguration : IEntityTypeConfiguration<DevicePushToken>
    {
        public void Configure(EntityTypeBuilder<DevicePushToken> builder)
        {
            builder.ToTable("DevicePushTokens");

            builder.HasKey(e => e.Id);
            builder.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            builder.Property(e => e.UserId).HasColumnName("UserId").IsRequired();
            builder.Property(e => e.Token).HasColumnName("Token").HasMaxLength(512).IsRequired();
            builder.Property(e => e.Platform).HasColumnName("Platform").HasMaxLength(30).IsRequired();
            builder.Property(e => e.AppVersion).HasColumnName("AppVersion").HasMaxLength(50);
            builder.Property(e => e.IsActive).HasColumnName("IsActive").IsRequired();
            builder.Property(e => e.CreatedAt).HasColumnName("CreatedAt").IsRequired();
            builder.Property(e => e.LastActiveAt).HasColumnName("LastActiveAt").IsRequired();

            // Foreign Key to tbl_app_user (AppUser)
            builder.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique index on Token within the tenant schema
            builder.HasIndex(e => e.Token)
                .HasDatabaseName("IX_DevicePushTokens_Token")
                .IsUnique();

            // Index for querying active tokens by user
            builder.HasIndex(e => new { e.UserId, e.IsActive })
                .HasDatabaseName("IX_DevicePushTokens_UserId_IsActive");
        }
    }
}
