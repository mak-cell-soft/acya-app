using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Audit
{
  public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
  {
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
      builder.ToTable("AuditLogs");

      builder.HasKey(a => a.Id);

      builder.Property(a => a.Action)
        .IsRequired();

      builder.Property(a => a.TableName)
        .IsRequired();

      builder.Property(a => a.Timestamp)
        .IsRequired();

      // Index for better performance when querying logs
      builder.HasIndex(a => a.Timestamp);
      builder.HasIndex(a => a.TableName);
      builder.HasIndex(a => a.UserId);
    }
  }
}
