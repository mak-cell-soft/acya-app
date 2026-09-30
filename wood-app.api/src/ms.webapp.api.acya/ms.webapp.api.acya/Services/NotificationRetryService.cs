using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
  /// <summary>
  /// Background service that periodically retries pending stock transfer notifications,
  /// strictly preserving multi-tenant isolation by iterating per tenant context.
  /// </summary>
  public class NotificationRetryService : BackgroundService
  {
    private readonly IServiceProvider _services;
    private readonly ILogger<NotificationRetryService> _logger;
    private readonly TimeSpan _retryInterval = TimeSpan.FromMinutes(5);

    public NotificationRetryService(IServiceProvider services, ILogger<NotificationRetryService> logger)
    {
      _services = services;
      _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
      _logger.LogInformation("Notification Retry Background Service is starting.");

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

                    var notificationService = tenantScope.ServiceProvider.GetRequiredService<NotificationService>();
                    await notificationService.RetryFailedNotifications();
                  }
                }
                catch (Exception tenantEx)
                {
                  _logger.LogError(tenantEx, "Failed to retry notifications for tenant '{Slug}'.", tenant.Slug);
                }
              }
            }
            else
            {
              var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();
              await notificationService.RetryFailedNotifications();
            }
          }
        }
        catch (Exception ex)
        {
          _logger.LogError(ex, "Failed to execute notification retry task.");
        }

        await Task.Delay(_retryInterval, stoppingToken);
      }

      _logger.LogInformation("Notification Retry Background Service is stopping.");
    }
  }
}
