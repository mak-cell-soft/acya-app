using System;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities
{
  public class EmployeeLeave : IEntity
  {
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Person? Employee { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal DurationDays { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public EmployeeLeave() { }

    public EmployeeLeave(EmployeeLeaveDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(EmployeeLeaveDto dto)
    {
      // NOTE: We do not reassign the primary key Id from the DTO. In EF Core, primary keys of tracked 
      // entities are immutable. Mutating them causes a key mutation exception (HTTP 500).
      EmployeeId = dto.employeeid;
      LeaveType = dto.leavetype;
      StartDate = dto.startdate;
      EndDate = dto.enddate;
      DurationDays = dto.durationdays;
      Status = dto.status;

      // NOTE: Preserve the existing CreatedAt timestamp if it is already set (which is true on updates).
      // If we are creating a new entity, fall back to the DTO's value or DateTime.UtcNow.
      CreatedAt = CreatedAt ?? dto.createdat ?? DateTime.UtcNow;
      UpdatedAt = DateTime.UtcNow;
    }
  }
}
