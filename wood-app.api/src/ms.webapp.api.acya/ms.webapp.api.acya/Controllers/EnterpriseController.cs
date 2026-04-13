using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.core.Entities.DTOs;
using Microsoft.IdentityModel.Tokens;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  public class EnterpriseController : BaseApiController
  {
    private readonly EnterpriseRepository _repository;
    private readonly AppUserRepository _userRepository;
    private readonly SalesSitesRepository _salesSitesRepository;

    public EnterpriseController(EnterpriseRepository repository, AppUserRepository userrepository, SalesSitesRepository salessitesrepository)
    {
      _repository = repository;
      _userRepository = userrepository;
      _salesSitesRepository = salessitesrepository;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Add(EnterpriseDto dto)
    {
      if (dto == null)
      {
        return BadRequest("Enterprise DTO must be provided.");
      }

      var existingEnterprise = await _repository.GetByMF(dto.matriculeFiscal!);
      if (existingEnterprise != null)
      {
        return BadRequest("Enterprise exists");
      }

      var newEnterprise = new Enterprise(dto);
      newEnterprise.Guid = Guid.NewGuid();
      await _repository.Add(newEnterprise);

      var usersToUpdate = await _userRepository.GetAllAppUsersAsync();

      if (usersToUpdate != null && usersToUpdate!.Any())
      {
        foreach (var user in usersToUpdate)
        {
          user.EnterpriseId = newEnterprise.Id;
          await _userRepository.Update(user);
        }
      }

      // Track the real AppUser ID to use in the seed script.
      // NOTE: We CANNOT assume this will be 1 — PostgreSQL sequences increment even
      // on rolled-back transactions, so after any prior failed attempt the first
      // successful insert may get id = 2, 3, etc.
      int seedAppUserId = 0;

      if (dto.user != null)
      {
        var userDto = dto.user.MoveToAppUserDto();
        var user = new AppUser(userDto);
        user.EnterpriseId = newEnterprise.Id;

        if (await _userRepository.Add(user) != null)
        {
          // Capture the real auto-generated ID assigned by the DB
          seedAppUserId = user.Id;
          user.Persons!.UpdadatedById = seedAppUserId;
          await _userRepository.Update(user);
        }
      }

      if (newEnterprise.IsSalingWood == true)
      {
        // Pass the real AppUser ID so the seed script uses the correct foreign key
        await _repository.ExecuteSeedWoodScript(seedAppUserId);
      }

      return Ok(new { entId = newEnterprise.Id, message = "Enterprise added successfully" });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EnterpriseDto>> Get(int id)
    {
      var _ent = await _repository.Get(id);
      if (_ent == null)
      {
        return NotFound();
      }
      var _entDto = new EnterpriseDto(_ent);
      return Ok(_entDto);
    }

    [HttpGet("getbyid/{id}")]
    public async Task<ActionResult<EnterpriseDto>> GetById(int id)
    {
      var _dto = await _repository.GetByIdAsync(id);
      if (_dto == null)
      {
        return NotFound(new {message = "Id de l'Entreprise non valide"});
      }
      return Ok(_dto);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, EnterpriseDto dto)
    {
      if (id != dto.id)
      {
        return BadRequest("ID mismatch");
      }

      var existing = await _repository.Get(id);
      if (existing == null)
      {
        return NotFound();
      }

      existing.UpdateFromDto(dto);
      await _repository.Update(existing);

      return Ok(new { message = "Enterprise updated successfully" });
    }
  }
}
