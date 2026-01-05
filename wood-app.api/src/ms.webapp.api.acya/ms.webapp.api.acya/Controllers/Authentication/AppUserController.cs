using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.Authentication
{
  public class AppUserController : BaseApiController
  {
    private readonly AppUserRepository _repository;
    private readonly SalesSitesRepository _repositorySalesSite;
    private readonly WoodAppContext _context;

    public AppUserController(AppUserRepository repository, SalesSitesRepository repositorySalesSite, WoodAppContext context)
    {
      _repository = repository;
      _repositorySalesSite = repositorySalesSite;
      _context = context;
    }

    [HttpGet("id")]
    public async Task<ActionResult<AppUserDto>> GetById(int id)
    {
      var user = await _repository.GetById(id);
      return Ok(user);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppUserDto>>> GetAll()
    {
      var all = await _repository.GetAllAsync();
      return Ok(all);
    }

    [HttpGet("detail")]
    public async Task<ActionResult<AppUserDto>> GetUserDetails(int _id)
    {
      var user = await _repository.GetById(_id);
      if (user is null)
      {
        return Unauthorized(new UserAuthDto
        {
          isSuccess = false,
          message = "User not found"
        });
      }
      return Ok(user);
    }

    [HttpGet("getsite/{_id}")]
    public async Task<ActionResult<SiteDto>> GetUserSalesSite(int _id)
    {
      var user = await _repository.GetById(_id);
      if (user is null)
      {
        return Unauthorized(new UserAuthDto
        {
          isSuccess = false,
          message = "User not found"
        });
      }
      int _s = (int)user.defaultsite!;
      var sales_site = await _repositorySalesSite.Get(_s);
      if (sales_site != null)
      {
        return Ok(new SiteDto(sales_site));
      } else
      {
        return NotFound();
      }     
    }

    [HttpGet("getstringsite/{_id}")]
    public async Task<ActionResult<string>> GetUserSalesSiteAsString(int _id)
    {
      var user = await _repository.GetById(_id);
      if (user is null)
      {
        return Unauthorized(new UserAuthDto
        {
          isSuccess = false,
          message = "User not found"
        });
      }
      int _s = (int)user.defaultsite!;
      var sales_site = await _repositorySalesSite.Get(_s);
      if (sales_site != null)
      {
        return Ok(sales_site.Address);
      }
      else
      {
        return NotFound();
      }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AppUserDto?>> Put(int id, AppUserDto dto)
    {
      // Fetch the existing user
      var existingUser = await _repository.Get(id);
      if (existingUser == null)
      {
        return NotFound();
      }

      // Check if another user exists with the same email but a different ID
      var userWithSameEmail = await _repository.GetByEmailAsync(existingUser.Email!);
      if (userWithSameEmail != null && userWithSameEmail.Id != id)
      {
        return Conflict(new { message = "A Person with the same CIN already exists." });
      }

      // Update the `Person` and `AppUser` details from DTO
      dto.person!.updatedate = DateTime.Now;
      dto.person!.guid = userWithSameEmail?.Persons?.Guid.ToString();



      // Update the main `AppUser` and related `Person` using the DTO
      userWithSameEmail!.UpdateFromDto(dto);

      // Detach any tracked `Person` to avoid conflicts
      if (userWithSameEmail!.Persons != null)
      {
        _context.Entry(existingUser.Persons!).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
      }

      // Save the updated entity
      var updatedEntity = await _repository.Update(userWithSameEmail);
      if (updatedEntity != null)
      {
        // Return the updated DTO
        var updatedDto = new AppUserDto(updatedEntity);
        return Ok(updatedDto);
      }

      return NoContent();
    }


  }
}
