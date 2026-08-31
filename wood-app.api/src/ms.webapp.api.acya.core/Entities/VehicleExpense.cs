using System;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
  /// <summary>
  /// Represents an operational expense, refuel, or maintenance event associated with a vehicle.
  /// </summary>
  public class VehicleExpense : IEntity, IAuditable
  {
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Type of expense: Fuel, OilChange, Repair, TechnicalVisit, Insurance, Tires, Other
    /// </summary>
    public string Type { get; set; } = "Fuel";

    /// <summary>
    /// Odometer / mileage reading at the time of the event
    /// </summary>
    public decimal? Mileage { get; set; }

    /// <summary>
    /// Quantity in liters (primarily for Fuel entries)
    /// </summary>
    public decimal? Liters { get; set; }

    /// <summary>
    /// Total cost / amount in TND
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Driver or conductor responsible for the expense
    /// </summary>
    public string? DriverName { get; set; }

    /// <summary>
    /// Gas station brand, service station, or workshop / provider
    /// </summary>
    public string? StationOrProvider { get; set; }

    /// <summary>
    /// Additional details, replaced parts, invoice number, or comments
    /// </summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public VehicleExpense()
    {
    }

    public VehicleExpense(VehicleExpenseDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(VehicleExpenseDto dto)
    {
      Id = dto.Id;
      VehicleId = dto.VehicleId;
      Date = dto.Date;
      Type = dto.Type ?? "Fuel";
      Mileage = dto.Mileage;
      Liters = dto.Liters;
      Amount = dto.Amount;
      DriverName = dto.DriverName;
      StationOrProvider = dto.StationOrProvider;
      Notes = dto.Notes;
      if (dto.CreatedAt.HasValue)
      {
        CreatedAt = dto.CreatedAt.Value;
      }
      CreatedBy = dto.CreatedBy;
    }
  }
}
