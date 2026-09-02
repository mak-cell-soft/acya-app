using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierAlertConfiguration : IEntityTypeConfiguration<ChantierAlert>
  {
    public void Configure(EntityTypeBuilder<ChantierAlert> entity)
    {
      entity.ToTable("chantier_alerts");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.Message).HasColumnName("Message").IsRequired();
      entity.Property(e => e.AlertType).HasColumnName("AlertType").HasConversion<short>().IsRequired();
      entity.Property(e => e.IsResolved).HasColumnName("IsResolved").IsRequired();
      entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").IsRequired();
      entity.Property(e => e.ResolvedAt).HasColumnName("ResolvedAt");

      entity.HasIndex(e => new { e.ChantierId, e.IsResolved });
    }
  }
}
