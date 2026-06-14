using Microsoft.AspNetCore.Mvc;
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

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.SuperAdminUsers.FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !user.IsActive)
                return Unauthorized("Invalid credentials or inactive user.");

            // Using simple password check for prototype. Needs BCrypt in real impl.
            if (user.PasswordHash != request.Password)
                return Unauthorized("Invalid credentials.");

            var token = _tokenService.CreateToken(user);

            return Ok(new AuthResponse
            {
                Token = token,
                Username = user.Username,
                Role = "SUPER_ADMIN"
            });
        }
    }
}
