using Microsoft.EntityFrameworkCore.ChangeTracking;
using ms.webapp.api.acya.core.Entities;
using System.Text.Json;

namespace ms.webapp.api.acya.infrastructure.Core
{
    public class AuditEntry
    {
        public AuditEntry(EntityEntry entry)
        {
            Entry = entry;
        }

        public EntityEntry Entry { get; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string TableName { get; set; } = string.Empty;
        public Dictionary<string, object?> KeyValues { get; } = new Dictionary<string, object?>();
        public Dictionary<string, object?> OldValues { get; } = new Dictionary<string, object?>();
        public Dictionary<string, object?> NewValues { get; } = new Dictionary<string, object?>();
        public List<string> ChangedColumns { get; } = new List<string>();

        public AuditLog ToAuditLog()
        {
            var auditLog = new AuditLog();
            auditLog.UserId = UserId;
            auditLog.UserName = UserName;
            auditLog.TableName = TableName;
            auditLog.Timestamp = DateTime.UtcNow;
            auditLog.KeyValues = JsonSerializer.Serialize(KeyValues);
            auditLog.OldValues = OldValues.Count == 0 ? null : JsonSerializer.Serialize(OldValues);
            auditLog.NewValues = NewValues.Count == 0 ? null : JsonSerializer.Serialize(NewValues);
            auditLog.ChangedColumns = ChangedColumns.Count == 0 ? null : JsonSerializer.Serialize(ChangedColumns);
            
            // Determine action
            if (OldValues.Count == 0 && NewValues.Count > 0) auditLog.Action = "Insert";
            else if (NewValues.Count == 0 && OldValues.Count > 0) auditLog.Action = "Delete";
            else auditLog.Action = "Update";

            return auditLog;
        }
    }
}
