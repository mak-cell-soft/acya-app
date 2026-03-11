using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Identity
{
    public class EmployeePayslipConfiguration : IEntityTypeConfiguration<EmployeePayslip>
    {
        public void Configure(EntityTypeBuilder<EmployeePayslip> entity)
        {
            entity.ToTable("tbl_employee_payslips");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EmployeeId).HasColumnName("employeeid");
            entity.Property(e => e.PeriodMonth).HasColumnName("periodmonth");
            entity.Property(e => e.PeriodYear).HasColumnName("periodyear");
            entity.Property(e => e.BaseSalary).HasColumnName("basesalary");
            entity.Property(e => e.Bonuses).HasColumnName("bonuses");
            entity.Property(e => e.Deductions).HasColumnName("deductions");
            entity.Property(e => e.NetSalary).HasColumnName("netsalary");
            entity.Property(e => e.GeneratedAt).HasColumnName("generatedat");

            entity.HasOne(d => d.Employee)
                .WithMany()
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
