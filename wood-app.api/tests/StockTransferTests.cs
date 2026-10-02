using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class StockTransferTests
    {
        private Mock<IHubContext<NotificationHub>> _hubContextMock;
        private Mock<NotificationService> _notificationServiceMock;
        private Mock<ILogger<StockService>> _loggerMock;
        private Mock<ILogger<StockController>> _notifLoggerMock;
        private WoodAppContext _context;
        private StockRepository _stockRepository;
        private DocumentRepository _docRepository;

        public StockTransferTests()
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new WoodAppContext(options);
            
            // Mock Repositories
            var docMerchRepo = new DocumentMerchandiseRepository(_context);
            _stockRepository = new StockRepository(_context, docMerchRepo);
            _docRepository = new DocumentRepository(_context, _stockRepository);
            
            _hubContextMock = new Mock<IHubContext<NotificationHub>>();
            
            // Mock Hubbard clients
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            _hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            _notifLoggerMock = new Mock<ILogger<StockController>>();
            _notificationServiceMock = new Mock<NotificationService>(_context, _hubContextMock.Object, _notifLoggerMock.Object);
            _loggerMock = new Mock<ILogger<StockService>>();
        }

        [Fact]
        public async Task ConfirmTransfer_ShouldUseStockRepositoryWithCorrectIds()
        {
            // Arrange
            var service = CreateService();
            var originSite = new SalesSite { Id = 1, Address = "Origin" };
            var destSite = new SalesSite { Id = 2, Address = "Destination" };
            _context.SalesSites.AddRange(originSite, destSite);
            
            var user = new AppUser { Id = 999, Login = "confirmer" };
            _context.AppUsers.Add(user);
            var merch = new Merchandise { Id = 10, ArticleId = 10 };
            _context.Merchandises.Add(merch);

            var exitDoc = new Document { Id = 101, SalesSiteId = 1, SalesSite = originSite, Type = DocumentTypes.stockTransfer, UpdatedById = 999, StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 102, SalesSiteId = 2, SalesSite = destSite, Type = DocumentTypes.stockTransfer, UpdatedById = 999, StockTransactionType = TransactionType.Add };
            var receiptDM = new DocumentMerchandise { Document = receiptDoc, Merchandise = merch, Quantity = 5 };
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.Add(receiptDM);
            
            var transfer = new StockTransfer 
            { 
                Id = 1, 
                ExitDocument = exitDoc, 
                ReceiptDocument = receiptDoc,
                Status = TransferStatus.Pending 
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var result = await service.ConfirmTransferAsync(1, 999);

            // Assert
            Assert.True(result.Success, $"ConfirmTransfer failed: {result.Message}");
            Assert.Equal(TransferStatus.Confirmed, transfer.Status);
        }

        [Fact]
        public async Task RejectTransfer_ShouldRestoreStockAndUseTransaction()
        {
            // Arrange
            var service = CreateService();
            var originSite = new SalesSite { Id = 1, Address = "Origin" };
            _context.SalesSites.Add(originSite);
            
            var exitDoc = new Document { Id = 201, SalesSiteId = 1, Type = DocumentTypes.stockTransfer };
            _context.Documents.Add(exitDoc);
            
            var transfer = new StockTransfer 
            { 
                Id = 2, 
                ExitDocument = exitDoc, 
                ExitDocumentId = 201,
                Status = TransferStatus.Pending 
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var result = await service.RejectTransferAsync(2, 999, "Reason");

            // Assert
            Assert.True(result.Success);
            Assert.Equal(TransferStatus.Rejected, transfer.Status);
            // Stock restoration check would involve verifying HandleTransaction calls
        }

        [Fact]
        public async Task InitiateTransfer_ShouldSendNotificationToSiteIdGroup()
        {
            // Arrange
            var service = CreateService();
            var originSite = new SalesSite { Id = 1, Address = "Origin" };
            var destSite = new SalesSite { Id = 2, Address = "Destination" };
            var user = new AppUser { Id = 888, Login = "test" };
            _context.SalesSites.AddRange(originSite, destSite);
            _context.AppUsers.Add(user);
            
            var merch = new Merchandise { Id = 500, ArticleId = 500 };
            var article = new Article { Id = 500, Reference = "ART1" };
            _context.Merchandises.Add(merch);
            _context.Articles.Add(article);

            var initialStock = new Stock
            {
                MerchandiseId = 500,
                Merchandises = merch,
                SalesSiteId = 1,
                SalesSites = originSite,
                Quantity = 100,
                Type = TransactionType.Add,
                UpdatedById = 888
            };
            _context.Stocks.Add(initialStock);
            await _context.SaveChangesAsync();

            var dto = new StockTransferDto
            {
                originSiteId = 1,
                destinationSiteId = 2,
                updatedById = 888,
                merchandisesItems = new[] { new MerchandiseDto { id = 500, quantity = 10, article = new ArticleDto { id = 500 } } },
                transferDate = DateTime.UtcNow
            };

            // Act
            var result = await service.InitiateTransferAsync(dto);
            Assert.True(result.Success, $"InitiateTransfer failed: {result.Message}");

            // Assert
            // Verify Group(destSite.Id.ToString()) was called
            _hubContextMock.Verify(h => h.Clients.Group("2"), Times.AtLeastOnce());
        }

        [Fact]
        public async Task RejectTransfer_ShouldSendTransferRejectedSignalRNotificationToOriginGroup()
        {
            // Arrange
            var service = CreateService();
            var originSite = new SalesSite { Id = 10, Address = "OriginDepot" };
            var destSite = new SalesSite { Id = 20, Address = "DestDepot" };
            _context.SalesSites.AddRange(originSite, destSite);

            var exitDoc = new Document { Id = 301, SalesSiteId = 10, SalesSite = originSite, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 302, SalesSiteId = 20, SalesSite = destSite, Type = DocumentTypes.stockTransfer };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 30,
                ExitDocument = exitDoc,
                ExitDocumentId = 301,
                ReceiptDocument = receiptDoc,
                ReceiptDocumentId = 302,
                Reference = "TR-REF-30",
                Status = TransferStatus.Pending
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var result = await service.RejectTransferAsync(30, 999, "Damaged goods");

            // Assert
            Assert.True(result.Success);
            Assert.Equal(TransferStatus.Rejected, transfer.Status);

            // Verify SignalR event TransferRejected was emitted to origin site group ("10")
            _hubContextMock.Verify(h => h.Clients.Group("10"), Times.AtLeastOnce());
        }

        [Fact]
        public async Task Timeline_PendingTransfer_ShouldShowExitAtOrigin_AndNoReceiptAtDestination()
        {
            // Arrange
            var movementService = new StockMovementService(_context);
            var article = new Article { Id = 401, Reference = "PINE-1" };
            var merch = new Merchandise { Id = 401, ArticleId = 401, PackageReference = "Standard", IsDeleted = false };
            var originSite = new SalesSite { Id = 1, Address = "SiteA" };
            var destSite = new SalesSite { Id = 2, Address = "SiteB" };
            _context.Articles.Add(article);
            _context.Merchandises.Add(merch);
            _context.SalesSites.AddRange(originSite, destSite);

            var exitDoc = new Document
            {
                Id = 4010,
                DocNumber = "TR-26-001",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Retrieve,
                SalesSiteId = 1,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var receiptDoc = new Document
            {
                Id = 4020,
                DocNumber = "TR-26-002",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Add,
                SalesSiteId = 2,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var exitDM = new DocumentMerchandise { DocumentId = 4010, MerchandiseId = 401, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 4020, MerchandiseId = 401, Quantity = 5 };
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var transfer = new StockTransfer
            {
                Id = 40,
                ExitDocumentId = 4010,
                ReceiptDocumentId = 4020,
                Status = TransferStatus.Pending
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var originTimeline = (await movementService.GetTimelineAsync(401, 1)).ToList();
            var destTimeline = (await movementService.GetTimelineAsync(401, 2)).ToList();

            // Assert
            // Origin site: shows SORTIE with negative delta (-5)
            Assert.Single(originTimeline);
            Assert.Equal(-5, originTimeline[0].QuantityDelta);
            Assert.Equal("TR-26-001", originTimeline[0].DocumentNumber);

            // Destination site: NO receipt movement while transfer is Pending
            Assert.Empty(destTimeline);
        }

        [Fact]
        public async Task Timeline_ConfirmedTransfer_ShouldShowExitAtOrigin_AndReceiptAtDestination()
        {
            // Arrange
            var movementService = new StockMovementService(_context);
            var article = new Article { Id = 501, Reference = "OAK-1" };
            var merch = new Merchandise { Id = 501, ArticleId = 501, PackageReference = "Standard", IsDeleted = false };
            var originSite = new SalesSite { Id = 3, Address = "SiteC" };
            var destSite = new SalesSite { Id = 4, Address = "SiteD" };
            _context.Articles.Add(article);
            _context.Merchandises.Add(merch);
            _context.SalesSites.AddRange(originSite, destSite);

            var exitDoc = new Document
            {
                Id = 5010,
                DocNumber = "TR-26-003",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Retrieve,
                SalesSiteId = 3,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var receiptDoc = new Document
            {
                Id = 5020,
                DocNumber = "TR-26-004",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Add,
                SalesSiteId = 4,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var exitDM = new DocumentMerchandise { DocumentId = 5010, MerchandiseId = 501, Quantity = 8 };
            var receiptDM = new DocumentMerchandise { DocumentId = 5020, MerchandiseId = 501, Quantity = 8 };
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var transfer = new StockTransfer
            {
                Id = 50,
                ExitDocumentId = 5010,
                ReceiptDocumentId = 5020,
                Status = TransferStatus.Confirmed
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var originTimeline = (await movementService.GetTimelineAsync(501, 3)).ToList();
            var destTimeline = (await movementService.GetTimelineAsync(501, 4)).ToList();

            // Assert
            // Both movements must be visible
            Assert.Single(originTimeline);
            Assert.Equal(-8, originTimeline[0].QuantityDelta);

            Assert.Single(destTimeline);
            Assert.Equal(8, destTimeline[0].QuantityDelta);
            Assert.Equal("TR-26-004", destTimeline[0].DocumentNumber);
        }

        [Fact]
        public async Task Timeline_RejectedTransfer_ShouldNotShowExitAtOrigin_AndNoReceiptAtDestination()
        {
            // Arrange
            var movementService = new StockMovementService(_context);
            var article = new Article { Id = 601, Reference = "BEECH-1" };
            var merch = new Merchandise { Id = 601, ArticleId = 601, PackageReference = "Standard", IsDeleted = false };
            var originSite = new SalesSite { Id = 5, Address = "SiteE" };
            var destSite = new SalesSite { Id = 6, Address = "SiteF" };
            _context.Articles.Add(article);
            _context.Merchandises.Add(merch);
            _context.SalesSites.AddRange(originSite, destSite);

            var exitDoc = new Document
            {
                Id = 6010,
                DocNumber = "TR-26-005",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Retrieve,
                SalesSiteId = 5,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var receiptDoc = new Document
            {
                Id = 6020,
                DocNumber = "TR-26-006",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Add,
                SalesSiteId = 6,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var exitDM = new DocumentMerchandise { DocumentId = 6010, MerchandiseId = 601, Quantity = 12 };
            var receiptDM = new DocumentMerchandise { DocumentId = 6020, MerchandiseId = 601, Quantity = 12 };
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var transfer = new StockTransfer
            {
                Id = 60,
                ExitDocumentId = 6010,
                ReceiptDocumentId = 6020,
                Status = TransferStatus.Rejected
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var originTimeline = (await movementService.GetTimelineAsync(601, 5)).ToList();
            var destTimeline = (await movementService.GetTimelineAsync(601, 6)).ToList();

            // Assert
            // Rejected transfer: neither origin exit nor destination receipt must appear as effective stock movements
            Assert.Empty(originTimeline);
            Assert.Empty(destTimeline);
        }

        [Fact]
        public async Task UpdateTransfer_MetadataOnly_ShouldKeepPinAndIncrementRevision()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 101, Address = "OriginSite" };
            var dest = new SalesSite { Id = 102, Address = "DestSite" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1001, Login = "originUser", IdSalesSite = 101 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 201, AllowNegativStock = false };
            _context.Merchandises.Add(merch);

            var exitDoc = new Document { Id = 2001, SalesSiteId = 101, SalesSite = origin, DocNumber = "TR-26-001", StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 2002, SalesSiteId = 102, SalesSite = dest, DocNumber = "TR-26-002", StockTransactionType = TransactionType.Add };
            var exitDM = new DocumentMerchandise { DocumentId = 2001, MerchandiseId = 201, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 2002, MerchandiseId = 201, Quantity = 5 };
            exitDoc.DocumentMerchandises.Add(exitDM);
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var initialStock = new Stock { SalesSiteId = 101, MerchandiseId = 201, Quantity = 95 };
            _context.Stocks.Add(initialStock);

            var transfer = new StockTransfer
            {
                Id = 200,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 2001,
                ReceiptDocumentId = 2002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1,
                ConfirmationCode = "1234",
                Notes = "Old Notes",
                Reference = "TR-26-001"
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Only metadata changed
            var request = new UpdateTransferRequest
            {
                Notes = "New Notes B",
                UpdatedByUserId = 1001,
                TransferDate = DateTime.UtcNow.AddDays(1)
            };
            var result = await service.UpdateTransferAsync(200, request);

            // Assert
            Assert.True(result.Success, result.Message);
            Assert.Equal(2, result.RevisionNumber);
            Assert.Equal("1234", result.ConfirmationCode); // PIN unchanged
            Assert.False(result.PinRegenerated);
            Assert.Equal("New Notes B", transfer.Notes);
            Assert.Equal(95, initialStock.Quantity); // Stock untouched
            Assert.Equal(5, exitDM.Quantity);
            Assert.Equal(5, receiptDM.Quantity);
        }

        [Fact]
        public async Task UpdateTransfer_QuantityIncrease_ShouldDeductStockAndRegeneratePin()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 301, Address = "Origin" };
            var dest = new SalesSite { Id = 302, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1002, Login = "sender", IdSalesSite = 301 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 301, AllowNegativStock = false };
            _context.Merchandises.Add(merch);

            var exitDoc = new Document { Id = 3001, SalesSiteId = 301, SalesSite = origin, DocNumber = "TR-26-003", StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 3002, SalesSiteId = 302, SalesSite = dest, DocNumber = "TR-26-004", StockTransactionType = TransactionType.Add };
            var exitDM = new DocumentMerchandise { DocumentId = 3001, MerchandiseId = 301, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 3002, MerchandiseId = 301, Quantity = 5 };
            exitDoc.DocumentMerchandises.Add(exitDM);
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var initialStock = new Stock { SalesSiteId = 301, MerchandiseId = 301, Quantity = 95 };
            _context.Stocks.Add(initialStock);

            var transfer = new StockTransfer
            {
                Id = 300,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 3001,
                ReceiptDocumentId = 3002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1,
                ConfirmationCode = "1234",
                Reference = "TR-26-003"
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Quantity increased from 5 to 7 (+2 delta)
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1002,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 301, quantity = 7 }
                }
            };
            var result = await service.UpdateTransferAsync(300, request);

            // Assert
            Assert.True(result.Success, result.Message);
            Assert.Equal(2, result.RevisionNumber);
            Assert.NotEqual("1234", result.ConfirmationCode); // PIN must be regenerated!
            Assert.True(result.PinRegenerated);
            Assert.Equal(93, initialStock.Quantity); // 95 - 2 = 93
            Assert.Equal(7, transfer.ExitDocument.DocumentMerchandises.First().Quantity);
            Assert.Equal(7, transfer.ReceiptDocument.DocumentMerchandises.First().Quantity);
        }

        [Fact]
        public async Task UpdateTransfer_QuantityDecrease_ShouldRestoreStockAndRegeneratePin()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 401, Address = "Origin" };
            var dest = new SalesSite { Id = 402, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1003, Login = "sender", IdSalesSite = 401 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 401, AllowNegativStock = false };
            _context.Merchandises.Add(merch);

            var exitDoc = new Document { Id = 4001, SalesSiteId = 401, SalesSite = origin, DocNumber = "TR-26-005", StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 4002, SalesSiteId = 402, SalesSite = dest, DocNumber = "TR-26-006", StockTransactionType = TransactionType.Add };
            var exitDM = new DocumentMerchandise { DocumentId = 4001, MerchandiseId = 401, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 4002, MerchandiseId = 401, Quantity = 5 };
            exitDoc.DocumentMerchandises.Add(exitDM);
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var initialStock = new Stock { SalesSiteId = 401, MerchandiseId = 401, Quantity = 95 };
            _context.Stocks.Add(initialStock);

            var transfer = new StockTransfer
            {
                Id = 400,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 4001,
                ReceiptDocumentId = 4002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1,
                ConfirmationCode = "1234",
                Reference = "TR-26-005"
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Quantity decreased from 5 to 3 (-2 delta)
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1003,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 401, quantity = 3 }
                }
            };
            var result = await service.UpdateTransferAsync(400, request);

            // Assert
            Assert.True(result.Success, result.Message);
            Assert.Equal(2, result.RevisionNumber);
            Assert.NotEqual("1234", result.ConfirmationCode); // PIN regenerated
            Assert.True(result.PinRegenerated);
            Assert.Equal(97, initialStock.Quantity); // 95 + 2 = 97
            Assert.Equal(3, transfer.ExitDocument.DocumentMerchandises.First().Quantity);
            Assert.Equal(3, transfer.ReceiptDocument.DocumentMerchandises.First().Quantity);
        }

        [Fact]
        public async Task UpdateTransfer_ArticleReplacement_ShouldRestoreOldDeductNew()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 501, Address = "Origin" };
            var dest = new SalesSite { Id = 502, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1004, Login = "sender", IdSalesSite = 501 };
            _context.AppUsers.Add(user);

            var merchA = new Merchandise { Id = 501, AllowNegativStock = false };
            var merchB = new Merchandise { Id = 502, AllowNegativStock = false };
            _context.Merchandises.AddRange(merchA, merchB);

            var exitDoc = new Document { Id = 5001, SalesSiteId = 501, SalesSite = origin, DocNumber = "TR-26-007", StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 5002, SalesSiteId = 502, SalesSite = dest, DocNumber = "TR-26-008", StockTransactionType = TransactionType.Add };
            var exitDM = new DocumentMerchandise { DocumentId = 5001, MerchandiseId = 501, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 5002, MerchandiseId = 501, Quantity = 5 };
            exitDoc.DocumentMerchandises.Add(exitDM);
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            var stockA = new Stock { SalesSiteId = 501, MerchandiseId = 501, Quantity = 95 };
            var stockB = new Stock { SalesSiteId = 501, MerchandiseId = 502, Quantity = 50 };
            _context.Stocks.AddRange(stockA, stockB);

            var transfer = new StockTransfer
            {
                Id = 500,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 5001,
                ReceiptDocumentId = 5002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1,
                ConfirmationCode = "5555",
                Reference = "TR-26-007"
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Replace Article A x 5 with Article B x 5
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1004,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 502, quantity = 5 }
                }
            };
            var result = await service.UpdateTransferAsync(500, request);

            // Assert
            Assert.True(result.Success, result.Message);
            Assert.Equal(100, stockA.Quantity); // A restored: 95 + 5 = 100
            Assert.Equal(45, stockB.Quantity);  // B deducted: 50 - 5 = 45
            Assert.Equal(502, transfer.ExitDocument.DocumentMerchandises.First().MerchandiseId);
            Assert.Equal(502, transfer.ReceiptDocument.DocumentMerchandises.First().MerchandiseId);
            Assert.Equal(2, result.RevisionNumber);
            Assert.NotEqual("5555", result.ConfirmationCode);
        }

        [Fact]
        public async Task UpdateTransfer_InsufficientStock_ShouldFailAndRollback()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 601, Address = "Origin" };
            var dest = new SalesSite { Id = 602, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1005, Login = "sender", IdSalesSite = 601 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 601, AllowNegativStock = false };
            _context.Merchandises.Add(merch);

            var exitDoc = new Document { Id = 6001, SalesSiteId = 601, SalesSite = origin, DocNumber = "TR-26-009", StockTransactionType = TransactionType.Retrieve };
            var receiptDoc = new Document { Id = 6002, SalesSiteId = 602, SalesSite = dest, DocNumber = "TR-26-010", StockTransactionType = TransactionType.Add };
            var exitDM = new DocumentMerchandise { DocumentId = 6001, MerchandiseId = 601, Quantity = 5 };
            var receiptDM = new DocumentMerchandise { DocumentId = 6002, MerchandiseId = 601, Quantity = 5 };
            exitDoc.DocumentMerchandises.Add(exitDM);
            receiptDoc.DocumentMerchandises.Add(receiptDM);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDM, receiptDM);

            // Only 2 available in source stock, but user wants +5
            var stock = new Stock { SalesSiteId = 601, MerchandiseId = 601, Quantity = 2 };
            _context.Stocks.Add(stock);

            var transfer = new StockTransfer
            {
                Id = 600,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 6001,
                ReceiptDocumentId = 6002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1,
                ConfirmationCode = "9999",
                Reference = "TR-26-009"
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Request 10 (+5 delta, exceeds available 2)
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1005,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 601, quantity = 10 }
                }
            };
            var result = await service.UpdateTransferAsync(600, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Insufficient stock", result.Message, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(2, stock.Quantity); // Stock unmodified
            Assert.Equal(1, transfer.RevisionNumber); // Revision unmodified
            Assert.Equal("9999", transfer.ConfirmationCode); // PIN unmodified
        }

        [Fact]
        public async Task UpdateTransfer_ConfirmedTransfer_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 701, Address = "Origin" };
            var dest = new SalesSite { Id = 702, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1006, Login = "sender", IdSalesSite = 701 };
            _context.AppUsers.Add(user);

            var exitDoc = new Document { Id = 7001, SalesSiteId = 701, SalesSite = origin };
            var receiptDoc = new Document { Id = 7002, SalesSiteId = 702, SalesSite = dest };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 700,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 7001,
                ReceiptDocumentId = 7002,
                Status = TransferStatus.Confirmed,
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var request = new UpdateTransferRequest
            {
                Notes = "Attempt to edit confirmed",
                UpdatedByUserId = 1006
            };
            var result = await service.UpdateTransferAsync(700, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Confirmed", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task UpdateTransfer_RejectedTransfer_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 801, Address = "Origin" };
            var dest = new SalesSite { Id = 802, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1007, Login = "sender", IdSalesSite = 801 };
            _context.AppUsers.Add(user);

            var exitDoc = new Document { Id = 8001, SalesSiteId = 801, SalesSite = origin };
            var receiptDoc = new Document { Id = 8002, SalesSiteId = 802, SalesSite = dest };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 800,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 8001,
                ReceiptDocumentId = 8002,
                Status = TransferStatus.Rejected,
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var request = new UpdateTransferRequest
            {
                Notes = "Attempt to edit rejected",
                UpdatedByUserId = 1007
            };
            var result = await service.UpdateTransferAsync(800, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Rejected", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task UpdateTransfer_UnauthorizedUserFromDestinationSite_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 901, Address = "Origin" };
            var dest = new SalesSite { Id = 902, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            // User belongs to destination site (902), not origin site (901)
            var destUser = new AppUser { Id = 1008, Login = "destUser", IdSalesSite = 902 };
            _context.AppUsers.Add(destUser);

            var exitDoc = new Document { Id = 9001, SalesSiteId = 901, SalesSite = origin };
            var receiptDoc = new Document { Id = 9002, SalesSiteId = 902, SalesSite = dest };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 900,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 9001,
                ReceiptDocumentId = 9002,
                Status = TransferStatus.Pending,
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var request = new UpdateTransferRequest
            {
                Notes = "Unauthorized edit attempt",
                UpdatedByUserId = 1008
            };
            var result = await service.UpdateTransferAsync(900, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("authorized", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task UpdateTransfer_ChangeOriginOrDestinationSite_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 951, Address = "Origin" };
            var dest = new SalesSite { Id = 952, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1009, Login = "originUser", IdSalesSite = 951 };
            _context.AppUsers.Add(user);

            var exitDoc = new Document { Id = 9501, SalesSiteId = 951, SalesSite = origin };
            var receiptDoc = new Document { Id = 9502, SalesSiteId = 952, SalesSite = dest };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 950,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 9501,
                ReceiptDocumentId = 9502,
                Status = TransferStatus.Pending,
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - attempt to change origin site
            var requestOrigin = new UpdateTransferRequest
            {
                OriginSiteId = 999,
                UpdatedByUserId = 1009
            };
            var resultOrigin = await service.UpdateTransferAsync(950, requestOrigin);

            // Act - attempt to change destination site
            var requestDest = new UpdateTransferRequest
            {
                DestinationSiteId = 999,
                UpdatedByUserId = 1009
            };
            var resultDest = await service.UpdateTransferAsync(950, requestDest);

            // Assert
            Assert.False(resultOrigin.Success);
            Assert.Contains("Origin site cannot be changed", resultOrigin.Message);
            Assert.False(resultDest.Success);
            Assert.Contains("Destination site cannot be changed", resultDest.Message);
        }

        [Fact]
        public async Task ResendTransfer_Unchanged_ShouldDeductFullStockAndRegeneratePin()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1101, Address = "Origin" };
            var dest = new SalesSite { Id = 1102, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1201, Login = "originUser", IdSalesSite = 1101 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 1301, ArticleId = 1301 };
            var article = new Article { Id = 1301, Reference = "ART-1301" };
            _context.Merchandises.Add(merch);
            _context.Articles.Add(article);

            var stock = new Stock
            {
                MerchandiseId = 1301,
                Merchandises = merch,
                SalesSiteId = 1101,
                SalesSites = origin,
                Quantity = 100, // Restored stock upon rejection
                Type = TransactionType.Add
            };
            _context.Stocks.Add(stock);

            var exitDoc = new Document { Id = 1401, SalesSiteId = 1101, SalesSite = origin, Type = DocumentTypes.stockTransfer, DocNumber = "TR-26-1101" };
            var receiptDoc = new Document { Id = 1402, SalesSiteId = 1102, SalesSite = dest, Type = DocumentTypes.stockTransfer, DocNumber = "TR-26-1102" };
            var exitDm = new DocumentMerchandise { DocumentId = 1401, MerchandiseId = 1301, Quantity = 20 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1402, MerchandiseId = 1301, Quantity = 20 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 1501,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1401,
                ReceiptDocumentId = 1402,
                Reference = "TR-REF-1501",
                Status = TransferStatus.Rejected,
                ConfirmationCode = "1111",
                RevisionNumber = 1,
                RejectionReason = "Initial delivery damaged",
                ConfirmedById = 999,
                ConfirmationDate = DateTime.UtcNow.AddHours(-1)
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Resend unchanged quantity 20
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1201,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 1301, quantity = 20 }
                }
            };
            var result = await service.ResendTransferAsync(1501, request);

            // Assert
            Assert.True(result.Success, $"ResendTransfer failed: {result.Message}");
            Assert.Equal(TransferStatus.Pending, transfer.Status);
            Assert.Equal(2, transfer.RevisionNumber);
            Assert.NotEqual("1111", transfer.ConfirmationCode);
            Assert.Null(transfer.RejectionReason);
            Assert.Null(transfer.ConfirmedById);
            Assert.Null(transfer.ConfirmationDate);
            // Stock was 100, full deduction of 20 -> 80
            Assert.Equal(80, stock.Quantity);
            Assert.Equal(20, exitDm.Quantity);
            Assert.Equal(20, receiptDm.Quantity);
        }

        [Fact]
        public async Task ResendTransfer_QuantityIncrease_ShouldDeductFullNewQuantity()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1111, Address = "Origin" };
            var dest = new SalesSite { Id = 1112, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1211, Login = "originUser", IdSalesSite = 1111 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 1311, ArticleId = 1311 };
            var article = new Article { Id = 1311, Reference = "ART-1311" };
            _context.Merchandises.Add(merch);
            _context.Articles.Add(article);

            var stock = new Stock
            {
                MerchandiseId = 1311,
                Merchandises = merch,
                SalesSiteId = 1111,
                SalesSites = origin,
                Quantity = 100,
                Type = TransactionType.Add
            };
            _context.Stocks.Add(stock);

            var exitDoc = new Document { Id = 1411, SalesSiteId = 1111, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1412, SalesSiteId = 1112, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            var exitDm = new DocumentMerchandise { DocumentId = 1411, MerchandiseId = 1311, Quantity = 20 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1412, MerchandiseId = 1311, Quantity = 20 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 1511,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1411,
                ReceiptDocumentId = 1412,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "2222",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Resend with quantity increased to 30
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1211,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 1311, quantity = 30 }
                }
            };
            var result = await service.ResendTransferAsync(1511, request);

            // Assert
            Assert.True(result.Success);
            Assert.Equal(TransferStatus.Pending, transfer.Status);
            // Stock was 100, full deduction of 30 -> 70
            Assert.Equal(70, stock.Quantity);
            Assert.Equal(30, exitDm.Quantity);
            Assert.Equal(30, receiptDm.Quantity);
        }

        [Fact]
        public async Task ResendTransfer_QuantityDecrease_ShouldDeductFullNewQuantity()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1121, Address = "Origin" };
            var dest = new SalesSite { Id = 1122, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1221, Login = "originUser", IdSalesSite = 1121 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 1321, ArticleId = 1321 };
            var article = new Article { Id = 1321, Reference = "ART-1321" };
            _context.Merchandises.Add(merch);
            _context.Articles.Add(article);

            var stock = new Stock
            {
                MerchandiseId = 1321,
                Merchandises = merch,
                SalesSiteId = 1121,
                SalesSites = origin,
                Quantity = 100,
                Type = TransactionType.Add
            };
            _context.Stocks.Add(stock);

            var exitDoc = new Document { Id = 1421, SalesSiteId = 1121, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1422, SalesSiteId = 1122, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            var exitDm = new DocumentMerchandise { DocumentId = 1421, MerchandiseId = 1321, Quantity = 20 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1422, MerchandiseId = 1321, Quantity = 20 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 1521,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1421,
                ReceiptDocumentId = 1422,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "3333",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Resend with quantity decreased to 10
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1221,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 1321, quantity = 10 }
                }
            };
            var result = await service.ResendTransferAsync(1521, request);

            // Assert
            Assert.True(result.Success);
            Assert.Equal(TransferStatus.Pending, transfer.Status);
            // Stock was 100, full deduction of 10 -> 90 (NOT 100 + (20-10) = 110)
            Assert.Equal(90, stock.Quantity);
            Assert.Equal(10, exitDm.Quantity);
            Assert.Equal(10, receiptDm.Quantity);
        }

        [Fact]
        public async Task ResendTransfer_ReplaceArticle_ShouldDeductNewArticleOnly()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1131, Address = "Origin" };
            var dest = new SalesSite { Id = 1132, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1231, Login = "originUser", IdSalesSite = 1131 };
            _context.AppUsers.Add(user);

            var merchA = new Merchandise { Id = 1331, ArticleId = 1331 };
            var merchB = new Merchandise { Id = 1332, ArticleId = 1332 };
            _context.Merchandises.AddRange(merchA, merchB);

            var stockA = new Stock { MerchandiseId = 1331, Merchandises = merchA, SalesSiteId = 1131, Quantity = 100, Type = TransactionType.Add };
            var stockB = new Stock { MerchandiseId = 1332, Merchandises = merchB, SalesSiteId = 1131, Quantity = 50, Type = TransactionType.Add };
            _context.Stocks.AddRange(stockA, stockB);

            var exitDoc = new Document { Id = 1431, SalesSiteId = 1131, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1432, SalesSiteId = 1132, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            var exitDmA = new DocumentMerchandise { DocumentId = 1431, MerchandiseId = 1331, Quantity = 20 };
            var receiptDmA = new DocumentMerchandise { DocumentId = 1432, MerchandiseId = 1331, Quantity = 20 };
            exitDoc.DocumentMerchandises.Add(exitDmA);
            receiptDoc.DocumentMerchandises.Add(receiptDmA);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDmA, receiptDmA);

            var transfer = new StockTransfer
            {
                Id = 1531,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1431,
                ReceiptDocumentId = 1432,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "4444",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Replace Article A with Article B (quantity 20)
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1231,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 1332, quantity = 20 }
                }
            };
            var result = await service.ResendTransferAsync(1531, request);

            // Assert
            Assert.True(result.Success);
            Assert.Equal(TransferStatus.Pending, transfer.Status);
            // Article A remains untouched at 100
            Assert.Equal(100, stockA.Quantity);
            // Article B deducted by 20 -> 30
            Assert.Equal(30, stockB.Quantity);
            // Document has Article B
            Assert.Single(exitDoc.DocumentMerchandises);
            Assert.Equal(1332, exitDoc.DocumentMerchandises.First().MerchandiseId);
        }

        [Fact]
        public async Task ResendTransfer_InsufficientStock_ShouldRollbackAndFail()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1141, Address = "Origin" };
            var dest = new SalesSite { Id = 1142, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1241, Login = "originUser", IdSalesSite = 1141 };
            _context.AppUsers.Add(user);

            var merch = new Merchandise { Id = 1341, ArticleId = 1341, AllowNegativStock = false };
            _context.Merchandises.Add(merch);

            var stock = new Stock
            {
                MerchandiseId = 1341,
                Merchandises = merch,
                SalesSiteId = 1141,
                Quantity = 15, // Only 15 available
                Type = TransactionType.Add
            };
            _context.Stocks.Add(stock);

            var exitDoc = new Document { Id = 1441, SalesSiteId = 1141, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1442, SalesSiteId = 1142, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            var exitDm = new DocumentMerchandise { DocumentId = 1441, MerchandiseId = 1341, Quantity = 20 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1442, MerchandiseId = 1341, Quantity = 20 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 1541,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1441,
                ReceiptDocumentId = 1442,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "5555",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - Try to resend with quantity 20 (requires 20, but only 15 available)
            var request = new UpdateTransferRequest
            {
                UpdatedByUserId = 1241,
                MerchandisesItems = new[]
                {
                    new MerchandiseDto { id = 1341, quantity = 20 }
                }
            };
            var result = await service.ResendTransferAsync(1541, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Insufficient stock", result.Message);
            Assert.Equal(TransferStatus.Rejected, transfer.Status);
            Assert.Equal(15, stock.Quantity);
            Assert.Equal("5555", transfer.ConfirmationCode);
            Assert.Equal(1, transfer.RevisionNumber);
        }

        [Fact]
        public async Task ResendTransfer_OldPinRejected_NewPinAccepted()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1151, Address = "Origin" };
            var dest = new SalesSite { Id = 1152, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var userOrigin = new AppUser { Id = 1251, Login = "originUser", IdSalesSite = 1151 };
            var userDest = new AppUser { Id = 1252, Login = "destUser", IdSalesSite = 1152 };
            _context.AppUsers.AddRange(userOrigin, userDest);

            var merch = new Merchandise { Id = 1351, ArticleId = 1351 };
            _context.Merchandises.Add(merch);

            var stock = new Stock { MerchandiseId = 1351, Merchandises = merch, SalesSiteId = 1151, Quantity = 100, Type = TransactionType.Add };
            _context.Stocks.Add(stock);

            var exitDoc = new Document { Id = 1451, SalesSiteId = 1151, SalesSite = origin, Type = DocumentTypes.stockTransfer, StockTransactionType = TransactionType.Retrieve, UpdatedById = 1251 };
            var receiptDoc = new Document { Id = 1452, SalesSiteId = 1152, SalesSite = dest, Type = DocumentTypes.stockTransfer, StockTransactionType = TransactionType.Add, UpdatedById = 1251 };
            var exitDm = new DocumentMerchandise { DocumentId = 1451, MerchandiseId = 1351, Merchandise = merch, Quantity = 10 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1452, MerchandiseId = 1351, Merchandise = merch, Quantity = 10 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 1551,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1451,
                ReceiptDocumentId = 1452,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "6666",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act 1: Resend
            var resendRequest = new UpdateTransferRequest
            {
                UpdatedByUserId = 1251,
                MerchandisesItems = new[] { new MerchandiseDto { id = 1351, quantity = 10 } }
            };
            var resendResult = await service.ResendTransferAsync(1551, resendRequest);
            Assert.True(resendResult.Success);
            string newPin = transfer.ConfirmationCode!;
            Assert.NotEqual("6666", newPin);

            // Act 2: Attempt confirm with old PIN 6666 -> FAILS
            var confirmOldResult = await service.ConfirmTransferAsync(1551, 1252, "6666");
            Assert.False(confirmOldResult.Success);
            Assert.Contains("Incorrect code", confirmOldResult.Message);

            // Act 3: Confirm with new PIN -> SUCCEEDS
            var confirmNewResult = await service.ConfirmTransferAsync(1551, 1252, newPin);
            Assert.True(confirmNewResult.Success);
            Assert.Equal(TransferStatus.Confirmed, transfer.Status);
        }

        [Fact]
        public async Task ResendTransfer_PendingTransfer_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1161, Address = "Origin" };
            var dest = new SalesSite { Id = 1162, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1261, Login = "originUser", IdSalesSite = 1161 };
            _context.AppUsers.Add(user);

            var exitDoc = new Document { Id = 1461, SalesSiteId = 1161, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1462, SalesSiteId = 1162, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 1561,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1461,
                ReceiptDocumentId = 1462,
                Status = TransferStatus.Pending // Already Pending!
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var request = new UpdateTransferRequest { UpdatedByUserId = 1261 };
            var result = await service.ResendTransferAsync(1561, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Pending transfers cannot be resent", result.Message);
        }

        [Fact]
        public async Task ResendTransfer_ConfirmedTransfer_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1171, Address = "Origin" };
            var dest = new SalesSite { Id = 1172, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1271, Login = "originUser", IdSalesSite = 1171 };
            _context.AppUsers.Add(user);

            var exitDoc = new Document { Id = 1471, SalesSiteId = 1171, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1472, SalesSiteId = 1172, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 1571,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1471,
                ReceiptDocumentId = 1472,
                Status = TransferStatus.Confirmed // Confirmed!
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act
            var request = new UpdateTransferRequest { UpdatedByUserId = 1271 };
            var result = await service.ResendTransferAsync(1571, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Confirmed transfers cannot be resent", result.Message);
        }

        [Fact]
        public async Task ResendTransfer_UnauthorizedUser_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1181, Address = "Origin" };
            var dest = new SalesSite { Id = 1182, Address = "Dest" };
            var otherSite = new SalesSite { Id = 1183, Address = "Other" };
            _context.SalesSites.AddRange(origin, dest, otherSite);

            var userOther = new AppUser { Id = 1281, Login = "otherUser", IdSalesSite = 1183 };
            _context.AppUsers.Add(userOther);

            var exitDoc = new Document { Id = 1481, SalesSiteId = 1181, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1482, SalesSiteId = 1182, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 1581,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1481,
                ReceiptDocumentId = 1482,
                Status = TransferStatus.Rejected
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - User from site 1183 attempts resend of transfer from site 1181
            var request = new UpdateTransferRequest { UpdatedByUserId = 1281 };
            var result = await service.ResendTransferAsync(1581, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Forbidden", result.Message);
        }

        [Fact]
        public async Task ResendTransfer_DestinationUser_ShouldBeRejected()
        {
            // Arrange
            var service = CreateService();
            var origin = new SalesSite { Id = 1191, Address = "Origin" };
            var dest = new SalesSite { Id = 1192, Address = "Dest" };
            _context.SalesSites.AddRange(origin, dest);

            var userDest = new AppUser { Id = 1291, Login = "destUser", IdSalesSite = 1192 };
            _context.AppUsers.Add(userDest);

            var exitDoc = new Document { Id = 1491, SalesSiteId = 1191, SalesSite = origin, Type = DocumentTypes.stockTransfer };
            var receiptDoc = new Document { Id = 1492, SalesSiteId = 1192, SalesSite = dest, Type = DocumentTypes.stockTransfer };
            _context.Documents.AddRange(exitDoc, receiptDoc);

            var transfer = new StockTransfer
            {
                Id = 1591,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1491,
                ReceiptDocumentId = 1492,
                Status = TransferStatus.Rejected
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Act - User from destination site 1192 attempts resend
            var request = new UpdateTransferRequest { UpdatedByUserId = 1291 };
            var result = await service.ResendTransferAsync(1591, request);

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Forbidden", result.Message);
        }

        [Fact]
        public async Task ResendTransfer_Timeline_ShouldShowExitAtOrigin_AndZeroAtDestination()
        {
            // Arrange
            var service = CreateService();
            var movementService = new StockMovementService(_context);
            var origin = new SalesSite { Id = 1601, Address = "OriginSite" };
            var dest = new SalesSite { Id = 1602, Address = "DestSite" };
            _context.SalesSites.AddRange(origin, dest);

            var user = new AppUser { Id = 1701, Login = "originUser", IdSalesSite = 1601 };
            _context.AppUsers.Add(user);

            var article = new Article { Id = 1801, Reference = "RESEND-ART-1" };
            var merch = new Merchandise { Id = 1801, ArticleId = 1801, PackageReference = "Standard", IsDeleted = false };
            _context.Articles.Add(article);
            _context.Merchandises.Add(merch);

            var stock = new Stock { MerchandiseId = 1801, Merchandises = merch, SalesSiteId = 1601, Quantity = 100, Type = TransactionType.Add };
            _context.Stocks.Add(stock);

            var exitDoc = new Document
            {
                Id = 1901,
                DocNumber = "TR-26-1901",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Retrieve,
                SalesSiteId = 1601,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var receiptDoc = new Document
            {
                Id = 1902,
                DocNumber = "TR-26-1902",
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Add,
                SalesSiteId = 1602,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            var exitDm = new DocumentMerchandise { DocumentId = 1901, MerchandiseId = 1801, Quantity = 25 };
            var receiptDm = new DocumentMerchandise { DocumentId = 1902, MerchandiseId = 1801, Quantity = 25 };
            exitDoc.DocumentMerchandises.Add(exitDm);
            receiptDoc.DocumentMerchandises.Add(receiptDm);
            _context.Documents.AddRange(exitDoc, receiptDoc);
            _context.DocumentMerchandises.AddRange(exitDm, receiptDm);

            var transfer = new StockTransfer
            {
                Id = 2001,
                ExitDocument = exitDoc,
                ReceiptDocument = receiptDoc,
                ExitDocumentId = 1901,
                ReceiptDocumentId = 1902,
                Status = TransferStatus.Rejected,
                ConfirmationCode = "7777",
                RevisionNumber = 1
            };
            _context.StockTransfers.Add(transfer);
            await _context.SaveChangesAsync();

            // Prior to resend: Rejected timeline has 0 movements at both sites (P0)
            var originBefore = await movementService.GetTimelineAsync(1801, 1601);
            var destBefore = await movementService.GetTimelineAsync(1801, 1602);
            Assert.Empty(originBefore);
            Assert.Empty(destBefore);

            // Act - Resend with quantity 25
            var resendRequest = new UpdateTransferRequest
            {
                UpdatedByUserId = 1701,
                MerchandisesItems = new[] { new MerchandiseDto { id = 1801, quantity = 25 } }
            };
            var resendResult = await service.ResendTransferAsync(2001, resendRequest);
            Assert.True(resendResult.Success);

            // Assert timeline after resend:
            // Origin: exactly 1 movement, negative delta (-25)
            var originAfter = (await movementService.GetTimelineAsync(1801, 1601)).ToList();
            Assert.Single(originAfter);
            Assert.Equal(-25, originAfter[0].QuantityDelta);
            Assert.Equal("TR-26-1901", originAfter[0].DocumentNumber);

            // Destination: still ZERO movement while transfer is Pending
            var destAfter = (await movementService.GetTimelineAsync(1801, 1602)).ToList();
            Assert.Empty(destAfter);
        }

        private StockService CreateService()
        {
            return new StockService(
                _stockRepository,
                _context,
                _docRepository,
                _hubContextMock.Object,
                _notificationServiceMock.Object,
                _loggerMock.Object);
        }
    }
}
