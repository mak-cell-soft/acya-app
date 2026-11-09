using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
  /// <summary>
  /// Domain repository abstraction for vehicle delivery tracking operations.
  /// </summary>
  public interface IDeliveryTrackingRepository
  {
    /// <summary>
    /// Gets the raw DeliveryTracking entity by ID.
    /// </summary>
    Task<DeliveryTracking?> GetByIdAsync(int id);

    /// <summary>
    /// Gets detailed delivery tracking DTO with all relational data populated.
    /// </summary>
    Task<DeliveryTrackingDto?> GetDetailByIdAsync(int id);

    /// <summary>
    /// Gets tracking information for a document (BL or direct invoice).
    /// If the document is an invoice converted from a BL, resolves tracking via parent document relationship.
    /// </summary>
    Task<DeliveryTrackingDto?> GetByDocumentIdAsync(int documentId);

    /// <summary>
    /// Retrieves delivery history for a specific vehicle with optional pagination and filtering.
    /// </summary>
    Task<PagedResult<DeliveryTrackingListItemDto>> GetVehicleHistoryAsync(int vehicleId, DeliveryTrackingFilterDto filter);

    /// <summary>
    /// Retrieves delivery history for a specific customer with optional pagination.
    /// </summary>
    Task<PagedResult<DeliveryTrackingListItemDto>> GetCustomerHistoryAsync(int customerId, DeliveryTrackingFilterDto filter);

    /// <summary>
    /// Retrieves distinct customers previously served by enterprise-owned vehicles.
    /// </summary>
    Task<List<FleetCustomerSummaryDto>> GetFleetCustomersAsync();

    /// <summary>
    /// Computes delivery statistics and operational KPIs for a specific fleet vehicle.
    /// </summary>
    Task<VehicleDeliveryStatsDto> GetVehicleStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Creates and persists a new delivery tracking record with full validation.
    /// </summary>
    Task<DeliveryTracking> CreateAsync(CreateDeliveryTrackingDto dto, int userId);

    /// <summary>
    /// Updates an existing delivery tracking record with audit trail tracking.
    /// </summary>
    Task<DeliveryTrackingDto?> UpdateAsync(int id, UpdateDeliveryTrackingDto dto, int userId);

    /// <summary>
    /// Soft deletes a delivery tracking record (is_deleted = true).
    /// </summary>
    Task<bool> SoftDeleteAsync(int id, int userId);

    /// <summary>
    /// Closes an in-transit delivery tracking record by recording the current authoritative server UTC timestamp as return date.
    /// </summary>
    Task<DeliveryTrackingDto> CompleteDeliveryAsync(int id, int userId);

    /// <summary>
    /// Checks whether an active (non-deleted) tracking record exists for the specified document ID.
    /// </summary>
    Task<bool> ActiveTrackingExistsForDocumentAsync(int documentId);
  }
}

