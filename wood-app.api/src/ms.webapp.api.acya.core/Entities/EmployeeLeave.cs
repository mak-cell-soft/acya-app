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
      Id = dto.id;
      EmployeeId = dto.employeeid;
      LeaveType = dto.leavetype;
      StartDate = dto.startdate;
      EndDate = dto.enddate;
      DurationDays = dto.durationdays;
      Status = dto.status;
      CreatedAt = dto.createdat ?? DateTime.UtcNow;
      UpdatedAt = DateTime.UtcNow;
    }
  }
}
