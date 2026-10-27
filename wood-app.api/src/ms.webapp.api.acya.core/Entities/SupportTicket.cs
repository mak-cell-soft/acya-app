using System;

namespace ms.webapp.api.acya.core.Entities
{
    public enum TicketEmailStatus
    {
        Pending = 0,
        Sent = 1,
        Failed = 2
    }

    public class SupportTicket : IEntity
    {
        public int Id { get; set; }

        /// <summary>
        /// Human-readable unique ticket reference, e.g., EL-2026-00001
        /// </summary>
        public string TicketReference { get; set; } = string.Empty;

        /// <summary>
        /// Authenticated user identifier
        /// </summary>
        public int UserId { get; set; }

        public string UserFullName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string EnterpriseName { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;
        public string Subcategory { get; set; } = string.Empty;
        public string Priority { get; set; } = "Normale";
        public string Status { get; set; } = "New";

        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public string? CurrentRoute { get; set; }
        public string? AppVersion { get; set; }

        /// <summary>
        /// JSON-serialized contextual metadata (device, expected vs observed, article/site refs, etc.)
        /// </summary>
        public string? ContextData { get; set; }

        public string? AttachmentFileName { get; set; }
        public string? AttachmentContentType { get; set; }
        public string? AttachmentStoragePath { get; set; }
        public long? AttachmentSizeBytes { get; set; }

        public string? IdempotencyKey { get; set; }

        public TicketEmailStatus EmailStatus { get; set; } = TicketEmailStatus.Pending;
        public string? EmailError { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
