using System.Text.Json;
using System.Text.Json.Serialization;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class StockTransferDto
  {
    public int originSiteId { get; set; }
    public int destinationSiteId { get; set; }
    public int transporterId { get; set; }
    public MerchandiseDto[]? merchandisesItems { get; set; } = Array.Empty<MerchandiseDto>();
    public DateTime transferDate { get; set; }
    public string? reference { get; set; }
    public string? notes { get; set; }
    public int updatedById { get; set; }

    // For Transfer Confirmation
    public TransferStatus status { get; set; } = TransferStatus.Pending;
    public int? confirmedById { get; set; }
    public DateTime? confirmationDate { get; set; }
    public string? rejectionReason { get; set; }
  }

  public class StockTransferInfoDto
  {
    public int Id { get; set; }
    public string DocSortie { get; set; } = string.Empty;
    public string DocReception { get; set; } = string.Empty;
    public string Origine { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime TransferDate { get; set; }
    public string Transporter { get; set; } = string.Empty;
    public string RefPaquet { get; set; } = string.Empty;
    public TransferStatus Status { get; set; }
  }

  public class StockTransferDetailsDto
  {
    public string? DocSortie { get; set; }
    public string? DocReception { get; set; }
    public string? Origine { get; set; }
    public string? Destination { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Transporter { get; set; }
    public string? RefPaquet { get; set; }
    public string? RefMerchandise { get; set; }
    public string? Description { get; set; }
    public double Quantity { get; set; }
    public string? Unit { get; set; }
    public IEnumerable<ListOflengthDto>? ExitDocLengths { get; set; }
  }

  public class NotificationDto
  {
    public string? NotificationType { get; set; } // e.g., "TransferCreated", "StockAlert"

    [JsonIgnore] // Don't include in serialized content
    public string? TargetGroup { get; set; } // Matches PendingNotification.TargetGroup

    // Common notification properties
    public int TransferId { get; set; } // For transfer notifications
    public string? Reference { get; set; }
    public string? OriginSite { get; set; }
    public int ItemsCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Additional flexible data
    public object? AdditionalData { get; set; }

    // For serialization
    public string Serialize()
    {
      return JsonSerializer.Serialize(this);
    }

    public static NotificationDto? Deserialize(string json)
    {
      return JsonSerializer.Deserialize<NotificationDto>(json);
    }
  }
}
