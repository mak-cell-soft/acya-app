using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierProgressEntryConfiguration : IEntityTypeConfiguration<ChantierProgressEntry>
  {
    public void Configure(EntityTypeBuilder<ChantierProgressEntry> entity)
    {
      entity.ToTable("chantier_progress_entries");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.Title).HasColumnName("Title").HasMaxLength(300).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.EntryType).HasColumnName("EntryType").HasConversion<short>().IsRequired();
      entity.Property(e => e.EntryStatus).HasColumnName("EntryStatus").HasConversion<short>().IsRequired();
      entity.Property(e => e.EntryDate).HasColumnName("EntryDate").IsRequired();
      entity.Property(e => e.RecordedById).HasColumnName("RecordedById").IsRequired();
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      entity.HasIndex(e => new { e.ChantierId, e.IsDeleted });
    }
  }
}
