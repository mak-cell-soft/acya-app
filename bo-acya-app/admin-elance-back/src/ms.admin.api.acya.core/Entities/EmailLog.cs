using System;
using System.Collections.Generic;

namespace ms.admin.api.acya.core.Entities
{
    public class EmailLog
    {
        public long Id { get; set; }
        public long? TenantId { get; set; }
        public long? RegistrationId { get; set; }
        public string? CorrelationId { get; set; }
        public string? MessageId { get; set; }
        public string Recipient { get; set; } = string.Empty;
        public string Template { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public MasterEnterprise? Tenant { get; set; }
        public ICollection<EmailLogEvent> Events { get; set; } = new List<EmailLogEvent>();
    }
}
