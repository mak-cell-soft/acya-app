using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.infrastructure.Configurations.Production
{
  public class ProductionOtherWorkEntryConfiguration : IEntityTypeConfiguration<ProductionOtherWorkEntry>
  {
    public void Configure(EntityTypeBuilder<ProductionOtherWorkEntry> entity)
    {
      entity.ToTable("production_other_work_entries");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.Guid).HasColumnName("Guid").IsRequired();
      entity.Property(e => e.PersonId).HasColumnName("PersonId").IsRequired();
      entity.Property(e => e.EmployeeFullName).HasColumnName("EmployeeFullName").HasMaxLength(255).IsRequired();
      entity.Property(e => e.WorkDate).HasColumnName("WorkDate").HasColumnType("date").IsRequired();
      entity.Property(e => e.Hours).HasColumnName("Hours").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.HourlyRate).HasColumnName("HourlyRate").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.CalculatedAmount).HasColumnName("CalculatedAmount").HasPrecision(18, 3).IsRequired();
      entity.Property(e => e.Description).HasColumnName("Description").IsRequired();

      entity.Property(e => e.CreatedById).HasColumnName("CreatedById").IsRequired();
      entity.Property(e => e.UpdatedById).HasColumnName("UpdatedById");
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();
      entity.Property(e => e.UpdateDate).HasColumnName("UpdateDate");
      entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired();

      // Restrictive relationship with Person
      entity.HasOne(e => e.Person)
            .WithMany()
            .HasForeignKey(e => e.PersonId)
            .OnDelete(DeleteBehavior.Restrict);

      // Indexes for monthly queries and soft-delete filtering
      entity.HasIndex(e => new { e.PersonId, e.WorkDate, e.IsDeleted });
      entity.HasIndex(e => new { e.WorkDate, e.IsDeleted });
      entity.HasIndex(e => e.Guid).IsUnique();
    }
  }
}
