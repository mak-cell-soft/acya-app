using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionStepWorkLogConfiguration : IEntityTypeConfiguration<ProductionStepWorkLog>
  {
    public void Configure(EntityTypeBuilder<ProductionStepWorkLog> entity)
    {
      entity.ToTable("production_step_work_logs");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.StepWorkerId).HasColumnName("StepWorkerId").IsRequired();
      entity.Property(e => e.ProductionStepId).HasColumnName("ProductionStepId").IsRequired();
      entity.Property(e => e.PersonId).HasColumnName("PersonId").IsRequired();
      entity.Property(e => e.EmployeeFullName).HasColumnName("EmployeeFullName").HasMaxLength(255).IsRequired();
      entity.Property(e => e.WorkDate).HasColumnName("WorkDate").HasColumnType("date").IsRequired();
      entity.Property(e => e.ActualHours).HasColumnName("ActualHours").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.HourlyRate).HasColumnName("HourlyRate").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.CalculatedLaborAmount).HasColumnName("CalculatedLaborAmount").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.Notes).HasColumnName("Notes");

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");

      // Cascading relationship with parent StepWorker
      entity.HasOne(e => e.StepWorker)
            .WithMany(w => w.WorkLogs)
            .HasForeignKey(e => e.StepWorkerId)
            .OnDelete(DeleteBehavior.Cascade);

      // Cascading relationship with ProductionStep for direct step rollup
      entity.HasOne(e => e.ProductionStep)
            .WithMany(s => s.WorkLogs)
            .HasForeignKey(e => e.ProductionStepId)
            .OnDelete(DeleteBehavior.Cascade);

      // Restrictive relationship with Person
      entity.HasOne(e => e.Person)
            .WithMany()
            .HasForeignKey(e => e.PersonId)
            .OnDelete(DeleteBehavior.Restrict);

      // Indexes for performance and monthly aggregation queries
      entity.HasIndex(e => e.StepWorkerId);
      entity.HasIndex(e => e.ProductionStepId);
      entity.HasIndex(e => new { e.PersonId, e.WorkDate });
      entity.HasIndex(e => e.WorkDate);
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
