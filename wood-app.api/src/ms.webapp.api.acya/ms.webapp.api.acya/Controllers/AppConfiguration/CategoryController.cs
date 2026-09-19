using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities.Dtos.Config;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AppConfiguration
{
  public class CategoryController : BaseApiController
  {
    private readonly ParentRepository _repositroy;
    public CategoryController(ParentRepository repository)
    {
      _repositroy = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<CategoryDto>?> Add(CategoryDto category)
    {
      // Check if the Category already exists in the repository by unique identifier : reference
      var existingCategory = await _repositroy.GetByReferenceAsync(category.reference!);
      if (existingCategory != null)
      {
        if (existingCategory.IsDeleted)
        {
          // Re-activate previously soft-deleted category
          existingCategory.IsDeleted = false;
          existingCategory.Description = category.description;
          existingCategory.UpdateDate = DateTime.UtcNow;
          await _repositroy.Update(existingCategory);
          return Ok(new CategoryDto(existingCategory));
        }
        return Conflict("Category with the given Reference already exists."); // Return 409 Conflict if active category exists
      }
      var _category = new Parent(category);
      var addedcategory = await _repositroy.Add(_category);
      category.id = addedcategory.Id; // Update the DTO with the generated ID
      return CreatedAtAction(nameof(Get), new { id = category!.id }, category);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> Get(int id)
    {
      var _category = await _repositroy.GetByIdAsync(id);
      if (_category == null || _category.IsDeleted)
      {
        return NotFound();
      }
      return Ok(new CategoryDto(_category));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
    {
      // GetAllAsync returns all active categories and active sub-categories
      var allCatDtos = await _repositroy.GetAllAsync();
      return Ok(allCatDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto?>> Put(int id, CategoryDto dto)
    {
      // Fetch the existing entity by id
      var existingEntity = await _repositroy.Get(id);
      if (existingEntity == null || existingEntity.IsDeleted)
      {
        return NotFound();
      }

      // System category protection: BOIS reference cannot be modified (description can be updated)
      if (existingEntity.Reference != null && existingEntity.Reference.Trim().Equals("BOIS", StringComparison.OrdinalIgnoreCase))
      {
        dto.reference = existingEntity.Reference;
      }

      if (dto.firstchildren != null)
      {
        // Check if any firstchildren have isNew set to true
        bool anyFirstChildrenIsNew = dto.firstchildren.Any(child => (bool)child.isNew!);
        if (anyFirstChildrenIsNew)
        {
          // Update the entity with the dto
          existingEntity.UpdateFromDto(dto);
        }
        else
        {
          // Nullify or ignore firstchildren to prevent re-insertion
          dto.firstchildren = null;
          existingEntity.UpdateFromDto(dto);
        }
      }
      else
      {
        // Update the entity with the dto if no firstchildren to check
        existingEntity.UpdateFromDto(dto);
      }

      // Update the properties using the constructor
      existingEntity.UpdateFromDto(dto);

      // Update the entity in the repository
      var updatedEntity = await _repositroy.Update(existingEntity);
      if (updatedEntity != null)
      {
        var updatedDto = new CategoryDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NotFound();
    }

    [HttpDelete("{id}")]
    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> Delete(int id)
    {
      var category = await _repositroy.GetByIdAsync(id);
      if (category == null || category.IsDeleted)
      {
        return NotFound("Catégorie introuvable.");
      }

      // System category protection: BOIS reference cannot be deleted
      if (category.Reference != null && category.Reference.Trim().Equals("BOIS", StringComparison.OrdinalIgnoreCase))
      {
        return BadRequest("La catégorie système BOIS ne peut pas être supprimée.");
      }

      var deleted = await _repositroy.SoftDeleteAsync(id);
      if (!deleted)
      {
        return NotFound("Catégorie introuvable ou déjà supprimée.");
      }

      return NoContent();
    }

  }
}
