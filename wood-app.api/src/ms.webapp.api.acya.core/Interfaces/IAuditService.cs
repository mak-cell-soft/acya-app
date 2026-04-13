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
  }
}
