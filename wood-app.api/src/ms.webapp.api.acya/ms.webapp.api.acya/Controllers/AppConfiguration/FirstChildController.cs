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

      // System subcategory protection: BD, BB, BR references cannot be modified (description can be updated)
      string[] systemRefs = { "BD", "BB", "BR" };
      if (existingEntity.Reference != null && systemRefs.Contains(existingEntity.Reference.Trim().ToUpperInvariant()))
      {
        dto.reference = existingEntity.Reference;
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
      string[] systemRefs = { "BD", "BB", "BR" };
      if (child.Reference != null && systemRefs.Contains(child.Reference.Trim().ToUpperInvariant()))
      {
        return BadRequest("Les sous-catégories système (BD, BB, BR) ne peuvent pas être supprimées.");
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
      string[] systemRefs = { "BD", "BB", "BR" };
      if (child.Reference != null && systemRefs.Contains(child.Reference.Trim().ToUpperInvariant()))
      {
        return BadRequest("Les sous-catégories système (BD, BB, BR) ne peuvent pas être supprimées.");
      }
      child.IsDeleted = true;
      var updateDel = await _repository.Update(child);
      return Ok();
    }
  }
}
