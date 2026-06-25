using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.core.Entities.DTOs;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
  public class EnterpriseController : BaseApiController
  {
    private readonly EnterpriseRepository _repository;
    private readonly AppUserRepository _userRepository;
    private readonly SalesSitesRepository _salesSitesRepository;
    private readonly MasterDbContext _masterDb;
    private readonly TenantContext _tenantContext;

    public EnterpriseController(EnterpriseRepository repository, AppUserRepository userrepository, SalesSitesRepository salessitesrepository, MasterDbContext masterDb, TenantContext tenantContext)
    {
      _repository = repository;
      _userRepository = userrepository;
      _salesSitesRepository = salessitesrepository;
      _masterDb = masterDb;
      _tenantContext = tenantContext;
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

        if (newEnterprise.Sites != null)
        {
          if (dto.user.defaultSiteIndex.HasValue && newEnterprise.Sites.Count > dto.user.defaultSiteIndex.Value)
          {
            user.IdSalesSite = newEnterprise.Sites.ElementAt(dto.user.defaultSiteIndex.Value).Id;
          }
          else if (newEnterprise.Sites.Count == 1)
          {
            user.IdSalesSite = newEnterprise.Sites.First().Id;
          }
        }

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

    [HttpGet("config")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<ActionResult> GetConfig()
    {
      if (!_tenantContext.IsEnabled)
      {
        return BadRequest(new { error = "No active tenant context." });
      }

      var tenant = await _masterDb.TenantRegistries
        .FirstOrDefaultAsync(t => t.Slug == _tenantContext.Slug);

      if (tenant == null)
      {
        return NotFound(new { error = "Tenant not found in registry." });
      }

      return Ok(new
      {
        name = tenant.Name,
        logoUrl = tenant.LogoUrl,
        faviconUrl = tenant.FaviconUrl,
        primaryColor = tenant.PrimaryColor,
        language = tenant.Language,
        currency = tenant.Currency,
        status = tenant.Status
      });
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

      // Synchronize branding settings with central Master Registry
      if (_tenantContext.IsEnabled)
      {
        var registry = await _masterDb.TenantRegistries
          .FirstOrDefaultAsync(t => t.Slug == _tenantContext.Slug);

        if (registry != null)
        {
          registry.LogoUrl = dto.logoUrl;
          registry.FaviconUrl = dto.faviconUrl;
          registry.PrimaryColor = dto.primaryColor;
          registry.CustomDomain = dto.customDomain;
          registry.Language = dto.language;
          registry.Currency = dto.currency;
          await _masterDb.SaveChangesAsync();
        }
      }

      return Ok(new { message = "Enterprise updated successfully" });
    }
  }
}
