using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierPhaseConfiguration : IEntityTypeConfiguration<ChantierPhase>
  {
    public void Configure(EntityTypeBuilder<ChantierPhase> entity)
    {
      entity.ToTable("chantier_phases");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.Name).HasColumnName("Name").HasMaxLength(200).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.SortOrder).HasColumnName("SortOrder").IsRequired();
      entity.Property(e => e.ProgressPct).HasColumnName("ProgressPct").IsRequired();
      entity.Property(e => e.Color).HasColumnName("Color").HasMaxLength(20);
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.StartDate).HasColumnName("StartDate").IsRequired();
      entity.Property(e => e.PlannedEndDate).HasColumnName("PlannedEndDate");
      entity.Property(e => e.ActualEndDate).HasColumnName("ActualEndDate");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      entity.HasMany(e => e.Tasks)
            .WithOne(t => t.Phase)
            .HasForeignKey(t => t.PhaseId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(e => new { e.ChantierId, e.IsDeleted });
    }
  }
}
