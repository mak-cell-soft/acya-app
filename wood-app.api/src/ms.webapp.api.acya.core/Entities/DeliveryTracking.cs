using System;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
  /// <summary>
  /// Represents a logistics delivery assignment associating an enterprise-owned vehicle
  /// with a commercial document (Delivery Note or Direct Invoice) and a destination customer.
  /// </summary>
  public class DeliveryTracking : IEntity, IAuditable
  {
    public int Id { get; set; }

    /// <summary>
    /// Foreign key referencing the commercial document (BL or direct invoice).
    /// </summary>
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    /// <summary>
    /// Foreign key referencing the enterprise-owned vehicle performing the delivery.
    /// </summary>
    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    /// <summary>
    /// Optional foreign key referencing the transporter/carrier record if mapped.
    /// </summary>
    public int? TransporterId { get; set; }
    public Transporter? Transporter { get; set; }

    /// <summary>
    /// Foreign key referencing the destination customer (CounterPart).
    /// </summary>
    public int CustomerId { get; set; }
    public CounterPart? Customer { get; set; }

    /// <summary>
    /// Historical customer name snapshot at the time of delivery dispatch.
    /// </summary>
    public string? CustomerName { get; set; }

    /// <summary>
    /// Optional designated driver or conductor name snapshot.
    /// </summary>
    public string? DriverName { get; set; }

    /// <summary>
    /// Departure date and time stored in UTC with timezone (TIMESTAMPTZ).
    /// </summary>
    public DateTime DepartureDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Return date and time stored in UTC with timezone (TIMESTAMPTZ). Nullable if delivery is still in transit.
    /// </summary>
    public DateTime? ReturnDate { get; set; }

    /// <summary>
    /// Historical delivery destination address snapshot captured at the time of document creation.
    /// </summary>
    public string? DeliveryAddress { get; set; }

    /// <summary>
    /// Operational delivery status: 1 = InTransit, 2 = Completed, 3 = Cancelled.
    /// </summary>
    public DeliveryTrackingStatus Status { get; set; } = DeliveryTrackingStatus.InTransit;

    /// <summary>
    /// Optional logistics notes, instructions, or delivery remarks.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Soft-deletion flag.
    /// </summary>
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// Audit timestamp for record creation in UTC.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Audit timestamp for record update in UTC.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// User identifier of the last user who updated the delivery tracking record.
    /// </summary>
    public int? UpdatedById { get; set; }
    public AppUser? UpdatedBy { get; set; }
  }
}

