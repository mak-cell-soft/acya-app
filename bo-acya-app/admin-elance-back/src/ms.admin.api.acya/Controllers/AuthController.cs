using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.Services;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly MasterDbContext _context;
        private readonly TokenService _tokenService;

        public AuthController(MasterDbContext context, TokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [EnableRateLimiting("AuthLimiter")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return Unauthorized("Invalid credentials.");

            var user = await _context.SuperAdminUsers.FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !user.IsActive)
                return Unauthorized("Invalid credentials or inactive user.");

            if (!PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials.");

            // Transparently upgrade legacy plain-text hashes to PBKDF2 on successful login
            if (!user.PasswordHash.StartsWith("PBKDF2$"))
            {
                user.PasswordHash = PasswordHasher.HashPassword(request.Password);
                await _context.SaveChangesAsync();
            }

            var token = _tokenService.CreateToken(user);

            return Ok(new AuthResponse
            {
                Token = token,
                Username = user.Username,
                Role = "SUPER_ADMIN"
            });
        }

        [Authorize]
        [HttpPost("update-password")]
        public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordRequest request)
        {
            var username = User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value;
            if (string.IsNullOrEmpty(username))
                return Unauthorized("User is not authenticated.");

            var user = await _context.SuperAdminUsers.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || !user.IsActive)
                return Unauthorized("User not found or inactive.");

            if (!PasswordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
                return BadRequest("Le mot de passe actuel est incorrect.");

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 12)
                return BadRequest("Le nouveau mot de passe doit contenir au moins 12 caractères.");

            user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Mot de passe mis à jour avec succès." });
        }

        [Authorize]
        [HttpPost("update-username")]
        public async Task<IActionResult> UpdateUsername([FromBody] UpdateUsernameRequest request)
        {
            var currentUsername = User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value;
            if (string.IsNullOrEmpty(currentUsername))
                return Unauthorized("User is not authenticated.");

            if (string.IsNullOrWhiteSpace(request.NewUsername) || request.NewUsername.Trim().Length < 3)
                return BadRequest("Le nom d'utilisateur doit contenir au moins 3 caractères.");

            var newUsername = request.NewUsername.Trim();

            if (!System.Text.RegularExpressions.Regex.IsMatch(newUsername, @"^[a-zA-Z0-9_\-\.@]+$"))
                return BadRequest("Le nom d'utilisateur contient des caractères invalides.");

            var user = await _context.SuperAdminUsers.FirstOrDefaultAsync(u => u.Username == currentUsername);
            if (user == null || !user.IsActive)
                return Unauthorized("User not found or inactive.");

            if (user.Username == newUsername)
                return Ok(new AuthResponse { Token = _tokenService.CreateToken(user), Username = user.Username, Role = "SUPER_ADMIN" });

            var exists = await _context.SuperAdminUsers.AnyAsync(u => u.Username == newUsername);
            if (exists)
                return BadRequest("Ce nom d'utilisateur est déjà utilisé.");

            user.Username = newUsername;
            await _context.SaveChangesAsync();

            var newToken = _tokenService.CreateToken(user);

            return Ok(new AuthResponse
            {
                Token = newToken,
                Username = user.Username,
                Role = "SUPER_ADMIN"
            });
        }
    }
}
