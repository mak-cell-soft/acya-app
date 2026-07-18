using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.Authentication
{
  [Authorize]
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
    public async Task<ActionResult> GetById(int id)
    {
      var user = await _repository.GetById(id);
      if (user == null) return NotFound();

      if (!(User.IsInRole("Admin") || User.IsInRole("SuperAdmin")))
      {
        return Ok(new AppUserPublicDto(user));
      }
      return Ok(user);
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
      var all = await _repository.GetAllAsync();
      if (!(User.IsInRole("Admin") || User.IsInRole("SuperAdmin")))
      {
        return Ok(all.Select(user => new AppUserPublicDto(user)));
      }
      return Ok(all);
    }

    [HttpGet("detail")]
    public async Task<ActionResult> GetUserDetails(int _id)
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
      if (!(User.IsInRole("Admin") || User.IsInRole("SuperAdmin")))
      {
        return Ok(new AppUserPublicDto(user));
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
      // Fetch the existing user WITH the related Person (needed to update both)
      var existingUser = await _context.AppUsers
          .Include(u => u.Persons)
          .FirstOrDefaultAsync(u => u.Id == id);

      if (existingUser == null)
        return NotFound(new { message = $"AppUser with id {id} not found." });

      // Check for duplicate email — only flag as conflict if it belongs to a DIFFERENT user
      if (!string.IsNullOrEmpty(dto.email))
      {
        var emailOwner = await _context.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == dto.email && u.Id != id);

        if (emailOwner != null)
          return Conflict(new { message = "A user with the same email already exists." });
      }

      // --- Update AppUser scalar fields ---
      existingUser.Login = dto.login;
      existingUser.Email = dto.email;
      existingUser.IsActive = dto.isactive;
      existingUser.IdSalesSite = dto.defaultsite;

      // --- Update nested Person fields if provided ---
      if (dto.person != null && existingUser.Persons != null)
      {
        var p = existingUser.Persons;
        var personDto = dto.person;

        // Preserve the existing GUID so we never generate a new one on update
        // (personDto.guid may be null/empty if the frontend didn't send it back)
        if (!string.IsNullOrEmpty(personDto.guid) &&
            Guid.TryParse(personDto.guid, out Guid parsedGuid))
        {
          p.Guid = parsedGuid;
        }

        p.Firstname   = ms.webapp.api.acya.common.Helpers.CapitalizeFirstLetter(personDto.firstname!);
        p.Lastname    = personDto.lastname?.ToUpper();
        p.FullName    = $"{personDto.firstname} {personDto.lastname?.ToUpper()}";
        p.BirthDate   = personDto.birthdate;
        p.Cin         = personDto.cin;
        p.IdCnss      = personDto.idcnss;
        p.Role        = Enum.TryParse(personDto.role.ToString(), out ms.webapp.api.acya.common.Roles parsedRole)
                          ? parsedRole
                          : ms.webapp.api.acya.common.Roles.Seller;
        p.Address     = personDto.address;
        p.BirthTown   = personDto.birthtown;
        p.BankName    = personDto.bankname;
        p.BankAccount = personDto.bankaccount;
        p.PhoneNumber = personDto.phonenumber;
        p.IsAppUser   = personDto.isappuser;
        p.IsDeleted   = personDto.isdeleted;
        // Use null-safe dates — never fall back to DateTime.MinValue/MaxValue for hire/firedate
        p.HireDate      = personDto.hiredate.HasValue ? personDto.hiredate : null;
        p.FireDate      = personDto.firedate.HasValue ? personDto.firedate : null;
        p.CreationDate  = personDto.creationdate.HasValue ? personDto.creationdate : p.CreationDate;
        p.UpdateDate    = DateTime.Now;
        p.UpdadatedById = personDto.updatedby;
      }

      try
      {
        await _context.SaveChangesAsync();
      }
      catch (Exception ex)
      {
        return StatusCode(500, new { message = "Update failed.", detail = ex.Message });
      }

      // Return the updated projection
      var updatedDto = new AppUserDto(existingUser);
      if (!(User.IsInRole("Admin") || User.IsInRole("SuperAdmin")))
      {
        return Ok(new AppUserPublicDto(updatedDto));
      }
      return Ok(updatedDto);
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpPut("{id}/set-password")]
    public async Task<ActionResult> SetPassword(int id, SetPasswordDto dto)
    {
      var existingUser = await _context.AppUsers.FindAsync(id);
      if (existingUser == null)
        return NotFound(new { message = $"AppUser with id {id} not found." });

      using var hmac = new System.Security.Cryptography.HMACSHA512();
      existingUser.PasswordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(dto.NewPassword));
      existingUser.PasswordSalt = hmac.Key;

      await _context.SaveChangesAsync();
      return Ok(new { message = "Password set successfully." });
    }


  }
}
