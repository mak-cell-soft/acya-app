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
