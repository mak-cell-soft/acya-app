using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

public class NotificationHub : Hub
{
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly ILogger<NotificationHub> _logger;

  public NotificationHub(IHttpContextAccessor httpContextAccessor, ILogger<NotificationHub> logger)
  {
    _httpContextAccessor = httpContextAccessor;
    _logger = logger;
  }

  public override async Task OnConnectedAsync()
  {
    var siteId = Context.User?.FindFirst("DefaultSiteId")?.Value;
    _logger.LogInformation("New connection from site {SiteId}. Connection ID: {ConnectionId}",
        siteId, Context.ConnectionId);

    if (!string.IsNullOrEmpty(siteId))
    {
      await Groups.AddToGroupAsync(Context.ConnectionId, siteId);
      _logger.LogInformation("Added connection {ConnectionId} to group {SiteId}",
          Context.ConnectionId, siteId);
    }

    await base.OnConnectedAsync();
  }

  //public override async Task OnConnectedAsync()
  //{
  //  try
  //  {
  //    _logger.LogInformation($"New connection established: {Context.ConnectionId}");

  //    // Debug: Log all claims for the connected user
  //    if (_httpContextAccessor.HttpContext?.User?.Claims != null)
  //    {
  //      _logger.LogInformation("User claims:");
  //      foreach (var claim in _httpContextAccessor.HttpContext.User.Claims)
  //      {
  //        _logger.LogInformation($"{claim.Type}: {claim.Value}");
  //      }
  //    }

  //    var siteId = _httpContextAccessor.HttpContext?.User?.FindFirst("DefaultSite")?.Value;

  //    _logger.LogInformation($"Attempting to add connection to group for site: {siteId}");

  //    if (!string.IsNullOrEmpty(siteId))
  //    {
  //      await Groups.AddToGroupAsync(Context.ConnectionId, siteId);
  //      _logger.LogInformation($"Successfully added connection {Context.ConnectionId} to group {siteId}");
  //    }
  //    else
  //    {
  //      _logger.LogWarning("No DefaultSite claim found for connected user");
  //    }
  //  }
  //  catch (Exception ex)
  //  {
  //    _logger.LogError(ex, "Error in OnConnectedAsync");
  //    throw;
  //  }

  //  await base.OnConnectedAsync();
  //}

  public override async Task OnDisconnectedAsync(Exception exception)
  {
    try
    {
      var siteId = _httpContextAccessor.HttpContext?.User?.FindFirst("DefaultSiteId")?.Value;

      _logger.LogInformation($"Connection {Context.ConnectionId} disconnecting from group {siteId}");

      if (!string.IsNullOrEmpty(siteId))
      {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, siteId);
        _logger.LogInformation($"Successfully removed connection {Context.ConnectionId} from group {siteId}");
      }

      if (exception != null)
      {
        _logger.LogError(exception, "Connection closed with error");
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Error in OnDisconnectedAsync");
      throw;
    }

    await base.OnDisconnectedAsync(exception);
  }

  public async Task JoinGroup(string siteAddress)
  {
    
    await Groups.AddToGroupAsync(Context.ConnectionId, siteAddress);

    _logger.LogInformation($"JoinGroup requested for site: {siteAddress}");

  }

  
}