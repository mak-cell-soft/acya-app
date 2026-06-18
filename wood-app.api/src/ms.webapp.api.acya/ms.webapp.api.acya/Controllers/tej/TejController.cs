using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services.tej;
using ms.webapp.api.acya.core.Entities.DTOs.tej;
using ms.webapp.api.acya.infrastructure;
using Microsoft.Extensions.Options;

namespace ms.webapp.api.acya.api.Controllers.tej
{
    [ApiController]
    [Route("api/tej")]
    public class TejController : BaseApiController
    {
        private readonly TejFacade _tejFacade;
        private readonly TejApiClient _tejApiClient;
        private readonly TejAuthService _tejAuthService;
        private readonly WoodAppContext _context;
        private readonly TejConfig _config;

        public TejController(
            TejFacade tejFacade, 
            TejApiClient tejApiClient, 
            TejAuthService tejAuthService,
            WoodAppContext context,
            IOptions<TejConfig> config)
        {
            _tejFacade = tejFacade;
            _tejApiClient = tejApiClient;
            _tejAuthService = tejAuthService;
            _context = context;
            _config = config.Value;
        }

        [HttpGet("username")]
        public async Task<IActionResult> GetUsername()
        {
            try
            {
                var username = await GetTejUsername();
                return Ok(new { username });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        private async Task<string> GetTejUsername()
        {
            var enterprise = await _context.Enterprises.FirstOrDefaultAsync();
            if (enterprise == null || string.IsNullOrEmpty(enterprise.MatriculeFiscal))
                throw new Exception("Enterprise Matricule Fiscal not configured");
            
            string mf = enterprise.MatriculeFiscal.Trim();
            // e.g. 0040863P -> 0040863P000 (keep the letter)
            var firstPart = mf.Split(' ')[0];
            return firstPart + "000";
        }

        [HttpPost("verify-password")]
        public async Task<IActionResult> VerifyPassword([FromBody] TejPasswordDto dto)
        {
            try
            {
                _config.Username = dto.Username;
                _config.Password = dto.Password;
                
                var token = await _tejAuthService.GetTokenAsync();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = "Mot de passe incorrect ou erreur TEJ", error = ex.Message });
            }
        }

        [HttpGet("verify-beneficiary/{identifier}")]
        public async Task<IActionResult> VerifyBeneficiary(string identifier)
        {
            try
            {
                // We also need auth token for this
                // If it's a GET, we might not have the password in request
                // The frontend should have verified the password in Step 1, but TejAuthService caches the token in memory!
                // So it should work as long as the memory cache is alive (15-30 mins).
                var taxpayer = await _tejApiClient.GetTaxpayerByIdentifierAsync(identifier, "1");
                return Ok(new { success = true, taxpayer });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = "Bénéficiaire introuvable sur TEJ", error = ex.Message });
            }
        }

        [HttpPost("submit-certificate")]
        public async Task<IActionResult> SubmitCertificate([FromBody] TejSubmitCertificateDto dto)
        {
            try
            {
                _config.Username = dto.Username;
                _config.Password = dto.Password;

                var enterprise = await _context.Enterprises.FirstOrDefaultAsync();

                if (enterprise == null || string.IsNullOrEmpty(enterprise.MatriculeFiscal))
                    throw new Exception("Enterprise Matricule Fiscal not configured");

                var req = new UploadDeclarationRequest
                {
                    TempDirectory = "temp",
                    Declaration = new BuildDeclarationRequest
                    {
                        DeclarantIdentifiant = enterprise.MatriculeFiscal.Trim().Split(' ')[0],
                        Year = DateTime.UtcNow.Year,
                        Month = DateTime.UtcNow.Month,
                        Certificates = new List<TejCertificateInput>
                        {
                            dto.Certificate
                        }
                    }
                };

                var result = await _tejFacade.UploadAsync(req);
                
                if (result.Success)
                {
                    // TEJ validation successful
                    return Ok(new { success = true, result });
                }
                
                return BadRequest(new { success = false, result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }
    }

    public class TejPasswordDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class TejSubmitCertificateDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public TejCertificateInput Certificate { get; set; } = new();
    }
}
