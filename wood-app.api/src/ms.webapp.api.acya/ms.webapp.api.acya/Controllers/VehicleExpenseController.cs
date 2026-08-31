using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using System.Security.Claims;

namespace ms.webapp.api.acya.api.Controllers
{
  public class VehicleExpenseController : BaseApiController
  {
    private readonly VehicleExpenseRepository _expenseRepository;
    private readonly VehicleRepository _vehicleRepository;
    private readonly WoodAppContext _context;

    public VehicleExpenseController(
      VehicleExpenseRepository expenseRepository,
      VehicleRepository vehicleRepository,
      WoodAppContext context)
    {
      _expenseRepository = expenseRepository;
      _vehicleRepository = vehicleRepository;
      _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VehicleExpenseDto>>> GetByVehicle([FromQuery] int vehicleId)
    {
      if (vehicleId <= 0)
      {
        return BadRequest("VehicleId is required.");
      }

      var expenses = await _expenseRepository.GetByVehicleIdAsync(vehicleId);
      var dtos = expenses.Select(e => new VehicleExpenseDto(e)).ToList();
      return Ok(dtos);
    }

    [HttpGet("stats")]
    public async Task<ActionResult<VehicleExpenseStatsDto>> GetStats([FromQuery] int vehicleId)
    {
      if (vehicleId <= 0)
      {
        return BadRequest("VehicleId is required.");
      }

      var stats = await _expenseRepository.GetStatsByVehicleIdAsync(vehicleId);
      return Ok(stats);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleExpenseDto>> Get(int id)
    {
      var expense = await _expenseRepository.Get(id);
      if (expense == null)
      {
        return NotFound();
      }
      return Ok(new VehicleExpenseDto(expense));
    }

    [HttpPost("Add")]
    public async Task<ActionResult<VehicleExpenseDto>> Add(VehicleExpenseDto dto)
    {
      if (dto == null || dto.VehicleId <= 0)
      {
        return BadRequest("Valid vehicle expense data is required.");
      }

      var vehicle = await _vehicleRepository.Get(dto.VehicleId);
      if (vehicle == null)
      {
        return NotFound("Vehicle not found.");
      }

      var username = User?.FindFirst(ClaimTypes.Name)?.Value 
                     ?? User?.FindFirst("name")?.Value 
                     ?? User?.Identity?.Name;

      var expense = new VehicleExpense(dto)
      {
        CreatedBy = username,
        CreatedAt = DateTime.UtcNow
      };

      var added = await _expenseRepository.Add(expense);
      if (added == null)
      {
        return BadRequest("Failed to add vehicle expense.");
      }

      // Auto-sync vehicle attributes if applicable:
      // 1. If higher mileage entered, update current vehicle mileage
      if (dto.Mileage.HasValue && dto.Mileage.Value > 0)
      {
        if (decimal.TryParse(vehicle.Mileage, out var currentMileage))
        {
          if (dto.Mileage.Value > currentMileage)
          {
            vehicle.Mileage = dto.Mileage.Value.ToString("0.##");
            await _vehicleRepository.Update(vehicle);
          }
        }
        else if (string.IsNullOrWhiteSpace(vehicle.Mileage))
        {
          vehicle.Mileage = dto.Mileage.Value.ToString("0.##");
          await _vehicleRepository.Update(vehicle);
        }
      }

      // 2. If OilChange / Vidange, sync latest DrainingDate
      if (dto.Type != null && (dto.Type.Equals("OilChange", StringComparison.OrdinalIgnoreCase) || dto.Type.Equals("Vidange", StringComparison.OrdinalIgnoreCase)))
      {
        if (!vehicle.DrainingDate.HasValue || dto.Date > vehicle.DrainingDate.Value)
        {
          vehicle.DrainingDate = dto.Date;
          if (!string.IsNullOrWhiteSpace(dto.Notes))
          {
            vehicle.Draining = dto.Notes;
          }
          await _vehicleRepository.Update(vehicle);
        }
      }

      return CreatedAtAction(nameof(Get), new { id = added.Id }, new VehicleExpenseDto(added));
    }

    [HttpPut("Update")]
    public async Task<ActionResult<VehicleExpenseDto>> Update(VehicleExpenseDto dto)
    {
      if (dto == null || dto.Id <= 0)
      {
        return BadRequest("Valid expense data is required.");
      }

      var expense = await _expenseRepository.Get(dto.Id);
      if (expense == null)
      {
        return NotFound("Expense not found.");
      }

      expense.UpdateFromDto(dto);
      var updated = await _expenseRepository.Update(expense);
      if (updated == null)
      {
        return BadRequest("Failed to update vehicle expense.");
      }

      return Ok(new VehicleExpenseDto(updated));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
      var deleted = await _expenseRepository.Delete(id);
      if (deleted == null)
      {
        return BadRequest("Failed to delete vehicle expense.");
      }
      return Ok();
    }
  }
}
