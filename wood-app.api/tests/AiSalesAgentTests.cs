using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers.AI;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Middleware;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.Attributes;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.AI;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class AiSalesAgentTests
    {
        private const string TestAiSecret = "test_super_secure_ai_secret_key_123456";

        private (WoodAppContext context, TenantContext tenantContext) CreateContext(string dbName, string tenantSlug)
        {
            var tenantContext = new TenantContext
            {
                IsEnabled = true,
                Slug = tenantSlug,
                SchemaName = $"tenant_{tenantSlug.Replace("-", "_")}"
            };

            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_{tenantSlug}")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            var ctx = new WoodAppContext(options, tenantContext);
            return (ctx, tenantContext);
        }

        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_master")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new MasterDbContext(options);
        }

        private IConfiguration CreateConfig(string? secret = TestAiSecret)
        {
            var inMemorySettings = new Dictionary<string, string?>();
            if (secret != null)
            {
                inMemorySettings["AIService:Secret"] = secret;
            }

            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();
        }

        private Article CreateTestArticle(
            WoodAppContext db,
            int id,
            string reference,
            string description,
            double priceHT = 20.0,
            bool isWood = false,
            string? lengths = null)
        {
            var cat = db.Parents.Find(1);
            if (cat == null)
            {
                cat = new Parent { Id = 1, Reference = "CAT1", Description = "Catégorie Test" };
                db.Parents.Add(cat);
            }

            var subCat = db.FirstChildren.Find(1);
            if (subCat == null)
            {
                subCat = new FirstChild { Id = 1, Reference = "SUBCAT1", Description = "Sous-Catégorie Test", IdParent = 1 };
                db.FirstChildren.Add(subCat);
            }

            var tva = db.AppVariables.Find(1);
            if (tva == null)
            {
                tva = new AppVariable { Id = 1, Name = "19%" };
                db.AppVariables.Add(tva);
            }

            var article = new Article
            {
                Id = id,
                Reference = reference,
                Description = description,
                Type = ArticleType.Merchandise,
                IsWood = isWood,
                Unit = isWood ? "m3" : "Pcs",
                SellPriceHT = priceHT,
                SellPriceTTC = Math.Round(priceHT * 1.19, 3),
                LastPurchasePriceTTC = Math.Round(priceHT * 0.7, 3),
                ProfitMarginPercentage = 30.0,
                ParentId = 1,
                FirstChildId = 1,
                TvaId = 1,
                Lengths = lengths,
                IsDeleted = false
            };

            db.Articles.Add(article);
            db.SaveChanges();
            return article;
        }

        private ActionExecutingContext CreateActionContext(HttpContext httpContext)
        {
            var actionContext = new ActionContext(
                httpContext,
                new RouteData(),
                new ActionDescriptor()
            );

            return new ActionExecutingContext(
                actionContext,
                new List<IFilterMetadata>(),
                new Dictionary<string, object?>(),
                new object()
            );
        }

        #region TEST 1 & 2: Authentication Security

        [Fact]
        public async Task Test1_Missing_XAiSecret_Returns401Unauthorized()
        {
            var filter = new RequireAiSecretAttribute();
            var httpContext = new DefaultHttpContext();
            var services = new ServiceCollection();
            services.AddSingleton(CreateConfig(TestAiSecret));
            services.AddLogging();
            httpContext.RequestServices = services.BuildServiceProvider();

            var actionContext = CreateActionContext(httpContext);
            bool nextCalled = false;

            await filter.OnActionExecutionAsync(actionContext, () =>
            {
                nextCalled = true;
                return Task.FromResult<ActionExecutedContext>(null!);
            });

            Assert.False(nextCalled);
            Assert.IsType<UnauthorizedObjectResult>(actionContext.Result);
        }

        [Fact]
        public async Task Test2_Invalid_XAiSecret_Returns401Unauthorized()
        {
            var filter = new RequireAiSecretAttribute();
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-AI-Secret"] = "wrong_invalid_secret";

            var services = new ServiceCollection();
            services.AddSingleton(CreateConfig(TestAiSecret));
            services.AddLogging();
            httpContext.RequestServices = services.BuildServiceProvider();

            var actionContext = CreateActionContext(httpContext);
            bool nextCalled = false;

            await filter.OnActionExecutionAsync(actionContext, () =>
            {
                nextCalled = true;
                return Task.FromResult<ActionExecutedContext>(null!);
            });

            Assert.False(nextCalled);
            Assert.IsType<UnauthorizedObjectResult>(actionContext.Result);
        }

        #endregion

        #region TEST 3: Tenant Resolution with Socofeb

        [Fact]
        public async Task Test3_ValidSecret_And_XTenantSlug_ResolvesSocofebContext()
        {
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateMasterDb(dbName);
            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Slug = "socofeb",
                Name = "SOCOFEB",
                SchemaName = "tenant_socofeb",
                IsActive = true,
                Status = "Active"
            });
            await masterDb.SaveChangesAsync();

            var tenantResolver = new SubdomainTenantResolver();
            var tenantContext = new TenantContext();

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/ai/products/search";
            httpContext.Request.Headers["X-Tenant-Slug"] = "socofeb";
            httpContext.Request.Headers["X-AI-Secret"] = TestAiSecret;

            var middleware = new TenantMiddleware(
                next: (ctx) => Task.CompletedTask,
                logger: new Mock<ILogger<TenantMiddleware>>().Object
            );

            await middleware.InvokeAsync(httpContext, tenantResolver, tenantContext, masterDb);

            Assert.True(tenantContext.IsEnabled);
            Assert.Equal("socofeb", tenantContext.Slug);
            Assert.Equal("tenant_socofeb", tenantContext.SchemaName);
        }

        #endregion

        #region TEST 4 & 5: Customer-Safe Search and Detail (Confidential Fields Scrubbed)

        [Fact]
        public async Task Test4_ProductSearch_ReturnsOnlyCustomerSafeFields()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var article = CreateTestArticle(db, 42, "MDF-18-BLANC", "Panneau MDF Blanc 18mm 280x207", 85.500, isWood: false);

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var actionResult = await controller.SearchProducts("MDF", 10);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var products = Assert.IsAssignableFrom<IEnumerable<AiProductDto>>(okResult.Value).ToList();

            Assert.Single(products);
            var p = products[0];
            Assert.Equal("MDF-18-BLANC", p.Reference);
            Assert.Equal("Panneau MDF Blanc 18mm 280x207", p.Name);
            Assert.Equal("Catégorie Test", p.Category);
            Assert.False(p.IsWood);
            Assert.Equal("Pcs", p.Unit);

            // Serialization check: Ensure NO purchase price or margin property exists in json
            var json = JsonSerializer.Serialize(p);
            Assert.DoesNotContain("lastpurchaseprice", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("profitmargin", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("cost", json, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Test5_ProductDetail_NeverExposesConfidentialPurchaseCostOrMargin()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var article = CreateTestArticle(db, 101, "CHEV-8X8", "Chevron Rouge 8x8 cm", 12.000, isWood: true, lengths: "3.0, 3.6, 4.0");

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var actionResult = await controller.GetProduct(article.Id);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var detail = Assert.IsType<AiProductDetailDto>(okResult.Value);

            Assert.Equal("CHEV-8X8", detail.Reference);
            Assert.True(detail.IsWood);
            Assert.Equal("3.0, 3.6, 4.0", detail.Dimensions?.AvailableLengths);

            var json = JsonSerializer.Serialize(detail);
            Assert.DoesNotContain("lastpurchaseprice", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("profitmargin", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("cost", json, StringComparison.OrdinalIgnoreCase);
        }

        #endregion

        #region TEST 6 & 7: Price Resolution (Catalog vs Phone-Matched Customer)

        [Fact]
        public async Task Test6_PriceEndpoint_ReturnsCatalogPrice_WhenPhoneIsUnmatchedOrEmpty()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var article = CreateTestArticle(db, 201, "BASTAING-6X16", "Bastaing Rouge 6x16 cm", 20.000, isWood: true);

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            // Call with un-registered phone number
            var actionResult = await controller.GetPrice(article.Id, customerPhone: "+21699999999");
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var price = Assert.IsType<AiPriceDto>(okResult.Value);

            Assert.False(price.IsCustomerIdentified);
            Assert.Null(price.CustomerName);
            Assert.Null(price.DiscountRate);
            Assert.Equal(20.000, price.CatalogPriceHT);
            Assert.Equal(23.800, price.CatalogPriceTTC);
            Assert.Equal(20.000, price.FinalPriceHT);
            Assert.Equal(23.800, price.FinalPriceTTC);
        }

        [Fact]
        public async Task Test7_CustomerSpecificPricing_Applied_WhenPhoneMatchedInPricingGrid()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var article = CreateTestArticle(db, 202, "BASTAING-6X16", "Bastaing Rouge 6x16 cm", 20.000, isWood: true);

            var customer = new CounterPart
            {
                Id = 55,
                Name = "Menuiserie Tunisienne",
                PhoneNumberOne = "+216 98 123 456",
                Type = CounterPartType.Customer,
                IsDeleted = false
            };
            db.CounterParts.Add(customer);
            await db.SaveChangesAsync();

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);

            var pricingGridMock = new Mock<IPricingGridService>();
            pricingGridMock.Setup(s => s.GetLookupAsync(customer.Id))
                .ReturnsAsync(new List<PricingGridLookupDto>
                {
                    new PricingGridLookupDto { articleid = article.Id, discountrate = 10.0 }
                });

            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            // Call with WhatsApp format E.164 without spaces: 21698123456
            var actionResult = await controller.GetPrice(article.Id, customerPhone: "21698123456");
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var price = Assert.IsType<AiPriceDto>(okResult.Value);

            Assert.True(price.IsCustomerIdentified);
            Assert.Equal("Menuiserie Tunisienne", price.CustomerName);
            Assert.Equal(10.0, price.DiscountRate);
            Assert.Equal(20.000, price.CatalogPriceHT);
            Assert.Equal(18.000, price.FinalPriceHT); // 20 - 10%
            Assert.Equal(21.420, price.FinalPriceTTC); // 23.8 - 10%
        }

        #endregion

        #region TEST 8 & 9: Stock Availability (Standard vs Wood)

        [Fact]
        public async Task Test8_Availability_StandardProduct_ReturnsStockStatus()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var site = new SalesSite { Id = 1, Address = "Dépôt Ariana", IsDeleted = false };
            db.SalesSites.Add(site);

            var article = CreateTestArticle(db, 301, "VIS-5X50", "Vis à bois 5x50 mm", 5.0, isWood: false);

            var merch = new Merchandise
            {
                Id = 301,
                ArticleId = article.Id,
                Articles = article,
                PackageReference = "Standard",
                IsDeleted = false
            };
            db.Merchandises.Add(merch);

            var stock = new Stock
            {
                Id = 301,
                MerchandiseId = merch.Id,
                Merchandises = merch,
                Quantity = 50,
                SalesSites = site
            };
            db.Stocks.Add(stock);
            await db.SaveChangesAsync();

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var actionResult = await controller.GetAvailability(article.Id);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var avail = Assert.IsType<AiAvailabilityDto>(okResult.Value);

            Assert.True(avail.IsAvailable);
            Assert.Equal("InStock", avail.StockStatus);
            Assert.Equal(50, avail.QuantityAvailable);
            Assert.Null(avail.LengthDetails);
        }

        [Fact]
        public async Task Test9_Availability_WoodProduct_ReturnsLengthDetailsAndPieces()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var site = new SalesSite { Id = 1, Address = "Dépôt Raoued", IsDeleted = false };
            db.SalesSites.Add(site);

            var article = CreateTestArticle(db, 302, "MADRIER-75X225", "Madrier Rouge 75x225 mm", 35.0, isWood: true);

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();

            var stockServiceMock = new Mock<IStockService>();
            stockServiceMock.Setup(s => s.GetWoodArticleStockDetailsAsync("MADRIER-75X225", It.IsAny<int>(), 0))
                .ReturnsAsync(new List<WoodArticleStockDetail>
                {
                    new WoodArticleStockDetail { LengthName = "4.00 m", RemainingPieces = 25 },
                    new WoodArticleStockDetail { LengthName = "4.50 m", RemainingPieces = 15 }
                });

            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var actionResult = await controller.GetAvailability(article.Id);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var avail = Assert.IsType<AiAvailabilityDto>(okResult.Value);

            Assert.True(avail.IsAvailable);
            Assert.Equal("InStock", avail.StockStatus);
            Assert.Equal(40, avail.QuantityAvailable);
            Assert.NotNull(avail.LengthDetails);
            Assert.Equal(2, avail.LengthDetails.Count);
            Assert.Equal("4.00 m", avail.LengthDetails[0].Length);
            Assert.Equal(25, avail.LengthDetails[0].Pieces);
        }

        #endregion

        #region TEST 10: Human Handoff Notification

        [Fact]
        public async Task Test10_Handoff_CreatesExpectedNotification_ForSalesRole()
        {
            var dbName = Guid.NewGuid().ToString();
            var (db, tenantContext) = CreateContext(dbName, "socofeb");

            var customer = new CounterPart
            {
                Id = 15,
                FirstName = "Ali",
                LastName = "Ben Salem",
                PhoneNumberOne = "+216 98 765 432",
                IsDeleted = false
            };
            db.CounterParts.Add(customer);
            await db.SaveChangesAsync();

            var articleRepo = new ArticleRepository(db);
            var counterPartRepo = new CounterPartRepository(db);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();

            var notifServiceMock = new Mock<IAppNotificationService>();
            notifServiceMock.Setup(n => n.NotifyAsync(
                It.Is<string>(t => t.Contains("Ali Ben Salem")),
                It.Is<string>(m => m.Contains("Devis 50m3")),
                NotificationType.Warning,
                NotificationPriority.High,
                null,
                "Seller",
                null,
                "15",
                "CounterPart"
            )).ReturnsAsync(new AppNotification { Id = 312, Title = "Handoff Notification" });

            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                db, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, tenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var request = new AiHandoffRequestDto
            {
                CustomerPhone = "21698765432",
                CustomerName = "Ali Ben Salem",
                Reason = "Prix sur mesure",
                Summary = "Demande Devis 50m3 avec livraison"
            };

            var actionResult = await controller.CreateHandoff(request);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<AiHandoffResponseDto>(okResult.Value);

            Assert.True(response.Success);
            Assert.Equal(312, response.NotificationId);
            notifServiceMock.VerifyAll();
        }

        #endregion

        #region TEST 11: Tenant Isolation Parameter Tampering

        [Fact]
        public async Task Test11_TenantIsolation_CannotBeOverriddenByRequestParameters()
        {
            var dbName = Guid.NewGuid().ToString();
            var (socofebDb, socofebTenantContext) = CreateContext(dbName, "socofeb");
            var (otherDb, otherTenantContext) = CreateContext(dbName, "other_company");

            CreateTestArticle(socofebDb, 1, "SOCOFEB-EXCLUSIVE-PRODUCT", "Produit Exclusif SOCOFEB", 50.0);
            CreateTestArticle(otherDb, 2, "OTHER-PRODUCT", "Produit Autre Entreprise", 50.0);

            var articleRepo = new ArticleRepository(socofebDb);
            var counterPartRepo = new CounterPartRepository(socofebDb);
            var pricingGridMock = new Mock<IPricingGridService>();
            var stockServiceMock = new Mock<IStockService>();
            var notifServiceMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<AiSalesController>>();

            var controller = new AiSalesController(
                socofebDb, articleRepo, counterPartRepo, pricingGridMock.Object,
                stockServiceMock.Object, notifServiceMock.Object, socofebTenantContext, loggerMock.Object
            )
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            // Search in SOCOFEB context for product from 'other_company'
            var actionResult = await controller.SearchProducts("OTHER-PRODUCT", 10);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var products = Assert.IsAssignableFrom<IEnumerable<AiProductDto>>(okResult.Value).ToList();

            // Must NOT find products from 'other_company'
            Assert.Empty(products);

            // Searching SOCOFEB product must succeed
            var socofebSearchResult = await controller.SearchProducts("SOCOFEB-EXCLUSIVE", 10);
            var socofebOk = Assert.IsType<OkObjectResult>(socofebSearchResult.Result);
            var socofebProducts = Assert.IsAssignableFrom<IEnumerable<AiProductDto>>(socofebOk.Value).ToList();

            Assert.Single(socofebProducts);
            Assert.Equal("SOCOFEB-EXCLUSIVE-PRODUCT", socofebProducts[0].Reference);
        }

        #endregion
    }
}
