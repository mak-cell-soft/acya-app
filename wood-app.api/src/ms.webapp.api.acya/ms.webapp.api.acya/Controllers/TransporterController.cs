using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  public class TransporterController : BaseApiController
  {
    private readonly TransporterRepository _repository;
    private readonly VehicleRepository _vehicleRepository;
    private readonly WoodAppContext _context;
    public TransporterController(TransporterRepository repository, VehicleRepository vehicleRepository, WoodAppContext context)
    {
      _repository= repository;
      _vehicleRepository= vehicleRepository;
      _context= context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransporterDto>>> GetAll()
    {
      var allDtos = await _repository.GetAllAsync();
      return Ok(allDtos);
    }

    [HttpPost("Add")]
    public async Task<ActionResult<TransporterDto>> Add(TransporterDto dto)
    {
      // First, validate input
      if (dto == null) return BadRequest("Transporter data is required");
      if (string.IsNullOrEmpty(dto.firstname) || string.IsNullOrEmpty(dto.lastname))
        return BadRequest("First name and last name are required");

      // Check if transporter already exists
      string _fullname = Helpers.CapitalizeFirstLetter(dto.firstname) + " " + dto.lastname.ToUpper();
      var existingTransporter = await _repository.ExistsByFullName(_fullname);
      if (existingTransporter)
      {
        return Conflict("Transporter with this name already exists");
      }

      // Handle vehicle creation
      Vehicle? vehicle = null;
      if (dto.car != null)
      {
        vehicle = new Vehicle(dto.car);
        vehicle = await _vehicleRepository.Add(vehicle);

        if (vehicle == null)
        {
          return BadRequest("Failed to create vehicle");
        }
      }

      // Create transporter
      var newTransporter = new Transporter(dto);
      //{
      //  VehicleId = vehicle?.Id // Set VehicleId only if vehicle exists
      //};

      if (vehicle != null)
      {
        newTransporter.VehicleId= vehicle.Id;
      }

      var addedTransporter = await _repository.Add(newTransporter);
      if (addedTransporter == null)
      {
        // Rollback vehicle creation if transporter fails
        if (vehicle != null)
        {
          await _vehicleRepository.Delete(vehicle.Id);
        }
        return BadRequest("Failed to add the new Transporter");
      }

      return CreatedAtAction(nameof(Get), new { id = addedTransporter.Id },
          new TransporterDto(addedTransporter));
    }

   
    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _transporter = await _repository.Get(id);
      if (_transporter == null)
      {
        return NotFound();
      }
      return Ok();
    }
  }
}
