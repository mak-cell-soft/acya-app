using System;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities
{
  public class EmployeeAdvance : IEntity
  {
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Person? Employee { get; set; }
    public decimal Amount { get; set; }
    public DateTime RequestDate { get; set; }
    public string? RepaymentSchedule { get; set; }
    public decimal AmountRepaid { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public EmployeeAdvance() { }

    public EmployeeAdvance(EmployeeAdvanceDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(EmployeeAdvanceDto dto)
    {
      Id = dto.id;
      EmployeeId = dto.employeeid;
      Amount = dto.amount;
      RequestDate = dto.requestdate;
      RepaymentSchedule = dto.repaymentschedule;
      AmountRepaid = dto.amountrepaid;
      Status = dto.status;
      CreatedAt = dto.createdat ?? DateTime.UtcNow;
      UpdatedAt = DateTime.UtcNow;
    }
  }
}
