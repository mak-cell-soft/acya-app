using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.api.Services.Notifications;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class FcmPushDispatcherTests
    {
        private (WoodAppContext Context, TenantContext TenantContext) CreateContext(string dbName, string tenantSlug)
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

            var context = new WoodAppContext(options, tenantContext);
            return (context, tenantContext);
        }

        private async Task SeedUsersAndTokensAsync(WoodAppContext context)
        {
            // Seed Person & AppUser for Seller (UserId 1, PersonId 1)
            var sellerPerson = new Person { Id = 1, FullName = "Seller 1", Role = Roles.Seller };
            var sellerUser = new AppUser { Id = 1, Login = "seller1", IsActive = true, IdPerson = 1, Persons = sellerPerson, IdSalesSite = 10 };

            // Seed Person & AppUser for Admin (UserId 2, PersonId 2)
            var adminPerson = new Person { Id = 2, FullName = "Admin 1", Role = Roles.Admin };
            var adminUser = new AppUser { Id = 2, Login = "admin1", IsActive = true, IdPerson = 2, Persons = adminPerson, IdSalesSite = 10 };

            // Seed Person & AppUser for User on Site 20 (UserId 3, PersonId 3)
            var userPerson = new Person { Id = 3, FullName = "User 1", Role = Roles.User };
            var site20User = new AppUser { Id = 3, Login = "user1", IsActive = true, IdPerson = 3, Persons = userPerson, IdSalesSite = 20 };

            // Seed Inactive User (UserId 4, PersonId 4)
            var inactivePerson = new Person { Id = 4, FullName = "Inactive User", Role = Roles.Seller };
            var inactiveUser = new AppUser { Id = 4, Login = "inactive1", IsActive = false, IdPerson = 4, Persons = inactivePerson, IdSalesSite = 10 };

            await context.Persons.AddRangeAsync(sellerPerson, adminPerson, userPerson, inactivePerson);
            await context.AppUsers.AddRangeAsync(sellerUser, adminUser, site20User, inactiveUser);

            // Tokens for Seller 1: 2 active tokens (phone + tablet)
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 1, UserId = 1, Token = "token_seller_phone", Platform = "android", IsActive = true });
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 2, UserId = 1, Token = "token_seller_tablet", Platform = "android", IsActive = true });

            // Token for Seller 1: 1 inactive token
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 3, UserId = 1, Token = "token_seller_inactive", Platform = "android", IsActive = false });

            // Token for Admin 1: 1 active token
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 4, UserId = 2, Token = "token_admin_phone", Platform = "android", IsActive = true });

            // Token for Site 20 User: 1 active token
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 5, UserId = 3, Token = "token_site20_phone", Platform = "android", IsActive = true });

            // Token for Inactive User 4: 1 active token
            await context.DevicePushTokens.AddAsync(new DevicePushToken { Id = 6, UserId = 4, Token = "token_inactive_user", Platform = "android", IsActive = true });

            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task Dispatch_SkippedSafely_WhenFirebaseNotConfigured()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(false);

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            var notif = new AppNotification { Id = 10, Title = "Test", Message = "Msg", TargetUserId = 1 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal("Firebase is not configured", result.SkippedReason);
            mockClient.Verify(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task Dispatch_NoActiveDeviceTokens_CausesNoFirebaseSend()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // User 99 has no registered tokens
            var notif = new AppNotification { Id = 11, Title = "Test", Message = "Msg", TargetUserId = 99 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal("No active device tokens found for recipient.", result.SkippedReason);
            mockClient.Verify(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task Dispatch_OnlyActiveTokensSelected_InactiveTokensIgnored()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 2, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // User 1 has 2 active tokens and 1 inactive token
            var notif = new AppNotification { Id = 12, Title = "Test", Message = "Msg", TargetUserId = 1 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(2, result.TargetedDevicesCount);
            Assert.NotNull(dispatchedTokens);
            Assert.Equal(2, dispatchedTokens.Count);
            Assert.Contains("token_seller_phone", dispatchedTokens);
            Assert.Contains("token_seller_tablet", dispatchedTokens);
            Assert.DoesNotContain("token_seller_inactive", dispatchedTokens);
        }

        [Fact]
        public async Task Dispatch_DirectUserTargeting_ActiveUser_UsesIntendedRecipient()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // Direct targeting to Admin (UserId 2, IsActive == true)
            var notif = new AppNotification { Id = 13, Title = "Admin Alert", Message = "Msg", TargetUserId = 2 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.NotNull(dispatchedTokens);
            Assert.Single(dispatchedTokens);
            Assert.Equal("token_admin_phone", dispatchedTokens.First());
        }

        [Fact]
        public async Task Dispatch_DirectUserTargeting_InactiveRecipient_ReceivesNoPush_AndTokenRemainsInDb()
        {
            // Regression test for FIX 2: Inactive direct user receives no push, but token is not deleted
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // Direct targeting to User 4 (IsActive == false, but has active token in DevicePushTokens)
            var notif = new AppNotification { Id = 130, Title = "Inactive Alert", Message = "Msg", TargetUserId = 4 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(0, result.TargetedDevicesCount);

            // Firebase send was NEVER called
            mockClient.Verify(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()), Times.Never);

            // Token for inactive user 4 remains in database untouched
            var tokenInDb = await context.DevicePushTokens.FirstOrDefaultAsync(t => t.UserId == 4 && t.Token == "token_inactive_user");
            Assert.NotNull(tokenInDb);
            Assert.True(tokenInDb.IsActive);
        }

        [Fact]
        public async Task Dispatch_DirectUserTargeting_MissingRecipient_ReceivesNoPush()
        {
            // Regression test for FIX 2: Missing direct user receives no push
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // Direct targeting to User 9999 (does not exist in AppUsers)
            var notif = new AppNotification { Id = 131, Title = "Ghost User Alert", Message = "Msg", TargetUserId = 9999 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(0, result.TargetedDevicesCount);
            mockClient.Verify(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task Dispatch_RoleTargeting_ResolvesActiveUsersWithRole()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 2, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // TargetRole: "Seller" should resolve Seller 1 (active), but ignore Inactive User 4
            var notif = new AppNotification { Id = 14, Title = "New Lead", Message = "Msg", TargetRole = "Seller" };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.NotNull(dispatchedTokens);
            Assert.Equal(2, dispatchedTokens.Count);
            Assert.Contains("token_seller_phone", dispatchedTokens);
            Assert.Contains("token_seller_tablet", dispatchedTokens);
        }

        [Fact]
        public async Task Dispatch_SiteTargeting_ResolvesActiveUsersOnSite()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // TargetSiteId = 20 should resolve User 3 on Site 20
            var notif = new AppNotification { Id = 15, Title = "Depot Notice", Message = "Msg", TargetSiteId = 20 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.NotNull(dispatchedTokens);
            Assert.Single(dispatchedTokens);
            Assert.Equal("token_site20_phone", dispatchedTokens.First());
        }

        [Fact]
        public async Task Dispatch_TenantWide_BroadcastsToAllActiveUsers()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 4, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // Broadcast: all targets null
            var notif = new AppNotification { Id = 16, Title = "Article Updated", Message = "Msg" };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.NotNull(dispatchedTokens);
            Assert.Equal(4, dispatchedTokens.Count); // 2 seller + 1 admin + 1 site20
        }

        [Fact]
        public async Task Dispatch_PayloadNeverIncludesSensitiveBusinessData()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            string? sentTitle = null;
            string? sentBody = null;
            IReadOnlyDictionary<string, string>? sentData = null;

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) =>
                    {
                        sentTitle = title;
                        sentBody = body;
                        sentData = data;
                    })
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            // Highly sensitive business notification message
            var notif = new AppNotification
            {
                Id = 999,
                Title = "Demande Caisse 50000 TND",
                Message = "Client John Doe avec telephone +216 99887766 a paye 50000.000 DT",
                Type = NotificationType.Warning,
                Priority = NotificationPriority.High,
                TargetUserId = 2
            };

            await dispatcher.DispatchAsync(notif);

            Assert.Equal("ACYA Élancé", sentTitle);
            Assert.Equal("Nouvelle notification reçue", sentBody);
            Assert.NotNull(sentData);
            Assert.Equal("999", sentData["notificationId"]);
            Assert.Equal("socofeb", sentData["tenantSlug"]);
            Assert.Equal(((int)NotificationType.Warning).ToString(), sentData["type"]);
            Assert.Equal(((int)NotificationPriority.High).ToString(), sentData["priority"]);

            // Ensure NO sensitive fields were leaked in data payload
            Assert.DoesNotContain("John Doe", string.Join(" ", sentData.Values));
            Assert.DoesNotContain("50000", string.Join(" ", sentData.Values));
            Assert.DoesNotContain("99887766", string.Join(" ", sentData.Values));
        }

        [Fact]
        public async Task Dispatch_InvalidUnregisteredTokens_AreDeactivatedInDatabase()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult
                {
                    SuccessCount = 1,
                    FailureCount = 1,
                    UnregisteredTokens = new List<string> { "token_seller_phone" }
                });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            var notif = new AppNotification { Id = 17, Title = "Test", Message = "Msg", TargetUserId = 1 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(1, result.DeactivatedTokensCount);

            // Verify in DB that token_seller_phone is now inactive
            var phoneToken = await context.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == "token_seller_phone");
            Assert.NotNull(phoneToken);
            Assert.False(phoneToken.IsActive);

            // And token_seller_tablet remains active
            var tabletToken = await context.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == "token_seller_tablet");
            Assert.NotNull(tabletToken);
            Assert.True(tabletToken.IsActive);
        }

        [Fact]
        public async Task Dispatch_InvalidArgumentError_DoesNotDeactivateTokens()
        {
            // Regression test for FIX 1: InvalidArgument is NOT treated as unregistered token
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult
                {
                    SuccessCount = 0,
                    FailureCount = 2,
                    UnregisteredTokens = new List<string>() // InvalidArgument does NOT add tokens to UnregisteredTokens list
                });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            var notif = new AppNotification { Id = 171, Title = "Test", Message = "Msg", TargetUserId = 1 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(0, result.DeactivatedTokensCount);

            // Tokens remain active
            var activeTokens = await context.DevicePushTokens.Where(t => t.UserId == 1 && t.IsActive).ToListAsync();
            Assert.Equal(2, activeTokens.Count);
        }

        [Fact]
        public async Task Dispatch_TransientFirebaseErrors_DoNotDeactivateTokens()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult
                {
                    SuccessCount = 0,
                    FailureCount = 2,
                    UnregisteredTokens = new List<string>() // Transient failure (QuotaExceeded/Unavailable): no unregistered tokens
                });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            var notif = new AppNotification { Id = 18, Title = "Test", Message = "Msg", TargetUserId = 1 };

            var result = await dispatcher.DispatchAsync(notif);

            Assert.True(result.IsSuccess);
            Assert.Equal(0, result.DeactivatedTokensCount);

            // Both tokens must remain active in database
            var activeTokens = await context.DevicePushTokens.Where(t => t.UserId == 1 && t.IsActive).ToListAsync();
            Assert.Equal(2, activeTokens.Count);
        }

        [Fact]
        public async Task Dispatch_PropagatesCancellation_WhenCancellationTokenTriggered()
        {
            // Regression test for FIX 3: Dispatcher propagates OperationCanceledException instead of swallowing it
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .ThrowsAsync(new OperationCanceledException());

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcher = new FcmPushDispatcher(context, mockClient.Object, mockLogger.Object, tenantContext);

            var notif = new AppNotification { Id = 181, Title = "Test", Message = "Msg", TargetUserId = 1 };

            using var cts = new CancellationTokenSource();
            cts.Cancel(); // Pre-cancelled token

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => dispatcher.DispatchAsync(notif, cts.Token));
        }

        [Fact]
        public async Task Dispatch_TenantIsolation_TenantANeverSendsTenantBTokens()
        {
            var db = Guid.NewGuid().ToString();
            var (contextA, tenantContextA) = CreateContext(db, "socofeb");
            var (contextB, tenantContextB) = CreateContext(db, "piqbit");

            // Seed User 10 in Tenant A
            var personA = new Person { Id = 10, FullName = "User A", Role = Roles.Admin };
            var userA = new AppUser { Id = 10, Login = "userA", IsActive = true, IdPerson = 10, Persons = personA };
            await contextA.Persons.AddAsync(personA);
            await contextA.AppUsers.AddAsync(userA);
            await contextA.DevicePushTokens.AddAsync(new DevicePushToken { Id = 1, UserId = 10, Token = "token_tenant_a", IsActive = true });
            await contextA.SaveChangesAsync();

            // Seed User 10 in Tenant B
            var personB = new Person { Id = 10, FullName = "User B", Role = Roles.Admin };
            var userB = new AppUser { Id = 10, Login = "userB", IsActive = true, IdPerson = 10, Persons = personB };
            await contextB.Persons.AddAsync(personB);
            await contextB.AppUsers.AddAsync(userB);
            await contextB.DevicePushTokens.AddAsync(new DevicePushToken { Id = 2, UserId = 10, Token = "token_tenant_b", IsActive = true });
            await contextB.SaveChangesAsync();

            IReadOnlyList<string>? dispatchedTokens = null;
            var mockClient = new Mock<IFirebaseMessagingClient>();
            mockClient.Setup(c => c.IsConfigured).Returns(true);
            mockClient.Setup(c => c.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, CancellationToken>(
                    (tokens, title, body, data, ct) => dispatchedTokens = tokens)
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0 });

            var mockLogger = new Mock<ILogger<FcmPushDispatcher>>();
            var dispatcherA = new FcmPushDispatcher(contextA, mockClient.Object, mockLogger.Object, tenantContextA);

            // Dispatch in Tenant A for User 10
            var notif = new AppNotification { Id = 19, Title = "Test", Message = "Msg", TargetUserId = 10 };
            await dispatcherA.DispatchAsync(notif);

            Assert.NotNull(dispatchedTokens);
            Assert.Single(dispatchedTokens);
            Assert.Equal("token_tenant_a", dispatchedTokens.First());
            Assert.DoesNotContain("token_tenant_b", dispatchedTokens);
        }

        [Fact]
        public async Task NotifyAsync_FcmFailure_NeverFailsOrRollsBackPersistedNotification()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockHub = new Mock<IHubContext<NotificationHub>>();
            var mockEmail = new Mock<IEmailService>();
            var mockLogger = new Mock<ILogger<AppNotificationService>>();

            // Mock dispatcher that throws an explosive exception
            var mockDispatcher = new Mock<IFcmPushDispatcher>();
            mockDispatcher.Setup(d => d.DispatchAsync(It.IsAny<AppNotification>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Simulated catastrophic Firebase timeout or crash"));

            var notificationService = new AppNotificationService(
                context,
                mockHub.Object,
                mockEmail.Object,
                mockLogger.Object,
                tenantContext,
                null,
                mockDispatcher.Object);

            // Execute NotifyAsync
            var created = await notificationService.NotifyAsync(
                title: "Sale Confirmed",
                message: "Order #123 has been confirmed.",
                type: NotificationType.Success,
                priority: NotificationPriority.Normal,
                targetUserId: 1);

            // Notification must be returned and persisted with valid Id
            Assert.NotNull(created);
            Assert.True(created.Id > 0);

            var inDb = await context.AppNotifications.FindAsync(created.Id);
            Assert.NotNull(inDb);
            Assert.Equal("Sale Confirmed", inDb.Title);

            // Verify dispatcher was called
            mockDispatcher.Verify(d => d.DispatchAsync(It.IsAny<AppNotification>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task NotifyAsync_FcmTimeout_LogsWarningDistinctly_AndPreservesPersistedNotificationAndSignalR()
        {
            // Regression test for FIX 3: Timeout logs warning distinctly from generic error, preserves DB and SignalR
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockHub = new Mock<IHubContext<NotificationHub>>();
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
            mockClients.Setup(c => c.Group("tenant:socofeb:user-1")).Returns(mockClientProxy.Object);

            var mockEmail = new Mock<IEmailService>();
            var mockLogger = new Mock<ILogger<AppNotificationService>>();

            // Mock dispatcher that throws OperationCanceledException (simulating 3s timeout)
            var mockDispatcher = new Mock<IFcmPushDispatcher>();
            mockDispatcher.Setup(d => d.DispatchAsync(It.IsAny<AppNotification>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new OperationCanceledException());

            var notificationService = new AppNotificationService(
                context,
                mockHub.Object,
                mockEmail.Object,
                mockLogger.Object,
                tenantContext,
                null,
                mockDispatcher.Object);

            var created = await notificationService.NotifyAsync(
                title: "Timeout Test",
                message: "Payload",
                type: NotificationType.Info,
                targetUserId: 1);

            // Persisted in DB
            Assert.NotNull(created);
            var inDb = await context.AppNotifications.FindAsync(created.Id);
            Assert.NotNull(inDb);

            // SignalR dispatch executed
            mockClientProxy.Verify(p => p.SendCoreAsync("ReceiveSystemNotification", It.IsAny<object[]>(), default), Times.Once);

            // Warning logged for timeout
            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("timed out after 3 seconds")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);

            // Error was NOT logged
            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Never);
        }

        [Fact]
        public async Task NotifyAsync_SignalRDispatchRemainsUnchanged()
        {
            var db = Guid.NewGuid().ToString();
            var (context, tenantContext) = CreateContext(db, "socofeb");
            await SeedUsersAndTokensAsync(context);

            var mockHub = new Mock<IHubContext<NotificationHub>>();
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();

            mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
            mockClients.Setup(c => c.Group("tenant:socofeb:user-1")).Returns(mockClientProxy.Object);

            var mockEmail = new Mock<IEmailService>();
            var mockLogger = new Mock<ILogger<AppNotificationService>>();
            var mockDispatcher = new Mock<IFcmPushDispatcher>();

            var notificationService = new AppNotificationService(
                context,
                mockHub.Object,
                mockEmail.Object,
                mockLogger.Object,
                tenantContext,
                null,
                mockDispatcher.Object);

            await notificationService.NotifyAsync(
                title: "Test SignalR",
                message: "Payload check",
                type: NotificationType.Info,
                targetUserId: 1);

            // Verify SignalR SendAsync called on group tenant:socofeb:user-1 with ReceiveSystemNotification
            mockClientProxy.Verify(p => p.SendCoreAsync(
                "ReceiveSystemNotification",
                It.Is<object[]>(args => args.Length == 1),
                default), Times.Once);

            // Verify FCM dispatcher was also invoked
            mockDispatcher.Verify(d => d.DispatchAsync(It.IsAny<AppNotification>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public void FirebaseMessagingClient_CredentialFileNotFound_DoesNotLogPath()
        {
            // Regression test for FIX 4: Missing credential file warning does not reveal file path
            var secretPath = @"C:\super_secret_system_path\firebase_creds.json";
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["FIREBASE_CREDENTIALS_PATH"]).Returns(secretPath);

            var mockValidator = new Mock<IFirebaseCredentialValidator>();
            mockValidator.Setup(v => v.FileExists(secretPath)).Returns(false);

            var mockLogger = new Mock<ILogger<FirebaseMessagingClient>>();

            var client = new FirebaseMessagingClient(mockConfig.Object, mockLogger.Object, mockValidator.Object);

            Assert.False(client.IsConfigured);

            // Verify warning was logged and does NOT contain the secret file path
            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("not found") && !v.ToString()!.Contains(secretPath)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void FirebaseMessagingClient_ProjectIdMismatch_DisablesFCMAndLogsErrorWithoutSecrets()
        {
            // Regression test for FIX 5: ProjectId mismatch keeps FCM disabled and logs sanitized error
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["FIREBASE_CREDENTIALS_PATH"]).Returns("/fake/path.json");
            mockConfig.Setup(c => c["FIREBASE_PROJECT_ID"]).Returns("expected-project-id");

            var mockValidator = new Mock<IFirebaseCredentialValidator>();
            mockValidator.Setup(v => v.FileExists(It.IsAny<string>())).Returns(true);
            mockValidator.Setup(v => v.ExtractProjectId(It.IsAny<string>())).Returns("different-project-id");

            var mockLogger = new Mock<ILogger<FirebaseMessagingClient>>();

            var client = new FirebaseMessagingClient(mockConfig.Object, mockLogger.Object, mockValidator.Object);

            Assert.False(client.IsConfigured);

            // Error logged for configuration mismatch
            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("mismatch")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void FirebaseMessagingClient_LogSendFailure_WithNullMessagingErrorCode_LogsSafelyAndSanitized()
        {
            var mockLogger = new Mock<ILogger<FirebaseMessagingClient>>();
            var response = new System.Net.Http.HttpResponseMessage(System.Net.HttpStatusCode.Forbidden);
            var rawMessage = "Firebase Cloud Messaging API has not been used in project or is disabled.\r\nEnable it in console.";

            var exType = typeof(FirebaseAdmin.Messaging.FirebaseMessagingException);
            var fex = (FirebaseAdmin.Messaging.FirebaseMessagingException)Activator.CreateInstance(
                exType,
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic,
                null,
                new object?[] { FirebaseAdmin.ErrorCode.PermissionDenied, rawMessage, null, null, response },
                null)!;

            FirebaseMessagingClient.LogSendFailure(mockLogger.Object, fex);

            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) =>
                        v.ToString()!.Contains("MessagingErrorCode: None") &&
                        v.ToString()!.Contains("ErrorCode: PermissionDenied") &&
                        v.ToString()!.Contains("StatusCode: 403") &&
                        v.ToString()!.Contains("Firebase Cloud Messaging API has not been used") &&
                        !v.ToString()!.Contains("\r\n")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void FirebaseMessagingClient_LogSendFailure_WithNullHttpResponse_HandlesNullSafely()
        {
            var mockLogger = new Mock<ILogger<FirebaseMessagingClient>>();
            var exType = typeof(FirebaseAdmin.Messaging.FirebaseMessagingException);
            var fex = (FirebaseAdmin.Messaging.FirebaseMessagingException)Activator.CreateInstance(
                exType,
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic,
                null,
                new object?[] { FirebaseAdmin.ErrorCode.InvalidArgument, "Invalid payload", FirebaseAdmin.Messaging.MessagingErrorCode.InvalidArgument, null, null },
                null)!;

            FirebaseMessagingClient.LogSendFailure(mockLogger.Object, fex);

            mockLogger.Verify(
                l => l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) =>
                        v.ToString()!.Contains("MessagingErrorCode: InvalidArgument") &&
                        v.ToString()!.Contains("ErrorCode: InvalidArgument") &&
                        v.ToString()!.Contains("Invalid payload")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void FirebaseMessagingClient_SanitizeErrorMessage_RemovesNewlinesAndTruncates()
        {
            Assert.Equal("None", FirebaseMessagingClient.SanitizeErrorMessage(null));
            Assert.Equal("None", FirebaseMessagingClient.SanitizeErrorMessage("   "));

            var multiline = "Line 1\r\nLine 2\nLine 3\r";
            var sanitized = FirebaseMessagingClient.SanitizeErrorMessage(multiline);
            Assert.DoesNotContain("\r", sanitized);
            Assert.DoesNotContain("\n", sanitized);
            Assert.Equal("Line 1  Line 2 Line 3", sanitized);

            var veryLong = new string('a', 600);
            var truncated = FirebaseMessagingClient.SanitizeErrorMessage(veryLong);
            Assert.Equal(503, truncated.Length); // 500 chars + "..."
            Assert.EndsWith("...", truncated);
        }
    }
}

