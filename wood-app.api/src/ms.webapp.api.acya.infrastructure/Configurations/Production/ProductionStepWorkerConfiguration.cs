using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionStepWorkerConfiguration : IEntityTypeConfiguration<ProductionStepWorker>
  {
    public void Configure(EntityTypeBuilder<ProductionStepWorker> entity)
    {
      entity.ToTable("production_step_workers");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.ProductionStepId).HasColumnName("ProductionStepId").IsRequired();
      entity.Property(e => e.PersonId).HasColumnName("PersonId").IsRequired();
      entity.Property(e => e.EmployeeFullName).HasColumnName("EmployeeFullName").HasMaxLength(255).IsRequired();
      entity.Property(e => e.PlannedHours).HasColumnName("PlannedHours").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.DefaultHourlyRate).HasColumnName("DefaultHourlyRate").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.EstimatedLaborAmount).HasColumnName("EstimatedLaborAmount").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.Notes).HasColumnName("Notes");

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");

      // Cascading relationship with parent ProductionStep
      entity.HasOne(e => e.ProductionStep)
            .WithMany(s => s.Workers)
            .HasForeignKey(e => e.ProductionStepId)
            .OnDelete(DeleteBehavior.Cascade);

      // Restrictive relationship with Person (Equipe & RH - never cascade delete)
      entity.HasOne(e => e.Person)
            .WithMany()
            .HasForeignKey(e => e.PersonId)
            .OnDelete(DeleteBehavior.Restrict);

      // Cascading relationship with child WorkLogs
      entity.HasMany(e => e.WorkLogs)
            .WithOne(l => l.StepWorker)
            .HasForeignKey(l => l.StepWorkerId)
            .OnDelete(DeleteBehavior.Cascade);

      // Indexes
      entity.HasIndex(e => e.ProductionStepId);
      entity.HasIndex(e => e.PersonId);
      entity.HasIndex(e => new { e.ProductionStepId, e.PersonId }).IsUnique();
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
