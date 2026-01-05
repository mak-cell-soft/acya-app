using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities
{
  public class StockTransfer : IEntity
  {
    public int Id { get; set; }

    // Exit document (from origin site)
    public int ExitDocumentId { get; set; }
    public Document? ExitDocument { get; set; }

    // Receipt document (at destination site)
    public int ReceiptDocumentId { get; set; }
    public Document? ReceiptDocument { get; set; }

    public DateTime TransferDate { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }

    // Optional transporter information
    public int? TransporterId { get; set; }
    public Transporter? Transporter { get; set; }

    public DateTime CreationDate { get; set; }
    public int CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }

    // For Transfer Confirmation
    public TransferStatus Status { get; set; } = TransferStatus.Pending;
    public int? ConfirmedById { get; set; }
    public DateTime? ConfirmationDate { get; set; }
    public string? RejectionReason { get; set; }
  }



  public class PendingNotification
  {
    [Key]
    public int Id { get; set; }

    [Required]
    public string? Content { get; set; } // JSON serialized notification data

    [Required]
    [StringLength(100)]
    public string? TargetGroup { get; set; } // e.g., siteId, userId, or group name

    [Required]
    public TransferStatus Status { get; set; } = TransferStatus.Pending;

    [Required]
    public int RetryCount { get; set; } = 0;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastAttemptAt { get; set; }

    public DateTime? DeliveredAt { get; set; }

    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    [NotMapped]
    public bool ShouldRetry =>
        Status == TransferStatus.Pending &&
        RetryCount < 5 &&
        CreatedAt > DateTime.UtcNow.AddDays(-1); // Don't retry notifications older than 1 day
  }
}
