using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Services
{
  /**
  * Background service that periodically triggers audit log cleanup.
  * Runs once every 24 hours.
  */
  public class AuditCleanupBackgroundService : BackgroundService
  {
    private readonly IServiceProvider _services;
    private readonly ILogger<AuditCleanupBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24);

    public AuditCleanupBackgroundService(IServiceProvider services, ILogger<AuditCleanupBackgroundService> logger)
    {
      _services = services;
      _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
      _logger.LogInformation("Audit Cleanup Background Service is starting.");

      while (!stoppingToken.IsCancellationRequested)
      {
        try
        {
          using (var scope = _services.CreateScope())
          {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            int purgedCount = await auditService.CleanupOldLogs();
            
            if (purgedCount > 0)
            {
               _logger.LogInformation("Successfully purged {Count} old audit logs.", purgedCount);
            }
          }
        }
        catch (Exception ex)
        {
          _logger.LogError(ex, "Failed to execute audit cleanup task.");
        }

        // Wait for the next interval
        await Task.Delay(_checkInterval, stoppingToken);
      }

      _logger.LogInformation("Audit Cleanup Background Service is stopping.");
    }
  }
}
