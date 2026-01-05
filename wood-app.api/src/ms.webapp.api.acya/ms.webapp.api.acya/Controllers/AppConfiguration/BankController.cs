using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AppConfiguration
{
  public class BankController : BaseApiController
  {
    private readonly BankRepository _repository;
    public BankController(BankRepository repository) 
    {
      _repository = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<BankDto>?> Add(BankDto bank)
    {
      // Check if the bank account already exists in the repository by unique identifier : rib
      var existingBank = await _repository.GetByRibAsync(bank.rib!);
      if (existingBank != null)
      {
        return Conflict("Bank with given rib already exist."); // Return 409 Conflict if category exists
      }
      var _bank = new Bank(bank);
      var addedBank = await _repository.Add(_bank);
      bank.id = addedBank.Id; // Update the DTO with the generated ID
      return CreatedAtAction(nameof(Get), new { id = bank!.id }, bank);
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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BankDto>>> GetAll()
    {
      var allBankDtos = await _repository.GetAllAsync();
      return Ok(allBankDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BankDto?>> Put(int id, BankDto dto)
    {
      // Fetch the existing entity by id
      var existingBank = await _repository.Get(id);
      if (existingBank == null)
      {
        return NotFound();
      }
      // Update the properties using the constructor
      existingBank.UpdateFromDto(dto);
      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingBank);
      if (updatedEntity != null)
      {
        var updatedDto = new BankDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NotFound();
    }
  }
}
