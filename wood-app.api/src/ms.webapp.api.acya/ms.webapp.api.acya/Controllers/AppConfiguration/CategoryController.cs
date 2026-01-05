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
        return Conflict("Category with the given Reference already exists."); // Return 409 Conflict if category exists
      }
      var _category = new Parent(category);
      var addedcategory = await _repositroy.Add(_category);
      category.id = addedcategory.Id; // Update the DTO with the generated ID
      return CreatedAtAction(nameof(Get), new { id = category!.id }, category);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _category = await _repositroy.Get(id);
      if (_category == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
    {
      // GetAllAsync is already modified in Repository (new GetAllAsync)
      var allCatDtos = await _repositroy.GetAllAsync();
      return Ok(allCatDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto?>> Put(int id, CategoryDto dto)
    {
      // Fetch the existing entity by id
      var existingEntity = await _repositroy.Get(id);
      if (existingEntity == null)
      {
        return NotFound();
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

  }
}
