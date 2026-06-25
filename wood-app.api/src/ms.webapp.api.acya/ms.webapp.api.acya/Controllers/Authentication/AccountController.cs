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
    private readonly TenantContext _tenantContext;
    public AccountController(WoodAppContext context, ITokenService tokenService, TenantContext tenantContext)
    {
      _context = context;
      _tokenService = tokenService;
      _tenantContext = tenantContext;
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
        .FirstOrDefaultAsync(u => u.Id == userId);

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
      // Enforce subscription plan limits
      if (_tenantContext.IsEnabled)
      {
        var currentUsersCount = await _context.AppUsers.CountAsync();
        var maxUsers = _tenantContext.Plan.ToLowerInvariant() switch
        {
          "trial" => 5,
          "starter" => 5,
          "pro" => 25,
          _ => int.MaxValue
        };

        if (currentUsersCount >= maxUsers)
        {
          return BadRequest(new UserAuthDto
          {
            isSuccess = false,
            message = $"La limite d'utilisateurs pour votre abonnement ({_tenantContext.Plan} : {maxUsers} max) a été atteinte."
          });
        }
      }

      if (await UserExists(registerDto.email!)) return BadRequest(new UserAuthDto
      {
        isSuccess = false,
        message = "L'email existe déjà"
      });

      if (await _context.AppUsers.AnyAsync(x => x.Login!.ToLower() == registerDto.login!.ToLower())) return BadRequest(new UserAuthDto
      {
        isSuccess = false,
        message = "L'identifiant existe déjà"
      });

      using var hmac = new HMACSHA512();
      var user = new AppUser
      {
        Login = registerDto.login!.ToLower() ?? "",
        PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(registerDto.password!)),
        PasswordSalt = hmac.Key,
        Email = registerDto.email!.ToLower(),
        IdSalesSite = registerDto.defaultsite,
        EnterpriseId = registerDto.identerprise,
        IsActive = registerDto.isactive
      };

      if (registerDto.person != null && registerDto.person.id > 0)
      {
        var existingPerson = await _context.Persons.FindAsync(registerDto.person.id);
        if (existingPerson != null)
        {
          existingPerson.Role = (Roles)registerDto.person.role;
          existingPerson.IsAppUser = true;
          user.Persons = existingPerson;
        }
        else
        {
          user.Persons = new Person(registerDto.person);
          user.Persons.IsAppUser = true;
        }
      }
      else if (registerDto.person != null)
      {
        user.Persons = new Person(registerDto.person);
        user.Persons.IsAppUser = true;
      }
      else
      {
        user.Persons = new Person
        {
          Guid = Guid.NewGuid(),
          Firstname = registerDto.login,
          Lastname = "",
          FullName = registerDto.login,
          Role = Roles.User,
          IsAppUser = true,
          CreationDate = DateTime.Now,
          UpdateDate = DateTime.Now
        };
      }

      try
      {
        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new UserAuthDto
        {
          fullname = user.Persons?.FullName ?? "",
          isSuccess = true,
          message = "Register Success",
          token = _tokenService.CreateToken(user, null)
        });
      }
      catch (Exception ex)
      {
        return StatusCode(500, new { message = "Erreur interne lors de la création de l'utilisateur: " + (ex.InnerException?.Message ?? ex.Message) });
      }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<UserAuthDto>> Login(LoginRequestDto loginDto)
    {
      var user = await _context.AppUsers
        .Include(u => u.SalesSite)
        .Include(u => u.Persons)
        .FirstOrDefaultAsync(u => (u.Email == loginDto.login || u.Login == loginDto.login) && u.IsActive == true);

      if (user == null) return Ok(new UserAuthDto
      {
        isSuccess = false,
        message = "Email ou mot de passe non valide",
      });

      using var hmac = new HMACSHA512(user.PasswordSalt!);
      var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.password!));

      if (!CryptographicOperations.FixedTimeEquals(computedHash, user.PasswordHash!))
      {
        return Ok(new UserAuthDto
        {
          fullname = user.Persons!.FullName,
          isSuccess = false,
          message = "Email ou mot de passe non valide"
        });
      }

      var ent = await _context.Enterprises.FindAsync(user.EnterpriseId);
      
      var userPerms = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == user.Id);
      
      return Ok(new UserAuthDto
      {
        fullname = user.Persons!.FullName,
        isSuccess = true,
        message = "Authentification avec Succés",
        enterpriseName = ent?.Name,
        token = _tokenService.CreateToken(user, userPerms?.Permissions)
      });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword(PasswordResetRequestDto dto)
    {
      var user = await _context.AppUsers.FirstOrDefaultAsync(u => u.Email == dto.Email);
      if (user == null) return Ok(new { message = "Si cet email existe, un code a été généré." });

      var tokenBytes = new byte[4];
      RandomNumberGenerator.Fill(tokenBytes);
      user.PasswordResetToken = Convert.ToHexString(tokenBytes).ToUpper();
      user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);

      await _context.SaveChangesAsync();

      return Ok(new
      {
        expiresAt = user.PasswordResetTokenExpiry,
        message = "Code de réinitialisation généré avec succès."
      });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword(PasswordResetDto dto)
    {
      var user = await _context.AppUsers.FirstOrDefaultAsync(u =>
          u.PasswordResetToken == dto.Token && u.PasswordResetTokenExpiry > DateTime.UtcNow);

      if (user == null) return BadRequest("Code invalide ou expiré.");

      if (dto.NewPassword != dto.ConfirmPassword) return BadRequest("Les mots de passe ne correspondent pas.");

      using var hmac = new HMACSHA512();
      user.PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.NewPassword!));
      user.PasswordSalt = hmac.Key;
      user.PasswordResetToken = null;
      user.PasswordResetTokenExpiry = null;

      await _context.SaveChangesAsync();

      return Ok(new { message = "Mot de passe réinitialisé avec succès." });
    }
    private async Task<bool> UserExists(string login)
    {
      return await _context.AppUsers.AnyAsync(x => x.Email!.ToLower() == login.ToLower());
    }

  }
}
