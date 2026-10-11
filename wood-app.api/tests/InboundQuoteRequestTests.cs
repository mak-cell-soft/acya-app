using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers.Inbound;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.Attributes;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Inbound;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class InboundQuoteRequestTests
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

        private static IConfiguration CreateConfiguration(string secret = "test-integration-secret-key-12345")
        {
            var inMemorySettings = new Dictionary<string, string?>
            {
                { "QuoteIntegration:Secret", secret },
                { "QuoteEmail:EnterpriseRecipient", "socofeb.deco@gmail.com" },
                { "QuoteEmail:SenderAlias", "contact-socofeb" }
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();
        }

        #region GROUP 1: Inbound Staging & Idempotency

        [Fact]
        public async Task Test1_NewQuoteRequest_PersistsDurableRecord_Returns202WithTracking()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<msg-123@acya.site>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            var dto = new InboundQuoteRequestDto
            {
                Product = "MDF 18mm Brut",
                Quantity = "50 panneaux",
                CustomerName = "Ahmed Ben Salah",
                CustomerEmail = "ahmed@example.com",
                CustomerPhone = "+216 98 000 111",
                Message = "Besoin de livraison urgente",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var result = await service.ProcessQuoteRequestAsync(dto);

            Assert.True(result.Success);
            Assert.Equal("Accepted", result.Status);
            Assert.False(result.IsDuplicate);
            Assert.StartsWith("QR-", result.TrackingNumber);

            // Verify persisted in DB
            var saved = await context.InboundQuoteRequests.FirstOrDefaultAsync(q => q.IdempotencyKey == dto.IdempotencyKey);
            Assert.NotNull(saved);
            Assert.Equal(dto.Product, saved.Product);
            Assert.Equal(EmailLeaseStatus.Accepted, saved.EnterpriseStatus);
            Assert.Equal(EmailLeaseStatus.Accepted, saved.CustomerStatus);
            Assert.Equal("<msg-123@acya.site>", saved.EnterpriseMessageId);
            Assert.Equal("<msg-123@acya.site>", saved.CustomerMessageId);

            // Verify in-app notification to Seller role was pushed
            notifMock.Verify(n => n.NotifyAsync(
                It.Is<string>(t => t.Contains("MDF 18mm Brut")),
                It.IsAny<string>(),
                NotificationType.Info,
                NotificationPriority.High,
                null,
                "Seller",
                null,
                saved.Id.ToString(),
                "InboundQuoteRequest"
            ), Times.Once);
        }

        [Fact]
        public async Task Test2_SequentialDuplicateSubmission_ReturnsOriginalTracking_SendsZeroNewEmails()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<msg-123@acya.site>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            var key = Guid.NewGuid().ToString();
            var dto = new InboundQuoteRequestDto
            {
                Product = "Contreplaqué 15mm",
                Quantity = "20 panneaux",
                CustomerName = "Sami Trabelsi",
                CustomerEmail = "sami@example.com",
                IdempotencyKey = key
            };

            // First submission
            var res1 = await service.ProcessQuoteRequestAsync(dto);
            Assert.False(res1.IsDuplicate);

            // Duplicate retry submission
            var res2 = await service.ProcessQuoteRequestAsync(dto);
            Assert.True(res2.IsDuplicate);
            Assert.Equal(res1.TrackingNumber, res2.TrackingNumber);

            // Verify email dispatch count: Exactly 2 emails sent total (1 enterprise, 1 customer), not 4!
            n8nMock.Verify(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        }

        [Fact]
        public async Task Test3_SameContentDifferentUUID_CreatesNewQuoteRequest()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<msg-123@acya.site>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            var dto1 = new InboundQuoteRequestDto
            {
                Product = "MDF 18mm",
                Quantity = "10",
                CustomerName = "Ali",
                CustomerEmail = "ali@test.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var dto2 = new InboundQuoteRequestDto
            {
                Product = "MDF 18mm",
                Quantity = "10",
                CustomerName = "Ali",
                CustomerEmail = "ali@test.com",
                IdempotencyKey = Guid.NewGuid().ToString() // Distinct UUID
            };

            var res1 = await service.ProcessQuoteRequestAsync(dto1);
            var res2 = await service.ProcessQuoteRequestAsync(dto2);

            Assert.False(res1.IsDuplicate);
            Assert.False(res2.IsDuplicate);
            Assert.NotEqual(res1.TrackingNumber, res2.TrackingNumber);
            Assert.Equal(2, await context.InboundQuoteRequests.CountAsync());
        }

        #endregion

        #region GROUP 2: Authentication & Pilot Gating

        [Fact]
        public async Task Test4_RequireQuoteIntegrationSecret_ValidatesSecretConstantTime()
        {
            var filter = new RequireQuoteIntegrationSecretAttribute();
            var validSecret = "super-secret-key-xyz-789";
            var config = CreateConfiguration(validSecret);

            var services = new ServiceCollection();
            services.AddSingleton(config);
            services.AddLogging();
            var serviceProvider = services.BuildServiceProvider();

            // Scenario A: Missing header -> 401
            var httpContextMissing = new DefaultHttpContext { RequestServices = serviceProvider };
            var actionContextMissing = new ActionContext(httpContextMissing, new RouteData(), new ActionDescriptor());
            var contextMissing = new ActionExecutingContext(actionContextMissing, new List<IFilterMetadata>(), new Dictionary<string, object?>(), new object());

            await filter.OnActionExecutionAsync(contextMissing, () => Task.FromResult(new ActionExecutedContext(actionContextMissing, new List<IFilterMetadata>(), new object())));
            Assert.IsType<UnauthorizedObjectResult>(contextMissing.Result);

            // Scenario B: Invalid header -> 401
            var httpContextInvalid = new DefaultHttpContext { RequestServices = serviceProvider };
            httpContextInvalid.Request.Headers["X-Integration-Key"] = "wrong-secret";
            var actionContextInvalid = new ActionContext(httpContextInvalid, new RouteData(), new ActionDescriptor());
            var contextInvalid = new ActionExecutingContext(actionContextInvalid, new List<IFilterMetadata>(), new Dictionary<string, object?>(), new object());

            await filter.OnActionExecutionAsync(contextInvalid, () => Task.FromResult(new ActionExecutedContext(actionContextInvalid, new List<IFilterMetadata>(), new object())));
            Assert.IsType<UnauthorizedObjectResult>(contextInvalid.Result);

            // Scenario C: Valid header -> Passes to next
            var httpContextValid = new DefaultHttpContext { RequestServices = serviceProvider };
            httpContextValid.Request.Headers["X-Integration-Key"] = validSecret;
            var actionContextValid = new ActionContext(httpContextValid, new RouteData(), new ActionDescriptor());
            var contextValid = new ActionExecutingContext(actionContextValid, new List<IFilterMetadata>(), new Dictionary<string, object?>(), new object());

            bool nextCalled = false;
            await filter.OnActionExecutionAsync(contextValid, () =>
            {
                nextCalled = true;
                return Task.FromResult(new ActionExecutedContext(actionContextValid, new List<IFilterMetadata>(), new object()));
            });

            Assert.True(nextCalled);
            Assert.Null(contextValid.Result);
        }

        [Fact]
        public async Task Test5_NonSocofebTenant_Returns403Forbidden()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socobois");

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socobois", SchemaName = "tenant_socobois" };
            var quoteServiceMock = new Mock<IQuoteRequestService>();
            var rateLimiterMock = new Mock<IQuoteRequestRateLimiter>();
            var loggerMock = new Mock<ILogger<PublicQuoteController>>();

            var controller = new PublicQuoteController(
                quoteServiceMock.Object,
                rateLimiterMock.Object,
                context,
                tenantContext,
                loggerMock.Object
            );

            var dto = new InboundQuoteRequestDto
            {
                Product = "Panneau",
                Quantity = "5",
                CustomerName = "Test",
                CustomerEmail = "test@example.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var actionResult = await controller.CreateQuoteRequest(dto);
            var objResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);
        }

        [Fact]
        public async Task Test6_FeatureFlagDisabled_Returns403Forbidden()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            // Enterprise with IsWebQuoteIntakeEnabled = false
            context.Enterprises.Add(new Enterprise
            {
                Name = "SOCOFEB",
                IsWebQuoteIntakeEnabled = false
            });
            await context.SaveChangesAsync();

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var quoteServiceMock = new Mock<IQuoteRequestService>();
            var rateLimiterMock = new Mock<IQuoteRequestRateLimiter>();
            var loggerMock = new Mock<ILogger<PublicQuoteController>>();

            var controller = new PublicQuoteController(
                quoteServiceMock.Object,
                rateLimiterMock.Object,
                context,
                tenantContext,
                loggerMock.Object
            );

            var dto = new InboundQuoteRequestDto
            {
                Product = "Panneau",
                Quantity = "5",
                CustomerName = "Test",
                CustomerEmail = "test@example.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var actionResult = await controller.CreateQuoteRequest(dto);
            var objResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);
        }

        #endregion

        #region GROUP 3: Rate Limiting & Error Handling

        [Fact]
        public void Test7_RateLimiter_ExceedingLimit_Returns429WithRetryAfter()
        {
            var limiter = new InMemoryQuoteRequestRateLimiter(maxRequestsPerIp: 2, maxRequestsPerEmail: 2, windowMinutes: 60);

            // Request 1 & 2 pass
            Assert.True(limiter.IsAllowed("192.168.1.100", "test@example.com", "socofeb", out _));
            Assert.True(limiter.IsAllowed("192.168.1.100", "test@example.com", "socofeb", out _));

            // Request 3 rejected
            Assert.False(limiter.IsAllowed("192.168.1.100", "test@example.com", "socofeb", out var retryAfter));
            Assert.True(retryAfter > 0);
        }

        [Fact]
        public async Task Test8_DatabaseFailure_Returns503ServiceUnavailable()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");
            context.Enterprises.Add(new Enterprise { Name = "SOCOFEB", IsWebQuoteIntakeEnabled = true });
            await context.SaveChangesAsync();

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var quoteServiceMock = new Mock<IQuoteRequestService>();
            quoteServiceMock.Setup(s => s.ProcessQuoteRequestAsync(It.IsAny<InboundQuoteRequestDto>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new DbUpdateException("DB connection refused"));

            var rateLimiterMock = new Mock<IQuoteRequestRateLimiter>();
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), out It.Ref<int>.IsAny))
                .Returns(true);

            var loggerMock = new Mock<ILogger<PublicQuoteController>>();

            var controller = new PublicQuoteController(
                quoteServiceMock.Object,
                rateLimiterMock.Object,
                context,
                tenantContext,
                loggerMock.Object
            );
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var dto = new InboundQuoteRequestDto
            {
                Product = "Panneau",
                Quantity = "5",
                CustomerName = "Test",
                CustomerEmail = "test@example.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var actionResult = await controller.CreateQuoteRequest(dto);
            var objResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, objResult.StatusCode);
        }

        #endregion

        #region GROUP 4: Partial Failure & Recovery Worker

        [Fact]
        public async Task Test9_PartialFailure_EnterpriseSuccess_CustomerFailure_PreservesIndependentStates()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var n8nMock = new Mock<IN8nEmailService>();
            // Enterprise email succeeds
            n8nMock.Setup(s => s.SendEmailAsync("socofeb.deco@gmail.com", It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<ent-msg-1>"));

            // Customer email fails
            n8nMock.Setup(s => s.SendEmailAsync("client@bad-domain.com", It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Rejected("Invalid mailbox"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            var dto = new InboundQuoteRequestDto
            {
                Product = "Planche Chêne",
                Quantity = "100",
                CustomerName = "Karim",
                CustomerEmail = "client@bad-domain.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            var res = await service.ProcessQuoteRequestAsync(dto);
            Assert.True(res.Success);

            var row = await context.InboundQuoteRequests.FirstAsync(q => q.IdempotencyKey == dto.IdempotencyKey);
            Assert.Equal(EmailLeaseStatus.Accepted, row.EnterpriseStatus);
            Assert.Equal("<ent-msg-1>", row.EnterpriseMessageId);

            Assert.Equal(EmailLeaseStatus.Failed, row.CustomerStatus);
            Assert.Equal(1, row.CustomerRetryCount);
            Assert.NotNull(row.NextRetryAt);
        }

        [Fact]
        public async Task Test10_AmbiguousTimeout_SetsUnknownTimeoutWithQuarantine()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Unknown("Timeout 5000ms connecting to email service provider."));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            var dto = new InboundQuoteRequestDto
            {
                Product = "MDF 18mm",
                Quantity = "10",
                CustomerName = "Ali",
                CustomerEmail = "ali@example.com",
                IdempotencyKey = Guid.NewGuid().ToString()
            };

            await service.ProcessQuoteRequestAsync(dto);

            var row = await context.InboundQuoteRequests.FirstAsync(q => q.IdempotencyKey == dto.IdempotencyKey);
            Assert.Equal(EmailLeaseStatus.UnknownTimeout, row.EnterpriseStatus);
            Assert.Equal(EmailLeaseStatus.UnknownTimeout, row.CustomerStatus);
            Assert.True(row.NextRetryAt > DateTime.UtcNow.AddMinutes(10)); // 15m quarantine
        }

        [Fact]
        public async Task Test11_RecoveryWorker_ReclaimsExpiredLease_AndCompletesDispatch()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            // Insert abandoned row with expired lease
            var abandoned = new InboundQuoteRequest
            {
                TrackingNumber = "QR-202610-9999",
                Product = "Hêtre 50mm",
                Quantity = "10",
                CustomerName = "Nizar",
                CustomerEmail = "nizar@example.com",
                IdempotencyKey = Guid.NewGuid().ToString(),
                EnterpriseStatus = EmailLeaseStatus.Claimed,
                EnterpriseLeaseExpiresAt = DateTime.UtcNow.AddMinutes(-5), // Expired 5 min ago
                CustomerStatus = EmailLeaseStatus.Pending,
                CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-10)
            };
            context.InboundQuoteRequests.Add(abandoned);
            await context.SaveChangesAsync();

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<recovered-msg-id>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            // Execute recovery pass
            await service.RetryPendingQuoteEmailsAsync();

            var recovered = await context.InboundQuoteRequests.FirstAsync(q => q.Id == abandoned.Id);
            Assert.Equal(EmailLeaseStatus.Accepted, recovered.EnterpriseStatus);
            Assert.Equal(EmailLeaseStatus.Accepted, recovered.CustomerStatus);
            Assert.Equal("<recovered-msg-id>", recovered.EnterpriseMessageId);
            Assert.Equal("<recovered-msg-id>", recovered.CustomerMessageId);
        }

        [Fact]
        public async Task Test12_UnknownTimeout_BeforeQuarantineExpires_IsNotRetried()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var quarantined = new InboundQuoteRequest
            {
                TrackingNumber = "QR-202610-1111",
                Product = "MDF 18mm",
                Quantity = "10",
                CustomerName = "Tarek",
                CustomerEmail = "tarek@example.com",
                IdempotencyKey = Guid.NewGuid().ToString(),
                EnterpriseStatus = EmailLeaseStatus.UnknownTimeout,
                EnterpriseRetryCount = 1,
                NextRetryAt = DateTime.UtcNow.AddMinutes(10), // Still in 15m quarantine
                CustomerStatus = EmailLeaseStatus.Accepted,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-5)
            };
            context.InboundQuoteRequests.Add(quarantined);
            await context.SaveChangesAsync();

            var n8nMock = new Mock<IN8nEmailService>();
            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            // Execute recovery pass
            await service.RetryPendingQuoteEmailsAsync();

            // Zero email dispatches should occur because quarantine is active
            n8nMock.Verify(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

            var unretried = await context.InboundQuoteRequests.FirstAsync(q => q.Id == quarantined.Id);
            Assert.Equal(EmailLeaseStatus.UnknownTimeout, unretried.EnterpriseStatus);
            Assert.Equal(1, unretried.EnterpriseRetryCount);
        }

        [Fact]
        public async Task Test13_UnknownTimeout_AfterQuarantineExpires_IsRetriedAndSucceeds()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var readyForRetry = new InboundQuoteRequest
            {
                TrackingNumber = "QR-202610-2222",
                Product = "Chêne 27mm",
                Quantity = "5",
                CustomerName = "Mourad",
                CustomerEmail = "mourad@example.com",
                IdempotencyKey = Guid.NewGuid().ToString(),
                EnterpriseStatus = EmailLeaseStatus.UnknownTimeout,
                EnterpriseRetryCount = 1,
                NextRetryAt = DateTime.UtcNow.AddMinutes(-1), // Quarantine expired
                CustomerStatus = EmailLeaseStatus.Accepted,
                CreatedAt = DateTime.UtcNow.AddMinutes(-20),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-20)
            };
            context.InboundQuoteRequests.Add(readyForRetry);
            await context.SaveChangesAsync();

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync("socofeb.deco@gmail.com", It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<recovered-after-quarantine>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            // Execute recovery pass
            await service.RetryPendingQuoteEmailsAsync();

            n8nMock.Verify(s => s.SendEmailAsync("socofeb.deco@gmail.com", It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

            var retried = await context.InboundQuoteRequests.FirstAsync(q => q.Id == readyForRetry.Id);
            Assert.Equal(EmailLeaseStatus.Accepted, retried.EnterpriseStatus);
            Assert.Equal("<recovered-after-quarantine>", retried.EnterpriseMessageId);
        }

        [Fact]
        public async Task Test14_UnknownTimeout_ExceedingMaxRetries_IsNotRetried()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var exhausted = new InboundQuoteRequest
            {
                TrackingNumber = "QR-202610-3333",
                Product = "Frêne 30mm",
                Quantity = "8",
                CustomerName = "Zouhair",
                CustomerEmail = "zouhair@example.com",
                IdempotencyKey = Guid.NewGuid().ToString(),
                EnterpriseStatus = EmailLeaseStatus.UnknownTimeout,
                EnterpriseRetryCount = 3, // MaxEmailRetries reached
                NextRetryAt = DateTime.UtcNow.AddMinutes(-5), // Expired but exhausted
                CustomerStatus = EmailLeaseStatus.Accepted,
                CreatedAt = DateTime.UtcNow.AddMinutes(-40),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-40)
            };
            context.InboundQuoteRequests.Add(exhausted);
            await context.SaveChangesAsync();

            var n8nMock = new Mock<IN8nEmailService>();
            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            // Execute recovery pass
            await service.RetryPendingQuoteEmailsAsync();

            // Zero dispatches because retries are exhausted
            n8nMock.Verify(s => s.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

            var check = await context.InboundQuoteRequests.FirstAsync(q => q.Id == exhausted.Id);
            Assert.Equal(EmailLeaseStatus.UnknownTimeout, check.EnterpriseStatus);
            Assert.Equal(3, check.EnterpriseRetryCount);
        }

        [Fact]
        public async Task Test15_IndependentSlotRecovery_OnlyRetriesEligibleSlot()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName, "socofeb");

            var record = new InboundQuoteRequest
            {
                TrackingNumber = "QR-202610-4444",
                Product = "Bois Rouge",
                Quantity = "20",
                CustomerName = "Kamel",
                CustomerEmail = "kamel@example.com",
                IdempotencyKey = Guid.NewGuid().ToString(),
                EnterpriseStatus = EmailLeaseStatus.Accepted, // Already completed
                EnterpriseMessageId = "<existing-ent-msg>",
                CustomerStatus = EmailLeaseStatus.UnknownTimeout, // Needs retry
                CustomerRetryCount = 1,
                NextRetryAt = DateTime.UtcNow.AddMinutes(-2), // Quarantine expired
                CreatedAt = DateTime.UtcNow.AddMinutes(-30),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-30)
            };
            context.InboundQuoteRequests.Add(record);
            await context.SaveChangesAsync();

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(s => s.SendEmailAsync("kamel@example.com", It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("<customer-recovered-msg>"));

            var notifMock = new Mock<IAppNotificationService>();
            var loggerMock = new Mock<ILogger<QuoteRequestService>>();
            var config = CreateConfiguration();

            var service = new QuoteRequestService(context, n8nMock.Object, notifMock.Object, config, loggerMock.Object);

            await service.RetryPendingQuoteEmailsAsync();

            // Customer email should be sent, but Enterprise email should NEVER be sent again
            n8nMock.Verify(s => s.SendEmailAsync("kamel@example.com", It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
            n8nMock.Verify(s => s.SendEmailAsync("socofeb.deco@gmail.com", It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

            var updated = await context.InboundQuoteRequests.FirstAsync(q => q.Id == record.Id);
            Assert.Equal(EmailLeaseStatus.Accepted, updated.EnterpriseStatus);
            Assert.Equal("<existing-ent-msg>", updated.EnterpriseMessageId);
            Assert.Equal(EmailLeaseStatus.Accepted, updated.CustomerStatus);
            Assert.Equal("<customer-recovered-msg>", updated.CustomerMessageId);
        }

        #endregion
    }
}
