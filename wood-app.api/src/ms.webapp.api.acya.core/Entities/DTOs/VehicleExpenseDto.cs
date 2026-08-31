using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class VehicleExpenseDto
  {
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Type { get; set; } = "Fuel";
    public decimal? Mileage { get; set; }
    public decimal? Liters { get; set; }
    public decimal Amount { get; set; }
    public string? DriverName { get; set; }
    public string? StationOrProvider { get; set; }
    public string? Notes { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string? CreatedBy { get; set; }

    public VehicleExpenseDto()
    {
    }

    public VehicleExpenseDto(VehicleExpense entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(VehicleExpense entity)
    {
      if (entity == null) return;

      Id = entity.Id;
      VehicleId = entity.VehicleId;
      Date = entity.Date;
      Type = entity.Type;
      Mileage = entity.Mileage;
      Liters = entity.Liters;
      Amount = entity.Amount;
      DriverName = entity.DriverName;
      StationOrProvider = entity.StationOrProvider;
      Notes = entity.Notes;
      CreatedAt = entity.CreatedAt;
      CreatedBy = entity.CreatedBy;
    }
  }

  public class VehicleExpenseStatsDto
  {
    public int VehicleId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalFuelAmount { get; set; }
    public decimal TotalLiters { get; set; }
    public decimal TotalMaintenanceAmount { get; set; }
    public decimal? AverageConsumptionPer100Km { get; set; }
    public int TotalExpensesCount { get; set; }
    public List<VehicleMonthlyExpenseDto> MonthlyExpenses { get; set; } = new();
    public List<VehicleTypeExpenseDto> ExpenseBreakdown { get; set; } = new();
  }

  public class VehicleMonthlyExpenseDto
  {
    public string Month { get; set; } = string.Empty;
    public decimal FuelAmount { get; set; }
    public decimal MaintenanceAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? MaxMileage { get; set; }
  }

  public class VehicleTypeExpenseDto
  {
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Count { get; set; }
  }
}
