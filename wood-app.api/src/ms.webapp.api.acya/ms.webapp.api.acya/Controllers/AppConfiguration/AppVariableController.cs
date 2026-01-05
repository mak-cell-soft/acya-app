using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AppConfiguration
{
  public class AppVariableController : BaseApiController
  {
    private readonly AppVariableRepository _repository;
    public AppVariableController(AppVariableRepository repository)
    {
      _repository = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<AppVariableDto>?> Add(AppVariableDto appvar)
    {
      // Check if the bank account already exists in the repository by unique identifier : rib
      var existingAppvariable = await _repository.GetByNameAsync(appvar.name!, appvar.GetFormattedValue()!);
      if (existingAppvariable != null)
      {
        return Conflict("AppVariable with given name and value already exist."); // Return 409 Conflict if category exists
      }
      var _appvar = new AppVariable(appvar);
      var addedAppVar = await _repository.Add(_appvar);
      appvar.id = addedAppVar.Id; // Update the DTO with the generated ID
      return CreatedAtAction(nameof(Get), new { id = appvar!.id }, appvar);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _bank = await _repository.Get(id);
      if (_bank == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpGet("getall/{nature}")]
    public async Task<ActionResult<IEnumerable<AppVariableDto>>> GetAll(string nature)
    {
      var allbyNature = await _repository.GetAllAsync(nature);
      var choosenDtos = allbyNature.Select
                        (u => new AppVariableDto(u!))
                        .ToList();
      return Ok(choosenDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AppVariableDto?>> Put(int id, AppVariableDto dto)
    {
      // Fetch the existing entity by id
      var existingAppVar = await _repository.Get(id);
      if (existingAppVar == null)
      {
        return NotFound();
      }
      // Update the properties using the constructor
      existingAppVar.UpdateFromDto(dto);
      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingAppVar);
      if (updatedEntity != null)
      {
        var updatedDto = new AppVariableDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NotFound();
    }


  }
}
 