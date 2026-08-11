using System;

namespace ms.admin.api.acya.core.DTOs
{
    public class NormalizedEmailEventDto
    {
        public string EventId { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Recipient { get; set; } = string.Empty;
        public string? MessageId { get; set; }
        public DateTime Timestamp { get; set; }
        public EventDetailsDto? Details { get; set; }
        public EventMetadataDto? Metadata { get; set; }
    }

    public class EventDetailsDto
    {
        public string? Reason { get; set; }
        public string? Severity { get; set; }
        public int? Code { get; set; }
        public string? Description { get; set; }
    }

    public class EventMetadataDto
    {
        public string? TenantId { get; set; }
        public string? RegistrationId { get; set; }
        public string? CorrelationId { get; set; }
        public string? Template { get; set; }
    }
}
