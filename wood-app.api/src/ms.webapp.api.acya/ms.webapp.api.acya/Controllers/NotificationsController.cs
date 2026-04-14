using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Controllers
{
  public class NotificationsController : BaseApiController
  {
    private readonly IAppNotificationService _appNotificationService;
    private readonly NotificationService _stockNotificationService;

    public NotificationsController(IAppNotificationService appNotificationService, NotificationService stockNotificationService)
    {
      _appNotificationService = appNotificationService;
      _stockNotificationService = stockNotificationService;
    }

    [HttpGet("unreads")]
    public async Task<IActionResult> GetUnreads()
    {
      var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
      var siteId = int.TryParse(User.FindFirst("DefaultSiteId")?.Value, out var sId) ? (int?)sId : null;
      var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

      if (userId == 0) return Unauthorized();

      var notifications = await _appNotificationService.GetUnreadNotificationsAsync(userId, siteId, role);
      return Ok(notifications);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
      await _appNotificationService.MarkAsReadAsync(id);
      return Ok();
    }

    [HttpPost("retry-failed")]
    public async Task<IActionResult> RetryFailed()
    {
      await _stockNotificationService.RetryFailedNotifications();
      return Ok(new
      {
        success = true,
        message = "Retry initiated",
        timestamp = DateTime.UtcNow
      });
    }

    [HttpDelete("{transferId}")]
    public async Task<IActionResult> Delete(int transferId)
    {
      var siteId = User.FindFirst("DefaultSite")?.Value;
      if (string.IsNullOrEmpty(siteId)) return BadRequest("User site context not found.");

      await _stockNotificationService.DeleteNotificationByTransferId(transferId, siteId);
      return Ok();
    }
  }
}
