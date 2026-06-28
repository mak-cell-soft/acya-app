using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
  public class SalesSitesController: BaseApiController
  {
    private readonly SalesSitesRepository _repository;
    private readonly EnterpriseRepository _enterpriseRepository;

    public SalesSitesController(SalesSitesRepository repository, EnterpriseRepository enterpriseRepository)
    {
      _repository= repository;
      _enterpriseRepository= enterpriseRepository;
    }

    [HttpPost("add")]
    public async Task<ActionResult> AddSalesSite(SiteDto salesSiteDto)
    {
      if (salesSiteDto == null)
      {
        return BadRequest("Sales site data must be provided.");
      }

      // Validate if the enterprise exists
      var enterprise = await _enterpriseRepository.GetByIdAsync(salesSiteDto.enterpriseid);
      if (enterprise == null)
      {
        return NotFound($"Enterprise with ID {salesSiteDto.enterpriseid} not found.");
      }

      // Create new SalesSite entity
      var newSalesSite = new SalesSite(salesSiteDto);

      // Add the sales site
      await _repository.Add(newSalesSite);

      return Ok(new { salesSiteId = newSalesSite.Id, message = "Sales site added successfully" });
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SiteDto>>> GetAll()
    {
      var allDtos = await _repository.GetAllAsync();
      return Ok(allDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Put(int id, SiteDto dto)
    {
      var existingSite = await _repository.Get(id);
      if (existingSite == null)
      {
        return NotFound();
      }

      // Ensure enterprise ID is preserved or validated
      if (!dto.enterpriseid.HasValue || dto.enterpriseid == 0)
      {
        dto.enterpriseid = existingSite.EnterpriseId;
      }

      existingSite.UpdatFromDto(dto);

      var updatedEntity = await _repository.Update(existingSite);
      if (updatedEntity != null)
      {
        return Ok(new SiteDto(updatedEntity));
      }
      return BadRequest("Failed to update the sales site.");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
      var existingSite = await _repository.Get(id);
      if (existingSite == null)
      {
        return NotFound();
      }

      existingSite.IsDeleted = true;

      var updatedEntity = await _repository.Update(existingSite);
      if (updatedEntity != null)
      {
        return Ok();
      }
      return BadRequest("Failed to delete the sales site.");
    }
  }
}
