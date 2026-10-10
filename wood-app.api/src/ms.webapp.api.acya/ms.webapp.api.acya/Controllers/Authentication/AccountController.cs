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
    private readonly IPasswordResetRateLimiter? _rateLimiter;
    private readonly ILogger<AccountController>? _logger;

    public AccountController(
        WoodAppContext context, 
        ITokenService tokenService, 
        TenantContext tenantContext,
        IAppNotificationService notificationService,
        IPasswordResetRateLimiter? rateLimiter = null,
        ILogger<AccountController>? logger = null)
    {
      _context = context;
      _tokenService = tokenService;
      _tenantContext = tenantContext;
      _notificationService = notificationService;
      _rateLimiter = rateLimiter;
      _logger = logger;
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
      const string genericPublicMessage = "Si un compte est associé à cette adresse e-mail, vous recevrez les instructions de réinitialisation.";

      // 1. Rate Limiting Protection (per IP and per email within current tenant)
      if (_rateLimiter != null)
      {
        var clientIp = ResolveClientIp();
        var tenantSlug = _tenantContext?.Slug?.ToLowerInvariant() ?? "default";
        if (!_rateLimiter.IsAllowed(clientIp, dto?.Email ?? string.Empty, tenantSlug, out var retryAfterSeconds))
        {
          _logger?.LogWarning("Rate limit exceeded for forgot-password from IP {ClientIp} in tenant {Tenant}", clientIp, tenantSlug);
          Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
          return StatusCode(StatusCodes.Status429TooManyRequests, new
          {
            message = "Trop de tentatives de réinitialisation. Veuillez réessayer dans quelques minutes."
          });
        }
      }

      if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
      {
        return Ok(new { message = genericPublicMessage });
      }

      var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
      var user = await _context.AppUsers.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail);
      if (user == null)
      {
        return Ok(new { message = genericPublicMessage });
      }

      // 2. Cryptographically secure 256-bit token generation
      var tokenBytes = new byte[32];
      RandomNumberGenerator.Fill(tokenBytes);
      var rawToken = Convert.ToHexString(tokenBytes).ToUpperInvariant();
      var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToUpperInvariant();

      user.PasswordResetToken = tokenHash;
      user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);
      await _context.SaveChangesAsync();

      // 3. Trusted tenant-based URL construction (Prevents Host Header / Origin Poisoning)
      var scheme = Request.Scheme;
      var tenantSlugForUrl = _tenantContext?.Slug?.ToLowerInvariant();
      string baseUrl;

      if (!string.IsNullOrEmpty(tenantSlugForUrl) && tenantSlugForUrl != "public")
      {
        var canonicalHost = $"{tenantSlugForUrl}.acya.site";
        var canonicalOrigin = $"https://{canonicalHost}";

        var originHeader = Request.Headers["Origin"].ToString();
        var refererHeader = Request.Headers["Referer"].ToString();

        if (IsTrustedOrigin(originHeader, canonicalHost))
        {
          baseUrl = originHeader.TrimEnd('/');
        }
        else if (IsTrustedOrigin(refererHeader, canonicalHost) && Uri.TryCreate(refererHeader, UriKind.Absolute, out var refUri))
        {
          baseUrl = $"{refUri.Scheme}://{refUri.Authority}";
        }
        else
        {
          baseUrl = canonicalOrigin;
        }
      }
      else
      {
        baseUrl = $"{scheme}://{Request.Host.Value}";
      }

      var resetUrl = $"{baseUrl}/forgot-password?token={rawToken}";

      // 4. Email construction
      var enterpriseName = _tenantContext?.Slug?.ToUpperInvariant() ?? "ACYA";
      var emailSubject = $"Réinitialisation de votre mot de passe - {enterpriseName}";
      var emailBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;"">
  <h2 style=""color: #3b82f6; text-align: center;"">Réinitialisation de votre mot de passe</h2>
  <p>Bonjour,</p>
  <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur <strong>{enterpriseName}</strong>.</p>
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

      // 5. Dispatch email with sanitized message to avoid storing raw tokens in secondary storage
      const string sanitizedNotificationSummary = "Demande de réinitialisation de mot de passe générée pour le compte.";
      var dispatchResult = await _notificationService.SendEmailNotificationAsync(
          user.Email!,
          emailSubject,
          emailBody,
          user.Id,
          sanitizedMessage: sanitizedNotificationSummary);

      // 6. Diagnostics without leaking tokens or private URLs
      if (dispatchResult != null)
      {
        var tenantIdentifier = _tenantContext?.Slug ?? "unknown";
        if (dispatchResult.Status == EmailDispatchStatus.Accepted)
        {
          _logger?.LogInformation("Password reset email accepted by transport for user ID {UserId} in tenant {Tenant}", user.Id, tenantIdentifier);
        }
        else if (dispatchResult.Status == EmailDispatchStatus.Rejected)
        {
          _logger?.LogError("Password reset email transport rejected for user ID {UserId} in tenant {Tenant}: {Reason}", user.Id, tenantIdentifier, dispatchResult.ErrorMessage);
        }
        else if (dispatchResult.Status == EmailDispatchStatus.Unknown)
        {
          _logger?.LogWarning("Password reset email transport timed out / outcome unknown for user ID {UserId} in tenant {Tenant}: {Reason}", user.Id, tenantIdentifier, dispatchResult.ErrorMessage);
        }
      }

      return Ok(new
      {
        message = genericPublicMessage
      });
    }

    private string ResolveClientIp()
    {
      if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && !string.IsNullOrEmpty(forwarded))
      {
        var firstIp = forwarded.ToString().Split(',')[0].Trim();
        if (System.Net.IPAddress.TryParse(firstIp, out _))
        {
          return firstIp;
        }
      }

      if (Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrEmpty(realIp))
      {
        var trimmed = realIp.ToString().Trim();
        if (System.Net.IPAddress.TryParse(trimmed, out _))
        {
          return trimmed;
        }
      }

      return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    public static bool IsTrustedOrigin(string? originOrReferer, string canonicalHost)
    {
      if (string.IsNullOrWhiteSpace(originOrReferer)) return false;
      if (!Uri.TryCreate(originOrReferer, UriKind.Absolute, out var uri)) return false;

      var host = uri.Host.ToLowerInvariant();
      if (string.Equals(host, canonicalHost, StringComparison.OrdinalIgnoreCase)) return true;
      if (host == "localhost" || host == "127.0.0.1" || host.EndsWith(".localhost")) return true;

      return false;
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
