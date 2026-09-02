using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierConfiguration : IEntityTypeConfiguration<core.Entities.Chantier.Chantier>
  {
    public void Configure(EntityTypeBuilder<core.Entities.Chantier.Chantier> entity)
    {
      entity.ToTable("chantier_projects");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.Reference).HasColumnName("Reference").HasMaxLength(50).IsRequired();
      entity.Property(e => e.Name).HasColumnName("Name").HasMaxLength(255).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description");
      entity.Property(e => e.InternalNote).HasColumnName("InternalNote");
      entity.Property(e => e.Location).HasColumnName("Location").HasMaxLength(500);
      entity.Property(e => e.Gouvernorate).HasColumnName("Gouvernorate").HasMaxLength(100);
      entity.Property(e => e.Status).HasColumnName("Status").HasConversion<short>().IsRequired();
      entity.Property(e => e.HealthFlag).HasColumnName("HealthFlag").HasConversion<short>().IsRequired();
      entity.Property(e => e.ProgressPct).HasColumnName("ProgressPct").IsRequired();
      entity.Property(e => e.BudgetTotal).HasColumnName("BudgetTotal").HasPrecision(18, 3);
      entity.Property(e => e.StartDate).HasColumnName("StartDate").IsRequired();
      entity.Property(e => e.PlannedEndDate).HasColumnName("PlannedEndDate");
      entity.Property(e => e.ActualEndDate).HasColumnName("ActualEndDate");
      entity.Property(e => e.ArchitectPersonId).HasColumnName("ArchitectPersonId");
      entity.Property(e => e.ProjectManagerPersonId).HasColumnName("ProjectManagerPersonId");
      entity.Property(e => e.ClientCounterPartId).HasColumnName("ClientCounterPartId");
      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      // One-way relationships with core Person entity
      entity.HasOne(e => e.ArchitectPerson)
            .WithMany()
            .HasForeignKey(e => e.ArchitectPersonId)
            .OnDelete(DeleteBehavior.SetNull);

      entity.HasOne(e => e.ProjectManagerPerson)
            .WithMany()
            .HasForeignKey(e => e.ProjectManagerPersonId)
            .OnDelete(DeleteBehavior.SetNull);

      // Owned navigation collections
      entity.HasMany(e => e.TeamMembers)
            .WithOne(m => m.Chantier)
            .HasForeignKey(m => m.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.Phases)
            .WithOne(p => p.Chantier)
            .HasForeignKey(p => p.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.MaterialRequirements)
            .WithOne(r => r.Chantier)
            .HasForeignKey(r => r.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.MaterialConsumptions)
            .WithOne(c => c.Chantier)
            .HasForeignKey(c => c.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.ProgressEntries)
            .WithOne(p => p.Chantier)
            .HasForeignKey(p => p.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.Alerts)
            .WithOne(a => a.Chantier)
            .HasForeignKey(a => a.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasMany(e => e.VehicleAssignments)
            .WithOne(v => v.Chantier)
            .HasForeignKey(v => v.ChantierId)
            .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(e => new { e.Status, e.IsDeleted });
      entity.HasIndex(e => new { e.StartDate, e.PlannedEndDate });
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
