using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
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
    public class HistoricalPendingTransfersTests
    {
        private static WoodAppContext CreateInMemoryContext(string dbName, TenantContext tenantContext)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new WoodAppContext(options, tenantContext);
        }

        private static (StockService Service, StockController Controller, NotificationService NotifService, WoodAppContext Context)
            CreateHarness(string dbName, string tenantSlug = "socofeb")
        {
            var tenantContext = new TenantContext
            {
                IsEnabled = true,
                Slug = tenantSlug,
                SchemaName = $"tenant_{tenantSlug}"
            };

            var context = CreateInMemoryContext(dbName, tenantContext);
            var docMerchRepo = new DocumentMerchandiseRepository(context);
            var stockRepo = new StockRepository(context, docMerchRepo);
            var docRepo = new DocumentRepository(context, null!);

            var hubClientsMock = new Mock<IHubClients>();
            var clientProxyMock = new Mock<IClientProxy>();
            hubClientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(clientProxyMock.Object);

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            hubContextMock.Setup(h => h.Clients).Returns(hubClientsMock.Object);

            var stockCtrlLogger = new Mock<ILogger<StockController>>();
            var stockSvcLogger = new Mock<ILogger<StockService>>();
            var appNotifMock = new Mock<IAppNotificationService>();

            var notifService = new NotificationService(context, hubContextMock.Object, stockCtrlLogger.Object, tenantContext);
            var stockService = new StockService(
                stockRepo,
                context,
                docRepo,
                hubContextMock.Object,
                notifService,
                stockSvcLogger.Object,
                tenantContext,
                appNotifMock.Object);

            var controller = new StockController(stockService, context, stockCtrlLogger.Object, notifService);
            return (stockService, controller, notifService, context);
        }

        private static void SetUserClaims(ControllerBase controller, int userId, string role, int? defaultSiteId = null, string? tenantSlug = "socofeb")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            };
            if (defaultSiteId.HasValue)
            {
                claims.Add(new Claim("DefaultSiteId", defaultSiteId.Value.ToString()));
            }
            if (!string.IsNullOrEmpty(tenantSlug))
            {
                claims.Add(new Claim("tenant_slug", tenantSlug));
            }

            var identity = new ClaimsIdentity(claims, "TestAuth");
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            };
        }

        private static async Task<(SalesSite Origin, SalesSite Dest, AppUser OriginUser, AppUser DestUser, AppUser AdminUser, Merchandise Merch1, Merchandise Merch2)>
            SeedBaseDataAsync(WoodAppContext context)
        {
            var origin = new SalesSite { Id = 1, Address = "Depot Tunis", Gouvernorate = "Tunis", IsForSale = true };
            var dest = new SalesSite { Id = 2, Address = "Depot Sfax", Gouvernorate = "Sfax", IsForSale = true };
            context.SalesSites.AddRange(origin, dest);

            var originUser = new AppUser { Id = 10, Login = "origin_user", IsActive = true, IdSalesSite = 1, SalesSite = origin };
            var destUser = new AppUser { Id = 20, Login = "dest_user", IsActive = true, IdSalesSite = 2, SalesSite = dest };
            var adminUser = new AppUser { Id = 30, Login = "admin_user", IsActive = true, IdSalesSite = 1, SalesSite = origin };
            context.AppUsers.AddRange(originUser, destUser, adminUser);

            var art1 = new Article { Id = 100, Reference = "BOIS-001", Description = "Bois Rouge 25x150", Unit = "M3", IsWood = true };
            var art2 = new Article { Id = 101, Reference = "CONT-002", Description = "Contreplaque 18mm", Unit = "PCS", IsWood = false };
            context.Articles.AddRange(art1, art2);

            var merch1 = new Merchandise { Id = 200, ArticleId = 100, Articles = art1, PackageReference = "PK-001", Description = "Paquet 1", AllowNegativStock = false };
            var merch2 = new Merchandise { Id = 201, ArticleId = 101, Articles = art2, PackageReference = "PK-002", Description = "Paquet 2", AllowNegativStock = false };
            context.Merchandises.AddRange(merch1, merch2);

            context.Stocks.Add(new Stock
            {
                Id = 300,
                SalesSiteId = 1,
                SalesSites = origin,
                MerchandiseId = 200,
                Merchandises = merch1,
                Quantity = 50.0,
                UpdatedById = 10,
                CreationDate = DateTime.UtcNow.AddDays(-200),
                UpdateDate = DateTime.UtcNow.AddDays(-200)
            });

            await context.SaveChangesAsync();
            return (origin, dest, originUser, destUser, adminUser, merch1, merch2);
        }

        private static async Task<StockTransfer> SeedTransferAsync(
            WoodAppContext context,
            int id,
            int originSiteId,
            int destSiteId,
            DateTime transferDateUtc,
            TransferStatus status,
            string reference,
            string exitDocNumber,
            string receiptDocNumber,
            string confirmationCode,
            params (Merchandise Merch, double Qty)[] items)
        {
            var exitDoc = new Document
            {
                Id = id * 10 + 1,
                DocNumber = exitDocNumber,
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Retrieve,
                SalesSiteId = originSiteId,
                UpdatedById = 10,
                CreationDate = transferDateUtc,
                UpdateDate = transferDateUtc,
                DocStatus = DocStatus.Completed,
                IsDeleted = false
            };
            var receiptDoc = new Document
            {
                Id = id * 10 + 2,
                DocNumber = receiptDocNumber,
                Type = DocumentTypes.stockTransfer,
                StockTransactionType = TransactionType.Add,
                SalesSiteId = destSiteId,
                UpdatedById = 10,
                CreationDate = transferDateUtc,
                UpdateDate = transferDateUtc,
                DocStatus = DocStatus.Completed,
                IsDeleted = false
            };

            context.Documents.AddRange(exitDoc, receiptDoc);

            int dmSeq = id * 100;
            foreach (var (merch, qty) in items)
            {
                context.DocumentMerchandises.Add(new DocumentMerchandise
                {
                    Id = ++dmSeq,
                    DocumentId = exitDoc.Id,
                    Document = exitDoc,
                    MerchandiseId = merch.Id,
                    Merchandise = merch,
                    Quantity = qty,
                    CreationDate = transferDateUtc,
                    UpdateDate = transferDateUtc
                });
                context.DocumentMerchandises.Add(new DocumentMerchandise
                {
                    Id = ++dmSeq,
                    DocumentId = receiptDoc.Id,
                    Document = receiptDoc,
                    MerchandiseId = merch.Id,
                    Merchandise = merch,
                    Quantity = qty,
                    CreationDate = transferDateUtc,
                    UpdateDate = transferDateUtc
                });
            }

            var transfer = new StockTransfer
            {
                Id = id,
                ExitDocumentId = exitDoc.Id,
                ExitDocument = exitDoc,
                ReceiptDocumentId = receiptDoc.Id,
                ReceiptDocument = receiptDoc,
                TransferDate = transferDateUtc,
                CreationDate = transferDateUtc,
                CreatedById = 10,
                Reference = reference,
                Status = status,
                ConfirmationCode = confirmationCode,
                RevisionNumber = 1
            };

            context.StockTransfers.Add(transfer);
            await context.SaveChangesAsync();
            return transfer;
        }

        [Fact]
        public async Task SearchTransfers_OlderPendingOnly_ReturnsAllHistoricalPendingRegardlessOfAge()
        {
            var (service, _, _, context) = CreateHarness(nameof(SearchTransfers_OlderPendingOnly_ReturnsAllHistoricalPendingRegardlessOfAge));
            var (_, _, _, _, _, merch1, merch2) = await SeedBaseDataAsync(context);

            var now = DateTime.UtcNow;
            await SeedTransferAsync(context, 1, 1, 2, now.AddDays(-5), TransferStatus.Pending, "TRF-RECENT", "TS-001", "TR-001", "1111", (merch1, 2));
            await SeedTransferAsync(context, 2, 1, 2, now.AddDays(-45), TransferStatus.Pending, "TRF-OLD-45", "TS-002", "TR-002", "2222", (merch1, 3), (merch2, 4));
            await SeedTransferAsync(context, 3, 1, 2, now.AddDays(-180), TransferStatus.Pending, "TRF-OLD-180", "TS-003", "TR-003", "3333", (merch1, 5));
            await SeedTransferAsync(context, 4, 1, 2, now.AddDays(-60), TransferStatus.Confirmed, "TRF-OLD-CONF", "TS-004", "TR-004", "4444", (merch1, 1));
            await SeedTransferAsync(context, 5, 1, 2, now.AddDays(-75), TransferStatus.Rejected, "TRF-OLD-REJ", "TS-005", "TR-005", "5555", (merch1, 1));
            await SeedTransferAsync(context, 6, 1, 2, now.AddDays(-90), TransferStatus.Cancelled, "TRF-OLD-CANC", "TS-006", "TR-006", "6666", (merch1, 1));

            // 1. OlderPendingOnly = true -> only IDs 2 & 3, no duplicate rows for multi-article transfer #2
            var historical = await service.SearchStockTransfersAsync(
                new StockTransferFilterDto { OlderPendingOnly = true, OlderThanDays = 30, Page = 1, PageSize = 20 },
                callerSiteId: 1,
                isAdmin: false);

            var items = historical.Items.ToList();
            Assert.Equal(2, historical.TotalCount);
            Assert.Equal(2, historical.HistoricalPendingCount);
            Assert.Equal(2, items.Count);
            Assert.Equal(new[] { 2, 3 }, items.Select(i => i.Id).ToArray());
            Assert.Equal(2, items.First(i => i.Id == 2).ItemsCount);
            Assert.Equal("2222", items.First(i => i.Id == 2).ConfirmationCode);
            Assert.Equal("3333", items.First(i => i.Id == 3).ConfirmationCode);

            // 2. Default view (no filters) -> preserves 30-day window (only ID 1) + reports HistoricalPendingCount = 2
            var recent = await service.SearchStockTransfersAsync(
                new StockTransferFilterDto { Page = 1, PageSize = 20 },
                callerSiteId: 1,
                isAdmin: false);

            Assert.Single(recent.Items);
            Assert.Equal(1, recent.Items.First().Id);
            Assert.Equal(2, recent.HistoricalPendingCount);
        }

        [Fact]
        public async Task ValidationCodeSecurity_DestinationUserCannotRetrievePinThroughAnyEndpoint()
        {
            var (_, controller, _, context) = CreateHarness(nameof(ValidationCodeSecurity_DestinationUserCannotRetrievePinThroughAnyEndpoint));
            var (_, _, _, _, _, merch1, _) = await SeedBaseDataAsync(context);

            var recentDate = DateTime.UtcNow.AddDays(-3);
            var oldDate = DateTime.UtcNow.AddDays(-60);
            await SeedTransferAsync(context, 10, 1, 2, recentDate, TransferStatus.Pending, "TRF-SEC-1", "TS-010", "TR-010", "7890", (merch1, 4));
            await SeedTransferAsync(context, 11, 1, 2, oldDate, TransferStatus.Pending, "TRF-SEC-2", "TS-011", "TR-011", "4321", (merch1, 2));

            // Act as Destination-Site User (SiteId = 2, Role = StoreManager)
            SetUserClaims(controller, userId: 20, role: "StoreManager", defaultSiteId: 2);

            // 1. GetStockTransfersInfos
            var infosRes = Assert.IsType<OkObjectResult>((await controller.GetStockTransfersInfos(2)).Result);
            var infos = Assert.IsAssignableFrom<IEnumerable<StockTransferInfoDto>>(infosRes.Value).ToList();
            Assert.NotEmpty(infos);
            Assert.All(infos, t => Assert.Null(t.ConfirmationCode));

            // 2. SearchStockTransfers (including historical)
            var searchRes = Assert.IsType<OkObjectResult>((await controller.SearchStockTransfers(new StockTransferFilterDto { OlderPendingOnly = true })).Result);
            var paged = Assert.IsType<PagedStockTransfersDto>(searchRes.Value);
            Assert.Single(paged.Items);
            Assert.Null(paged.Items.First().ConfirmationCode);

            // 3. GetStockTransfersInfosDetails
            var detailsRes = Assert.IsType<OkObjectResult>((await controller.GetStockTransfersInfosDetails("TS-011", "TR-011")).Result);
            var details = Assert.IsAssignableFrom<IEnumerable<StockTransferDetailsDto>>(detailsRes.Value).ToList();
            Assert.NotEmpty(details);
            Assert.All(details, d => Assert.Null(d.ConfirmationCode));

            // 4. GetStockTransferById
            var byIdRes = Assert.IsType<OkObjectResult>((await controller.GetStockTransferById(11)).Result);
            var byId = Assert.IsType<StockTransferInfoDto>(byIdRes.Value);
            Assert.Null(byId.ConfirmationCode);

            // 5. GetFilteredStockInfosTransfers
            var filteredRes = Assert.IsType<OkObjectResult>((await controller.GetFilteredStockInfosTransfers(oldDate.AddDays(-1), DateTime.UtcNow, 1, 2)).Result);
            var filtered = Assert.IsAssignableFrom<IEnumerable<StockTransferInfoDto>>(filteredRes.Value).ToList();
            Assert.NotEmpty(filtered);
            Assert.All(filtered, t => Assert.Null(t.ConfirmationCode));

            // 6. GetConfirmationCode -> 403 Forbidden
            var codeRes = await controller.GetConfirmationCode(11);
            var statusResult = Assert.IsType<ObjectResult>(codeRes);
            Assert.Equal(403, statusResult.StatusCode);
        }

        [Fact]
        public async Task ValidationCodeSecurity_OriginUserAndAdminCanRetrievePin_MissingSiteDenied()
        {
            var (_, controller, _, context) = CreateHarness(nameof(ValidationCodeSecurity_OriginUserAndAdminCanRetrievePin_MissingSiteDenied));
            var (_, _, _, _, _, merch1, _) = await SeedBaseDataAsync(context);

            await SeedTransferAsync(context, 21, 1, 2, DateTime.UtcNow.AddDays(-90), TransferStatus.Pending, "TRF-HIST", "TS-021", "TR-021", "9517", (merch1, 5));

            // 1. Origin-Site User (SiteId = 1) -> allowed
            SetUserClaims(controller, userId: 10, role: "StoreManager", defaultSiteId: 1);
            var originCodeRes = Assert.IsType<OkObjectResult>(await controller.GetConfirmationCode(21));
            Assert.Equal("9517", originCodeRes.Value);

            var originSearchRes = Assert.IsType<OkObjectResult>((await controller.SearchStockTransfers(new StockTransferFilterDto { OlderPendingOnly = true })).Result);
            var originPaged = Assert.IsType<PagedStockTransfersDto>(originSearchRes.Value);
            Assert.Equal("9517", originPaged.Items.First().ConfirmationCode);

            // 2. Administrator (even if DefaultSiteId is destination site 2) -> allowed
            SetUserClaims(controller, userId: 30, role: "Admin", defaultSiteId: 2);
            var adminCodeRes = Assert.IsType<OkObjectResult>(await controller.GetConfirmationCode(21));
            Assert.Equal("9517", adminCodeRes.Value);

            // 3. Non-admin user with missing site identifier -> fail-closed (403 on code, empty on search)
            SetUserClaims(controller, userId: 999, role: "User", defaultSiteId: null);
            var missingSiteCodeRes = Assert.IsType<ObjectResult>(await controller.GetConfirmationCode(21));
            Assert.Equal(403, missingSiteCodeRes.StatusCode);

            var missingSiteSearchRes = Assert.IsType<OkObjectResult>((await controller.SearchStockTransfers(new StockTransferFilterDto { OlderPendingOnly = true })).Result);
            var missingSitePaged = Assert.IsType<PagedStockTransfersDto>(missingSiteSearchRes.Value);
            Assert.Empty(missingSitePaged.Items);
        }

        [Fact]
        public async Task HistoricalPendingTransfer_RemainsReceivableWithOriginalCode_AndPreventsDoubleConfirm()
        {
            var (service, _, _, context) = CreateHarness(nameof(HistoricalPendingTransfer_RemainsReceivableWithOriginalCode_AndPreventsDoubleConfirm));
            var (_, _, _, _, _, merch1, _) = await SeedBaseDataAsync(context);

            // 90-day-old pending transfer (origin stock already deducted to 50)
            await SeedTransferAsync(context, 31, 1, 2, DateTime.UtcNow.AddDays(-90), TransferStatus.Pending, "TRF-90D", "TS-031", "TR-031", "6042", (merch1, 12.5));

            // Wrong code fails
            var wrongResult = await service.ConfirmTransferAsync(31, confirmedByUserId: 20, confirmationCode: "0000", comment: "wrong");
            Assert.False(wrongResult.Success);

            // Original code succeeds
            var confirmResult = await service.ConfirmTransferAsync(31, confirmedByUserId: 20, confirmationCode: "6042", comment: "Received late");
            Assert.True(confirmResult.Success, confirmResult.Message);

            // Origin stock untouched (still 50), Destination stock credited once (+12.5)
            var originStock = await context.Stocks.FirstAsync(s => s.SalesSiteId == 1 && s.MerchandiseId == 200);
            var destStock = await context.Stocks.FirstAsync(s => s.SalesSiteId == 2 && s.MerchandiseId == 200);
            Assert.Equal(50.0, originStock.Quantity);
            Assert.Equal(12.5, destStock.Quantity);

            // Second confirmation attempt is rejected (no double stock credit)
            var duplicateResult = await service.ConfirmTransferAsync(31, confirmedByUserId: 20, confirmationCode: "6042", comment: "Duplicate");
            Assert.False(duplicateResult.Success);

            var destStockAfter = await context.Stocks.FirstAsync(s => s.SalesSiteId == 2 && s.MerchandiseId == 200);
            Assert.Equal(12.5, destStockAfter.Quantity);
        }

        [Fact]
        public async Task MissedNotifications_DisplayPersistedDispatchDate_StripPin_ExcludeConfirmed_AndDismissWorks()
        {
            var (_, controller, notifService, context) = CreateHarness(nameof(MissedNotifications_DisplayPersistedDispatchDate_StripPin_ExcludeConfirmed_AndDismissWorks));
            var (_, _, _, _, _, merch1, merch2) = await SeedBaseDataAsync(context);

            // Dispatch date is 50 days ago, while notification row CreatedAt is 40 days ago (distinct!)
            var persistedDispatchDate = new DateTime(2026, 9, 10, 8, 30, 0, DateTimeKind.Utc);
            var notifCreatedAt = new DateTime(2026, 9, 20, 14, 0, 0, DateTimeKind.Utc);

            await SeedTransferAsync(context, 41, 1, 2, persistedDispatchDate, TransferStatus.Pending, "TRF-NOTIF-1", "TS-041", "TR-041", "8844", (merch1, 2), (merch2, 3));
            await SeedTransferAsync(context, 42, 1, 2, persistedDispatchDate.AddDays(-5), TransferStatus.Confirmed, "TRF-NOTIF-2", "TS-042", "TR-042", "7733", (merch1, 1));

            // Legacy PendingNotification rows (one with legacy ConfirmationCode in JSON, one for already-confirmed transfer)
            context.PendingNotifications.Add(new PendingNotification
            {
                Id = 501,
                TargetGroup = "tenant:socofeb:site-2",
                Status = TransferStatus.Pending,
                CreatedAt = notifCreatedAt,
                RetryCount = 0,
                Content = JsonSerializer.Serialize(new NotificationDto
                {
                    NotificationType = "TransferCreated",
                    TransferId = 41,
                    Reference = "TRF-NOTIF-1",
                    OriginSite = "Depot Tunis",
                    ItemsCount = 2,
                    ConfirmationCode = "8844", // Legacy leaked PIN that must be stripped
                    AdditionalData = new { ExitDocNumber = "TS-041", ReceiptDocNumber = "TR-041" }
                })
            });
            context.PendingNotifications.Add(new PendingNotification
            {
                Id = 502,
                TargetGroup = "tenant:socofeb:site-2",
                Status = TransferStatus.Pending, // Stale notification for already-confirmed transfer #42
                CreatedAt = notifCreatedAt,
                RetryCount = 0,
                Content = JsonSerializer.Serialize(new NotificationDto
                {
                    NotificationType = "TransferCreated",
                    TransferId = 42,
                    Reference = "TRF-NOTIF-2",
                    OriginSite = "Depot Tunis",
                    ItemsCount = 1
                })
            });
            await context.SaveChangesAsync();

            // Fetch missed notifications as destination user (site 2)
            SetUserClaims(controller, userId: 20, role: "StoreManager", defaultSiteId: 2);
            var missedRes = Assert.IsType<OkObjectResult>(await controller.GetMissedNotifications(20));
            var list = Assert.IsAssignableFrom<IEnumerable<PendingTransferNotificationDto>>(missedRes.Value).ToList();

            // Confirmed transfer #42 is excluded; pending transfer #41 is returned with persisted TransferDate
            Assert.Single(list);
            var item = list[0];
            Assert.Equal(41, item.TransferId);
            Assert.Equal("TRF-NOTIF-1", item.TransferRef);
            Assert.Equal(persistedDispatchDate, item.TransferDate);
            Assert.NotEqual(notifCreatedAt, item.TransferDate);
            Assert.Equal(2, item.ItemsCount);
            Assert.Equal(TransferStatus.Pending, item.TransferStatus);
            Assert.DoesNotContain("8844", item.Content ?? string.Empty);

            // Dismiss via NotificationsController.Delete using DefaultSiteId claim
            var appNotifMock = new Mock<IAppNotificationService>();
            var notifController = new NotificationsController(appNotifMock.Object, notifService, context);
            SetUserClaims(notifController, userId: 20, role: "StoreManager", defaultSiteId: 2);

            var deleteRes = await notifController.Delete(41);
            Assert.IsType<OkResult>(deleteRes);

            // Verify notification is now finalized and no longer returned
            var afterDismiss = await notifService.GetEnrichedMissedNotificationsAsync(2);
            Assert.Empty(afterDismiss);
        }

        [Fact]
        public async Task MultiTenantIsolation_HistoricalSearchCannotExposeAnotherTenantsTransfers()
        {
            var (socofebService, _, _, socofebCtx) = CreateHarness("db_socofeb_hist_iso", "socofeb");
            var (mansourService, _, _, mansourCtx) = CreateHarness("db_mansour_hist_iso", "mansour");

            var (_, _, _, _, _, socofebMerch, _) = await SeedBaseDataAsync(socofebCtx);
            var (_, _, _, _, _, mansourMerch, _) = await SeedBaseDataAsync(mansourCtx);

            await SeedTransferAsync(socofebCtx, 61, 1, 2, DateTime.UtcNow.AddDays(-120), TransferStatus.Pending, "SOCOFEB-OLD-001", "TS-SOC-1", "TR-SOC-1", "1234", (socofebMerch, 5));
            await SeedTransferAsync(mansourCtx, 62, 1, 2, DateTime.UtcNow.AddDays(-120), TransferStatus.Pending, "MANSOUR-OLD-001", "TS-MAN-1", "TR-MAN-1", "9876", (mansourMerch, 8));

            var socofebResults = await socofebService.SearchStockTransfersAsync(
                new StockTransferFilterDto { OlderPendingOnly = true },
                callerSiteId: 1,
                isAdmin: true);

            var mansourResults = await mansourService.SearchStockTransfersAsync(
                new StockTransferFilterDto { OlderPendingOnly = true },
                callerSiteId: 1,
                isAdmin: true);

            Assert.Single(socofebResults.Items);
            Assert.Equal("SOCOFEB-OLD-001", socofebResults.Items.First().Reference);
            Assert.DoesNotContain(socofebResults.Items, t => t.Reference == "MANSOUR-OLD-001");

            Assert.Single(mansourResults.Items);
            Assert.Equal("MANSOUR-OLD-001", mansourResults.Items.First().Reference);
            Assert.DoesNotContain(mansourResults.Items, t => t.Reference == "SOCOFEB-OLD-001");
        }
    }
}
