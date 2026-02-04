using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;

namespace ms.webapp.api.acya.api.Controllers
{
  public class NotificationsController : BaseApiController
  {
    private readonly NotificationService _notificationService;

    public NotificationsController(NotificationService notificationService)
    {
      _notificationService = notificationService;
    }

    [HttpPost("retry-failed")]
    public async Task<IActionResult> RetryFailed()
    {
      await _notificationService.RetryFailedNotifications();
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

      await _notificationService.DeleteNotificationByTransferId(transferId, siteId);
      return Ok();
    }
  }
}
