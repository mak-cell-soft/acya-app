using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
    [Authorize]
    public class SupportController : BaseApiController
    {
        private readonly ISupportTicketService _supportTicketService;
        private readonly TenantContext _tenantContext;
        private readonly ILogger<SupportController> _logger;

        public SupportController(
            ISupportTicketService supportTicketService,
            TenantContext tenantContext,
            ILogger<SupportController> logger)
        {
            _supportTicketService = supportTicketService;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        /// <summary>
        /// Submits a new support ticket.
        /// Authenticated user identity and tenant context are authoritatively resolved on the server.
        /// </summary>
        [HttpPost("submit")]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB limit on request body
        public async Task<IActionResult> SubmitTicket([FromForm] SubmitSupportTicketFormRequest form, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Authoritative server-side identity resolution
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out var userId) || userId == 0)
            {
                return Unauthorized(new { message = "Identité utilisateur non autorisée." });
            }

            var userFullName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Utilisateur Élancé";
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
            var enterpriseName = User.FindFirst("EnterpriseName")?.Value ?? _tenantContext.Slug ?? "Entreprise ACYA";

            // Authoritative tenant context
            var tenantSlug = !string.IsNullOrWhiteSpace(_tenantContext.Slug)
                ? _tenantContext.Slug
                : (User.FindFirst("TenantSlug")?.Value ?? "socobois");

            var dto = new CreateSupportTicketDto
            {
                Category = form.Category,
                Subcategory = form.Subcategory,
                Priority = form.Priority,
                Subject = form.Subject,
                Description = form.Description,
                CurrentRoute = form.CurrentRoute,
                AppVersion = form.AppVersion,
                ContextData = form.ContextData,
                IdempotencyKey = form.IdempotencyKey
            };

            if (form.Attachment != null && form.Attachment.Length > 0)
            {
                using var ms = new System.IO.MemoryStream();
                await form.Attachment.CopyToAsync(ms, cancellationToken);
                dto.AttachmentBytes = ms.ToArray();
                dto.AttachmentFileName = form.Attachment.FileName;
                dto.AttachmentContentType = form.Attachment.ContentType;
            }

            try
            {
                var result = await _supportTicketService.CreateTicketAsync(
                    dto,
                    userId,
                    userFullName,
                    userEmail,
                    enterpriseName,
                    tenantSlug,
                    cancellationToken);

                return Ok(result);
            }
            catch (ArgumentException argEx)
            {
                _logger.LogWarning(argEx, "Invalid support ticket submission parameters: {Message}", argEx.Message);
                return BadRequest(new { message = argEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error processing support ticket for user {UserId}", userId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de l'enregistrement de votre demande." });
            }
        }


    }

    public class SubmitSupportTicketFormRequest
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "La catégorie est requise.")]
        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Le type de demande est requis.")]
        [System.ComponentModel.DataAnnotations.MaxLength(150)]
        public string Subcategory { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.MaxLength(50)]
        public string Priority { get; set; } = "Normale";

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Le sujet est requis.")]
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string Subject { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "La description est requise.")]
        public string Description { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? CurrentRoute { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(50)]
        public string? AppVersion { get; set; }

        public string? ContextData { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string? IdempotencyKey { get; set; }

        public Microsoft.AspNetCore.Http.IFormFile? Attachment { get; set; }
    }
}

