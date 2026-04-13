using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
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

    public StockController(
        IStockService stockService, 
        WoodAppContext context,
        ILogger<StockController> logger)
    {
      _stockService = stockService;
      _context = context;
      _logger = logger;
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
    public async Task<ActionResult<IEnumerable<StockTransferInfoDto>>> GetStockTransfersInfos([FromQuery] int? siteId = null)
    {
      var allTransfers = await _stockService.GetStockTransfersInfosAsync(siteId);
      return Ok(allTransfers);
    }

    [HttpGet("transfers/details")]
    public async Task<ActionResult<IEnumerable<StockTransferDetailsDto>>> GetStockTransfersInfosDetails(
    [FromQuery] string? originDoc = null,
    [FromQuery] string? receiptDoc = null)
    {
      var allTrInfos = await _stockService.GetStockTransfersDetailsAsync(originDoc, receiptDoc);
      return Ok(allTrInfos);
    }

    [HttpGet("transfers/filtered")]
    public async Task<ActionResult<IEnumerable<StockTransferInfoDto>>> GetFilteredStockInfosTransfers(
    [FromQuery] DateTime? fromDate = null,
    [FromQuery] DateTime? toDate = null,
    [FromQuery] int? originSiteId = null,
    [FromQuery] int? destinationSiteId = null)
    {
      try
      {
        var filteredTransfers = await _stockService.GetFilteredStockTransfersAsync(
            fromDate,
            toDate,
            originSiteId,
            destinationSiteId);

        return Ok(filteredTransfers);
      }
      catch (Exception ex)
      {
        return StatusCode(500, "An error occurred while retrieving stock transfers" + ex.Message);
      }
    }

    [HttpPost("process-transfer")]
    public async Task<ActionResult> PreocessStockTransfer(StockTransferDto dto)
    {
       var result = await _stockService.InitiateTransferAsync(dto, autoConfirm: false);
       if (!result.Success) return BadRequest(result.Message);

       return Ok(new
       {
         ExitDocumentNumber = result.ExitDocumentNumber,
         ReceiptDocumentNumber = result.ReceiptDocumentNumber,
         TransferId = result.TransferId,
         TransferRef = result.TransferRef,
         Status = result.Status,
         Message = result.Message
       });
    }

    [HttpPost("confirm-transfer/{transferId}")]
    [HttpPost("transfers/{transferId}/confirm")]
    public async Task<ActionResult> ConfirmTransfer(int transferId, [FromBody] ConfirmTransferRequest request)
    {
       var result = await _stockService.ConfirmTransferAsync(transferId, request.ConfirmedByUserId, request.ConfirmationCode, request.Comment);
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
    public async Task<ActionResult> RejectTransfer(int transferId, [FromBody] RejectTransferRequest request)
    {
       var result = await _stockService.RejectTransferAsync(transferId, request.RejectedByUserId, request.Reason);
       if (!result.Success) return BadRequest(result.Message);

       return Ok(new { Message = result.Message });
    }

    [HttpPut("transfers/{transferId}")]
    public async Task<ActionResult> UpdateTransfer(int transferId, [FromBody] UpdateTransferRequest request)
    {
        var result = await _stockService.UpdateTransferAsync(transferId, request);
        if (!result.Success) return BadRequest(result.Message);

        return Ok(new
        {
            Message = result.Message,
            TransferId = result.TransferId,
            TransferRef = result.TransferRef,
            ExitDocNumber = result.ExitDocumentNumber,
            ReceiptDocNumber = result.ReceiptDocumentNumber
        });
    }

    [HttpGet("notifications/missed")]
    public async Task<ActionResult> GetMissedNotifications(int userId)
    {
      try
      {
        string? siteId = null;
        var user = await _context.AppUsers.Include(u => u.SalesSite).FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.SalesSite != null) siteId = user.SalesSite.Id.ToString();

        if (string.IsNullOrEmpty(siteId))
        {
          var siteAddress = User.FindFirst("DefaultSite")?.Value;
          if (!string.IsNullOrEmpty(siteAddress))
          {
            var site = await _context.SalesSites.FirstOrDefaultAsync(s => s.Address == siteAddress);
            if (site != null) siteId = site.Id.ToString();
          }
        }

        if (string.IsNullOrEmpty(siteId)) return BadRequest("User site context not found.");

        var notifications = await _context.PendingNotifications
            .Where(n => n.Status != TransferStatus.Confirmed && 
                        n.Status != TransferStatus.Rejected && 
                        n.Status != TransferStatus.Cancelled && 
                        n.TargetGroup == siteId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications);
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "Error retrieving missed notifications");
        return StatusCode(500, ex.Message);
      }
    }

    [HttpGet("confirmation-code/{transferId}")]
    public async Task<ActionResult> GetConfirmationCode(int transferId)
    {
      var transfer = await _context.StockTransfers.FirstOrDefaultAsync(t => t.Id == transferId);
      if (transfer == null) return NotFound("Transfer not found");
      return Ok(transfer.ConfirmationCode);
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
  }
}
