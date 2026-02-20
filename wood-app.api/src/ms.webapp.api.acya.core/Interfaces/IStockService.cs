using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IStockService
    {
        // Transactional Operations
        Task<StockTransferResult> InitiateTransferAsync(StockTransferDto dto, bool autoConfirm = false);
        Task<StockTransferResult> ConfirmTransferAsync(int transferId, int confirmedByUserId, string? confirmationCode = null, string? comment = null);
        Task<StockTransferResult> RejectTransferAsync(int transferId, int rejectedByUserId, string reason);
        Task<StockTransferResult> UpdateTransferAsync(int transferId, UpdateTransferRequest request);
        
        // Handling Transactions (Single stock update)
        Task HandleTransactionAsync(Stock transaction);

        // Read Operations
        Task<IEnumerable<StockQuantityDto>> GetStockQuantitiesBySiteAsync(int siteId);
        Task<IEnumerable<StockDto>> GetStocksBySiteAsync(SiteDto site);
        Task<IEnumerable<StockDto>> GetAllStocksAsync();
        
        // Complex Read Operations
        Task<IEnumerable<StockTransferInfoDto>> GetStockTransfersInfosAsync();
        Task<IEnumerable<StockTransferDetailsDto>> GetStockTransfersDetailsAsync(string? originDoc, string? receiptDoc);
        Task<IEnumerable<StockTransferInfoDto>> GetFilteredStockTransfersAsync(DateTime? fromDate, DateTime? toDate, int? originSiteId, int? destinationSiteId);
        Task<IEnumerable<WoodArticleStockDetail>> GetWoodArticleStockDetailsAsync(string articleRef, int salesSiteId, int merchandiseId);
    }
}
