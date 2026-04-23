using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  public class VehicleController : BaseApiController
  {
    private readonly VehicleRepository _repository;
    private readonly WoodAppContext _context;

    public VehicleController(VehicleRepository repository, WoodAppContext context)
    {
      _repository = repository;
      _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VehicleDto>>> GetAll(bool? isowned = null)
    {
      var query = _repository.FindByCondition(v => !isowned.HasValue || v.IsOwned == isowned.Value);
      var vehicles = await query.ToListAsync();
      var vehicleDtos = vehicles.Select(v => new VehicleDto(v)).ToList();
      return Ok(vehicleDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleDto>> Get(int id)
    {
      var vehicle = await _repository.Get(id);
      if (vehicle == null)
      {
        return NotFound();
      }
      return Ok(new VehicleDto(vehicle));
    }

    [HttpPost("Add")]
    public async Task<ActionResult<VehicleDto>> Add(VehicleDto dto)
    {
      if (dto == null) return BadRequest("Vehicle data is required");

      var vehicle = new Vehicle(dto);
      var addedVehicle = await _repository.Add(vehicle);

      if (addedVehicle == null)
      {
        return BadRequest("Failed to add the new vehicle");
      }

      return CreatedAtAction(nameof(Get), new { id = addedVehicle.Id }, new VehicleDto(addedVehicle));
    }

    [HttpPut("Update")]
    public async Task<ActionResult<VehicleDto>> Update(VehicleDto dto)
    {
      if (dto == null || dto.id == 0) return BadRequest("Valid vehicle data is required");

      var vehicle = await _repository.Get(dto.id);
      if (vehicle == null) return NotFound();

      vehicle.UpdateFromDto(dto);
      var updatedVehicle = await _repository.Update(vehicle);

      if (updatedVehicle == null)
      {
        return BadRequest("Failed to update the vehicle");
      }

      return Ok(new VehicleDto(updatedVehicle));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
      var deletedVehicle = await _repository.Delete(id);
      if (deletedVehicle == null)
      {
        return BadRequest("Failed to delete the vehicle or vehicle not found");
      }
      return Ok();
    }
  }
}
