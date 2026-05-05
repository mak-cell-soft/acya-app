using System;

namespace ms.webapp.api.acya.core.Entities.Dtos
{
  public class EmployeePayslipDto
  {
    public int id { get; set; }
    public int employeeid { get; set; }
    public int periodmonth { get; set; }
    public int periodyear { get; set; }
    public decimal basesalary { get; set; }
    public decimal brutsalary { get; set; }
    public decimal cnssamount { get; set; }
    public decimal irppamount { get; set; }
    public decimal cssamount { get; set; }
    public decimal bonuses { get; set; }
    public decimal deductions { get; set; }
    public decimal netsalary { get; set; }
    public DateTime? generatedat { get; set; }

    public EmployeePayslipDto() { }

    public EmployeePayslipDto(EmployeePayslip entity)
    {
      if (entity == null) return;
      id = entity.Id;
      employeeid = entity.EmployeeId;
      periodmonth = entity.PeriodMonth;
      periodyear = entity.PeriodYear;
      basesalary = entity.BaseSalary;
      brutsalary = entity.BrutSalary;
      cnssamount = entity.CnssAmount;
      irppamount = entity.IrppAmount;
      cssamount = entity.CssAmount;
      bonuses = entity.Bonuses;
      deductions = entity.Deductions;
      netsalary = entity.NetSalary;
      generatedat = entity.GeneratedAt;
    }
  }
}
