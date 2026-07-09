using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

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
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var isMultiTenant = configuration.GetValue<bool>("MultiTenancy:Enabled");

            if (isMultiTenant)
            {
              var masterContext = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
              var tenants = await masterContext.TenantRegistries.Where(t => t.IsActive).ToListAsync(stoppingToken);
              _logger.LogInformation("Audit cleanup background task: resolving {Count} active tenants.", tenants.Count);

              foreach (var tenant in tenants)
              {
                try
                {
                  var connStr = (string.IsNullOrEmpty(tenant.ConnectionString)
                    ? configuration.GetConnectionString("WoodAppContextConnection")
                    : tenant.ConnectionString) ?? "";

                  using (var tenantScope = _services.CreateScope())
                  {
                    var tenantContext = tenantScope.ServiceProvider.GetRequiredService<TenantContext>();
                    tenantContext.IsEnabled = true;
                    tenantContext.Slug = tenant.Slug;
                    tenantContext.SchemaName = tenant.SchemaName;
                    tenantContext.ConnectionString = connStr;

                    var auditService = tenantScope.ServiceProvider.GetRequiredService<IAuditService>();
                    int purgedCount = await auditService.CleanupOldLogs();
                    if (purgedCount > 0)
                    {
                      _logger.LogInformation("Tenant '{Slug}': Successfully purged {Count} old audit logs.", tenant.Slug, purgedCount);
                    }
                  }
                }
                catch (Exception tenantEx)
                {
                  _logger.LogError(tenantEx, "Failed to execute audit cleanup for tenant '{Slug}'.", tenant.Slug);
                }
              }
            }
            else
            {
              var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
              int purgedCount = await auditService.CleanupOldLogs();
              if (purgedCount > 0)
              {
                 _logger.LogInformation("Successfully purged {Count} old audit logs.", purgedCount);
              }
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
