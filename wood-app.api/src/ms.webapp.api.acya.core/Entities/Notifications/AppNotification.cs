using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.Notifications
{
    public class AppNotification : IEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        public NotificationType Type { get; set; } = NotificationType.Info;

        [Required]
        public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;

        // Optional targeting
        public int? TargetUserId { get; set; }
        public AppUser? TargetUser { get; set; }

        [StringLength(100)]
        public string? TargetRole { get; set; }

        public int? TargetSiteId { get; set; }
        public SalesSite? TargetSite { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ViewedAt { get; set; }

        // Generic linking to other entities (e.g., StockAlert, Document ID)
        public string? RelatedEntityId { get; set; }
        public string? RelatedEntityType { get; set; }

        // For email tracking if Type == Email
        public string? EmailRecipient { get; set; }
        public bool? EmailSent { get; set; }
        public DateTime? EmailSentAt { get; set; }
    }
}
