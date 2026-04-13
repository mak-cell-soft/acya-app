using System;

namespace ms.webapp.api.acya.core.Entities
{
    public class AuditLog : IEntity
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string Action { get; set; } = string.Empty; // Insert, Update, Delete
        public string TableName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? KeyValues { get; set; } // JSON Primary Key(s)
        public string? OldValues { get; set; } // JSON Old Data
        public string? NewValues { get; set; } // JSON New Data
        public string? ChangedColumns { get; set; } // JSON List of changed columns
    }
}
