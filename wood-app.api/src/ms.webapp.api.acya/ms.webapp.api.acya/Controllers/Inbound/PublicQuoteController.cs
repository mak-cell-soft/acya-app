using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.Attributes;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Inbound;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers.Inbound
{
    [ApiController]
    [Route("api/public/quote-requests")]
    [RequireQuoteIntegrationSecret]
    public class PublicQuoteController : ControllerBase
    {
        private readonly IQuoteRequestService _quoteService;
        private readonly IQuoteRequestRateLimiter _rateLimiter;
        private readonly WoodAppContext _context;
        private readonly TenantContext _tenantContext;
        private readonly ILogger<PublicQuoteController> _logger;

        public PublicQuoteController(
            IQuoteRequestService quoteService,
            IQuoteRequestRateLimiter rateLimiter,
            WoodAppContext context,
            TenantContext tenantContext,
            ILogger<PublicQuoteController> logger)
        {
            _quoteService = quoteService;
            _rateLimiter = rateLimiter;
            _context = context;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateQuoteRequest([FromBody] InboundQuoteRequestDto dto)
        {
            var tenantSlug = _tenantContext?.Slug?.Trim().ToLowerInvariant() ?? string.Empty;

            // 1. Explicit SOCOFEB Pilot Gate & Feature Check
            if (tenantSlug != "socofeb")
            {
                _logger.LogWarning("Quote request rejected: Tenant '{Tenant}' is not authorized for the web quote pilot.", tenantSlug);
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    status = "TenantDisabled",
                    message = "Le service de devis public n'est pas activé pour ce tenant."
                });
            }

            var enterprise = await _context.Enterprises.FirstOrDefaultAsync();
            if (enterprise?.IsWebQuoteIntakeEnabled != true)
            {
                _logger.LogWarning("Quote request rejected: Web quote intake feature flag is disabled for tenant '{Tenant}'.", tenantSlug);
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    status = "TenantDisabled",
                    message = "Le service de devis public n'est pas activé pour ce tenant."
                });
            }

            // 2. Model State Validation
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value!.Errors.First().ErrorMessage
                    );

                return BadRequest(new
                {
                    success = false,
                    status = "ValidationError",
                    errors = errors
                });
            }

            // 3. Rate Limiting Check (Defensive in-memory sliding window)
            var clientIp = ResolveForwardedClientIp();
            if (!_rateLimiter.IsAllowed(clientIp, dto.CustomerEmail, tenantSlug, out var retryAfterSeconds))
            {
                _logger.LogWarning("Rate limit exceeded for quote request from IP {ClientIp} and email {Email} in tenant {Tenant}",
                    clientIp, dto.CustomerEmail, tenantSlug);
                Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    status = "RateLimited",
                    message = "Trop de requêtes soumises. Veuillez patienter avant de réessayer."
                });
            }

            // 4. Staging & Execution
            try
            {
                var response = await _quoteService.ProcessQuoteRequestAsync(dto, HttpContext.RequestAborted);
                return StatusCode(StatusCodes.Status202Accepted, response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error staging quote request for tenant '{Tenant}'", tenantSlug);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    success = false,
                    status = "DatabaseFailure",
                    message = "Service temporairement indisponible. Veuillez réessayer."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error processing quote request for tenant '{Tenant}'", tenantSlug);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    status = "ServerError",
                    message = "Une erreur interne est survenue lors de l'enregistrement de votre demande."
                });
            }
        }

        private string ResolveForwardedClientIp()
        {
            if (Request?.Headers == null) return "unknown";

            // Because this endpoint is protected by X-Integration-Key, we trust X-Forwarded-Client-IP forwarded by the SOCOFEB backend
            if (Request.Headers.TryGetValue("X-Forwarded-Client-IP", out var clientIpHeader) && !string.IsNullOrWhiteSpace(clientIpHeader))
            {
                var candidate = clientIpHeader.ToString().Trim();
                if (System.Net.IPAddress.TryParse(candidate, out _))
                {
                    return candidate;
                }
            }

            if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && !string.IsNullOrWhiteSpace(forwarded))
            {
                var firstIp = forwarded.ToString().Split(',')[0].Trim();
                if (System.Net.IPAddress.TryParse(firstIp, out _))
                {
                    return firstIp;
                }
            }

            return HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
