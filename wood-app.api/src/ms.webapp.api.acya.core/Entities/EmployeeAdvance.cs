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
      // NOTE: We do not reassign the primary key Id from the DTO. In EF Core, primary keys of tracked 
      // entities are immutable. Mutating them causes a key mutation exception (HTTP 500).
      EmployeeId = dto.employeeid;
      Amount = dto.amount;
      RequestDate = dto.requestdate;
      RepaymentSchedule = dto.repaymentschedule;
      AmountRepaid = dto.amountrepaid;
      Status = dto.status;

      // NOTE: Preserve the existing CreatedAt timestamp if it is already set (which is true on updates).
      // If we are creating a new entity, fall back to the DTO's value or DateTime.UtcNow.
      CreatedAt = CreatedAt ?? dto.createdat ?? DateTime.UtcNow;
      UpdatedAt = DateTime.UtcNow;
    }
  }
}
