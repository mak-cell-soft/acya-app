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
using ms.webapp.api.acya.core.Entities.Dtos;
using Microsoft.AspNetCore.Authorization;

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

      if (user == null) return Unauthorized(new UserAuthDto
      {
        isSuccess = false,
        message = "Email non valide !",
      });

      using var hmac = new HMACSHA512(user.PasswordSalt!);
      var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.password!));

      for (int i = 0; i < computedHash.Length; i++)
      {
        if (computedHash[i] != user.PasswordHash![i]) return Unauthorized(new UserAuthDto
        {
          fullname = user.Persons!.FullName,
          isSuccess = false,
          message = "Mot de Passe Non Valide"
        });
      }

      var ent = await _context.Enterprises.FindAsync(user.EnterpriseId);
      if (ent == null) return Unauthorized(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = false,
        message = "Entreprise Introuvable"
      });

      if (ent.Guid.ToString() != loginDto.enterpriseRef) return Unauthorized(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = false,
        message = "Référence de l'Entreprise non Valide"
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
