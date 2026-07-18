using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
  public class PersonController : BaseApiController
  {
    private readonly PersonRepository _repository;

    public PersonController(PersonRepository repository)
    {
      _repository = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<PersonDto>> Add(PersonDto personDto)
    {
      if (personDto != null)
      {
        var person = new Person(personDto);
        person.Guid= Guid.NewGuid();
        await _repository.Add(person);

        return Ok(new { personId = person.Id, message = "Person added successfully" });
      }
      else
      {
        return BadRequest("Either userDto or personDto must be provided.");
      }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var pers = await _repository.Get(id);
      if (pers == null)
      {
        return NotFound();
      }
      if (User.IsInRole("Admin") || User.IsInRole("SuperAdmin"))
      {
        return Ok(new PersonDto(pers));
      }
      return Ok(new PersonSafeDto(pers));
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
      var allpersons = await _repository.GetAllAsync();
      if (User.IsInRole("Admin") || User.IsInRole("SuperAdmin"))
      {
        return Ok(allpersons);
      }
      var safePersons = allpersons.Select(pers => new PersonSafeDto(pers));
      return Ok(safePersons);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Put(int id, PersonDto dto)
    {
      // Fetch the existing entity by id
      var existingPerson = await _repository.Get(id);
      if (existingPerson == null)
      {
        return NotFound();
      }

      // Check if there's another Person with the same CIN but a different ID
      var personWithSameCIN = await _repository.GetByCIN(dto.cin!);
      if (personWithSameCIN != null && personWithSameCIN.Id != id)
      {
        return Conflict(new { message = "A Person with the same CIN already exists." });
      }

      // Update the properties using the constructor
      dto.guid = existingPerson.Guid.ToString();
      existingPerson.UpdateFromDto(dto);

      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingPerson);
      if (updatedEntity != null)
      {
        if (User.IsInRole("Admin") || User.IsInRole("SuperAdmin"))
        {
          return Ok(new PersonDto(updatedEntity));
        }
        return Ok(new PersonSafeDto(updatedEntity));
      }
      return NoContent();
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
