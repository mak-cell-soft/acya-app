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
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Controllers.Authentication
{
  public class AccountController : BaseApiController
  {
    private readonly WoodAppContext _context;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;
    private readonly IAppNotificationService _notificationService;

    public AccountController(
        WoodAppContext context, 
        ITokenService tokenService, 
        TenantContext tenantContext,
        IAppNotificationService notificationService)
    {
      _context = context;
      _tokenService = tokenService;
      _tenantContext = tenantContext;
      _notificationService = notificationService;
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

        if (user.EnterpriseId.HasValue)
        {
          user.Enterprise = await _context.Enterprises.FindAsync(user.EnterpriseId.Value);
        }

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
      user.Enterprise = ent;
      
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
      if (user == null) return Ok(new { message = "Si cet email existe, un code de réinitialisation a été généré." });

      var tokenBytes = new byte[32];
      RandomNumberGenerator.Fill(tokenBytes);
      var rawToken = Convert.ToHexString(tokenBytes).ToUpper();
      var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToUpper();

      user.PasswordResetToken = tokenHash;
      user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);

      await _context.SaveChangesAsync();

      // Build dynamic base URL based on Request headers
      var scheme = Request.Scheme;
      var host = Request.Host.Value;
      string baseUrl = $"{scheme}://{host}";

      if (Request.Headers.TryGetValue("Origin", out var originHeader) && !string.IsNullOrEmpty(originHeader))
      {
        baseUrl = originHeader.ToString().TrimEnd('/');
      }
      else if (Request.Headers.TryGetValue("Referer", out var refererHeader) && !string.IsNullOrEmpty(refererHeader))
      {
        try
        {
          var uri = new Uri(refererHeader.ToString());
          baseUrl = $"{uri.Scheme}://{uri.Authority}";
        }
        catch { /* fallback to default */ }
      }

      var resetUrl = $"{baseUrl}/forgot-password?token={rawToken}";

      // Send password reset email
      var emailSubject = "Réinitialisation de votre mot de passe - ACYA";
      var emailBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;"">
  <h2 style=""color: #3b82f6; text-align: center;"">Réinitialisation de votre mot de passe</h2>
  <p>Bonjour,</p>
  <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte ACYA.</p>
  <p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le bouton ci-dessous (ce lien est valable pendant 15 minutes) :</p>
  <div style=""text-align: center; margin: 30px 0;"">
    <a href=""{resetUrl}"" style=""background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Réinitialiser mon mot de passe</a>
  </div>
  <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
  <p style=""word-break: break-all; color: #3b82f6;""><a href=""{resetUrl}"">{resetUrl}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
  <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
  <p style=""font-size: 12px; color: #6b7280; text-align: center;"">Ceci est un message automatique, veuillez ne pas y répondre.</p>
</div>";

      await _notificationService.SendEmailNotificationAsync(user.Email!, emailSubject, emailBody, user.Id);

      return Ok(new
      {
        message = "Si cet email existe, un code de réinitialisation a été généré."
      });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword(PasswordResetDto dto)
    {
      if (string.IsNullOrEmpty(dto.Token))
      {
        return BadRequest("Code invalide ou expiré.");
      }

      var incomingHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dto.Token.ToUpper()))).ToUpper();

      var user = await _context.AppUsers.FirstOrDefaultAsync(u =>
          u.PasswordResetToken == incomingHash && u.PasswordResetTokenExpiry > DateTime.UtcNow);

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
