using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
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
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class SaaSBillingAndSessionLimitTests
    {
        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_master")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new MasterDbContext(options);
        }

        private WoodAppContext CreateTenantDb(string dbName, string tenantSlug)
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

        private static ClaimsPrincipal CreateUserPrincipal(int userId, string tenantSlug, string? sessionId = null, string role = "Admin")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim("tenant_slug", tenantSlug)
            };
            if (!string.IsNullOrEmpty(sessionId))
            {
                claims.Add(new Claim("jti", sessionId));
                claims.Add(new Claim("session_id", sessionId));
            }
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }

        [Fact]
        public async Task Test1_And_Test3_OverdueTenantCanStillConnect_WhileManuallySuspendedTenantIsBlocked()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            // Tenant 1: Overdue payment status, but active connection (IsActive = true)
            // Tenant 2: Manually suspended by administrator (IsActive = false, Status = "Suspended")
            masterDb.TenantRegistries.AddRange(
                new TenantRegistry
                {
                    Id = 1,
                    Slug = "overdue-tenant",
                    Name = "Overdue But Active Tenant",
                    SchemaName = "tenant_overdue_tenant",
                    IsActive = true,
                    Plan = "Starter",
                    Status = "Overdue",
                    MaxConnectedUsers = 5
                },
                new TenantRegistry
                {
                    Id = 2,
                    Slug = "suspended-tenant",
                    Name = "Suspended Tenant",
                    SchemaName = "tenant_suspended_tenant",
                    IsActive = false,
                    Plan = "Starter",
                    Status = "Suspended",
                    MaxConnectedUsers = 5
                }
            );
            await masterDb.SaveChangesAsync();

            var resolver = new SubdomainTenantResolver();
            var logger = new Mock<ILogger<TenantMiddleware>>();

            // 1. Overdue tenant connects -> MUST succeed (200 OK, pipeline proceeds)
            bool overdueNextCalled = false;
            var overdueMiddleware = new TenantMiddleware(_ => { overdueNextCalled = true; return Task.CompletedTask; }, logger.Object);
            var overdueCtx = new DefaultHttpContext();
            overdueCtx.Request.Path = "/api/notifications/unreads";
            overdueCtx.Request.Headers["X-Tenant-Slug"] = "overdue-tenant";
            overdueCtx.User = CreateUserPrincipal(1, "overdue-tenant");
            var overdueTenantContext = new TenantContext();

            await overdueMiddleware.InvokeAsync(overdueCtx, resolver, overdueTenantContext, masterDb);
            Assert.True(overdueNextCalled);
            Assert.Equal(StatusCodes.Status200OK, overdueCtx.Response.StatusCode);

            // 2. Manually suspended tenant connects -> MUST be blocked with 403 Forbidden
            bool suspendedNextCalled = false;
            var suspendedMiddleware = new TenantMiddleware(_ => { suspendedNextCalled = true; return Task.CompletedTask; }, logger.Object);
            var suspendedCtx = new DefaultHttpContext();
            suspendedCtx.Request.Path = "/api/notifications/unreads";
            suspendedCtx.Request.Headers["X-Tenant-Slug"] = "suspended-tenant";
            suspendedCtx.User = CreateUserPrincipal(1, "suspended-tenant");
            suspendedCtx.Response.Body = new MemoryStream();
            var suspendedTenantContext = new TenantContext();

            await suspendedMiddleware.InvokeAsync(suspendedCtx, resolver, suspendedTenantContext, masterDb);
            Assert.False(suspendedNextCalled);
            Assert.Equal(StatusCodes.Status403Forbidden, suspendedCtx.Response.StatusCode);
        }

        [Fact]
        public async Task Test8_Test11_Test12_ConcurrentLoginAttemptsCannotExceedLimit_AndExistingSessionsSurviveLimitReduction()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            var tenant = new TenantRegistry
            {
                Id = 1,
                Slug = "mansour-construction",
                Name = "Mansour Construction",
                SchemaName = "tenant_mansour_construction",
                IsActive = true,
                Plan = "Starter",
                Status = "Active",
                MaxConnectedUsers = 5 // Default limit = 5
            };
            masterDb.TenantRegistries.Add(tenant);
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);

            // Simulate 8 simultaneous login attempts racing against the default limit of 5
            var tasks = Enumerable.Range(1, 8)
                .Select(i => sessionService.TryAcquireSessionAsync("mansour-construction", i, $"user{i}", TimeSpan.FromHours(4)))
                .ToArray();

            var results = await Task.WhenAll(tasks);

            var allowed = results.Where(r => r.IsAllowed).ToList();
            var rejected = results.Where(r => !r.IsAllowed).ToList();

            // Exactly 5 sessions must succeed and 3 must be rejected
            Assert.Equal(5, allowed.Count);
            Assert.Equal(3, rejected.Count);
            Assert.Equal(5, await sessionService.GetActiveSessionCountAsync("mansour-construction"));

            // Administrator decreases limit from 5 to 3 while 5 sessions are already connected
            tenant.MaxConnectedUsers = 3;
            await masterDb.SaveChangesAsync();

            // Existing 5 sessions are NOT disconnected and remain valid
            foreach (var activeSession in allowed)
            {
                bool stillValid = await sessionService.ValidateSessionActiveAsync(activeSession.SessionId!, "mansour-construction");
                Assert.True(stillValid);
            }

            // A new login attempt while 5 > 3 is rejected
            var sixthAttempt = await sessionService.TryAcquireSessionAsync("mansour-construction", 99, "user99", TimeSpan.FromHours(4));
            Assert.False(sixthAttempt.IsAllowed);

            // Revoke one session (logout) -> count becomes 4 (still >= 3), then revoke two more -> count becomes 2 (< 3)
            var revoked1 = await sessionService.RevokeSessionAsync(allowed[0].SessionId!, "mansour-construction");
            Assert.True(revoked1);
            Assert.False(await sessionService.ValidateSessionActiveAsync(allowed[0].SessionId!, "mansour-construction"));

            await sessionService.RevokeSessionAsync(allowed[1].SessionId!, "mansour-construction");
            await sessionService.RevokeSessionAsync(allowed[2].SessionId!, "mansour-construction");
            Assert.Equal(2, await sessionService.GetActiveSessionCountAsync("mansour-construction"));

            // Now 2 < 3 -> a new login succeeds!
            var seventhAttempt = await sessionService.TryAcquireSessionAsync("mansour-construction", 100, "user100", TimeSpan.FromHours(4));
            Assert.True(seventhAttempt.IsAllowed);
        }

        private class FaultyLockTenantSessionService : TenantSessionService
        {
            public FaultyLockTenantSessionService(MasterDbContext masterDb) : base(masterDb) { }

            protected override Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction?> BeginDistributedTenantLockTransactionAsync(
                string normalizedSlug,
                CancellationToken cancellationToken)
            {
                throw new InvalidOperationException("Simulated PostgreSQL advisory lock failure");
            }
        }

        [Fact]
        public async Task Test_Phase9_DistributedLockFailure_FailsClosed_AndRevokedSessionRejectedByMiddlewareAndSignalR()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);
            using var tenantDb = CreateTenantDb(dbName, "mansour-construction");

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "mansour-construction",
                Name = "Mansour Construction",
                SchemaName = "tenant_mansour_construction",
                IsActive = true,
                Plan = "Starter",
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            // 1. Fail-closed verification when distributed lock throws
            var faultyService = new FaultyLockTenantSessionService(masterDb);
            var failClosedResult = await faultyService.TryAcquireSessionAsync("mansour-construction", 1, "user1", TimeSpan.FromHours(1));
            Assert.False(failClosedResult.IsAllowed);
            Assert.Equal(0, await faultyService.GetActiveSessionCountAsync("mansour-construction"));

            // 2. Acquire a real session, revoke it on logout, and verify both TenantMiddleware and NotificationHub reject it
            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync("mansour-construction", 1, "user1", TimeSpan.FromHours(1));
            Assert.True(acquired.IsAllowed);
            Assert.NotNull(acquired.SessionId);

            await sessionService.RevokeSessionAsync(acquired.SessionId!, "mansour-construction");

            // TenantMiddleware must reject revoked session with 401 Unauthorized
            bool nextCalled = false;
            var middleware = new TenantMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, Mock.Of<ILogger<TenantMiddleware>>());
            var httpCtx = new DefaultHttpContext();
            httpCtx.Request.Path = "/api/notifications/unreads";
            httpCtx.Request.Headers["X-Tenant-Slug"] = "mansour-construction";
            httpCtx.User = CreateUserPrincipal(1, "mansour-construction", acquired.SessionId);
            httpCtx.Response.Body = new MemoryStream();

            await middleware.InvokeAsync(httpCtx, new SubdomainTenantResolver(), new TenantContext(), masterDb);
            Assert.False(nextCalled);
            Assert.Equal(StatusCodes.Status401Unauthorized, httpCtx.Response.StatusCode);

            // NotificationHub must abort connection for revoked session
            var hub = new NotificationHub(Mock.Of<IHttpContextAccessor>(), Mock.Of<ILogger<NotificationHub>>(), tenantDb, masterDb);
            var hubCallerMock = new Mock<HubCallerContext>();
            hubCallerMock.Setup(c => c.ConnectionId).Returns("conn-revoked");
            hubCallerMock.Setup(c => c.User).Returns(CreateUserPrincipal(1, "mansour-construction", acquired.SessionId));
            hub.Context = hubCallerMock.Object;
            hub.Groups = Mock.Of<IGroupManager>();

            await hub.OnConnectedAsync();
            hubCallerMock.Verify(c => c.Abort(), Times.Once());
        }

        [Fact]
        public async Task Test4_Test5_Test13_BillingReminderNotifications_AppearInExistingNotificationCenter_Deduplicated_AndTenantIsolated()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);
            using var mansourDb = CreateTenantDb(dbName, "mansour-construction");
            using var socofebDb = CreateTenantDb(dbName, "socofeb");

            var nowUtc = DateTime.UtcNow;

            masterDb.TenantRegistries.AddRange(
                new TenantRegistry { Id = 1, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction", IsActive = true },
                new TenantRegistry { Id = 2, Slug = "socofeb", SchemaName = "tenant_socofeb", IsActive = true }
            );

            // Invoice for Mansour due in 3 days (matches default BeforeDueDays = [7, 3])
            masterDb.TenantInvoices.Add(new MasterTenantInvoice
            {
                Id = 100,
                TenantId = 1,
                InvoiceNumber = "INV-2026-TND300",
                Amount = 300.000m,
                Currency = "TND",
                Status = "UNPAID",
                BillingDate = nowUtc.Date.AddDays(-27),
                DueDate = nowUtc.Date.AddDays(3),
                CreatedAt = nowUtc.Date.AddDays(-27)
            });
            await masterDb.SaveChangesAsync();

            var hubContextMock = new Mock<IHubContext<NotificationHub>>();
            var clientsMock = new Mock<IHubClients>();
            var groupProxyMock = new Mock<IClientProxy>();
            clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(groupProxyMock.Object);
            hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);

            var emailMock = new Mock<IEmailService>();
            var notifLogger = new Mock<ILogger<AppNotificationService>>();

            var mansourTenantCtx = new TenantContext { IsEnabled = true, TenantId = 1, Slug = "mansour-construction", SchemaName = "tenant_mansour_construction" };
            var mansourNotifService = new AppNotificationService(mansourDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, mansourTenantCtx);

            var reminderConfig = new BillingReminderIntervalsOption();

            // 1. First evaluation creates 1 reminder notification in Mansour's AppNotifications
            int firstRunCreated = await BillingReminderBackgroundService.EvaluateTenantBillingRemindersAsync(
                1, masterDb, mansourDb, mansourNotifService, reminderConfig, nowUtc);
            Assert.Equal(1, firstRunCreated);

            // 2. Second evaluation on same day creates 0 notifications (duplicate prevention)
            int secondRunCreated = await BillingReminderBackgroundService.EvaluateTenantBillingRemindersAsync(
                1, masterDb, mansourDb, mansourNotifService, reminderConfig, nowUtc);
            Assert.Equal(0, secondRunCreated);

            // 3. Verify notification appears in Mansour's existing notification center with TND currency
            var mansourUnreads = (await mansourNotifService.GetUnreadNotificationsAsync(1)).ToList();
            Assert.Single(mansourUnreads);
            Assert.Contains("INV-2026-TND300", mansourUnreads[0].Title);
            Assert.Contains("TND", mansourUnreads[0].Message);
            Assert.Equal("SaaSInvoice", mansourUnreads[0].RelatedEntityType);

            // 4. Verify Socofeb tenant cannot see Mansour's billing notification
            var socofebTenantCtx = new TenantContext { IsEnabled = true, TenantId = 2, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var socofebNotifService = new AppNotificationService(socofebDb, hubContextMock.Object, emailMock.Object, notifLogger.Object, socofebTenantCtx);
            var socofebUnreads = await socofebNotifService.GetUnreadNotificationsAsync(1);
            Assert.Empty(socofebUnreads);
        }
    }
}
