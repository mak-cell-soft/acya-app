using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ms.webapp.api.acya.core.Entities.Notifications
{
    /// <summary>
    /// Represents an FCM device registration token belonging to an authenticated user
    /// within a specific tenant schema.
    /// </summary>
    public class DevicePushToken : IEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public AppUser? User { get; set; }

        [Required]
        [StringLength(512)]
        public string Token { get; set; } = string.Empty;

        [Required]
        [StringLength(30)]
        public string Platform { get; set; } = "android";

        [StringLength(50)]
        public string? AppVersion { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    }
}
