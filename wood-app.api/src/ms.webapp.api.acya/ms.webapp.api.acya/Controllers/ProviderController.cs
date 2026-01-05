using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
  public class ProviderController : BaseApiController
  {
    public readonly ProviderRepository _repository;

    public ProviderController(ProviderRepository repository)
    {
      _repository = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<ProviderDto>> Add(ProviderDto dto)
    {
      // Check if the Provider with the given reference already exists
      var existingProvider = await _repository.GetByName(dto.name!);
      if (existingProvider != null)
      {
        return Conflict("Article with Given Reference Already exists");
      }

      // Create the new article
      var newProvider = new Provider(dto);
      var addedProvider = await _repository.Add(newProvider);

      if (addedProvider == null)
      {
        return BadRequest("Failed to add the new Provider");
      }

      // Return the created article with its history
      return CreatedAtAction(nameof(Get), new { dto!.id }, dto);
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

    /**
     * return all Provider where IsDeleted == false.
     * 
     */

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProviderDto>>> GetAll()
    {
      var allDtos = await _repository.GetAllAsync();
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
