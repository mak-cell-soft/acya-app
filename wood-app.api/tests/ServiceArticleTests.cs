using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class ServiceArticleTests
    {
        private readonly WoodAppContext _context;
        private readonly StockRepository _stockRepository;
        private readonly MerchandiseRepository _merchandiseRepository;
        private readonly DocumentRepository _documentRepository;
        private readonly Mock<IAccountService> _accountServiceMock;
        private readonly Mock<IBalanceService> _balanceServiceMock;
        private readonly Mock<IApprovalService> _approvalServiceMock;
        private readonly Mock<IPdfGenerationService> _pdfServiceMock;
        private readonly Mock<IAppNotificationService> _notificationServiceMock;
        private readonly Mock<IEmailService> _emailServiceMock;

        public ServiceArticleTests()
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new WoodAppContext(options);

            var docMerchRepo = new DocumentMerchandiseRepository(_context);
            _stockRepository = new StockRepository(_context, docMerchRepo);
            _merchandiseRepository = new MerchandiseRepository(_context);
            _documentRepository = new DocumentRepository(_context, _stockRepository);

            _accountServiceMock = new Mock<IAccountService>();
            _balanceServiceMock = new Mock<IBalanceService>();
            _approvalServiceMock = new Mock<IApprovalService>();
            _pdfServiceMock = new Mock<IPdfGenerationService>();
            _notificationServiceMock = new Mock<IAppNotificationService>();
            _emailServiceMock = new Mock<IEmailService>();
        }

        private DocumentController CreateDocumentController()
        {
            var controller = new DocumentController(
                _documentRepository,
                _merchandiseRepository,
                _stockRepository,
                _context,
                _accountServiceMock.Object,
                _balanceServiceMock.Object,
                _approvalServiceMock.Object,
                _pdfServiceMock.Object,
                _notificationServiceMock.Object,
                _emailServiceMock.Object
            );

            controller.ControllerContext = new ControllerContext()
            {
                HttpContext = new DefaultHttpContext()
            };

            return controller;
        }

        [Fact]
        public async Task AddDocument_SupplierInvoice_WithServiceArticle_ReturnsBadRequest()
        {
            // Arrange
            var controller = CreateDocumentController();

            var appUser = new AppUser { Id = 10, Login = "admin", Email = "admin@acya.site" };
            _context.AppUsers.Add(appUser);

            var serviceArticle = new Article
            {
                Id = 101,
                Reference = "SRV-TEST-01",
                Description = "Service de pose",
                Type = ArticleType.Service,
                ParentId = 1,
                FirstChildId = 1,
                Unit = "FORFAIT",
                SellPriceHT = 200
            };
            _context.Articles.Add(serviceArticle);
            await _context.SaveChangesAsync();

            var docDto = new DocumentDto
            {
                type = DocumentTypes.supplierInvoice, // Purchase document
                updatedbyid = appUser.Id,
                docnumber = "FAC-TEST-001",
                merchandises = new MerchandiseDto[]
                {
                    new MerchandiseDto
                    {
                        article = new ArticleDto { id = serviceArticle.Id, reference = serviceArticle.Reference, type = ArticleType.Service },
                        cost_ht = 200,
                        unit_price_ht = 200,
                        quantity = 1
                    }
                }
            };

            // Act
            var result = await controller.Add(docDto);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("Un article de type Service", badRequestResult.Value?.ToString());
        }

        [Fact]
        public async Task AddDocument_SupplierOrder_WithServiceArticle_ReturnsBadRequest()
        {
            // Arrange
            var controller = CreateDocumentController();

            var appUser = new AppUser { Id = 11, Login = "buyer", Email = "buyer@acya.site" };
            _context.AppUsers.Add(appUser);

            var serviceArticle = new Article
            {
                Id = 102,
                Reference = "SRV-TEST-02",
                Description = "Prestation transport",
                Type = ArticleType.Service,
                ParentId = 1,
                FirstChildId = 1
            };
            _context.Articles.Add(serviceArticle);
            await _context.SaveChangesAsync();

            var docDto = new DocumentDto
            {
                type = DocumentTypes.supplierOrder,
                updatedbyid = appUser.Id,
                docnumber = "BC-TEST-001",
                merchandises = new MerchandiseDto[]
                {
                    new MerchandiseDto
                    {
                        article = new ArticleDto { id = serviceArticle.Id, type = ArticleType.Service },
                        quantity = 1,
                        cost_ht = 100
                    }
                }
            };

            // Act
            var result = await controller.Add(docDto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UpdateStockByMerchandises_ServiceArticle_DoesNotThrowEvenWhenNoStockExists()
        {
            // Arrange
            var appUser = new AppUser { Id = 1, Login = "admin", Email = "admin@acya.site" };
            var salesSite = new SalesSite { Id = 1, Address = "Dépôt Central", Gouvernorate = "Tunis" };
            _context.AppUsers.Add(appUser);
            _context.SalesSites.Add(salesSite);

            var serviceArticle = new Article
            {
                Id = 201,
                Reference = "SRV-TEST-03",
                Description = "Main d'oeuvre",
                Type = ArticleType.Service,
                ParentId = 1,
                FirstChildId = 1
            };
            _context.Articles.Add(serviceArticle);

            var serviceMerchandise = new Merchandise
            {
                Id = 1,
                ArticleId = serviceArticle.Id,
                Articles = serviceArticle,
                PackageReference = "SERVICE",
                AllowNegativStock = true,
                IsInvoicible = true
            };
            _context.Merchandises.Add(serviceMerchandise);
            await _context.SaveChangesAsync();

            var customerInvoiceDoc = new ms.webapp.api.acya.core.Entities.Document
            {
                Id = 10,
                Type = DocumentTypes.customerInvoice,
                SalesSite = salesSite,
                SalesSiteId = salesSite.Id,
                UpdatedById = appUser.Id,
                DocumentMerchandises = new List<DocumentMerchandise>
                {
                    new DocumentMerchandise
                    {
                        Id = 1,
                        Type = LineType.Merchandise,
                        Merchandise = serviceMerchandise,
                        MerchandiseId = serviceMerchandise.Id,
                        Quantity = 5,
                        UnitPriceHT = 50
                    }
                }
            };

            // Act & Assert
            // Normally CustomerInvoice triggers TransactionType.Retrieve which throws "Cannot retrieve stock from an empty inventory."
            // Because Article is Service, updateStockByMerchandises should safely skip stock movement without throwing.
            var exception = await Record.ExceptionAsync(() => _documentRepository.updateStockByMerchandises(customerInvoiceDoc));

            Assert.Null(exception);
        }

        [Fact]
        public async Task MixedDocument_CustomerInvoice_DecrementsMerchandiseStockAndLeavesServiceUntouched()
        {
            // Arrange
            var appUser = new AppUser { Id = 2, Login = "User2", Email = "user2@acya.site" };
            var salesSite = new SalesSite { Id = 2, Address = "Dépôt Sfax", Gouvernorate = "Sfax" };
            _context.AppUsers.Add(appUser);
            _context.SalesSites.Add(salesSite);

            // 1. Merchandise article with real stock
            var merchArticle = new Article
            {
                Id = 301,
                Reference = "PROD-WOOD-01",
                Description = "Planche Sapin",
                Type = ArticleType.Merchandise,
                ParentId = 1,
                FirstChildId = 1,
                IsWood = false,
                Unit = "PCS"
            };
            // 2. Service article with no stock
            var serviceArticle = new Article
            {
                Id = 302,
                Reference = "SRV-DECOUPE",
                Description = "Découpe sur mesure",
                Type = ArticleType.Service,
                ParentId = 1,
                FirstChildId = 1,
                Unit = "FORFAIT"
            };

            _context.Articles.AddRange(merchArticle, serviceArticle);

            var merchEntity = new Merchandise
            {
                Id = 10,
                ArticleId = merchArticle.Id,
                Articles = merchArticle,
                PackageReference = "BATCH-001",
                AllowNegativStock = false,
                IsInvoicible = true
            };
            var serviceEntity = new Merchandise
            {
                Id = 20,
                ArticleId = serviceArticle.Id,
                Articles = serviceArticle,
                PackageReference = "SERVICE",
                AllowNegativStock = true,
                IsInvoicible = true
            };
            _context.Merchandises.AddRange(merchEntity, serviceEntity);

            // Seed initial stock of 10 for merchandise
            var initialStock = new Stock
            {
                Id = 10,
                SalesSiteId = salesSite.Id,
                SalesSites = salesSite,
                MerchandiseId = merchEntity.Id,
                Merchandises = merchEntity,
                Quantity = 10,
                Type = TransactionType.Add,
                UpdatedById = appUser.Id
            };
            _context.Stocks.Add(initialStock);
            await _context.SaveChangesAsync();

            // Prepare mixed customer invoice: sell 3 pieces of merchandise + 1 service
            var mixedDocument = new ms.webapp.api.acya.core.Entities.Document
            {
                Id = 20,
                Type = DocumentTypes.customerInvoice,
                SalesSite = salesSite,
                SalesSiteId = salesSite.Id,
                UpdatedById = appUser.Id,
                DocumentMerchandises = new List<DocumentMerchandise>
                {
                    new DocumentMerchandise
                    {
                        Id = 11,
                        Type = LineType.Merchandise,
                        MerchandiseId = merchEntity.Id,
                        Merchandise = merchEntity,
                        Quantity = 3,
                        UnitPriceHT = 100
                    },
                    new DocumentMerchandise
                    {
                        Id = 12,
                        Type = LineType.Merchandise,
                        MerchandiseId = serviceEntity.Id,
                        Merchandise = serviceEntity,
                        Quantity = 1,
                        UnitPriceHT = 50
                    }
                }
            };

            // Act: Execute stock decrement for the mixed document
            await _documentRepository.updateStockByMerchandises(mixedDocument);

            // Assert:
            // 1. Merchandise stock should be reduced from 10 to 7
            var updatedMerchStock = await _context.Stocks.FirstOrDefaultAsync(s => s.MerchandiseId == merchEntity.Id);
            Assert.NotNull(updatedMerchStock);
            Assert.Equal(7, updatedMerchStock.Quantity);

            // 2. Service article should have NO stock rows created
            var serviceStockExists = await _context.Stocks.AnyAsync(s => s.MerchandiseId == serviceEntity.Id);
            Assert.False(serviceStockExists);
        }

        [Fact]
        public async Task RevertStockByMerchandises_MixedDocument_RestoresMerchandiseAndSkipsService()
        {
            // Arrange
            var appUser = new AppUser { Id = 3, Login = "User3", Email = "user3@acya.site" };
            var salesSite = new SalesSite { Id = 3, Address = "Dépôt Tunis", Gouvernorate = "Tunis" };
            _context.AppUsers.Add(appUser);
            _context.SalesSites.Add(salesSite);

            var merchArticle = new Article
            {
                Id = 401,
                Reference = "PROD-PANEL-01",
                Description = "Panneau MDF",
                Type = ArticleType.Merchandise,
                ParentId = 1,
                FirstChildId = 1
            };
            var serviceArticle = new Article
            {
                Id = 402,
                Reference = "SRV-LIVRAISON",
                Description = "Livraison Express",
                Type = ArticleType.Service,
                ParentId = 1,
                FirstChildId = 1
            };
            _context.Articles.AddRange(merchArticle, serviceArticle);

            var merchEntity = new Merchandise
            {
                Id = 30,
                ArticleId = merchArticle.Id,
                Articles = merchArticle,
                PackageReference = "BATCH-MDF"
            };
            var serviceEntity = new Merchandise
            {
                Id = 40,
                ArticleId = serviceArticle.Id,
                Articles = serviceArticle,
                PackageReference = "SERVICE"
            };
            _context.Merchandises.AddRange(merchEntity, serviceEntity);

            var initialStock = new Stock
            {
                Id = 20,
                SalesSiteId = salesSite.Id,
                SalesSites = salesSite,
                MerchandiseId = merchEntity.Id,
                Merchandises = merchEntity,
                Quantity = 5,
                Type = TransactionType.Add,
                UpdatedById = appUser.Id
            };
            _context.Stocks.Add(initialStock);
            await _context.SaveChangesAsync();

            var mixedDocument = new ms.webapp.api.acya.core.Entities.Document
            {
                Id = 30,
                Type = DocumentTypes.customerInvoice,
                SalesSite = salesSite,
                SalesSiteId = salesSite.Id,
                UpdatedById = appUser.Id,
                DocumentMerchandises = new List<DocumentMerchandise>
                {
                    new DocumentMerchandise
                    {
                        Id = 21,
                        Type = LineType.Merchandise,
                        MerchandiseId = merchEntity.Id,
                        Merchandise = merchEntity,
                        Quantity = 5
                    },
                    new DocumentMerchandise
                    {
                        Id = 22,
                        Type = LineType.Merchandise,
                        MerchandiseId = serviceEntity.Id,
                        Merchandise = serviceEntity,
                        Quantity = 1
                    }
                }
            };

            // Act: Revert stock retrieval (document cancelled or modified)
            await _documentRepository.revertStockByMerchandises(mixedDocument, appUser);

            // Assert: Merchandise stock restored from 5 to 10
            var restoredStock = await _context.Stocks.FirstOrDefaultAsync(s => s.MerchandiseId == merchEntity.Id);
            Assert.NotNull(restoredStock);
            Assert.Equal(10, restoredStock.Quantity);

            // Service article should have NO stock rows created
            var serviceStockCount = await _context.Stocks.CountAsync(s => s.MerchandiseId == serviceEntity.Id);
            Assert.Equal(0, serviceStockCount);
        }
    }
}
