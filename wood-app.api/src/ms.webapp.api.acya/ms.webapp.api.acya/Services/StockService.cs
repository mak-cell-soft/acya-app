using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using ms.webapp.api.acya.api.Controllers; // For NotificationHub
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
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

        private readonly TenantContext? _tenantContext;

        public StockService(
            StockRepository repository,
            WoodAppContext context,
            DocumentRepository docRepository,
            IHubContext<NotificationHub> hubContext,
            NotificationService notificationService,
            ILogger<StockService> logger)
            : this(repository, context, docRepository, hubContext, notificationService, logger, null)
        {
        }

        public StockService(
            StockRepository repository,
            WoodAppContext context,
            DocumentRepository docRepository,
            IHubContext<NotificationHub> hubContext,
            NotificationService notificationService,
            ILogger<StockService> logger,
            TenantContext? tenantContext)
        {
            _repository = repository;
            _context = context;
            _docRepository = docRepository;
            _hubContext = hubContext;
            _notificationService = notificationService;
            _logger = logger;
            _tenantContext = tenantContext;
        }

        private string? GetTenantSlug()
        {
            if (_tenantContext != null && !string.IsNullOrEmpty(_tenantContext.Slug))
                return _tenantContext.Slug.Trim().ToLowerInvariant();
            if (!string.IsNullOrEmpty(_context.SchemaName) && _context.SchemaName.StartsWith("tenant_"))
                return _context.SchemaName.Substring("tenant_".Length).Trim().ToLowerInvariant();
            return null;
        }

        private string GetSiteGroupName(int siteId)
        {
            var slug = GetTenantSlug();
            return !string.IsNullOrEmpty(slug) ? $"tenant:{slug}:site-{siteId}" : siteId.ToString();
        }

        #region Transactional Operations

        /**
         * Initiate a stock transfer
         * @param dto The transfer data
         * @param autoConfirm Whether to auto-confirm the transfer
         * @returns The result of the initiation
         */
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

            var user = await _context.AppUsers
                .Include(u => u.Enterprise)
                .FirstOrDefaultAsync(u => u.Id == dto.updatedById);

            if (user == null)
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
            var numberingConfig = new DocumentNumberingConfigDto();
            if (!string.IsNullOrEmpty(user.Enterprise?.DocumentNumberingConfig))
            {
                try
                {
                    var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    numberingConfig = System.Text.Json.JsonSerializer.Deserialize<DocumentNumberingConfigDto>(user.Enterprise.DocumentNumberingConfig, options) ?? new DocumentNumberingConfigDto();
                }
                catch { }
            }

            string prefix = Helpers.GetPrefixForDocumentType(DocumentTypes.stockTransfer, numberingConfig.Prefixes);
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
                    outgoingDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber, numberingConfig.YearFormat, numberingConfig.IncrementLength);
                    incomingDocNumber = Helpers.GenerateNewDocNumber(prefix, outgoingDocNumber, numberingConfig.YearFormat, numberingConfig.IncrementLength);
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

                // Generate a random 4-digit PIN code (e.g., "0123")
                string generatedPin = new Random().Next(0, 10000).ToString("D4");

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
                    ConfirmationDate = autoConfirm ? DateTime.UtcNow : null,
                    ConfirmationCode = generatedPin
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
                    exitDoc.DocumentMerchandises.Add(exitDM);
                    receiptDoc.DocumentMerchandises.Add(receiptDM);
                }

                exitDoc.SalesSite = originSite;
                receiptDoc.SalesSite = destinationSite;

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
                    await CheckDocumentStockAlertsAsync(exitDoc.Id);
                    
                    return StockTransferResult.Ok(
                        "Stock transfer completed successfully",
                        transferRelationship.Id,
                        transferRelationship.Reference!,
                        exitDoc.DocNumber!,
                        receiptDoc.DocNumber!,
                        "Confirmed",
                        generatedPin
                    );
                }
                else
                {
                    // Only update stock for exit side immediately
                    await _repository.UpdateStockForTransfer(exitDoc.Id, null);
                    await CheckDocumentStockAlertsAsync(exitDoc.Id);

                    // Notifications
                    await SendTransferNotificationAsync(destinationSite, originSite, transferRelationship, dto.merchandisesItems.Length, exitDoc.DocNumber!, receiptDoc.DocNumber!);
                    await QueueNotificationAsync(destinationSite, originSite, transferRelationship, dto.merchandisesItems.Length, exitDoc.DocNumber!, receiptDoc.DocNumber!);

                    return StockTransferResult.Ok(
                        "Transfer initiated, waiting for confirmation",
                        transferRelationship.Id,
                        transferRelationship.Reference!,
                        exitDoc.DocNumber!,
                        receiptDoc.DocNumber!,
                        "PendingConfirmation",
                        generatedPin
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

        /**
         * Confirm a stock transfer
         * @param transferId The ID of the transfer to confirm
         * @param confirmedByUserId The ID of the user confirming the transfer
         * @returns The result of the confirmation
         */
        public async Task<StockTransferResult> ConfirmTransferAsync(int transferId, int confirmedByUserId, string? confirmationCode = null, string? comment = null)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument)
                    .Include(t => t.ReceiptDocument)
                    .FirstOrDefaultAsync(t => t.Id == transferId && t.Status == TransferStatus.Pending);

                if (transfer == null) return StockTransferResult.Fail("Transfer not found or already processed");

                // Validate confirmation code if provided (or if expected)
                if (!string.IsNullOrEmpty(transfer.ConfirmationCode) && transfer.ConfirmationCode != confirmationCode)
                {
                    return StockTransferResult.Fail("Incorrect code, please try again");
                }

                transfer.Status = TransferStatus.Confirmed;
                transfer.ConfirmedById = confirmedByUserId;
                transfer.ConfirmationDate = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(comment))
                {
                    transfer.Notes = string.IsNullOrEmpty(transfer.Notes) ? comment : $"{transfer.Notes} | Confirmation Note: {comment}";
                }

                // Update stock for receipt side
                await _docRepository.updateListOfIdsListOfLengths(transfer.ReceiptDocument!);
                await _repository.UpdateStockForTransfer(null, transfer.ReceiptDocument!.Id);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Finalize notification
                if (transfer.ReceiptDocument != null)
                {
                    await _notificationService.UpdateStatusByTransferId(transferId, transfer.ReceiptDocument.SalesSiteId.ToString(), TransferStatus.Confirmed);
                }

                return StockTransferResult.Ok(
                    "Transfer confirmed and stock updated",
                    transfer.Id,
                    transfer.Reference!,
                    transfer.ExitDocument!.DocNumber!,
                    transfer.ReceiptDocument!.DocNumber!,
                    "Confirmed",
                    transfer.ConfirmationCode
                );
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error confirming transfer");
                return StockTransferResult.Fail($"Error confirming transfer: {ex.Message}");
            }
        }

        /**
         * Reject a stock transfer
         * @param transferId The ID of the transfer to reject
         * @param rejectedByUserId The ID of the user rejecting the transfer
         * @param reason The reason for rejecting the transfer
         * @returns The result of the rejection
         */
        public async Task<StockTransferResult> RejectTransferAsync(int transferId, int rejectedByUserId, string reason)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument)
                    .FirstOrDefaultAsync(t => t.Id == transferId && t.Status == TransferStatus.Pending);

                if (transfer == null) return StockTransferResult.Fail("Transfer not found or already processed");

                transfer.Status = TransferStatus.Rejected;
                transfer.RejectionReason = reason;
                transfer.ConfirmedById = rejectedByUserId;
                transfer.ConfirmationDate = DateTime.UtcNow;

                // Restore stock at origin site
                if (transfer.ExitDocumentId != 0)
                {
                    var restored = await _repository.RestoreStockForTransfer(transfer.ExitDocumentId);
                    if (!restored)
                    {
                        await transaction.RollbackAsync();
                        return StockTransferResult.Fail("Failed to restore stock at origin site.");
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Finalize notification at destination site
                var destinationSiteId = await _context.Documents
                    .Where(d => d.Id == transfer.ReceiptDocumentId)
                    .Select(d => d.SalesSiteId)
                    .FirstOrDefaultAsync();
                
                if (destinationSiteId != 0)
                {
                    await _notificationService.UpdateStatusByTransferId(transferId, destinationSiteId.ToString(), TransferStatus.Rejected);
                }

                // Notify Origin
                if (transfer.ExitDocument != null)
                {
                    await _hubContext.Clients.Group(GetSiteGroupName(transfer.ExitDocument.SalesSiteId))
                        .SendAsync("TransferRejected", new
                        {
                            TransferId = transfer.Id,
                            Reference = transfer.Reference,
                            Reason = reason
                        });
                }

                return StockTransferResult.Ok("Transfer rejected and stock restored successfully", transferId, transfer.Reference!, "", "", "Rejected");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error rejecting transfer");
                return StockTransferResult.Fail($"Error rejecting transfer: {ex.Message}");
            }
        }

        /**
         * Update a stock transfer
         * @param transferId The ID of the transfer to update
         * @param request The update request
        /**
         * Update an existing pending stock transfer (P1: Pending -> Edit -> Pending)
         * @param transferId The ID of the transfer to update
         * @param request The update payload containing metadata and optional merchandise items
         * @returns The result of the update
         */
        public async Task<StockTransferResult> UpdateTransferAsync(int transferId, UpdateTransferRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument)
                        .ThenInclude(d => d!.DocumentMerchandises)
                            .ThenInclude(dm => dm.QuantityMovements)
                                .ThenInclude(qm => qm!.ListOfLengths)
                    .Include(t => t.ReceiptDocument)
                        .ThenInclude(d => d!.DocumentMerchandises)
                            .ThenInclude(dm => dm.QuantityMovements)
                                .ThenInclude(qm => qm!.ListOfLengths)
                    .FirstOrDefaultAsync(t => t.Id == transferId);

                if (transfer == null)
                    return StockTransferResult.Fail("Transfer not found");

                // Strict Status checks
                if (transfer.Status == TransferStatus.Confirmed)
                    return StockTransferResult.Fail("Confirmed transfers cannot be edited. Confirmed transfers are immutable.");

                if (transfer.Status == TransferStatus.Rejected)
                    return StockTransferResult.Fail("Rejected transfers cannot be edited via this endpoint. Resending rejected transfers is handled separately.");

                if (transfer.Status != TransferStatus.Pending)
                    return StockTransferResult.Fail("Only pending transfers can be edited");

                if (transfer.ExitDocument == null || transfer.ReceiptDocument == null)
                    return StockTransferResult.Fail("Transfer documents not found");

                // Immutability checks: Origin and Destination sites MUST NEVER be editable
                if (request.OriginSiteId.HasValue && request.OriginSiteId.Value != transfer.ExitDocument.SalesSiteId)
                    return StockTransferResult.Fail("Origin site cannot be changed. Please create a new transfer instead.");

                if (request.DestinationSiteId.HasValue && request.DestinationSiteId.Value != transfer.ReceiptDocument.SalesSiteId)
                    return StockTransferResult.Fail("Destination site cannot be changed. Please create a new transfer instead.");

                // Authorization: Only sender / authorized user from the origin site may edit
                if (request.UpdatedByUserId.HasValue && request.UpdatedByUserId.Value > 0)
                {
                    var user = await _context.AppUsers
                        .Include(u => u.SalesSite)
                        .FirstOrDefaultAsync(u => u.Id == request.UpdatedByUserId.Value);

                    if (user == null)
                        return StockTransferResult.Fail("User not found.");

                    // If user has an assigned site, it must match the origin site
                    if (user.IdSalesSite.HasValue && user.IdSalesSite.Value != transfer.ExitDocument.SalesSiteId)
                    {
                        return StockTransferResult.Fail("User is not authorized to edit this transfer. Only authorized users from the origin site can edit.");
                    }
                }

                // Determine whether edit is metadata-only or stock-affecting
                var oldMerchMap = transfer.ExitDocument.DocumentMerchandises
                    .Where(dm => dm.MerchandiseId.HasValue)
                    .GroupBy(dm => dm.MerchandiseId!.Value)
                    .ToDictionary(g => g.Key, g => g.Sum(dm => dm.Quantity));

                bool isStockAffecting = false;
                Dictionary<int, double> newMerchMap = new Dictionary<int, double>();

                if (request.MerchandisesItems != null)
                {
                    foreach (var item in request.MerchandisesItems)
                    {
                        if (!item.id.HasValue) continue;
                        int mId = item.id.Value;
                        if (newMerchMap.ContainsKey(mId))
                            newMerchMap[mId] += item.quantity;
                        else
                            newMerchMap[mId] = item.quantity;
                    }

                    // Compare oldMerchMap vs newMerchMap
                    if (oldMerchMap.Count != newMerchMap.Count)
                    {
                        isStockAffecting = true;
                    }
                    else
                    {
                        foreach (var kvp in oldMerchMap)
                        {
                            if (!newMerchMap.TryGetValue(kvp.Key, out var newQty) || Math.Abs(kvp.Value - newQty) > 0.0001)
                            {
                                isStockAffecting = true;
                                break;
                            }
                        }
                    }

                    // Also check if any lengths changed for wood items
                    if (!isStockAffecting)
                    {
                        foreach (var item in request.MerchandisesItems)
                        {
                            var existingDm = transfer.ExitDocument.DocumentMerchandises.FirstOrDefault(dm => dm.MerchandiseId == item.id);
                            var existingLengths = existingDm?.QuantityMovements?.ListOfLengths?.ToList();
                            var newLengths = item.lisoflengths?.ToList();

                            if ((existingLengths?.Count ?? 0) != (newLengths?.Count ?? 0))
                            {
                                isStockAffecting = true;
                                break;
                            }
                            if (existingLengths != null && newLengths != null)
                            {
                                for (int i = 0; i < existingLengths.Count; i++)
                                {
                                    if (existingLengths[i].AppVarLengthId != newLengths[i].length?.id ||
                                        existingLengths[i].NumberOfPieces != newLengths[i].nbpieces ||
                                        Math.Abs(existingLengths[i].Quantity - newLengths[i].quantity) > 0.0001)
                                    {
                                        isStockAffecting = true;
                                        break;
                                    }
                                }
                                if (isStockAffecting) break;
                            }
                        }
                    }
                }

                // If stock-affecting, perform stock delta validation and updates
                if (isStockAffecting)
                {
                    int originSiteId = transfer.ExitDocument.SalesSiteId;
                    var allMerchIds = oldMerchMap.Keys.Union(newMerchMap.Keys).Distinct().ToList();

                    // Step 1: Pre-validation of stock availability for all positive deltas
                    foreach (var merchId in allMerchIds)
                    {
                        double oldQty = oldMerchMap.GetValueOrDefault(merchId, 0.0);
                        double newQty = newMerchMap.GetValueOrDefault(merchId, 0.0);
                        double delta = newQty - oldQty;

                        if (delta > 0)
                        {
                            var stock = await _context.Stocks
                                .Include(s => s.Merchandises)
                                .FirstOrDefaultAsync(s => s.SalesSiteId == originSiteId && s.MerchandiseId == merchId);

                            var merchandise = stock?.Merchandises ?? await _context.Merchandises.FindAsync(merchId);
                            if (merchandise == null)
                            {
                                await transaction.RollbackAsync();
                                return StockTransferResult.Fail($"Merchandise {merchId} not found");
                            }

                            if (!merchandise.AllowNegativStock)
                            {
                                double available = stock?.Quantity ?? 0.0;
                                if (available < delta)
                                {
                                    await transaction.RollbackAsync();
                                    return StockTransferResult.Fail($"Insufficient stock for merchandise {merchId}. Available: {available:F2}, additional required: {delta:F2}");
                                }
                            }
                        }
                    }

                    // Step 2: Apply stock adjustments
                    foreach (var merchId in allMerchIds)
                    {
                        double oldQty = oldMerchMap.GetValueOrDefault(merchId, 0.0);
                        double newQty = newMerchMap.GetValueOrDefault(merchId, 0.0);
                        double delta = newQty - oldQty;

                        if (Math.Abs(delta) < 0.0001) continue;

                        var stock = await _context.Stocks
                            .Include(s => s.Merchandises)
                            .FirstOrDefaultAsync(s => s.SalesSiteId == originSiteId && s.MerchandiseId == merchId);

                        if (delta > 0)
                        {
                            // Deduct delta from origin stock
                            if (stock == null)
                            {
                                stock = new Stock
                                {
                                    SalesSiteId = originSiteId,
                                    MerchandiseId = merchId,
                                    Quantity = -delta,
                                    CreationDate = DateTime.UtcNow,
                                    UpdateDate = DateTime.UtcNow,
                                    Type = TransactionType.Retrieve
                                };
                                _context.Stocks.Add(stock);
                            }
                            else
                            {
                                stock.Quantity -= delta;
                                stock.UpdateDate = DateTime.UtcNow;
                                stock.Type = TransactionType.Retrieve;
                                if (stock.Quantity == 0)
                                {
                                    _context.Stocks.Remove(stock);
                                }
                            }
                        }
                        else // delta < 0
                        {
                            // Restore abs(delta) to origin stock
                            double toRestore = Math.Abs(delta);
                            if (stock == null)
                            {
                                stock = new Stock
                                {
                                    SalesSiteId = originSiteId,
                                    MerchandiseId = merchId,
                                    Quantity = toRestore,
                                    CreationDate = DateTime.UtcNow,
                                    UpdateDate = DateTime.UtcNow,
                                    Type = TransactionType.Add
                                };
                                _context.Stocks.Add(stock);
                            }
                            else
                            {
                                stock.Quantity += toRestore;
                                stock.UpdateDate = DateTime.UtcNow;
                                stock.Type = TransactionType.Add;
                            }
                        }
                    }

                    // Step 3: Synchronize DocumentMerchandises in-place on ExitDocument and ReceiptDocument
                    var exitDocMerch = transfer.ExitDocument.DocumentMerchandises.ToList();
                    var receiptDocMerch = transfer.ReceiptDocument.DocumentMerchandises.ToList();

                    var newItems = request.MerchandisesItems!.Where(i => i.id.HasValue).ToList();
                    var newMerchIdSet = newItems.Select(i => i.id!.Value).ToHashSet();

                    // 3a. Remove lines that are no longer in the request
                    foreach (var exitDm in exitDocMerch)
                    {
                        if (exitDm.MerchandiseId.HasValue && !newMerchIdSet.Contains(exitDm.MerchandiseId.Value))
                        {
                            _context.DocumentMerchandises.Remove(exitDm);
                            transfer.ExitDocument.DocumentMerchandises.Remove(exitDm);
                        }
                    }
                    foreach (var receiptDm in receiptDocMerch)
                    {
                        if (receiptDm.MerchandiseId.HasValue && !newMerchIdSet.Contains(receiptDm.MerchandiseId.Value))
                        {
                            _context.DocumentMerchandises.Remove(receiptDm);
                            transfer.ReceiptDocument.DocumentMerchandises.Remove(receiptDm);
                        }
                    }

                    // 3b. Update existing lines or add new lines
                    foreach (var item in newItems)
                    {
                        int mId = item.id!.Value;
                        var exitDm = exitDocMerch.FirstOrDefault(dm => dm.MerchandiseId == mId);
                        var receiptDm = receiptDocMerch.FirstOrDefault(dm => dm.MerchandiseId == mId);

                        if (exitDm != null && receiptDm != null)
                        {
                            exitDm.Quantity = item.quantity;
                            exitDm.UpdateDate = DateTime.UtcNow;

                            receiptDm.Quantity = item.quantity;
                            receiptDm.UpdateDate = DateTime.UtcNow;

                            if (item.lisoflengths != null && item.lisoflengths.Any())
                            {
                                if (exitDm.QuantityMovements != null)
                                    _context.QuantityMovements.Remove(exitDm.QuantityMovements);
                                if (receiptDm.QuantityMovements != null)
                                    _context.QuantityMovements.Remove(receiptDm.QuantityMovements);

                                exitDm.QuantityMovements = CreateQuantityMovement(exitDm, -item.quantity, item.lisoflengths);
                                receiptDm.QuantityMovements = CreateQuantityMovement(receiptDm, item.quantity, item.lisoflengths);
                            }
                        }
                        else
                        {
                            var merchandise = await _context.Merchandises.FindAsync(mId);

                            if (merchandise == null)
                            {
                                await transaction.RollbackAsync();
                                return StockTransferResult.Fail($"Merchandise {mId} not found");
                            }

                            var newExitDm = new DocumentMerchandise
                            {
                                DocumentId = transfer.ExitDocumentId,
                                MerchandiseId = merchandise.Id,
                                Quantity = item.quantity,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow
                            };

                            var newReceiptDm = new DocumentMerchandise
                            {
                                DocumentId = transfer.ReceiptDocumentId,
                                MerchandiseId = merchandise.Id,
                                Quantity = item.quantity,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow
                            };

                            if (item.lisoflengths != null && item.lisoflengths.Any())
                            {
                                newExitDm.QuantityMovements = CreateQuantityMovement(newExitDm, -item.quantity, item.lisoflengths);
                                newReceiptDm.QuantityMovements = CreateQuantityMovement(newReceiptDm, item.quantity, item.lisoflengths);
                            }

                            _context.DocumentMerchandises.Add(newExitDm);
                            _context.DocumentMerchandises.Add(newReceiptDm);
                            transfer.ExitDocument.DocumentMerchandises.Add(newExitDm);
                            transfer.ReceiptDocument.DocumentMerchandises.Add(newReceiptDm);
                        }
                    }

                    // Step 4: PIN code invalidation & regeneration for stock-affecting edit
                    string newPin = new Random().Next(0, 10000).ToString("D4");
                    while (newPin == transfer.ConfirmationCode)
                    {
                        newPin = new Random().Next(0, 10000).ToString("D4");
                    }
                    transfer.ConfirmationCode = newPin;
                }

                // Step 5: Update metadata fields
                if (request.TransferDate.HasValue) transfer.TransferDate = request.TransferDate.Value;
                if (request.Notes != null) transfer.Notes = request.Notes;
                if (request.TransporterId.HasValue) transfer.TransporterId = request.TransporterId.Value;

                // Vehicle update if provided
                if (request.VehicleId.HasValue && transfer.TransporterId.HasValue)
                {
                    var transporter = await _context.Transporters.FindAsync(transfer.TransporterId.Value);
                    if (transporter != null)
                    {
                        transporter.VehicleId = request.VehicleId.Value;
                    }
                }

                // Step 6: Increment revision & update audit fields
                transfer.RevisionNumber += 1;
                transfer.UpdateDate = DateTime.UtcNow;
                if (request.UpdatedByUserId.HasValue)
                {
                    transfer.UpdatedById = request.UpdatedByUserId.Value;
                }

                transfer.ExitDocument.UpdateDate = DateTime.UtcNow;
                transfer.ReceiptDocument.UpdateDate = DateTime.UtcNow;
                if (request.UpdatedByUserId.HasValue)
                {
                    transfer.ExitDocument.UpdatedById = request.UpdatedByUserId.Value;
                    transfer.ReceiptDocument.UpdatedById = request.UpdatedByUserId.Value;
                }

                await _context.SaveChangesAsync();

                if (isStockAffecting)
                {
                    await _docRepository.updateListOfIdsListOfLengths(transfer.ExitDocument);
                    await _context.SaveChangesAsync();
                }

                // Commit the entire atomic transaction
                await transaction.CommitAsync();

                // Step 7: Update existing PendingNotification.Content and emit SignalR event
                int itemsCount = transfer.ExitDocument.DocumentMerchandises.Count;
                var pendingNotifications = await _context.PendingNotifications
                    .Where(n => n.Status == TransferStatus.Pending || n.Status == TransferStatus.Delivered)
                    .ToListAsync();

                foreach (var notif in pendingNotifications)
                {
                    try
                    {
                        var content = JsonSerializer.Deserialize<NotificationDto>(notif.Content ?? "{}");
                        if (content != null && content.TransferId == transfer.Id)
                        {
                            content.ItemsCount = itemsCount;
                            content.Reference = transfer.Reference;
                            content.ConfirmationCode = transfer.ConfirmationCode;
                            content.AdditionalData = new
                            {
                                ExitDocNumber = transfer.ExitDocument.DocNumber,
                                ReceiptDocNumber = transfer.ReceiptDocument.DocNumber,
                                RevisionNumber = transfer.RevisionNumber,
                                UpdateDate = transfer.UpdateDate
                            };
                            notif.Content = JsonSerializer.Serialize(content);
                        }
                    }
                    catch { }
                }
                await _context.SaveChangesAsync();

                // SignalR: Broadcast TransferUpdated to destination site group
                var destSiteGroup = GetSiteGroupName(transfer.ReceiptDocument.SalesSiteId);
                await _hubContext.Clients.Group(destSiteGroup).SendAsync("TransferUpdated", new
                {
                    TransferId = transfer.Id,
                    Reference = transfer.Reference,
                    ItemsCount = itemsCount,
                    RevisionNumber = transfer.RevisionNumber,
                    OriginSiteId = transfer.ExitDocument.SalesSiteId,
                    DestinationSiteId = transfer.ReceiptDocument.SalesSiteId,
                    UpdateDate = transfer.UpdateDate,
                    Message = $"Le transfert {transfer.Reference} a été modifié par l'expéditeur (Révision {transfer.RevisionNumber})."
                });

                return StockTransferResult.Ok(
                    "Transfer updated successfully",
                    transfer.Id,
                    transfer.Reference ?? "",
                    transfer.ExitDocument.DocNumber!,
                    transfer.ReceiptDocument.DocNumber!,
                    "Pending",
                    transfer.ConfirmationCode,
                    transfer.RevisionNumber,
                    isStockAffecting
                );
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating transfer {TransferId}", transferId);
                return StockTransferResult.Fail($"Error updating transfer: {ex.Message}");
            }
        }

        /**
         * Resend a previously rejected stock transfer (P2: Rejected -> Modifier et Renvoyer -> Pending)
         * @param transferId The ID of the rejected transfer to resend
         * @param request The update payload containing metadata and merchandise items
         * @returns The result of the resend
         */
        public async Task<StockTransferResult> ResendTransferAsync(int transferId, UpdateTransferRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = await _context.StockTransfers
                    .Include(t => t.ExitDocument)
                        .ThenInclude(d => d!.DocumentMerchandises)
                            .ThenInclude(dm => dm.QuantityMovements)
                                .ThenInclude(qm => qm!.ListOfLengths)
                    .Include(t => t.ReceiptDocument)
                        .ThenInclude(d => d!.DocumentMerchandises)
                            .ThenInclude(dm => dm.QuantityMovements)
                                .ThenInclude(qm => qm!.ListOfLengths)
                    .FirstOrDefaultAsync(t => t.Id == transferId);

                if (transfer == null)
                    return StockTransferResult.Fail("Transfer not found");

                // Strict Status checks: Resend is allowed ONLY when transfer.Status == Rejected
                if (transfer.Status == TransferStatus.Pending)
                    return StockTransferResult.Fail("Pending transfers cannot be resent. Please use the edit endpoint to modify pending transfers.");

                if (transfer.Status == TransferStatus.Confirmed)
                    return StockTransferResult.Fail("Confirmed transfers cannot be resent. Confirmed transfers are immutable.");

                if (transfer.Status != TransferStatus.Rejected)
                    return StockTransferResult.Fail("Only rejected transfers can be resent via this endpoint.");

                if (transfer.ExitDocument == null || transfer.ReceiptDocument == null)
                    return StockTransferResult.Fail("Transfer documents not found");

                // Immutability checks: Origin and Destination sites MUST NEVER be editable
                if (request.OriginSiteId.HasValue && request.OriginSiteId.Value != transfer.ExitDocument.SalesSiteId)
                    return StockTransferResult.Fail("Origin site cannot be changed. Please create a new transfer instead.");

                if (request.DestinationSiteId.HasValue && request.DestinationSiteId.Value != transfer.ReceiptDocument.SalesSiteId)
                    return StockTransferResult.Fail("Destination site cannot be changed. Please create a new transfer instead.");

                // Authorization: Only sender / authorized user from the origin site may resend
                if (request.UpdatedByUserId.HasValue && request.UpdatedByUserId.Value > 0)
                {
                    var user = await _context.AppUsers
                        .Include(u => u.SalesSite)
                        .FirstOrDefaultAsync(u => u.Id == request.UpdatedByUserId.Value);

                    if (user == null)
                        return StockTransferResult.Fail("User not found.");

                    // If user has an assigned site, it must match the origin site
                    if (user.IdSalesSite.HasValue && user.IdSalesSite.Value != transfer.ExitDocument.SalesSiteId)
                    {
                        return StockTransferResult.Fail("Forbidden: You are not authorized to resend this transfer. Only authorized users from the origin site can resend.");
                    }
                }

                int originSiteId = transfer.ExitDocument.SalesSiteId;

                // Determine merchandise items to send
                List<MerchandiseDto> itemsToSend;
                if (request.MerchandisesItems != null && request.MerchandisesItems.Length > 0)
                {
                    itemsToSend = request.MerchandisesItems.Where(i => i.id.HasValue && i.quantity > 0).ToList();
                }
                else
                {
                    itemsToSend = transfer.ExitDocument.DocumentMerchandises
                        .Where(dm => dm.MerchandiseId.HasValue && dm.Quantity > 0)
                        .Select(dm => new MerchandiseDto
                        {
                            id = dm.MerchandiseId,
                            quantity = dm.Quantity,
                            packagereference = dm.Merchandise?.PackageReference ?? "Standard",
                            lisoflengths = dm.QuantityMovements?.ListOfLengths?.Select(l => new ListOflengthDto
                            {
                                nbpieces = l.NumberOfPieces,
                                quantity = l.Quantity,
                                length = l.AppVarLengthId > 0 ? new AppVariableDto { id = l.AppVarLengthId } : null
                            }).ToArray()
                        }).ToList();
                }

                if (itemsToSend.Count == 0)
                {
                    await transaction.RollbackAsync();
                    return StockTransferResult.Fail("Transfer must contain at least one merchandise item with positive quantity.");
                }

                // STEP 1: Pre-validate FULL STOCK AVAILABILITY at the origin depot for 100% of the requested items
                // (Because when the transfer was rejected, the previous stock deduction was completely restored)
                var merchQuantities = itemsToSend
                    .GroupBy(i => i.id!.Value)
                    .ToDictionary(g => g.Key, g => g.Sum(i => i.quantity));

                foreach (var kvp in merchQuantities)
                {
                    int merchId = kvp.Key;
                    double requiredQty = kvp.Value;

                    var stock = await _context.Stocks
                        .Include(s => s.Merchandises)
                        .FirstOrDefaultAsync(s => s.SalesSiteId == originSiteId && s.MerchandiseId == merchId);

                    var merchandise = stock?.Merchandises ?? await _context.Merchandises.FindAsync(merchId);
                    if (merchandise == null)
                    {
                        await transaction.RollbackAsync();
                        return StockTransferResult.Fail($"Merchandise {merchId} not found");
                    }

                    if (!merchandise.AllowNegativStock)
                    {
                        double available = stock?.Quantity ?? 0.0;
                        if (available < requiredQty)
                        {
                            await transaction.RollbackAsync();
                            return StockTransferResult.Fail($"Insufficient stock for merchandise {merchId}. Available: {available:F2}, required: {requiredQty:F2}");
                        }
                    }
                }

                // STEP 2: Deduct FULL requested quantities from origin stock in tbl_stock
                foreach (var kvp in merchQuantities)
                {
                    int merchId = kvp.Key;
                    double requiredQty = kvp.Value;

                    var stock = await _context.Stocks
                        .Include(s => s.Merchandises)
                        .FirstOrDefaultAsync(s => s.SalesSiteId == originSiteId && s.MerchandiseId == merchId);

                    if (stock == null)
                    {
                        stock = new Stock
                        {
                            SalesSiteId = originSiteId,
                            MerchandiseId = merchId,
                            Quantity = -requiredQty,
                            CreationDate = DateTime.UtcNow,
                            UpdateDate = DateTime.UtcNow,
                            Type = TransactionType.Retrieve
                        };
                        _context.Stocks.Add(stock);
                    }
                    else
                    {
                        stock.Quantity -= requiredQty;
                        stock.UpdateDate = DateTime.UtcNow;
                        stock.Type = TransactionType.Retrieve;
                        if (stock.Quantity == 0)
                        {
                            _context.Stocks.Remove(stock);
                        }
                    }
                }

                // STEP 3: Synchronize DocumentMerchandises in-place on ExitDocument and ReceiptDocument
                var exitDocMerch = transfer.ExitDocument.DocumentMerchandises.ToList();
                var receiptDocMerch = transfer.ReceiptDocument.DocumentMerchandises.ToList();
                var newMerchIdSet = itemsToSend.Select(i => i.id!.Value).ToHashSet();

                // 3a. Remove lines that are no longer in the request
                foreach (var exitDm in exitDocMerch)
                {
                    if (exitDm.MerchandiseId.HasValue && !newMerchIdSet.Contains(exitDm.MerchandiseId.Value))
                    {
                        _context.DocumentMerchandises.Remove(exitDm);
                        transfer.ExitDocument.DocumentMerchandises.Remove(exitDm);
                    }
                }
                foreach (var receiptDm in receiptDocMerch)
                {
                    if (receiptDm.MerchandiseId.HasValue && !newMerchIdSet.Contains(receiptDm.MerchandiseId.Value))
                    {
                        _context.DocumentMerchandises.Remove(receiptDm);
                        transfer.ReceiptDocument.DocumentMerchandises.Remove(receiptDm);
                    }
                }

                // 3b. Update existing lines or add new lines
                foreach (var item in itemsToSend)
                {
                    int mId = item.id!.Value;
                    var exitDm = exitDocMerch.FirstOrDefault(dm => dm.MerchandiseId == mId);
                    var receiptDm = receiptDocMerch.FirstOrDefault(dm => dm.MerchandiseId == mId);

                    if (exitDm != null && receiptDm != null)
                    {
                        exitDm.Quantity = item.quantity;
                        exitDm.UpdateDate = DateTime.UtcNow;

                        receiptDm.Quantity = item.quantity;
                        receiptDm.UpdateDate = DateTime.UtcNow;

                        if (item.lisoflengths != null && item.lisoflengths.Any())
                        {
                            if (exitDm.QuantityMovements != null)
                                _context.QuantityMovements.Remove(exitDm.QuantityMovements);
                            if (receiptDm.QuantityMovements != null)
                                _context.QuantityMovements.Remove(receiptDm.QuantityMovements);

                            exitDm.QuantityMovements = CreateQuantityMovement(exitDm, -item.quantity, item.lisoflengths);
                            receiptDm.QuantityMovements = CreateQuantityMovement(receiptDm, item.quantity, item.lisoflengths);
                        }
                    }
                    else
                    {
                        var merchandise = await _context.Merchandises.FindAsync(mId);
                        if (merchandise == null)
                        {
                            await transaction.RollbackAsync();
                            return StockTransferResult.Fail($"Merchandise {mId} not found");
                        }

                        var newExitDm = new DocumentMerchandise
                        {
                            DocumentId = transfer.ExitDocumentId,
                            MerchandiseId = merchandise.Id,
                            Quantity = item.quantity,
                            CreationDate = DateTime.UtcNow,
                            UpdateDate = DateTime.UtcNow
                        };

                        var newReceiptDm = new DocumentMerchandise
                        {
                            DocumentId = transfer.ReceiptDocumentId,
                            MerchandiseId = merchandise.Id,
                            Quantity = item.quantity,
                            CreationDate = DateTime.UtcNow,
                            UpdateDate = DateTime.UtcNow
                        };

                        if (item.lisoflengths != null && item.lisoflengths.Any())
                        {
                            newExitDm.QuantityMovements = CreateQuantityMovement(newExitDm, -item.quantity, item.lisoflengths);
                            newReceiptDm.QuantityMovements = CreateQuantityMovement(newReceiptDm, item.quantity, item.lisoflengths);
                        }

                        _context.DocumentMerchandises.Add(newExitDm);
                        _context.DocumentMerchandises.Add(newReceiptDm);
                        transfer.ExitDocument.DocumentMerchandises.Add(newExitDm);
                        transfer.ReceiptDocument.DocumentMerchandises.Add(newReceiptDm);
                    }
                }

                // STEP 4: State Transition & Mandatory PIN Regeneration
                string newPin = new Random().Next(0, 10000).ToString("D4");
                while (newPin == transfer.ConfirmationCode)
                {
                    newPin = new Random().Next(0, 10000).ToString("D4");
                }
                transfer.ConfirmationCode = newPin;

                transfer.Status = TransferStatus.Pending;
                transfer.RevisionNumber += 1;
                transfer.UpdateDate = DateTime.UtcNow;
                if (request.UpdatedByUserId.HasValue)
                {
                    transfer.UpdatedById = request.UpdatedByUserId.Value;
                }

                // Reset confirmation & rejection tracking fields on active transfer
                transfer.ConfirmedById = null;
                transfer.ConfirmationDate = null;
                transfer.RejectionReason = null;

                // Update metadata fields if provided
                if (request.TransferDate.HasValue) transfer.TransferDate = request.TransferDate.Value;
                if (request.Notes != null) transfer.Notes = request.Notes;
                if (request.TransporterId.HasValue) transfer.TransporterId = request.TransporterId.Value;

                if (request.VehicleId.HasValue && transfer.TransporterId.HasValue)
                {
                    var transporter = await _context.Transporters.FindAsync(transfer.TransporterId.Value);
                    if (transporter != null)
                    {
                        transporter.VehicleId = request.VehicleId.Value;
                    }
                }

                transfer.ExitDocument.UpdateDate = DateTime.UtcNow;
                transfer.ReceiptDocument.UpdateDate = DateTime.UtcNow;
                if (request.UpdatedByUserId.HasValue)
                {
                    transfer.ExitDocument.UpdatedById = request.UpdatedByUserId.Value;
                    transfer.ReceiptDocument.UpdatedById = request.UpdatedByUserId.Value;
                }

                await _context.SaveChangesAsync();
                await _docRepository.updateListOfIdsListOfLengths(transfer.ExitDocument);
                await _context.SaveChangesAsync();

                // STEP 5: Notification Persistence
                // Find existing notification or create new one so destination has active Pending notification
                var destinationSiteId = transfer.ReceiptDocument.SalesSiteId;
                var allGroupNotifications = await _context.PendingNotifications
                    .Where(n => n.TargetGroup == destinationSiteId.ToString() || 
                                n.TargetGroup == GetSiteGroupName(destinationSiteId))
                    .ToListAsync();

                PendingNotification? existingNotif = null;
                foreach (var notif in allGroupNotifications)
                {
                    try
                    {
                        var c = JsonSerializer.Deserialize<NotificationDto>(notif.Content ?? "{}");
                        if (c != null && c.TransferId == transfer.Id)
                        {
                            existingNotif = notif;
                            break;
                        }
                    }
                    catch { }
                }

                var notifPayload = new NotificationDto
                {
                    NotificationType = "TransferResent",
                    TargetGroup = GetSiteGroupName(destinationSiteId),
                    TransferId = transfer.Id,
                    Reference = transfer.Reference,
                    OriginSite = transfer.ExitDocument.SalesSite?.Address ?? "Origine",
                    ItemsCount = transfer.ExitDocument.DocumentMerchandises.Count,
                    ConfirmationCode = transfer.ConfirmationCode,
                    AdditionalData = new
                    {
                        ExitDocNumber = transfer.ExitDocument.DocNumber,
                        ReceiptDocNumber = transfer.ReceiptDocument.DocNumber,
                        RevisionNumber = transfer.RevisionNumber
                    }
                };

                if (existingNotif != null)
                {
                    existingNotif.Status = TransferStatus.Pending;
                    existingNotif.DeliveredAt = null;
                    existingNotif.RetryCount = 0;
                    existingNotif.Content = JsonSerializer.Serialize(notifPayload);
                }
                else
                {
                    var newNotif = new PendingNotification
                    {
                        Content = JsonSerializer.Serialize(notifPayload),
                        TargetGroup = GetSiteGroupName(destinationSiteId),
                        CreatedAt = DateTime.UtcNow,
                        Status = TransferStatus.Pending,
                        RetryCount = 0
                    };
                    _context.PendingNotifications.Add(newNotif);
                }

                await _context.SaveChangesAsync();

                // Commit the atomic database transaction
                await transaction.CommitAsync();

                // STEP 6: SignalR Broadcast (After Commit)
                var destGroupName = GetSiteGroupName(destinationSiteId);

                // Broadcast ReceiveTransferNotification to ensure receiver UI adds it back to pending drawer
                await _hubContext.Clients.Group(destGroupName)
                    .SendAsync("ReceiveTransferNotification", new
                    {
                        transferId = transfer.Id,
                        reference = transfer.Reference,
                        originSite = transfer.ExitDocument.SalesSite?.Address ?? "Origine",
                        itemsCount = transfer.ExitDocument.DocumentMerchandises.Count,
                        exitDocNumber = transfer.ExitDocument.DocNumber,
                        receiptDocNumber = transfer.ReceiptDocument.DocNumber,
                        destinationSiteId = destinationSiteId.ToString(),
                        revisionNumber = transfer.RevisionNumber,
                        isResent = true
                    });

                // Also broadcast TransferResent for explicit toast display
                await _hubContext.Clients.Group(destGroupName)
                    .SendAsync("TransferResent", new
                    {
                        TransferId = transfer.Id,
                        Reference = transfer.Reference,
                        RevisionNumber = transfer.RevisionNumber,
                        OriginSite = transfer.ExitDocument.SalesSite?.Address ?? "Origine"
                    });

                return StockTransferResult.Ok(
                    "Transfer resent successfully",
                    transfer.Id,
                    transfer.Reference!,
                    transfer.ExitDocument.DocNumber!,
                    transfer.ReceiptDocument.DocNumber!,
                    "Pending",
                    newPin,
                    transfer.RevisionNumber,
                    true
                );
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error resending transfer {TransferId}", transferId);
                return StockTransferResult.Fail($"Error resending transfer: {ex.Message}");
            }
        }

        /**
         * Handle a stock transaction
         * @param transaction The stock transaction
         */
        public async Task HandleTransactionAsync(Stock transaction)
        {
            await _repository.HandleTransaction(transaction);
            
            // Check for low stock alert after retrieval
            if (transaction.Type == TransactionType.Retrieve)
            {
                await CheckAndNotifyLowStockAsync(transaction.SalesSiteId, transaction.MerchandiseId);
            }
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

        public async Task<StockTransferInfoDto?> GetStockTransferByIdAsync(int transferId)
        {
            return await _repository.GetStockTransferInfoById(transferId);
        }

        public async Task<IEnumerable<StockTransferInfoDto>> GetStockTransfersInfosAsync(int? siteId = null)
        {
            return await _repository.GetStockTransfersInfos(siteId);
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
            return await _repository.GetWoodArticleStockDetails(articleRef, salesSiteId, merchandiseId);
        }

        public async Task<bool> UpdateMinimumStockAsync(int stockId, double minimumStock)
        {
            var stock = await _context.Stocks.FindAsync(stockId);
            if (stock == null) return false;

            stock.MinimumStock = minimumStock;
            stock.UpdateDate = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<StockQuantityDto>> GetStockAlertsAsync(int? siteId = null)
        {
            var query = _context.Stocks
                .Include(s => s.Merchandises)
                    .ThenInclude(m => m!.Articles)
                .Where(s => s.MinimumStock > 0 && s.Quantity <= s.MinimumStock);

            if (siteId.HasValue)
            {
                query = query.Where(s => s.SalesSiteId == siteId.Value);
            }

            var results = await query.Select(s => new StockQuantityDto
            {
                ArticleId = s.Merchandises!.ArticleId,
                MerchandiseId = s.MerchandiseId,
                PackageReference = s.Merchandises.PackageReference,
                ArticleReference = s.Merchandises.Articles!.Reference,
                Unit = s.Merchandises.Articles.Unit,
                StockQuantity = s.Quantity,
                MinimumStock = s.MinimumStock,
                SiteId = s.SalesSiteId
            }).ToListAsync();

            return results;
        }

        public async Task<StockDashboardStatsDto> GetStockDashboardStatsAsync(int? siteId = null)
        {
            var query = _context.Stocks.AsQueryable();
            if (siteId.HasValue)
            {
                query = query.Where(s => s.SalesSiteId == siteId.Value);
            }

            var allStocks = await query.ToListAsync();

            var stats = new StockDashboardStatsDto
            {
                TotalItems = allStocks.Count,
                OutOfStockItems = allStocks.Count(s => s.Quantity <= 0),
                LowStockItems = allStocks.Count(s => s.MinimumStock > 0 && s.Quantity > 0 && s.Quantity <= s.MinimumStock),
                HealthyStockItems = allStocks.Count(s => s.Quantity > s.MinimumStock || s.MinimumStock == 0)
            };

            // Get top 5 low stock items for detail
            stats.TopLowStockItems = await query
                .Where(s => s.MinimumStock > 0 && s.Quantity <= s.MinimumStock)
                .OrderBy(s => s.Quantity / s.MinimumStock)
                .Take(5)
                .Select(s => new StockQuantityDto
                {
                    ArticleReference = s.Merchandises!.Articles!.Reference,
                    Unit = s.Merchandises.Articles.Unit,
                    StockQuantity = s.Quantity,
                    MinimumStock = s.MinimumStock
                }).ToListAsync();

            return stats;
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
            if (transfer.Status != TransferStatus.Pending) return;

            try
            {
                await _hubContext.Clients.Group(GetSiteGroupName(destination.Id))
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
            if (transfer.Status != TransferStatus.Pending) return;

            try 
            {
                var notification = new NotificationDto
                {
                    NotificationType = "TransferCreated",
                    TargetGroup = GetSiteGroupName(destination.Id),
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

        private async Task CheckAndNotifyLowStockAsync(int siteId, int merchandiseId)
        {
            try
            {
                var stock = await _context.Stocks
                    .Include(s => s.Merchandises)
                        .ThenInclude(m => m!.Articles)
                    .FirstOrDefaultAsync(s => s.SalesSiteId == siteId && s.MerchandiseId == merchandiseId);

                if (stock != null && stock.MinimumStock > 0 && stock.Quantity <= stock.MinimumStock)
                {
                    // Send real-time notification
                    await _hubContext.Clients.Group(GetSiteGroupName(siteId)).SendAsync("ReceiveStockAlert", new
                    {
                        ArticleReference = stock.Merchandises!.Articles!.Reference,
                        Quantity = stock.Quantity,
                        MinimumStock = stock.MinimumStock,
                        SiteId = siteId
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking/notifying low stock");
            }
        }

        private async Task CheckDocumentStockAlertsAsync(int docId)
        {
            try
            {
                var doc = await _context.Documents
                    .Include(d => d.DocumentMerchandises)
                    .FirstOrDefaultAsync(d => d.Id == docId);

                if (doc == null || doc.StockTransactionType != TransactionType.Retrieve) return;

                foreach (var dm in doc.DocumentMerchandises)
                {
                    if (dm.MerchandiseId.HasValue)
                    {
                        await CheckAndNotifyLowStockAsync(doc.SalesSiteId, dm.MerchandiseId.Value);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking document stock alerts");
            }
        }

        public async Task<IEnumerable<StockValuationDto>> GetGlobalStockValuationAsync(int year)
        {
            // 1. Get all current stocks where Quantity > 0, grouped by MerchandiseId
            var currentStocks = await _context.Stocks
                .Include(s => s.Merchandises)
                .ThenInclude(m => m!.Articles)
                .Where(s => s.Quantity > 0 && s.Merchandises != null && !s.Merchandises.IsDeleted)
                .GroupBy(s => new { 
                    s.MerchandiseId, 
                    s.Merchandises!.PackageReference, 
                    s.Merchandises.Description,
                    Unit = s.Merchandises.Articles != null ? s.Merchandises.Articles.Unit : string.Empty
                })
                .Select(g => new
                {
                    MerchandiseId = g.Key.MerchandiseId,
                    Reference = g.Key.PackageReference,
                    Description = g.Key.Description,
                    Unit = g.Key.Unit,
                    TotalQuantity = g.Sum(s => s.Quantity)
                })
                .ToListAsync();

            if (!currentStocks.Any())
            {
                return Enumerable.Empty<StockValuationDto>();
            }

            var merchandiseIds = currentStocks.Select(s => s.MerchandiseId).ToList();

            // 2. Fetch all purchase-impacting document lines for these merchandises in the given year.
            var purchaseTypes = new[]
            {
                DocumentTypes.supplierReceipt,
                DocumentTypes.supplierInvoice
            };

            var purchaseLines = await (from dm in _context.DocumentMerchandises
                                       join d in _context.Documents on dm.DocumentId equals d.Id
                                       where dm.MerchandiseId.HasValue 
                                             && merchandiseIds.Contains(dm.MerchandiseId.Value)
                                             && d.CreationDate.HasValue && d.CreationDate.Value.Year == year
                                             && !d.IsDeleted
                                             && d.Type.HasValue && purchaseTypes.Contains(d.Type.Value)
                                       select new
                                       {
                                           dm.MerchandiseId,
                                           dm.DocumentId,
                                           d.CreationDate,
                                           dm.Quantity,
                                           dm.CostNetHT, // HT price with discount applied
                                           d.Type
                                       })
                                       .OrderBy(x => x.CreationDate)
                                       .ToListAsync();

            // Apply deduplication using DocumentDocumentRelationship
            var purchaseDocIds = purchaseLines.Select(l => l.DocumentId).Distinct().ToList();
            var relationships = await _context.DocumentDocumentRelationships
                .Include(r => r.ChildDocument)
                .Where(r => purchaseDocIds.Contains(r.ParentDocumentId) || purchaseDocIds.Contains(r.ChildDocumentId))
                .ToListAsync();

            // Filter out the supplierInvoices that are linked to a supplierReceipt.
            var filteredPurchaseLines = purchaseLines.Where(line =>
            {
                if (line.Type == DocumentTypes.supplierInvoice)
                {
                    bool hasLinkedReceipt = relationships.Any(r =>
                        r.ParentDocumentId == line.DocumentId &&
                        r.ChildDocument != null &&
                        r.ChildDocument.Type == DocumentTypes.supplierReceipt);

                    if (hasLinkedReceipt)
                    {
                        return false; // Skip invoice, keep the receipt
                    }
                }
                return true;
            }).ToList();

            var purchaseGroupByMerch = filteredPurchaseLines
                .GroupBy(l => l.MerchandiseId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = new List<StockValuationDto>();

            foreach (var stock in currentStocks)
            {
                double cmp = 0;
                double lastPrice = 0;

                if (purchaseGroupByMerch.TryGetValue(stock.MerchandiseId, out var lines) && lines.Any())
                {
                    double totalQty = lines.Sum(l => l.Quantity);
                    if (totalQty > 0)
                    {
                        cmp = lines.Sum(l => l.CostNetHT) / totalQty;
                    }

                    var latestPurchase = lines.OrderByDescending(l => l.CreationDate).First();
                    lastPrice = latestPurchase.Quantity > 0 ? (latestPurchase.CostNetHT / latestPurchase.Quantity) : 0;
                }

                result.Add(new StockValuationDto
                {
                    MerchandiseId = stock.MerchandiseId,
                    Reference = stock.Reference ?? string.Empty,
                    Description = stock.Description ?? string.Empty,
                    Unit = stock.Unit ?? string.Empty,
                    CurrentStockQuantity = stock.TotalQuantity,
                    CmpUnitPrice = Math.Round(cmp, 3),
                    CmpTotalValue = Math.Round(stock.TotalQuantity * cmp, 3),
                    LastPurchasePrice = Math.Round(lastPrice, 3),
                    LastPurchaseTotalValue = Math.Round(stock.TotalQuantity * lastPrice, 3)
                });
            }

            return result;
        }

        #endregion
    }
}
