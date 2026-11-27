using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.api.Controllers
{
  public class StockController : BaseApiController
  {
    private readonly IStockService _stockService;
    private readonly ILogger<StockController> _logger;
    private readonly WoodAppContext _context;
    private readonly NotificationService? _notificationService;

    public StockController(
        IStockService stockService, 
        WoodAppContext context,
        ILogger<StockController> logger)
        : this(stockService, context, logger, null)
    {
    }

    [ActivatorUtilitiesConstructor]
    public StockController(
        IStockService stockService,
        WoodAppContext context,
        ILogger<StockController> logger,
        NotificationService? notificationService)
    {
      _stockService = stockService;
      _context = context;
      _logger = logger;
      _notificationService = notificationService;
    }

    private async Task<(int? UserId, int? SiteId, bool IsAdmin, bool IsAuthenticated)> ResolveCallerContextAsync()
    {
      bool isAuthenticated = User?.Identity?.IsAuthenticated == true;
      if (!isAuthenticated)
      {
        return (null, null, false, false);
      }

      int? userId = null;
      var userIdStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      if (int.TryParse(userIdStr, out var parsedUserId) && parsedUserId > 0)
      {
        userId = parsedUserId;
      }

      var roles = User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();
      bool isAdmin = roles.Any(r =>
          string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase) ||
          string.Equals(r, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
          r == ((int)Roles.Admin).ToString() ||
          r == ((int)Roles.SuperAdmin).ToString());

      int? siteId = null;
      var defaultSiteIdStr = User?.FindFirst("DefaultSiteId")?.Value;
      if (int.TryParse(defaultSiteIdStr, out var parsedSiteId) && parsedSiteId > 0)
      {
        siteId = parsedSiteId;
      }

      if (!siteId.HasValue && userId.HasValue)
      {
        siteId = await _context.AppUsers
            .AsNoTracking()
            .Where(u => u.Id == userId.Value)
            .Select(u => u.IdSalesSite)
            .FirstOrDefaultAsync();
      }

      if (!siteId.HasValue)
      {
        var siteAddress = User?.FindFirst("DefaultSite")?.Value;
        if (!string.IsNullOrEmpty(siteAddress))
        {
          siteId = await _context.SalesSites
              .AsNoTracking()
              .Where(s => s.Address == siteAddress)
              .Select(s => (int?)s.Id)
              .FirstOrDefaultAsync();
        }
      }

      return (userId, siteId, isAdmin, true);
    }

    [HttpPost("transfer")]
    public async Task<ActionResult> StockTransfer(StockTransferDto dto)
    {
      var result = await _stockService.InitiateTransferAsync(dto, autoConfirm: true);
      if (!result.Success) return BadRequest(result.Message);
      
      return Ok(new
      {
        ExitDocumentNumber = result.ExitDocumentNumber,
        ReceiptDocumentNumber = result.ReceiptDocumentNumber,
        TransferId = result.TransferId,
        TransferRef = result.TransferRef,
        Message = "Stock transfer completed successfully"
      });
    }

    [HttpPost("GetBySite")]
    public async Task<ActionResult<IEnumerable<StockQuantityDto>>> GetBySite(SiteDto dto)
    {
      var allDtos = await _stockService.GetStockQuantitiesBySiteAsync(dto.id);
      return Ok(allDtos);
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction([FromBody] Stock transaction)
    {
      if (transaction == null) return BadRequest("Transaction data is required.");

      var authUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
      if (int.TryParse(authUserIdStr, out var authUserId) && authUserId > 0)
      {
        transaction.UpdatedById = authUserId;
      }

      try
      {
        await _stockService.HandleTransactionAsync(transaction);
        return Ok();
      }
      catch (Exception ex)
      {
        return BadRequest(ex.Message);
      }
    }

    [HttpGet("site")]
    public async Task<IActionResult> GetStocks([FromBody] SiteDto site)
    {
      var stocks = await _stockService.GetStocksBySiteAsync(site);
      return Ok(stocks);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllStocks()
    {
      var stocks = await _stockService.GetAllStocksAsync();
      return Ok(stocks);
    }

    [HttpPost("wood/details")]
    public async Task<ActionResult<StockWithLengthDetailsDto>> GetWoodStockWithLengthDetails([FromBody] WoodParamsDto woodParams)
    {
      var stockDetails = await _stockService.GetWoodArticleStockDetailsAsync(woodParams.merchandiseRef!, woodParams.salesSiteId, woodParams.merchandiseId);
      return Ok(stockDetails);
    }

    [HttpGet("transfers/infos")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<StockTransferInfoDto>>> GetStockTransfersInfos([FromQuery] int? siteId = null)
    {
      var caller = await ResolveCallerContextAsync();
      var allTransfers = await _stockService.GetStockTransfersInfosAsync(siteId, caller.SiteId, caller.IsAdmin);
      return Ok(allTransfers);
    }

    [HttpGet("transfers/search")]
    [Authorize]
    public async Task<ActionResult<PagedStockTransfersDto>> SearchStockTransfers([FromQuery] StockTransferFilterDto filter)
    {
      var caller = await ResolveCallerContextAsync();
      var result = await _stockService.SearchStockTransfersAsync(filter ?? new StockTransferFilterDto(), caller.SiteId, caller.IsAdmin);
      return Ok(result);
    }

    [HttpGet("transfers/details")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<StockTransferDetailsDto>>> GetStockTransfersInfosDetails(
    [FromQuery] string? originDoc = null,
    [FromQuery] string? receiptDoc = null)
    {
      var caller = await ResolveCallerContextAsync();
      var allTrInfos = await _stockService.GetStockTransfersDetailsAsync(originDoc, receiptDoc, caller.SiteId, caller.IsAdmin);
      return Ok(allTrInfos);
    }

    [HttpGet("transfers/filtered")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<StockTransferInfoDto>>> GetFilteredStockInfosTransfers(
    [FromQuery] DateTime? fromDate = null,
    [FromQuery] DateTime? toDate = null,
    [FromQuery] int? originSiteId = null,
    [FromQuery] int? destinationSiteId = null)
    {
      try
      {
        var caller = await ResolveCallerContextAsync();
        var filteredTransfers = await _stockService.GetFilteredStockTransfersAsync(
            fromDate,
            toDate,
            originSiteId,
            destinationSiteId,
            caller.SiteId,
            caller.IsAdmin);

        return Ok(filteredTransfers);
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "An error occurred while retrieving filtered stock transfers");
        return StatusCode(500, "An error occurred while retrieving stock transfers.");
      }
    }

    [HttpGet("transfers/{id:int}")]
    [Authorize]
    public async Task<ActionResult<StockTransferInfoDto>> GetStockTransferById(int id)
    {
      var caller = await ResolveCallerContextAsync();
      var transfer = await _stockService.GetStockTransferByIdAsync(id, caller.SiteId, caller.IsAdmin);
      if (transfer == null) return NotFound("Transfer not found.");
      return Ok(transfer);
    }

    [HttpPost("process-transfer")]
    [Authorize]
    public async Task<ActionResult> PreocessStockTransfer(StockTransferDto dto)
    {
       // Initiate the stock transfer (autoConfirm is false so it is pending)
       var result = await _stockService.InitiateTransferAsync(dto, autoConfirm: false);
       if (!result.Success) return BadRequest(result.Message);

       var caller = await ResolveCallerContextAsync();
       var transferInfo = await _stockService.GetStockTransferByIdAsync(
           result.TransferId,
           caller.SiteId ?? dto.originSiteId,
           caller.IsAdmin);

       // NOTE: We return the complete persisted transfer with relationships alongside ConfirmationCode so the frontend print layout can display it right after creation
       return Ok(new
       {
         ExitDocumentNumber = result.ExitDocumentNumber,
         ReceiptDocumentNumber = result.ReceiptDocumentNumber,
         TransferId = result.TransferId,
         TransferRef = result.TransferRef,
         ConfirmationCode = result.ConfirmationCode,
         Status = result.Status,
         Message = result.Message,
         Transfer = transferInfo
       });
    }

    [HttpPost("confirm-transfer/{transferId}")]
    [HttpPost("transfers/{transferId}/confirm")]
    [Authorize]
    public async Task<ActionResult> ConfirmTransfer(int transferId, [FromBody] ConfirmTransferRequest request)
    {
       var caller = await ResolveCallerContextAsync();
       int confirmedByUserId = caller.UserId ?? request.ConfirmedByUserId;

       var result = await _stockService.ConfirmTransferAsync(transferId, confirmedByUserId, request.ConfirmationCode, request.Comment);
       if (!result.Success) return BadRequest(result.Message);

       return Ok(new
       {
         Message = result.Message,
         ExitDocNumber = result.ExitDocumentNumber,
         ReceiptDocNumber = result.ReceiptDocumentNumber,
         ConfirmationCode = result.ConfirmationCode
       });
    }

    [HttpPost("reject-transfer/{transferId}")]
    [HttpPost("transfers/{transferId}/reject")]
    [Authorize]
    public async Task<ActionResult> RejectTransfer(int transferId, [FromBody] RejectTransferRequest request)
    {
       var caller = await ResolveCallerContextAsync();
       int rejectedByUserId = caller.UserId ?? request.RejectedByUserId;

       var result = await _stockService.RejectTransferAsync(transferId, rejectedByUserId, request.Reason);
       if (!result.Success) return BadRequest(result.Message);

       return Ok(new { Message = result.Message });
    }

    [HttpPut("transfers/{transferId}")]
    public async Task<ActionResult> UpdateTransfer(int transferId, [FromBody] UpdateTransferRequest request)
    {
        // Enforce authenticated user from JWT if available
        var authUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(authUserIdStr, out var authUserId) && authUserId > 0)
        {
            request.UpdatedByUserId = authUserId;
        }

        var result = await _stockService.UpdateTransferAsync(transferId, request);
        if (!result.Success)
        {
            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { Message = result.Message });
            if (result.Message.Contains("authorized", StringComparison.OrdinalIgnoreCase))
                return StatusCode(403, new { Message = result.Message });
            if (result.Message.Contains("Confirmed", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { Message = result.Message });
            return BadRequest(new { Message = result.Message });
        }

        return Ok(new
        {
            Message = result.Message,
            TransferId = result.TransferId,
            TransferRef = result.TransferRef,
            ExitDocNumber = result.ExitDocumentNumber,
            ReceiptDocNumber = result.ReceiptDocumentNumber,
            ConfirmationCode = result.ConfirmationCode,
            RevisionNumber = result.RevisionNumber,
            PinRegenerated = result.PinRegenerated,
            Status = result.Status
        });
    }

    [HttpPost("transfers/{transferId}/resend")]
    public async Task<ActionResult> ResendTransfer(int transferId, [FromBody] UpdateTransferRequest request)
    {
        // Enforce authenticated user from JWT if available
        var authUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(authUserIdStr, out var authUserId) && authUserId > 0)
        {
            request.UpdatedByUserId = authUserId;
        }

        var result = await _stockService.ResendTransferAsync(transferId, request);
        if (!result.Success)
        {
            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { Message = result.Message });
            if (result.Message.Contains("authorized", StringComparison.OrdinalIgnoreCase) || result.Message.Contains("Forbidden", StringComparison.OrdinalIgnoreCase))
                return StatusCode(403, new { Message = result.Message });
            if (result.Message.Contains("Confirmed", StringComparison.OrdinalIgnoreCase) || result.Message.Contains("Pending", StringComparison.OrdinalIgnoreCase) || result.Message.Contains("Only rejected", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { Message = result.Message });
            return BadRequest(new { Message = result.Message });
        }

        return Ok(new
        {
            Message = result.Message,
            TransferId = result.TransferId,
            TransferRef = result.TransferRef,
            ExitDocNumber = result.ExitDocumentNumber,
            ReceiptDocNumber = result.ReceiptDocumentNumber,
            ConfirmationCode = result.ConfirmationCode,
            RevisionNumber = result.RevisionNumber,
            PinRegenerated = result.PinRegenerated,
            Status = result.Status
        });
    }

    [HttpGet("notifications/missed")]
    [Authorize]
    public async Task<ActionResult> GetMissedNotifications(int userId)
    {
      try
      {
        var caller = await ResolveCallerContextAsync();
        int effectiveUserId = caller.UserId ?? userId;
        int? resolvedSiteId = caller.SiteId;

        if (!resolvedSiteId.HasValue && effectiveUserId > 0)
        {
          var user = await _context.AppUsers.AsNoTracking().Include(u => u.SalesSite).FirstOrDefaultAsync(u => u.Id == effectiveUserId);
          if (user?.SalesSite != null) resolvedSiteId = user.SalesSite.Id;
        }

        if (!resolvedSiteId.HasValue || resolvedSiteId.Value <= 0)
        {
          return Ok(new List<PendingTransferNotificationDto>());
        }

        if (_notificationService != null)
        {
          var enriched = await _notificationService.GetEnrichedMissedNotificationsAsync(resolvedSiteId.Value);
          return Ok(enriched);
        }

        // Fallback if NotificationService was not injected (e.g. legacy unit tests)
        var siteIdStr = resolvedSiteId.Value.ToString();
        var slug = !string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_") 
            ? _context.SchemaName.Substring("tenant_".Length) 
            : null;
        var tenantSiteGroup = !string.IsNullOrEmpty(slug) ? $"tenant:{slug}:site-{siteIdStr}" : null;

        var notifications = await _context.PendingNotifications
            .AsNoTracking()
            .Where(n => n.Status != TransferStatus.Confirmed && 
                        n.Status != TransferStatus.Rejected && 
                        n.Status != TransferStatus.Cancelled && 
                        (n.TargetGroup == siteIdStr || (tenantSiteGroup != null && n.TargetGroup == tenantSiteGroup)))
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications);
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "Error retrieving missed notifications");
        return StatusCode(500, "An error occurred while retrieving notifications.");
      }
    }

    [HttpGet("confirmation-code/{transferId}")]
    [Authorize]
    public async Task<ActionResult> GetConfirmationCode(int transferId)
    {
      var caller = await ResolveCallerContextAsync();
      if (!caller.IsAuthenticated)
      {
        return Unauthorized();
      }

      var result = await _stockService.GetConfirmationCodeAsync(transferId, caller.SiteId, caller.IsAdmin);
      if (!result.Found) return NotFound("Transfer not found");
      if (!result.Authorized) return StatusCode(403, "Forbidden: Only authorized origin-site users or administrators can access the validation code.");

      return Ok(result.ConfirmationCode);
    }

    [HttpPut("{stockId}/minimum")]
    public async Task<IActionResult> UpdateMinimumStock(int stockId, [FromBody] double minimumStock)
    {
        var success = await _stockService.UpdateMinimumStockAsync(stockId, minimumStock);
        if (!success) return NotFound("Stock reference not found.");
        return Ok();
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<IEnumerable<StockQuantityDto>>> GetStockAlerts([FromQuery] int? siteId = null)
    {
        var alerts = await _stockService.GetStockAlertsAsync(siteId);
        return Ok(alerts);
    }

    [HttpGet("dashboard-stats")]
    public async Task<ActionResult<StockDashboardStatsDto>> GetStockDashboardStats([FromQuery] int? siteId = null)
    {
        var stats = await _stockService.GetStockDashboardStatsAsync(siteId);
        return Ok(stats);
    }

    [HttpGet("valuation")]
    public async Task<ActionResult<IEnumerable<StockValuationDto>>> GetStockValuation([FromQuery] int? year = null)
    {
        int targetYear = year ?? DateTime.UtcNow.Year;
        var valuation = await _stockService.GetGlobalStockValuationAsync(targetYear);
        return Ok(valuation);
    }
  }
}
