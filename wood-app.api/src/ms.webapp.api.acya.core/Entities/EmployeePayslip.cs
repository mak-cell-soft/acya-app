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
      // NOTE: We do not reassign the primary key Id from the DTO. In EF Core, primary keys of tracked 
      // entities are immutable. Mutating them causes a key mutation exception (HTTP 500).
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
      // NOTE: Preserve the existing GeneratedAt timestamp if it is already set (which is true on updates).
      // If we are creating a new entity, fall back to the DTO's value or DateTime.UtcNow.
      GeneratedAt = GeneratedAt ?? dto.generatedat ?? DateTime.UtcNow;
    }
  }
}
