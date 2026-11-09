using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  /// <summary>
  /// REST API controller managing logistics delivery tracking for enterprise-owned fleet vehicles,
  /// destination customers, delivery note (BL) associations, and operational statistics.
  /// </summary>
  [Authorize]
  public class DeliveryTrackingController : BaseApiController
  {
    private readonly IDeliveryTrackingRepository _repository;
    private readonly WoodAppContext _context;

    public DeliveryTrackingController(IDeliveryTrackingRepository repository, WoodAppContext context)
    {
      _repository = repository;
      _context = context;
    }

    private int GetCurrentUserId()
    {
      var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
      if (claim != null && int.TryParse(claim.Value, out var id) && id > 0)
      {
        return id;
      }
      return 0;
    }

    /// <summary>
    /// Retrieves delivery history for a specific fleet vehicle with pagination, date range, and status filters.
    /// GET /api/DeliveryTracking/Vehicle/{vehicleId}
    /// </summary>
    [HttpGet("Vehicle/{vehicleId}")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<PagedResult<DeliveryTrackingListItemDto>>> GetVehicleHistory(
      int vehicleId,
      [FromQuery] DeliveryTrackingFilterDto filter)
    {
      if (vehicleId <= 0)
      {
        return BadRequest("L'identifiant du véhicule est obligatoire et doit être supérieur à zéro.");
      }

      var vehicleExists = await _context.Vehicles.AnyAsync(v => v.Id == vehicleId);
      if (!vehicleExists)
      {
        return NotFound($"Véhicule #{vehicleId} introuvable.");
      }

      var history = await _repository.GetVehicleHistoryAsync(vehicleId, filter);
      return Ok(history);
    }

    /// <summary>
    /// Retrieves the delivery tracking record associated with a commercial document (BL or direct invoice).
    /// If the queried document is an invoice converted from a BL, resolves tracking through parent BL relationship.
    /// GET /api/DeliveryTracking/Document/{documentId}
    /// </summary>
    [HttpGet("Document/{documentId}")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<DeliveryTrackingDto>> GetByDocument(int documentId)
    {
      if (documentId <= 0)
      {
        return BadRequest("L'identifiant du document est obligatoire et doit être supérieur à zéro.");
      }

      var tracking = await _repository.GetByDocumentIdAsync(documentId);
      if (tracking == null)
      {
        return NotFound($"Aucun suivi de livraison trouvé pour le document commercial #{documentId}.");
      }

      return Ok(tracking);
    }

    /// <summary>
    /// Retrieves a single delivery tracking record by its primary key ID.
    /// GET /api/DeliveryTracking/{id}
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<DeliveryTrackingDto>> GetById(int id)
    {
      if (id <= 0)
      {
        return BadRequest("Identifiant de suivi invalide.");
      }

      var tracking = await _repository.GetDetailByIdAsync(id);
      if (tracking == null)
      {
        return NotFound($"Suivi de livraison #{id} introuvable.");
      }

      return Ok(tracking);
    }

    /// <summary>
    /// Creates a new delivery tracking record associating an owned fleet vehicle with a BL or direct invoice.
    /// POST /api/DeliveryTracking
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "Vehicles.CanAdd")]
    public async Task<ActionResult<DeliveryTrackingDto>> Create([FromBody] CreateDeliveryTrackingDto dto)
    {
      if (dto == null)
      {
        return BadRequest("Les données du suivi de livraison sont obligatoires.");
      }

      if (dto.DocumentId <= 0 || dto.VehicleId <= 0 || dto.CustomerId <= 0)
      {
        return BadRequest("DocumentId, VehicleId et CustomerId sont des champs obligatoires.");
      }

      try
      {
        int userId = GetCurrentUserId();
        var created = await _repository.CreateAsync(dto, userId);
        var detail = await _repository.GetDetailByIdAsync(created.Id);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, detail);
      }
      catch (KeyNotFoundException ex)
      {
        return NotFound(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    /// <summary>
    /// Updates delivery tracking fields (dates, return status, driver, address, notes).
    /// PUT /api/DeliveryTracking/{id}
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "Vehicles.CanUpdate")]
    public async Task<ActionResult<DeliveryTrackingDto>> Update(int id, [FromBody] UpdateDeliveryTrackingDto dto)
    {
      if (id <= 0 || dto == null)
      {
        return BadRequest("Données de mise à jour invalides.");
      }

      try
      {
        int userId = GetCurrentUserId();
        var updated = await _repository.UpdateAsync(id, dto, userId);
        if (updated == null)
        {
          return NotFound($"Suivi de livraison #{id} introuvable.");
        }

        return Ok(updated);
      }
      catch (KeyNotFoundException ex)
      {
        return NotFound(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    /// <summary>
    /// Retrieves past delivery records for a specific customer delivered via fleet vehicles.
    /// GET /api/DeliveryTracking/Customer/{customerId}
    /// </summary>
    [HttpGet("Customer/{customerId}")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<PagedResult<DeliveryTrackingListItemDto>>> GetCustomerHistory(
      int customerId,
      [FromQuery] DeliveryTrackingFilterDto filter)
    {
      if (customerId <= 0)
      {
        return BadRequest("L'identifiant du client est obligatoire.");
      }

      var customerExists = await _context.CounterParts.AnyAsync(c => c.Id == customerId);
      if (!customerExists)
      {
        return NotFound($"Client #{customerId} introuvable.");
      }

      var history = await _repository.GetCustomerHistoryAsync(customerId, filter);
      return Ok(history);
    }

    /// <summary>
    /// Retrieves the list of distinct customers who have received deliveries via enterprise fleet vehicles.
    /// GET /api/DeliveryTracking/FleetCustomers
    /// </summary>
    [HttpGet("FleetCustomers")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<List<FleetCustomerSummaryDto>>> GetFleetCustomers()
    {
      var customers = await _repository.GetFleetCustomersAsync();
      return Ok(customers);
    }

    /// <summary>
    /// Computes logistics statistics and operational KPIs for a fleet vehicle.
    /// GET /api/DeliveryTracking/Vehicle/{vehicleId}/Statistics
    /// </summary>
    [HttpGet("Vehicle/{vehicleId}/Statistics")]
    [Authorize(Policy = "Vehicles.CanRead")]
    public async Task<ActionResult<VehicleDeliveryStatsDto>> GetVehicleStatistics(
      int vehicleId,
      [FromQuery] DateTime? startDate = null,
      [FromQuery] DateTime? endDate = null)
    {
      if (vehicleId <= 0)
      {
        return BadRequest("L'identifiant du véhicule est obligatoire.");
      }

      var vehicleExists = await _context.Vehicles.AnyAsync(v => v.Id == vehicleId);
      if (!vehicleExists)
      {
        return NotFound($"Véhicule #{vehicleId} introuvable.");
      }

      var stats = await _repository.GetVehicleStatisticsAsync(vehicleId, startDate, endDate);
      return Ok(stats);
    }

    /// <summary>
    /// Records the vehicle return for an active in-transit delivery tracking record.
    /// Sets the return date to the authoritative server UTC timestamp and status to Completed.
    /// POST /api/DeliveryTracking/{id}/Complete
    /// </summary>
    [HttpPost("{id}/Complete")]
    [Authorize(Policy = "Vehicles.CanUpdate")]
    public async Task<ActionResult<DeliveryTrackingDto>> Complete(int id)
    {
      if (id <= 0)
      {
        return BadRequest("Identifiant de suivi invalide.");
      }

      try
      {
        int userId = GetCurrentUserId();
        var completed = await _repository.CompleteDeliveryAsync(id, userId);
        return Ok(completed);
      }
      catch (KeyNotFoundException ex)
      {
        return NotFound(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
      catch (Exception ex)
      {
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
      }
    }

    /// <summary>
    /// Soft deletes a delivery tracking record (is_deleted = true).
    /// DELETE /api/DeliveryTracking/{id}
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "Vehicles.CanDelete")]
    public async Task<ActionResult> Delete(int id)
    {
      if (id <= 0)
      {
        return BadRequest("Identifiant de suivi invalide.");
      }

      int userId = GetCurrentUserId();
      bool deleted = await _repository.SoftDeleteAsync(id, userId);
      if (!deleted)
      {
        return NotFound($"Suivi de livraison #{id} introuvable.");
      }

      return NoContent();
    }
  }
}

