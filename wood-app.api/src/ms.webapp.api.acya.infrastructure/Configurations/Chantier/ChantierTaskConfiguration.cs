using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierTaskConfiguration : IEntityTypeConfiguration<ChantierTask>
  {
    public void Configure(EntityTypeBuilder<ChantierTask> entity)
    {
      entity.ToTable("chantier_tasks");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.PhaseId).HasColumnName("PhaseId").IsRequired();
      entity.Property(e => e.Label).HasColumnName("Label").HasMaxLength(200).IsRequired();
      entity.Property(e => e.SubLabel).HasColumnName("SubLabel").HasMaxLength(200);
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.ProgressPct).HasColumnName("ProgressPct").IsRequired();
      entity.Property(e => e.StartDate).HasColumnName("StartDate").IsRequired();
      entity.Property(e => e.PlannedEndDate).HasColumnName("PlannedEndDate");
      entity.Property(e => e.ActualEndDate).HasColumnName("ActualEndDate");
      entity.Property(e => e.ResponsiblePersonId).HasColumnName("ResponsiblePersonId");
      entity.Property(e => e.SortOrder).HasColumnName("SortOrder").IsRequired();
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      entity.HasOne(e => e.ResponsiblePerson)
            .WithMany()
            .HasForeignKey(e => e.ResponsiblePersonId)
            .OnDelete(DeleteBehavior.SetNull);

      entity.HasIndex(e => new { e.PhaseId, e.IsDeleted });
    }
  }
}
