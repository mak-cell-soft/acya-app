using System;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Entities
{
    public enum EmailLeaseStatus
    {
        Pending = 0,
        Claimed = 1,
        Accepted = 2,
        Failed = 3,
        UnknownTimeout = 4
    }

    public class InboundQuoteRequest : IEntity
    {
        public int Id { get; set; }
        public string TrackingNumber { get; set; } = string.Empty;
        public string Product { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? Message { get; set; }
        public string Source { get; set; } = "socofeb-decor.com";
        public string IdempotencyKey { get; set; } = string.Empty;

        // Enterprise Notification Slot
        public EmailLeaseStatus EnterpriseStatus { get; set; } = EmailLeaseStatus.Pending;
        public DateTime? EnterpriseLeaseExpiresAt { get; set; }
        public string? EnterpriseMessageId { get; set; }
        public int EnterpriseRetryCount { get; set; } = 0;

        // Customer Confirmation Slot
        public EmailLeaseStatus CustomerStatus { get; set; } = EmailLeaseStatus.Pending;
        public DateTime? CustomerLeaseExpiresAt { get; set; }
        public string? CustomerMessageId { get; set; }
        public int CustomerRetryCount { get; set; } = 0;

        public DateTime? NextRetryAt { get; set; }
        public string? LastError { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
