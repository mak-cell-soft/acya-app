using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.api.Services
{
  /**
  * Implementation of IAuditService to manage Audit Log lifecycle.
  */
  public class AuditService : IAuditService
  {
    private readonly WoodAppContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(WoodAppContext context, ILogger<AuditService> logger)
    {
      _context = context;
      _logger = logger;
    }

    /**
    * CleanupOldLogs purges logs based on the Enterprise.AuditRetentionMonths setting.
    * If multiple enterprises exist, it uses the first one found.
    */
    public async Task<int> CleanupOldLogs()
    {
      try
      {
        // Fetch retention policy from the enterprise settings
        // Defaults to 12 months if not found or set to 0
        var enterprise = await _context.Enterprises.FirstOrDefaultAsync();
        int retentionMonths = enterprise?.AuditRetentionMonths ?? 12;

        if (retentionMonths <= 0)
        {
          _logger.LogInformation("Audit cleanup skipped: Retention period not configured.");
          return 0;
        }

        var cutoffDate = DateTime.UtcNow.AddMonths(-retentionMonths);
        
        // Find logs older than the cutoff date
        var logsToPurge = await _context.AuditLogs
          .Where(l => l.Timestamp < cutoffDate)
          .ToListAsync();

        if (logsToPurge.Any())
        {
          int count = logsToPurge.Count;
          _context.AuditLogs.RemoveRange(logsToPurge);
          await _context.SaveChangesAsync();
          
          _logger.LogInformation("Audit cleanup: Purged {Count} logs older than {CutoffDate}", count, cutoffDate);
          return count;
        }

        return 0;
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "Error occurred during audit log cleanup.");
        throw;
      }
    }
  }
}
