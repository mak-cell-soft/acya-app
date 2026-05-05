using System;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities
{
  public class EmployeePayslip : IEntity
  {
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Person? Employee { get; set; }
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal BrutSalary { get; set; }
    public decimal CnssAmount { get; set; }
    public decimal IrppAmount { get; set; }
    public decimal CssAmount { get; set; }
    public decimal Bonuses { get; set; }
    public decimal Deductions { get; set; }
    public decimal NetSalary { get; set; }
    public DateTime? GeneratedAt { get; set; }

    public EmployeePayslip() { }

    public EmployeePayslip(EmployeePayslipDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(EmployeePayslipDto dto)
    {
      Id = dto.id;
      EmployeeId = dto.employeeid;
      PeriodMonth = dto.periodmonth;
      PeriodYear = dto.periodyear;
      BaseSalary = dto.basesalary;
      BrutSalary = dto.brutsalary;
      CnssAmount = dto.cnssamount;
      IrppAmount = dto.irppamount;
      CssAmount = dto.cssamount;
      Bonuses = dto.bonuses;
      Deductions = dto.deductions;
      NetSalary = dto.netsalary;
      GeneratedAt = dto.generatedat ?? DateTime.UtcNow;
    }
  }
}
