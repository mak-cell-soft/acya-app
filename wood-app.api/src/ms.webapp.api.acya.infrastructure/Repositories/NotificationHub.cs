using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

[Authorize]
public class NotificationHub : Hub
{
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly ILogger<NotificationHub> _logger;
  private readonly WoodAppContext _context;

  public NotificationHub(
      IHttpContextAccessor httpContextAccessor, 
      ILogger<NotificationHub> logger,
      WoodAppContext context)
  {
    _httpContextAccessor = httpContextAccessor;
    _logger = logger;
    _context = context;
  }

  public override async Task OnConnectedAsync()
  {
    var tenantSlug = Context.User?.FindFirst("tenant_slug")?.Value?.Trim().ToLowerInvariant();

    if (string.IsNullOrEmpty(tenantSlug))
    {
      _logger.LogWarning("NotificationHub: Connection {ConnectionId} rejected. Missing tenant_slug claim.", Context.ConnectionId);
      Context.Abort();
      return;
    }

    _logger.LogInformation("NotificationHub: New connection {ConnectionId} authenticated for tenant '{TenantSlug}'",
        Context.ConnectionId, tenantSlug);

    // 1. Join Tenant-wide group (strictly isolated to this tenant)
    await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantSlug}");
    _logger.LogInformation("Added connection {ConnectionId} to group tenant:{TenantSlug}",
        Context.ConnectionId, tenantSlug);

    // 2. Join User-specific group within tenant
    var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!string.IsNullOrEmpty(userId))
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantSlug}:user-{userId}");
        _logger.LogInformation("Added connection {ConnectionId} to group tenant:{TenantSlug}:user-{UserId}",
            Context.ConnectionId, tenantSlug, userId);
    }

    // 3. Join Role-specific groups within tenant
    var roles = Context.User?.FindAll(ClaimTypes.Role).Select(c => c.Value);
    if (roles != null)
    {
        foreach (var role in roles)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantSlug}:role-{role}");
            _logger.LogInformation("Added connection {ConnectionId} to group tenant:{TenantSlug}:role-{Role}",
                Context.ConnectionId, tenantSlug, role);
        }
    }

    // 4. Join Site-specific group within tenant
    var siteId = Context.User?.FindFirst("DefaultSiteId")?.Value;
    if (string.IsNullOrEmpty(siteId))
    {
         var siteAddress = Context.User?.FindFirst("DefaultSite")?.Value;
         if (!string.IsNullOrEmpty(siteAddress))
         {
             var site = await _context.SalesSites.FirstOrDefaultAsync(s => s.Address == siteAddress);
             if (site != null) 
             {
                 siteId = site.Id.ToString();
             }
         }
    }

    if (!string.IsNullOrEmpty(siteId))
    {
      await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantSlug}:site-{siteId}");
      _logger.LogInformation("Added connection {ConnectionId} to group tenant:{TenantSlug}:site-{SiteId}",
          Context.ConnectionId, tenantSlug, siteId);
    }

    await base.OnConnectedAsync();
  }

  public override async Task OnDisconnectedAsync(Exception? exception)
  {
    var tenantSlug = Context.User?.FindFirst("tenant_slug")?.Value?.Trim().ToLowerInvariant();
    _logger.LogInformation("NotificationHub: Connection {ConnectionId} disconnected (Tenant: '{TenantSlug}')",
        Context.ConnectionId, tenantSlug ?? "unknown");

    if (exception != null)
    {
      _logger.LogWarning(exception, "NotificationHub: Connection {ConnectionId} closed with error", Context.ConnectionId);
    }

    await base.OnDisconnectedAsync(exception);
  }

  public async Task JoinGroup(string siteIdentifier)
  {
    var tenantSlug = Context.User?.FindFirst("tenant_slug")?.Value?.Trim().ToLowerInvariant();
    if (string.IsNullOrEmpty(tenantSlug))
    {
      _logger.LogWarning("JoinGroup rejected: Connection {ConnectionId} has no tenant_slug claim.", Context.ConnectionId);
      return;
    }

    var groupId = siteIdentifier;
    
    // If not numeric, try to resolve by address within the tenant's context
    if (!int.TryParse(siteIdentifier, out _))
    {
        var site = await _context.SalesSites.FirstOrDefaultAsync(s => s.Address == siteIdentifier);
        if (site != null)
        {
            groupId = site.Id.ToString();
            _logger.LogInformation("JoinGroup: Resolved address {Address} to ID {GroupId}", siteIdentifier, groupId);
        }
    }

    // ALWAYS scope to tenant: the client cannot join any group outside its authenticated tenant
    var tenantSiteGroup = $"tenant:{tenantSlug}:site-{groupId}";
    await Groups.AddToGroupAsync(Context.ConnectionId, tenantSiteGroup);
    _logger.LogInformation("JoinGroup: Connection {ConnectionId} joined tenant group {TenantGroup} (requested: {Requested})", 
        Context.ConnectionId, tenantSiteGroup, siteIdentifier);
  }
}