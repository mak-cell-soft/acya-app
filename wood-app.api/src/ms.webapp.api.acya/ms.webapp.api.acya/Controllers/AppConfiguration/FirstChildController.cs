using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.Dtos.Config;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AppConfiguration
{
  public class FirstChildController : BaseApiController
  {
    private readonly FirstChildRepository _repository;

    public FirstChildController(FirstChildRepository firstChildRepository)
    {
      _repository = firstChildRepository;
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FirstChildDto?>> Put(int id, FirstChildDto dto)
    {
      // Fetch the existing entity by id
      var existingEntity = await _repository.Get(id);
      if (existingEntity == null)
      {
        return NotFound();
      }

      // Update the properties using the constructor
      existingEntity.UpdateFromDto(dto);
      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingEntity);
      if (updatedEntity != null)
      {
        var updatedDto = new FirstChildDto(updatedEntity);
        return Ok(updatedDto);
      }

      return NotFound();
    }

    
    [HttpDelete("DeleteHard/{id}")]
    public async Task<ActionResult> DeleteHard(int id)
    {
      var child = await _repository.Get(id);
      if (child == null)
      {
        return NotFound();
      }
      await _repository.Delete(id);
      return NoContent();
    }

    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> DeleteSoft(int id)
    {
      var child = await _repository.Get(id);
      if (child == null)
      {
        return NotFound();
      }
      child.IsDeleted = true;
      var updateDel = await _repository.Update(child);
      return Ok();
    }
  }
}
