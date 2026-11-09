using System;
using System.Collections.Generic;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  /// <summary>
  /// Request payload for creating a new delivery tracking record.
  /// </summary>
  public class CreateDeliveryTrackingDto
  {
    public int DocumentId { get; set; }
    public int VehicleId { get; set; }
    public int? TransporterId { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? DriverName { get; set; }
    public DateTime DepartureDate { get; set; } = DateTime.UtcNow;
    public DateTime? ReturnDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
  }

  /// <summary>
  /// Request payload for updating an existing delivery tracking record.
  /// </summary>
  public class UpdateDeliveryTrackingDto
  {
    public DateTime? DepartureDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public int? TransporterId { get; set; }
    public string? DriverName { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public DeliveryTrackingStatus? Status { get; set; }
  }

  /// <summary>
  /// Detailed delivery tracking response representation.
  /// </summary>
  public class DeliveryTrackingDto
  {
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public string? DocNumber { get; set; }
    public DocumentTypes? DocumentType { get; set; }
    public int VehicleId { get; set; }
    public string? VehicleSerialNumber { get; set; }
    public string? VehicleBrand { get; set; }
    public int? TransporterId { get; set; }
    public string? TransporterName { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? DriverName { get; set; }
    public DateTime DepartureDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public int? DurationMinutes { get; set; }
    public string? DeliveryAddress { get; set; }
    public DeliveryTrackingStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? UpdatedById { get; set; }
  }

  /// <summary>
  /// Summary item representation for delivery history lists.
  /// </summary>
  public class DeliveryTrackingListItemDto
  {
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public string? DocNumber { get; set; }
    public DocumentTypes? DocumentType { get; set; }
    public int VehicleId { get; set; }
    public string? VehicleSerialNumber { get; set; }
    public string? VehicleBrand { get; set; }
    public int? TransporterId { get; set; }
    public string? TransporterName { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? DeliveryAddress { get; set; }
    public DateTime DepartureDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public int? DurationMinutes { get; set; }
    public string? DriverName { get; set; }
    public DeliveryTrackingStatus Status { get; set; }
    public string? Notes { get; set; }
  }

  /// <summary>
  /// Filter and pagination parameters for delivery queries.
  /// </summary>
  public class DeliveryTrackingFilterDto
  {
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 15;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DeliveryTrackingStatus? Status { get; set; }
    public string? Search { get; set; }
  }

  /// <summary>
  /// Aggregated summary of a customer who was served by owned fleet vehicles.
  /// </summary>
  public class FleetCustomerSummaryDto
  {
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerAddress { get; set; }
    public int TotalDeliveries { get; set; }
    public DateTime LastDeliveryDate { get; set; }
    public string? LastVehicleSerialNumber { get; set; }
  }

  /// <summary>
  /// Operational statistics and delivery KPIs for a specific fleet vehicle.
  /// </summary>
  public class VehicleDeliveryStatsDto
  {
    public int VehicleId { get; set; }
    public int TotalDeliveries { get; set; }
    public int ActiveDeliveries { get; set; }
    public int CompletedDeliveries { get; set; }
    public int CancelledDeliveries { get; set; }
    public double? AverageDeliveryMinutes { get; set; }
    public List<MonthlyDeliveryCountDto> MonthlyDeliveries { get; set; } = new();
    public List<TopCustomerDeliveryDto> TopCustomers { get; set; } = new();
  }

  /// <summary>
  /// Monthly count of deliveries for breakdown charts.
  /// </summary>
  public class MonthlyDeliveryCountDto
  {
    public string Month { get; set; } = string.Empty; // Format: "yyyy-MM"
    public int TotalCount { get; set; }
    public int CompletedCount { get; set; }
    public int ActiveCount { get; set; }
  }

  /// <summary>
  /// Destination customer metrics for top destinations widget.
  /// </summary>
  public class TopCustomerDeliveryDto
  {
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int DeliveryCount { get; set; }
    public DateTime LastDeliveryDate { get; set; }
  }
}

