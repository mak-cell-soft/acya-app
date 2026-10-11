using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
    /// <summary>
    /// Background service that periodically inspects pending quote request email slots
    /// and expired claims, executing safe recoverable dispatches without introducing
    /// external message broker infrastructure.
    /// Strictly scoped to pilot tenants (socofeb) with web quote intake enabled.
    /// </summary>
    public class QuoteEmailRecoveryBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<QuoteEmailRecoveryBackgroundService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(3);

        public QuoteEmailRecoveryBackgroundService(
            IServiceProvider services,
            ILogger<QuoteEmailRecoveryBackgroundService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Quote Email Recovery Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_checkInterval, stoppingToken);

                    using (var scope = _services.CreateScope())
                    {
                        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                        var isMultiTenant = configuration.GetValue<bool>("MultiTenancy:Enabled");

                        if (isMultiTenant)
                        {
                            var masterContext = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
                            // Strictly scope recovery to the active SOCOFEB pilot tenant
                            var tenants = await masterContext.TenantRegistries
                                .Where(t => t.IsActive && t.Slug.ToLower() == "socofeb")
                                .ToListAsync(stoppingToken);

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

                                        var woodContext = tenantScope.ServiceProvider.GetRequiredService<WoodAppContext>();
                                        var enterprise = await woodContext.Enterprises.FirstOrDefaultAsync(stoppingToken);

                                        // Verify feature flag is enabled
                                        if (enterprise?.IsWebQuoteIntakeEnabled == true)
                                        {
                                            var quoteService = tenantScope.ServiceProvider.GetRequiredService<IQuoteRequestService>();
                                            await quoteService.RetryPendingQuoteEmailsAsync(stoppingToken);
                                        }
                                    }
                                }
                                catch (Exception tenantEx)
                                {
                                    _logger.LogError(tenantEx, "Failed to run quote email recovery for tenant '{Slug}'.", tenant.Slug);
                                }
                            }
                        }
                        else
                        {
                            // Single-tenant / dev mode fallback
                            var quoteService = scope.ServiceProvider.GetService<IQuoteRequestService>();
                            if (quoteService != null)
                            {
                                await quoteService.RetryPendingQuoteEmailsAsync(stoppingToken);
                            }
                        }
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // Graceful shutdown
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in Quote Email Recovery Background Service iteration.");
                }
            }

            _logger.LogInformation("Quote Email Recovery Background Service is stopping.");
        }
    }
}
