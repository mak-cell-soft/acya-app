using System;
using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class CreateSupportTicketDto
    {
        [Required(ErrorMessage = "La catégorie est requise.")]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le type de demande (sous-catégorie) est requis.")]
        [MaxLength(150)]
        public string Subcategory { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Priority { get; set; } = "Normale";

        [Required(ErrorMessage = "Le sujet est requis.")]
        [MaxLength(255)]
        public string Subject { get; set; } = string.Empty;

        [Required(ErrorMessage = "La description est requise.")]
        public string Description { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? CurrentRoute { get; set; }

        [MaxLength(50)]
        public string? AppVersion { get; set; }

        public string? ContextData { get; set; }

        [MaxLength(100)]
        public string? IdempotencyKey { get; set; }

        public byte[]? AttachmentBytes { get; set; }
        public string? AttachmentFileName { get; set; }
        public string? AttachmentContentType { get; set; }
    }

    public class SupportTicketResponseDto
    {
        public string TicketReference { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Subcategory { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string EmailStatus { get; set; } = string.Empty;
        public bool EmailDispatched { get; set; }
        public string? AttachmentFileName { get; set; }
    }
}
