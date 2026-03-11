using System;

namespace ms.webapp.api.acya.core.Entities.Dtos
{
  public class EmployeeAdvanceDto
  {
    public int id { get; set; }
    public int employeeid { get; set; }
    public decimal amount { get; set; }
    public DateTime requestdate { get; set; }
    public string? repaymentschedule { get; set; }
    public decimal amountrepaid { get; set; }
    public string status { get; set; } = "Pending";
    public DateTime? createdat { get; set; }
    public DateTime? updatedat { get; set; }

    public EmployeeAdvanceDto() { }

    public EmployeeAdvanceDto(EmployeeAdvance entity)
    {
      if (entity == null) return;
      id = entity.Id;
      employeeid = entity.EmployeeId;
      amount = entity.Amount;
      requestdate = entity.RequestDate;
      repaymentschedule = entity.RepaymentSchedule;
      amountrepaid = entity.AmountRepaid;
      status = entity.Status;
      createdat = entity.CreatedAt;
      updatedat = entity.UpdatedAt;
    }
  }
}
