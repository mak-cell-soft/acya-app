using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Interfaces
{
  /**
  * IAuditService handles operations related to audit logs, 
  * such as retrieving history and managing data retention.
  */
  public interface IAuditService
  {
    /**
     * Purges audit logs that are older than the retention period 
     * defined in the enterprise settings.
     */
    Task<int> CleanupOldLogs();

    /**
     * Retrieves the most recent audit logs with optional filtering.
     */
    Task<IEnumerable<AuditLog>> GetRecentLogsAsync(int count = 50, string? userName = null, DateTime? date = null);
  }
}
