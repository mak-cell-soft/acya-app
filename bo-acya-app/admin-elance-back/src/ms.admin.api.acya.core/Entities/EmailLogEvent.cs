using System;

namespace ms.admin.api.acya.core.Entities
{
    public class EmailLogEvent
    {
        public long Id { get; set; }
        public long EmailLogId { get; set; }
        public string EventId { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string? Reason { get; set; }
        public string? Severity { get; set; }
        public int? Code { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }

        public EmailLog EmailLog { get; set; } = null!;
    }
}
