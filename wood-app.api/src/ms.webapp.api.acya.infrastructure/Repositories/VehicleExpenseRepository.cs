using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class VehicleExpenseRepository : CoreRepository<VehicleExpense, WoodAppContext>
  {
    public VehicleExpenseRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<List<VehicleExpense>> GetByVehicleIdAsync(int vehicleId)
    {
      return await context.VehicleExpenses
        .Where(e => e.VehicleId == vehicleId)
        .OrderByDescending(e => e.Date)
        .ThenByDescending(e => e.Id)
        .ToListAsync();
    }

    public async Task<VehicleExpenseStatsDto> GetStatsByVehicleIdAsync(int vehicleId)
    {
      var expenses = await context.VehicleExpenses
        .Where(e => e.VehicleId == vehicleId)
        .OrderBy(e => e.Date)
        .ToListAsync();

      var stats = new VehicleExpenseStatsDto
      {
        VehicleId = vehicleId,
        TotalExpensesCount = expenses.Count,
        TotalAmount = expenses.Sum(e => e.Amount),
        TotalFuelAmount = expenses.Where(e => e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase)).Sum(e => e.Amount),
        TotalLiters = expenses.Where(e => e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase) && e.Liters.HasValue).Sum(e => e.Liters!.Value),
        TotalMaintenanceAmount = expenses.Where(e => !e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase)).Sum(e => e.Amount),
      };

      // 1. Calculate Average Consumption (L / 100km) if we have fuel events with mileage
      var fuelWithMileage = expenses
        .Where(e => e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase) && e.Mileage.HasValue && e.Liters.HasValue && e.Mileage.Value > 0 && e.Liters.Value > 0)
        .OrderBy(e => e.Mileage)
        .ToList();

      if (fuelWithMileage.Count >= 2)
      {
        var minMileage = fuelWithMileage.First().Mileage!.Value;
        var maxMileage = fuelWithMileage.Last().Mileage!.Value;
        var totalKm = maxMileage - minMileage;

        // Sum liters excluding first point or total liters across the range
        var litersConsumed = fuelWithMileage.Skip(1).Sum(e => e.Liters!.Value);
        if (totalKm > 0 && litersConsumed > 0)
        {
          stats.AverageConsumptionPer100Km = Math.Round((litersConsumed / totalKm) * 100m, 2);
        }
      }

      // 2. Monthly aggregates (last 12 months or active months)
      var monthlyGroups = expenses
        .GroupBy(e => e.Date.ToString("yyyy-MM"))
        .OrderBy(g => g.Key)
        .TakeLast(12)
        .ToList();

      foreach (var group in monthlyGroups)
      {
        var monthFuel = group.Where(e => e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase)).Sum(e => e.Amount);
        var monthMaint = group.Where(e => !e.Type.Equals("Fuel", StringComparison.OrdinalIgnoreCase)).Sum(e => e.Amount);
        var maxKm = group.Where(e => e.Mileage.HasValue).Max(e => (decimal?)e.Mileage);

        stats.MonthlyExpenses.Add(new VehicleMonthlyExpenseDto
        {
          Month = group.Key,
          FuelAmount = monthFuel,
          MaintenanceAmount = monthMaint,
          TotalAmount = monthFuel + monthMaint,
          MaxMileage = maxKm
        });
      }

      // 3. Breakdown by type
      var typeGroups = expenses
        .GroupBy(e => e.Type)
        .OrderByDescending(g => g.Sum(x => x.Amount))
        .ToList();

      foreach (var group in typeGroups)
      {
        stats.ExpenseBreakdown.Add(new VehicleTypeExpenseDto
        {
          Type = group.Key,
          Amount = group.Sum(e => e.Amount),
          Count = group.Count()
        });
      }

      return stats;
    }
  }
}
