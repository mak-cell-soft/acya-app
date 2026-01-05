using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers; // For NotificationHub
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Services
{
    public class StockService : IStockService
    {
        private readonly StockRepository _repository;
        private readonly WoodAppContext _context;
        private readonly DocumentRepository _docRepository;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly NotificationService _notificationService;
        private readonly ILogger<StockService> _logger;

        public StockService(
            StockRepository repository,
            WoodAppContext context,
            DocumentRepository docRepository,
            IHubContext<NotificationHub> hubContext,
            NotificationService notificationService,
            ILogger<StockService> logger)
        {
            _repository = repository;
            _context = context;
            _docRepository = docRepository;
            _hubContext = hubContext;
            _notificationService = notificationService;
            _logger = logger;
        }

        #region Transactional Operations

        public async Task<StockTransferResult> InitiateTransferAsync(StockTransferDto dto, bool autoConfirm = false)
        {
            // 1. Validation
            if (dto == null || dto.originSiteId == 0 || dto.destinationSiteId == 0 ||
                !dto.merchandisesItems!.Any())
            {
                return StockTransferResult.Fail("Invalid transfer data or no items provided.");
            }

            if (dto.updatedById == 0)
            {
                return StockTransferResult.Fail("updatedbyid is required.");
            }

            var appUserExists = await _context.AppUsers.AnyAsync(u => u.Id == dto.updatedById);
            if (!appUserExists)
            {
                return StockTransferResult.Fail("Invalid updatedById: The specified user does not exist.");
            }

            var originSite = await _context.SalesSites.FindAsync(dto.originSiteId);
            var destinationSite = await _context.SalesSites.FindAsync(dto.destinationSiteId);

            if (originSite == null || destinationSite == null)
            {
                return StockTransferResult.Fail("Invalid origin or destination site.");
            }

            if (dto.merchandisesItems!.Any(i => i.article!.id == 0 || i.id == 0 || i.quantity <= 0))
            {
                return StockTransferResult.Fail("All items must have valid article, merchandise and quantity.");
            }

            // 2. Document Number Generation
            string prefix = Helpers.GetPrefixForDocumentType(DocumentTypes.stockTransfer);
            if (string.IsNullOrEmpty(prefix))
            {
                return StockTransferResult.Fail("Invalid document type.");
            }

            string outgoingDocNumber;
            string incomingDocNumber;

            try
            {
                lock (_docRepository)
                {
                    string? lastDocNumber = _docRepository.GetLastDocNumberByPrefix(prefix);
                    outgoingDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber);
                    incomingDocNumber = Helpers.GenerateNewDocNumber(prefix, outgoingDocNumber);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate document numbers");
                return StockTransferResult.Fail($"Failed to generate document number: {ex.Message}");
            }

            // 3. Execution
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Create Documents
                var exitDoc = new Document
                {
                    DocNumber = outgoingDocNumber,
                    Type = DocumentTypes.stockTransfer,
                    StockTransactionType = TransactionType.Retrieve,
                    Description = $"Transfert stock pour {destinationSite.Address}",
                    CreationDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow,
                    UpdatedById = dto.updatedById,
                    DocStatus = DocStatus.Completed,
                    SalesSiteId = dto.originSiteId,
                    IsDeleted = false
                };

                var receiptDoc = new Document
                {
                    DocNumber = incomingDocNumber,
                    Type = DocumentTypes.stockTransfer,
                    StockTransactionType = TransactionType.Add,
                    Description = $"Transfert stock de {originSite.Address}",
                    CreationDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow,
                    UpdatedById = dto.updatedById,
                    DocStatus = DocStatus.Completed,
                    SalesSiteId = dto.destinationSiteId,
                    IsDeleted = false
                };

                var transferRelationship = new StockTransfer
                {
                    ExitDocument = exitDoc,
                    ReceiptDocument = receiptDoc,
                    TransferDate = dto.transferDate,
                    Reference = dto.reference,
                    Notes = dto.notes,
                    TransporterId = dto.transporterId,
                    CreatedById = dto.updatedById,
                    Status = autoConfirm ? TransferStatus.Confirmed : TransferStatus.Pending,
                    ConfirmedById = autoConfirm ? dto.updatedById : null,
                    ConfirmationDate = autoConfirm ? DateTime.UtcNow : null
                };

                // Add Items
                foreach (var merchItem in dto.merchandisesItems!)
                {
                    var merchandise = await _context.Merchandises
                        .Include(m => m.Articles)
                        .FirstOrDefaultAsync(m => m.Id == merchItem.id && m.ArticleId == merchItem.article!.id);

                    if (merchandise == null)
                    {
                        await transaction.RollbackAsync();
                        return StockTransferResult.Fail($"Merchandise with ID {merchItem.id} and article ID {merchItem.article!.id} not found.");
                    }


                    var exitDM = new DocumentMerchandise
                    {
                        Document = exitDoc,
                        Merchandise = merchandise,
                        Quantity = merchItem.quantity, // Stored as positive in DocMerch table usually
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow
                    };

                    // Receipt Document Merchandise
                    var receiptDM = new DocumentMerchandise
                    {
                        Document = receiptDoc,
                        Merchandise = merchandise,
                        Quantity = merchItem.quantity,
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow
                    };

                    // Handle Lengths
                    if (merchItem.lisoflengths != null && merchItem.lisoflengths.Any())
                    {
                        var exitMovement = CreateQuantityMovement(exitDM, -merchItem.quantity, merchItem.lisoflengths);
                        exitDM.QuantityMovements = exitMovement;

                        var receiptMovement = CreateQuantityMovement(receiptDM, merchItem.quantity, merchItem.lisoflengths);
                        receiptDM.QuantityMovements = receiptMovement;
                    }

                    _context.DocumentMerchandises.Add(exitDM);
                    _context.DocumentMerchandises.Add(receiptDM);
                }

                _context.Documents.Add(exitDoc);
                _context.Documents.Add(receiptDoc);
                _context.StockTransfers.Add(transferRelationship);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Post-Commit Updates
                await _docRepository.updateListOfIdsListOfLengths(exitDoc);
                
                if (autoConfirm)
                {
                    await _docRepository.updateListOfIdsListOfLengths(receiptDoc);
                    await _repository.UpdateStockForTransfer(exitDoc.Id, receiptDoc.Id);
                    
                    return StockTransferResult.Ok(
                        "Stock transfer completed successfully",
                        transferRelationship.Id,
                        transferRelationship.Reference!,
                        exitDoc.DocNumber!,
                        receiptDoc.DocNumber!,
                        "Confirmed"
                    );
                }
                else
                {
                    // Only update stock for exit side immediately
                    await _repository.UpdateStockForTransfer(exitDoc.Id, null);

                    // Notifications
                    await SendTransferNotificationAsync(destinationSite, originSite, transferRelationship, dto.merchandisesItems.Length, exitDoc.DocNumber!, receiptDoc.DocNumber!);
                    await QueueNotificationAsync(destinationSite, originSite, transferRelationship, dto.merchandisesItems.Length, exitDoc.DocNumber!, receiptDoc.DocNumber!);

                    return StockTransferResult.Ok(
                        "Transfer initiated, waiting for confirmation",
                        transferRelationship.Id,
                        transferRelationship.Reference!,
                        exitDoc.DocNumber!,
                        receiptDoc.DocNumber!,
                        "PendingConfirmation"
                    );
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error executing transfer transaction");
                return StockTransferResult.Fail($"An error occurred during stock transfer: {ex.Message}");
            }
        }

        public async Task<StockTransferResult> ConfirmTransferAsync(int transferId, int confirmedByUserId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument)
                    .Include(t => t.ReceiptDocument)
                    .FirstOrDefaultAsync(t => t.Id == transferId && t.Status == TransferStatus.Pending);

                if (transfer == null) return StockTransferResult.Fail("Transfer not found or already processed");

                transfer.Status = TransferStatus.Confirmed;
                transfer.ConfirmedById = confirmedByUserId;
                transfer.ConfirmationDate = DateTime.UtcNow;

                // Update stock for receipt side
                await _docRepository.updateListOfIdsListOfLengths(transfer.ReceiptDocument!);
                await _repository.UpdateStockForTransfer(null, transfer.ReceiptDocument!.Id);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return StockTransferResult.Ok(
                    "Transfer confirmed and stock updated",
                    transfer.Id,
                    transfer.Reference!,
                    transfer.ExitDocument!.DocNumber!,
                    transfer.ReceiptDocument!.DocNumber!,
                    "Confirmed"
                );
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error confirming transfer");
                return StockTransferResult.Fail($"Error confirming transfer: {ex.Message}");
            }
        }

        public async Task<StockTransferResult> RejectTransferAsync(int transferId, int rejectedByUserId, string reason)
        {
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument) // Needed for notification
                    .FirstOrDefaultAsync(t => t.Id == transferId && t.Status == TransferStatus.Pending);

                if (transfer == null) return StockTransferResult.Fail("Transfer not found or already processed");

                transfer.Status = TransferStatus.Rejected;
                transfer.RejectionReason = reason;
                transfer.ConfirmedById = rejectedByUserId; // Reusing field for rejector
                transfer.ConfirmationDate = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Notify Origin
                if (transfer.ExitDocument != null)
                {
                    await _hubContext.Clients.Group(transfer.ExitDocument.SalesSiteId.ToString())
                        .SendAsync("TransferRejected", new
                        {
                            TransferId = transfer.Id,
                            Reference = transfer.Reference,
                            Reason = reason
                        });
                }

                return StockTransferResult.Ok("Transfer rejected successfully", transferId, transfer.Reference!, "", "", "Rejected");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting transfer");
                return StockTransferResult.Fail($"Error rejecting transfer: {ex.Message}");
            }
        }

        public async Task HandleTransactionAsync(Stock transaction)
        {
            await _repository.HandleTransaction(transaction);
        }

        #endregion

        #region Read Operations

        public async Task<IEnumerable<StockQuantityDto>> GetStockQuantitiesBySiteAsync(int siteId)
        {
            return await _repository.GetStockQuantities(siteId);
        }

        public async Task<IEnumerable<StockDto>> GetStocksBySiteAsync(SiteDto site)
        {
            return await _repository.GetStocksBySite(site);
        }

        public async Task<IEnumerable<StockDto>> GetAllStocksAsync()
        {
            return await _repository.GetStocks();
        }

        public async Task<IEnumerable<StockTransferInfoDto>> GetStockTransfersInfosAsync()
        {
            return await _repository.GetStockTransfersInfos();
        }

        public async Task<IEnumerable<StockTransferDetailsDto>> GetStockTransfersDetailsAsync(string? originDoc, string? receiptDoc)
        {
             if (!string.IsNullOrEmpty(originDoc) || !string.IsNullOrEmpty(receiptDoc))
             {
                bool exists = await _repository.DocTransferRefExists(originDoc ?? string.Empty, receiptDoc ?? string.Empty);
                if (!exists) 
                {
                    // Return empty or throw? Controller returned NotFound. 
                    // Service should probably just return empty list or specific result. 
                    // Returning empty list is safer for now.
                    return Enumerable.Empty<StockTransferDetailsDto>();
                }
             }
             return await _repository.GetStockTransfersInfosDetails(originDoc, receiptDoc);
        }

        public async Task<IEnumerable<StockTransferInfoDto>> GetFilteredStockTransfersAsync(DateTime? fromDate, DateTime? toDate, int? originSiteId, int? destinationSiteId)
        {
            return await _repository.GetFilteredStockInfosTransfers(fromDate, toDate, originSiteId, destinationSiteId);
        }

        public async Task<IEnumerable<WoodArticleStockDetail>> GetWoodArticleStockDetailsAsync(string articleRef, int salesSiteId, int merchandiseId)
        {
            // Map the repository result (Core.Entities.DTOs.WoodArticleStockDetail)
            // Wait, I moved the class to Core DTOs, so the types should match exactly!
            return await _repository.GetWoodArticleStockDetails(articleRef, salesSiteId, merchandiseId);
        }

        #endregion

        #region Helpers

        private QuantityMovement CreateQuantityMovement(DocumentMerchandise docMerch, double quantity, ListOflengthDto[] lengths)
        {
            var qm = new QuantityMovement
            {
                Quantity = quantity,
                LengthIds = string.Join(",", lengths.Select(l => l.id)),
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow,
                DocumentMerchandise = docMerch
            };

            foreach (var length in lengths)
            {
                qm.ListOfLengths.Add(new ListOfLength
                {
                    NumberOfPieces = length.nbpieces,
                    Quantity = length.quantity,
                    AppVarLengthId = length.length!.id
                });
            }
            return qm;
        }

        private async Task SendTransferNotificationAsync(SalesSite destination, SalesSite origin, StockTransfer transfer, int itemsCount, string exitDocNum, string receiptDocNum)
        {
            try
            {
                await _hubContext.Clients.Group(destination.Address!.ToString())
                    .SendAsync("ReceiveTransferNotification", new
                    {
                        TransferId = transfer.Id,
                        Reference = transfer.Reference,
                        OriginSite = origin.Address,
                        ItemsCount = itemsCount,
                        ExitDocNumber = exitDocNum,
                        ReceiptDocNumber = receiptDocNum,
                        DestinationSiteId = destination.Id
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send SignalR notification");
            }
        }

        private async Task QueueNotificationAsync(SalesSite destination, SalesSite origin, StockTransfer transfer, int itemsCount, string exitDocNum, string receiptDocNum)
        {
            try 
            {
                var notification = new NotificationDto
                {
                    NotificationType = "TransferCreated",
                    TargetGroup = destination.Address!.ToString(),
                    TransferId = transfer.Id,
                    Reference = transfer.Reference,
                    OriginSite = origin.Address,
                    ItemsCount = itemsCount,
                    AdditionalData = new
                    {
                        ExitDocNumber = exitDocNum,
                        ReceiptDocNumber = receiptDocNum
                    }
                };
                await _notificationService.QueueNotification(notification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue persistence notification");
            }
        }

        #endregion
    }
}
