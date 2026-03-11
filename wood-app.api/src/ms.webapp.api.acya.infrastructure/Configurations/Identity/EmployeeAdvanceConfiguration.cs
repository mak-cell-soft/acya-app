using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Identity
{
    public class EmployeeAdvanceConfiguration : IEntityTypeConfiguration<EmployeeAdvance>
    {
        public void Configure(EntityTypeBuilder<EmployeeAdvance> entity)
        {
            entity.ToTable("tbl_employee_advances");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EmployeeId).HasColumnName("employeeid");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.RequestDate).HasColumnName("requestdate");
            entity.Property(e => e.RepaymentSchedule).HasColumnName("repaymentschedule");
            entity.Property(e => e.AmountRepaid).HasColumnName("amountrepaid");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CreatedAt).HasColumnName("createdat");
            entity.Property(e => e.UpdatedAt).HasColumnName("updatedat");

            entity.HasOne(d => d.Employee)
                .WithMany()
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
