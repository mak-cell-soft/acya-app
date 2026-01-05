namespace ms.webapp.api.acya.api.Services
{
  // BackgroundService/NotificationRetryService.cs
  public class NotificationRetryService : BackgroundService
  {
    private readonly IServiceProvider _services;
    private readonly ILogger<NotificationRetryService> _logger;
    private readonly TimeSpan _retryInterval = TimeSpan.FromMinutes(5); // Retry every 5 mins

    public NotificationRetryService(IServiceProvider services, ILogger<NotificationRetryService> logger)
    {
      _services = services;
      _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
      while (!stoppingToken.IsCancellationRequested)
      {
        try
        {
          using (var scope = _services.CreateScope())
          {
            var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();
            await notificationService.RetryFailedNotifications();
          }
          _logger.LogInformation("Retried failed notifications");
        }
        catch (Exception ex)
        {
          _logger.LogError(ex, "Failed to retry notifications");
        }

        await Task.Delay(_retryInterval, stoppingToken);
      }
    }
  }
}
