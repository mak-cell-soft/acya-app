using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using ms.webapp.api.acya.Interfaces;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ms.webapp.api.acya.core.Entities.Dtos;
using Microsoft.AspNetCore.Authorization;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.api.Controllers.Authentication
{
  public class AccountController : BaseApiController
  {
    private readonly WoodAppContext _context;
    private readonly ITokenService _tokenService;
    public AccountController(WoodAppContext context, ITokenService tokenService)
    {
      _context = context;
      _tokenService = tokenService;
    }

    [Authorize]
    [HttpGet("profile/{id}")]
    public async Task<ActionResult<AppUserDto>> GetProfile(int id)
    {
      var user = await _context.AppUsers
        .Include(u => u.Persons)
        .SingleOrDefaultAsync(u => u.Id == id);

      if (user == null) 
      {
        return NotFound();
      }

      return Ok(new AppUserDto(user));
    }

    [Authorize]
    [HttpPut("update-profile")]
    public async Task<ActionResult> UpdateProfile(ProfileUpdateDto profileUpdateDto)
    {
      var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

      var user = await _context.AppUsers
        .Include(u => u.Persons)
        .SingleOrDefaultAsync(u => u.Id == userId);

      if (user == null) return NotFound();

      user.Email = profileUpdateDto.Email?.ToLower();
      user.Login = profileUpdateDto.Login?.ToLower();
      
      if (user.Persons != null)
      {
        user.Persons.Firstname = Helpers.CapitalizeFirstLetter(profileUpdateDto.FirstName ?? "");
        user.Persons.Lastname = profileUpdateDto.LastName?.ToUpper() ?? "";
        user.Persons.FullName = $"{user.Persons.Firstname} {user.Persons.Lastname}";
        user.Persons.PhoneNumber = profileUpdateDto.PhoneNumber;
        user.Persons.Address = profileUpdateDto.Address;
      }

      await _context.SaveChangesAsync();

      return Ok(new { message = "Profile updated successfully" });
    }
    
    [Authorize]
    [HttpPut("update-password")]
    public async Task<ActionResult> UpdatePassword(PasswordUpdateDto passwordUpdateDto)
    {
      var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

      var user = await _context.AppUsers.FindAsync(userId);

      if (user == null) return NotFound();

      if (string.IsNullOrEmpty(passwordUpdateDto.OldPassword) || string.IsNullOrEmpty(passwordUpdateDto.NewPassword))
      {
          return BadRequest("Old and new passwords are required");
      }

      using var hmacOld = new HMACSHA512(user.PasswordSalt!);
      var computedHash = hmacOld.ComputeHash(Encoding.UTF8.GetBytes(passwordUpdateDto.OldPassword));

      for (int i = 0; i < computedHash.Length; i++)
      {
        if (computedHash[i] != user.PasswordHash![i]) 
        {
          return BadRequest("Invalid old password");
        }
      }

      using var hmacNew = new HMACSHA512();
      user.PasswordHash = hmacNew.ComputeHash(Encoding.UTF8.GetBytes(passwordUpdateDto.NewPassword));
      user.PasswordSalt = hmacNew.Key;

      await _context.SaveChangesAsync();

      return Ok(new { message = "Password updated successfully" });
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<UserAuthDto>> Register(AppUserDto registerDto)
    {
      if (await UserExists(registerDto.login!)) return BadRequest(new UserAuthDto
      {
        isSuccess = false,
        message = "Email already exists"
      }); ;

      using var hmac = new HMACSHA512();
      var user = new AppUser
      {
        Login = registerDto.login!.ToLower() ?? "",
        PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(registerDto.password!)),
        PasswordSalt = hmac.Key,
        Email = registerDto.email!.ToLower(),
        IdSalesSite = registerDto.defaultsite,
        EnterpriseId = registerDto.identerprise,
        Persons = new Person(registerDto.person!)
      };

      //user.Persons.Guid = Guid.NewGuid();

      _context.AppUsers.Add(user);
      await _context.SaveChangesAsync();

      return Ok(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = true,
        message = "Register Success",
        token = _tokenService.CreateToken(user)
      });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<UserAuthDto>> Login(LoginRequestDto loginDto)
    {
      var user = await _context.AppUsers
        .Include(u => u.SalesSite)
        .Include(u => u.Persons)
        .SingleOrDefaultAsync(u => u.Email == loginDto.login || u.Login == loginDto.login);

      if (user == null) return Ok(new UserAuthDto
      {
        isSuccess = false,
        message = "Email non valide",
      });

      using var hmac = new HMACSHA512(user.PasswordSalt!);
      var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.password!));

      for (int i = 0; i < computedHash.Length; i++)
      {
        if (computedHash[i] != user.PasswordHash![i]) return Ok(new UserAuthDto
        {
          fullname = user.Persons!.FullName,
          isSuccess = false,
          message = "Mot de passe non valide"
        });
      }

      var ent = await _context.Enterprises.FindAsync(user.EnterpriseId);
      if (ent == null) return Ok(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = false,
        message = "Entreprise introuvable"
      });

      if (ent.Guid.ToString() != loginDto.enterpriseRef) return Ok(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = false,
        message = "Référence de l'entreprise non valide"
      });

      return Ok(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = true,
        message = "Authentification avec Succés",
        token = _tokenService.CreateToken(user)
      });
    }
    private async Task<bool> UserExists(string login)
    {
      return await _context.AppUsers.AnyAsync(x => x.Email!.ToLower() == login.ToLower());
    }

  }
}
