using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Middleware;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class TenantNotificationIsolationTests
    {
        private WoodAppContext CreateContext(string dbName, string tenantSlug)
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

            return new WoodAppContext(options, tenantContext);
        }

        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_master")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new MasterDbContext(options);
        }

        private ClaimsPrincipal CreateUserPrincipal(int userId, string tenantSlug, string role = "Admin", string? siteId = "1")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim("tenant_slug", tenantSlug)
            };
            if (!string.IsNullOrEmpty(siteId))
            {
                claims.Add(new Claim("DefaultSiteId", siteId));
            }
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }

        #region TEST 1 — API isolation: SOCOFEB notification not visible to MANSOUR

        [Fact]
        public async Task Test1_ApiIsolation_SocofebNotification_NotVisibleToMansour()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");
            var mansourDb = CreateContext(dbName, "mansour-construction");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();
            var stockNotifLogger = new Mock<ILogger<StockController>>();

            var socofebTenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var socofebNotifService = new AppNotificationService(socofebDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, socofebTenantContext);
            var socofebStockNotifService = new NotificationService(socofebDb, hubContextMock.Object, stockNotifLogger.Object, socofebTenantContext);

            // Create notification in SOCOFEB
            await socofebNotifService.NotifyAsync(
                title: "Mise à jour Article (SOCOFEB-101)",
                message: "Article SOCOFEB mis à jour",
                type: NotificationType.Info,
                relatedEntityId: "101",
                relatedEntityType: "Article"
            );

            // 1. Authenticate as SOCOFEB -> Notification must be visible
            var socofebController = new NotificationsController(socofebNotifService, socofebStockNotifService)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(1, "socofeb") }
                }
            };

            var socofebResult = await socofebController.GetUnreads() as OkObjectResult;
            Assert.NotNull(socofebResult);
            var socofebNotifs = Assert.IsAssignableFrom<IEnumerable<AppNotification>>(socofebResult.Value);
            Assert.Contains(socofebNotifs, n => n.Title.Contains("SOCOFEB-101"));

            // 2. Authenticate as MANSOUR -> Notification must NOT be visible
            var mansourTenantContext = new TenantContext { IsEnabled = true, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction" };
            var mansourNotifService = new AppNotificationService(mansourDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, mansourTenantContext);
            var mansourStockNotifService = new NotificationService(mansourDb, hubContextMock.Object, stockNotifLogger.Object, mansourTenantContext);

            var mansourController = new NotificationsController(mansourNotifService, mansourStockNotifService)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(2, "mansour-construction") }
                }
            };

            var mansourResult = await mansourController.GetUnreads() as OkObjectResult;
            Assert.NotNull(mansourResult);
            var mansourNotifs = Assert.IsAssignableFrom<IEnumerable<AppNotification>>(mansourResult.Value);
            Assert.DoesNotContain(mansourNotifs, n => n.Title.Contains("SOCOFEB-101"));
            Assert.Empty(mansourNotifs);
        }

        #endregion

        #region TEST 2 — Reverse isolation: MANSOUR notification not visible to SOCOFEB

        [Fact]
        public async Task Test2_ReverseIsolation_MansourNotification_NotVisibleToSocofeb()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");
            var mansourDb = CreateContext(dbName, "mansour-construction");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();
            var stockNotifLogger = new Mock<ILogger<StockController>>();

            var mansourTenantContext = new TenantContext { IsEnabled = true, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction" };
            var mansourNotifService = new AppNotificationService(mansourDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, mansourTenantContext);
            var mansourStockNotifService = new NotificationService(mansourDb, hubContextMock.Object, stockNotifLogger.Object, mansourTenantContext);

            // Create notification in MANSOUR
            await mansourNotifService.NotifyAsync(
                title: "Demande d'argent - Caisse Chantier (MANSOUR)",
                message: "Demande de caisse",
                type: NotificationType.Warning,
                relatedEntityId: "50",
                relatedEntityType: "ChantierCaisseTransaction"
            );

            // 1. Authenticate as MANSOUR -> Notification visible
            var mansourController = new NotificationsController(mansourNotifService, mansourStockNotifService)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(2, "mansour-construction") }
                }
            };

            var mansourResult = await mansourController.GetUnreads() as OkObjectResult;
            Assert.NotNull(mansourResult);
            var mansourNotifs = Assert.IsAssignableFrom<IEnumerable<AppNotification>>(mansourResult.Value);
            Assert.Contains(mansourNotifs, n => n.Title.Contains("MANSOUR"));

            // 2. Authenticate as SOCOFEB -> Notification NOT visible
            var socofebTenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var socofebNotifService = new AppNotificationService(socofebDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, socofebTenantContext);
            var socofebStockNotifService = new NotificationService(socofebDb, hubContextMock.Object, stockNotifLogger.Object, socofebTenantContext);

            var socofebController = new NotificationsController(socofebNotifService, socofebStockNotifService)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(1, "socofeb") }
                }
            };

            var socofebResult = await socofebController.GetUnreads() as OkObjectResult;
            Assert.NotNull(socofebResult);
            var socofebNotifs = Assert.IsAssignableFrom<IEnumerable<AppNotification>>(socofebResult.Value);
            Assert.DoesNotContain(socofebNotifs, n => n.Title.Contains("MANSOUR"));
            Assert.Empty(socofebNotifs);
        }

        #endregion

        #region TEST 3 — Article update generates notification only in updated tenant

        [Fact]
        public async Task Test3_ArticleUpdate_SocofebGeneratesNotification_MansourDoesNotReceiveIt()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");
            var mansourDb = CreateContext(dbName, "mansour-construction");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();
            var articleLogger = new Mock<ILogger<ArticleController>>();

            var socofebTenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var socofebNotifService = new AppNotificationService(socofebDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, socofebTenantContext);

            // Seed category, subcategory, tva and article in SOCOFEB
            var parent = new Parent { Id = 1, Reference = "CAT1", Description = "Cat 1" };
            var child = new FirstChild { Id = 1, IdParent = 1, Reference = "SUB1", Description = "Sub 1" };
            var tva = new AppVariable { Id = 1, Name = "19%", Value = 19 };
            socofebDb.Parents.Add(parent);
            socofebDb.FirstChildren.Add(child);
            socofebDb.AppVariables.Add(tva);

            var article = new Article
            {
                Id = 10,
                Reference = "MS-18280-2095",
                Description = "Chêne",
                SellPriceHT = 200,
                SellPriceTTC = 238,
                ParentId = 1,
                FirstChildId = 1,
                TvaId = 1,
                Unit = "M3",
                UpdatedBy = 1
            };
            socofebDb.Articles.Add(article);
            socofebDb.AppUsers.Add(new AppUser { Id = 1, Login = "socofeb_user" });
            await socofebDb.SaveChangesAsync();

            var articleRepo = new ArticleRepository(socofebDb);
            var sellPriceRepo = new SellPriceHistoryRepository(socofebDb);
            var articleController = new ArticleController(articleRepo, sellPriceRepo, socofebDb, socofebNotifService, articleLogger.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(1, "socofeb") }
                }
            };

            int articleId = article.Id;
            // Update article price in SOCOFEB
            var updateDto = new ArticleDto(article)
            {
                id = articleId,
                sellprice_ht = 250,
                updatedby = 1
            };

            var updateResult = await articleController.Put(articleId, updateDto);
            Assert.IsType<OkObjectResult>(updateResult.Result);

            // Verify SOCOFEB DB has notification
            var socofebNotif = await socofebDb.AppNotifications.FirstOrDefaultAsync(n => n.RelatedEntityId == articleId.ToString());
            Assert.NotNull(socofebNotif);
            Assert.Contains("MS-18280-2095", socofebNotif.Title);

            // Verify MANSOUR DB does NOT have this notification
            var mansourNotif = await mansourDb.AppNotifications.FirstOrDefaultAsync(n => n.RelatedEntityId == articleId.ToString());
            Assert.Null(mansourNotif);
        }

        #endregion

        #region TEST 4 — Realtime: SOCOFEB broadcast pushes to tenant:socofeb group only

        [Fact]
        public async Task Test4_Realtime_SocofebArticleUpdate_PushesToSocofebTenantGroupOnly()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var socofebGroupProxyMock = new Mock<IClientProxy>();
            var mansourGroupProxyMock = new Mock<IClientProxy>();

            clientsMock.Setup(c => c.Group("tenant:socofeb")).Returns(socofebGroupProxyMock.Object);
            clientsMock.Setup(c => c.Group("tenant:mansour-construction")).Returns(mansourGroupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();

            var socofebTenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var socofebNotifService = new AppNotificationService(socofebDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, socofebTenantContext);

            // Trigger article update notification
            await socofebNotifService.NotifyAsync(
                title: "Mise à jour Article (MS-18280-2095)",
                message: "Prix mis à jour",
                type: NotificationType.Info,
                relatedEntityId: "18280",
                relatedEntityType: "Article"
            );

            // Assert: Sent to tenant:socofeb
            clientsMock.Verify(c => c.Group("tenant:socofeb"), Times.Once());
            socofebGroupProxyMock.Verify(p => p.SendCoreAsync("ReceiveSystemNotification", It.IsAny<object[]>(), default), Times.Once());

            // Assert: NEVER sent to MANSOUR group
            clientsMock.Verify(c => c.Group("tenant:mansour-construction"), Times.Never());
            mansourGroupProxyMock.Verify(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object[]>(), default), Times.Never());

            // Assert: NEVER broadcast globally via Clients.All
            clientsMock.Verify(c => c.All, Times.Never());
        }

        #endregion

        #region TEST 5 — Reverse realtime: MANSOUR broadcast pushes to tenant:mansour-construction only

        [Fact]
        public async Task Test5_ReverseRealtime_MansourArticleUpdate_PushesToMansourTenantGroupOnly()
        {
            var dbName = Guid.NewGuid().ToString();
            var mansourDb = CreateContext(dbName, "mansour-construction");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var socofebGroupProxyMock = new Mock<IClientProxy>();
            var mansourGroupProxyMock = new Mock<IClientProxy>();

            clientsMock.Setup(c => c.Group("tenant:socofeb")).Returns(socofebGroupProxyMock.Object);
            clientsMock.Setup(c => c.Group("tenant:mansour-construction")).Returns(mansourGroupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();

            var mansourTenantContext = new TenantContext { IsEnabled = true, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction" };
            var mansourNotifService = new AppNotificationService(mansourDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, mansourTenantContext);

            // Trigger article update notification in MANSOUR
            await mansourNotifService.NotifyAsync(
                title: "Mise à jour Article (MANSOUR-500)",
                message: "Article Mansour mis à jour",
                type: NotificationType.Info,
                relatedEntityId: "500",
                relatedEntityType: "Article"
            );

            // Assert: Sent to tenant:mansour-construction
            clientsMock.Verify(c => c.Group("tenant:mansour-construction"), Times.Once());
            mansourGroupProxyMock.Verify(p => p.SendCoreAsync("ReceiveSystemNotification", It.IsAny<object[]>(), default), Times.Once());

            // Assert: NEVER sent to SOCOFEB group
            clientsMock.Verify(c => c.Group("tenant:socofeb"), Times.Never());
            socofebGroupProxyMock.Verify(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object[]>(), default), Times.Never());

            // Assert: NEVER broadcast globally via Clients.All
            clientsMock.Verify(c => c.All, Times.Never());
        }

        #endregion

        #region TEST 6 — Direct API attack: Authenticated MANSOUR user attempting SOCOFEB access is rejected (403)

        [Fact]
        public async Task Test6_DirectApiAttack_MansourJwtWithSocofebHeader_Returns403()
        {
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateMasterDb(dbName);
            masterDb.TenantRegistries.AddRange(
                new TenantRegistry { Id = 1, Slug = "socofeb", SchemaName = "tenant_socofeb", IsActive = true },
                new TenantRegistry { Id = 2, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction", IsActive = true }
            );
            await masterDb.SaveChangesAsync();

            var tenantResolver = new SubdomainTenantResolver();
            var middlewareLogger = new Mock<ILogger<TenantMiddleware>>();
            bool nextCalled = false;
            RequestDelegate next = (ctx) => { nextCalled = true; return Task.CompletedTask; };

            var middleware = new TenantMiddleware(next, middlewareLogger.Object);
            var tenantContext = new TenantContext();

            // Attacker has MANSOUR JWT but sends header for SOCOFEB
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/notifications/unreads";
            httpContext.Request.Headers["X-Tenant-Slug"] = "socofeb";
            httpContext.User = CreateUserPrincipal(2, "mansour-construction");
            httpContext.Response.Body = new MemoryStream();

            await middleware.InvokeAsync(httpContext, tenantResolver, tenantContext, masterDb);

            // Assert: Must be rejected with 403 Forbidden
            Assert.Equal(StatusCodes.Status403Forbidden, httpContext.Response.StatusCode);
            Assert.False(nextCalled);

            httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
            var responseBody = await new StreamReader(httpContext.Response.Body).ReadToEndAsync();
            Assert.Contains("Tenant mismatch", responseBody);
        }

        #endregion

        #region TEST 7 — Mark as read isolation: MANSOUR cannot mark SOCOFEB notification as read

        [Fact]
        public async Task Test7_MarkAsReadIsolation_MansourUserCannotMarkSocofebNotificationAsRead()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");
            var mansourDb = CreateContext(dbName, "mansour-construction");

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();
            var stockNotifLogger = new Mock<ILogger<StockController>>();

            // Create notification in SOCOFEB (Id = 162)
            var socofebNotif = new AppNotification
            {
                Id = 162,
                Title = "Mise à jour Article (MS-18280-2095)",
                Message = "Article modifie",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            socofebDb.AppNotifications.Add(socofebNotif);
            await socofebDb.SaveChangesAsync();

            // Authenticate as MANSOUR user in MANSOUR context
            var mansourTenantContext = new TenantContext { IsEnabled = true, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction" };
            var mansourNotifService = new AppNotificationService(mansourDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, mansourTenantContext);
            var mansourStockNotifService = new NotificationService(mansourDb, hubContextMock.Object, stockNotifLogger.Object, mansourTenantContext);

            var mansourController = new NotificationsController(mansourNotifService, mansourStockNotifService)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(2, "mansour-construction") }
                }
            };

            // Attempt to mark SOCOFEB notification (162) as read from MANSOUR account
            var result = await mansourController.MarkAsRead(162);

            // Assert: Returns 404 NotFound
            Assert.IsType<NotFoundObjectResult>(result);

            // Assert: SOCOFEB notification in SOCOFEB database is UNCHANGED (still unread)
            var unchangedNotif = await socofebDb.AppNotifications.FindAsync(162);
            Assert.NotNull(unchangedNotif);
            Assert.False(unchangedNotif.IsRead);
            Assert.Null(unchangedNotif.ViewedAt);
        }

        #endregion

        #region TEST 8 — SignalR Hub: Unauthenticated or missing tenant claim is rejected & groups strictly scoped

        [Fact]
        public async Task Test8_SignalRHub_OnConnected_EnforcesTenantSlug_AndAbortsIfMissing()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var loggerMock = new Mock<ILogger<NotificationHub>>();
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();

            var hub = new NotificationHub(httpContextAccessorMock.Object, loggerMock.Object, context);

            // 1. Connection with missing tenant_slug -> Must abort
            var hubCallerContextMock = new Mock<HubCallerContext>();
            hubCallerContextMock.Setup(c => c.ConnectionId).Returns("conn-1");
            hubCallerContextMock.Setup(c => c.User).Returns(new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1")
            }, "TestAuth")));

            hub.Context = hubCallerContextMock.Object;

            var groupManagerMock = new Mock<IGroupManager>();
            hub.Groups = groupManagerMock.Object;

            await hub.OnConnectedAsync();

            hubCallerContextMock.Verify(c => c.Abort(), Times.Once());
            groupManagerMock.Verify(g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), default), Times.Never());

            // 2. Connection with valid tenant_slug "socofeb" -> Joins only tenant:socofeb groups
            var hubCallerContextMock2 = new Mock<HubCallerContext>();
            hubCallerContextMock2.Setup(c => c.ConnectionId).Returns("conn-2");
            hubCallerContextMock2.Setup(c => c.User).Returns(CreateUserPrincipal(1, "socofeb", "Admin", "5"));

            hub.Context = hubCallerContextMock2.Object;

            await hub.OnConnectedAsync();

            // Verify joined groups
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:socofeb", default), Times.Once());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:socofeb:user-1", default), Times.Once());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:socofeb:role-Admin", default), Times.Once());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:socofeb:site-5", default), Times.Once());

            // Verify it did NOT join any plain, non-prefixed group or other tenant group
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "5", default), Times.Never());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "user-1", default), Times.Never());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "role-Admin", default), Times.Never());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", It.Is<string>(s => s.Contains("mansour")), default), Times.Never());

            // 3. Calling JoinGroup("mansour-construction") on SOCOFEB connection cannot escape tenant
            await hub.JoinGroup("mansour-construction");
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:socofeb:site-mansour-construction", default), Times.Once());
            groupManagerMock.Verify(g => g.AddToGroupAsync("conn-2", "tenant:mansour-construction", default), Times.Never());
        }

        #endregion
    }
}
