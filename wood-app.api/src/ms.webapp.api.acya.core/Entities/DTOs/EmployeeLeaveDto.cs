using System;

namespace ms.webapp.api.acya.core.Entities.Dtos
{
  public class EmployeeLeaveDto
  {
    public int id { get; set; }
    public int employeeid { get; set; }
    public string leavetype { get; set; } = string.Empty;
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public decimal durationdays { get; set; }
    public string status { get; set; } = "Pending";
    public DateTime? createdat { get; set; }
    public DateTime? updatedat { get; set; }

    public EmployeeLeaveDto() { }

    public EmployeeLeaveDto(EmployeeLeave entity)
    {
      if (entity == null) return;
      id = entity.Id;
      employeeid = entity.EmployeeId;
      leavetype = entity.LeaveType;
      startdate = entity.StartDate;
      enddate = entity.EndDate;
      durationdays = entity.DurationDays;
      status = entity.Status;
      createdat = entity.CreatedAt;
      updatedat = entity.UpdatedAt;
    }
  }
}
