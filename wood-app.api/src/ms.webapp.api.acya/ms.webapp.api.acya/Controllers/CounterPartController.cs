using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ms.webapp.api.acya.api.Controllers
{
  public class CounterPartController : BaseApiController
  {
    private readonly CounterPartRepository _repository;
    private readonly WoodAppContext _context;

    public CounterPartController(CounterPartRepository repository, WoodAppContext context)
    {
      _repository = repository;
      _context = context;
    }

    [HttpPost("Add")]
    public async Task<ActionResult> Add(CounterPartDto dto)
    {
      // Check if the Provider with the given reference already exists
      var exists = await _repository.ExistsAsync(dto);
      if (exists.Exists)
      {
        return Conflict("Counter Part Already exists");
      }

      // Create the new Counter Part
      var newCP = new CounterPart(dto);
      newCP.Guid = Guid.NewGuid();

      newCP.AppUsers = await _context.AppUsers.FindAsync(dto.updatedbyid);
      if (newCP.AppUsers == null)
      {
        return BadRequest(new { message = "The referenced AppUser does not exist." });
      }

      if (newCP.Transporter != null)
      {
        _context.Entry(newCP.Transporter).State = EntityState.Unchanged;
      }

      var addedCP = await _repository.Add(newCP);
      if (addedCP == null)
      {
        return BadRequest("Failed to add the new Counter Part");
      }

      // Return the created article with its history
      return Ok(new { cpId = addedCP.Id, message = "Counter Part Added Succefully" });
      //return CreatedAtAction(nameof(Get), new { dto!.id }, dto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _provider = await _repository.Get(id);
      if (_provider == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CounterPartDto?>> Put(int id, CounterPartDto dto)
    {
      // Fetch the existing entity by id
      var existingCounterpart = await _repository.Get(id);
      if (existingCounterpart == null)
      {
        return NotFound();
      }

      // Check if there's another Counter Part with the same reference but a different ID
      var counterpartWithSameName = await _repository.ExistsAsync(dto);
      if (counterpartWithSameName != null && counterpartWithSameName.Dto!.id != id)
      {
        return Conflict(new { message = "Counter Part with the same Name already exists." });
      }

      // Update the properties using the constructor
      existingCounterpart.UpdateFromDto(dto);

      // Test the existence of Transporter
      if (existingCounterpart.Transporter != null)
      {
        _context.Entry(existingCounterpart.Transporter).State = EntityState.Added;
      }

      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingCounterpart);
      if (updatedEntity != null)
      {
        var updatedDto = new CounterPartDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NoContent();
    }

    /**
     * return all Provider where IsDeleted == false.
     * 
     */

    [HttpGet("GetAll/{_type}")]
    public async Task<ActionResult<IEnumerable<CounterPartDto>>> GetAll(string _type)
    {
      var allDtos = await _repository.GetAllAsync(_type);
      return Ok(allDtos);
    }

    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> DeleteSoft(int id)
    {
      var _p = await _repository.Get(id);
      if (_p == null)
      {
        return NotFound();
      }
      _p.IsDeleted = true;
      var updateDel = await _repository.Update(_p);
      return Ok();
    }
  }
}
