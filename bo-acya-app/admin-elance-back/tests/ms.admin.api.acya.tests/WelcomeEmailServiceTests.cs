using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Services;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;

        public MockHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return _handler(request, cancellationToken);
        }
    }

    public class WelcomeEmailServiceTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        private MasterEnterprise CreateTestEnterprise(long id = 1, string slug = "test-corp", string name = "Test Corp", string email = "user@testcorp.com")
        {
            return new MasterEnterprise
            {
                Id = id,
                Slug = slug,
                Name = name,
                Email = email,
                Status = TenantStatus.Active,
                Plan = TenantPlan.Trial,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
        }

        private IConfiguration CreateTestConfiguration(string? apiKey = "test-api-key")
        {
            var dict = new Dictionary<string, string?>
            {
                { "N8nEmailService:BaseUrl", "http://n8n:5678" }
            };
            if (apiKey != null)
            {
                dict["N8nEmailService:ApiKey"] = apiKey;
            }
            return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
        }

        [Fact]
        public async Task SendWelcomeEmail_WithEmptyConfigApiKey_FailsSafelyWithoutSendingRequest()
        {
            HttpRequestMessage? interceptedRequest = null;
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                interceptedRequest = req;
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-default-key@acya.site>\"}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration(apiKey: ""); // Empty API key in configuration

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(46, "zaiemtex", "zaiemtex", "zaiem618@gmail.com");

            var result = await service.SendWelcomeEmailAsync(enterprise, "zaiem618@gmail.com", 46, "corr-123");

            Assert.Null(interceptedRequest); // No HTTP request should be sent
            Assert.Equal("FAILED_CONFIG", result.CurrentStatus);
            Assert.Null(result.MessageId);
        }

        [Fact]
        public async Task SendWelcomeEmail_WithExplicitApiKey_ConstructsCorrectBearerHeader()
        {
            HttpRequestMessage? interceptedRequest = null;
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                interceptedRequest = req;
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-explicit-key@acya.site>\"}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration(apiKey: "custom-secret-token-xyz");

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(47, "test-tenant", "Test Tenant", "test@acya.site");

            var result = await service.SendWelcomeEmailAsync(enterprise, "test@acya.site", 47, "corr-explicit");

            Assert.NotNull(interceptedRequest);
            Assert.NotNull(interceptedRequest!.Headers.Authorization);
            Assert.Equal("Bearer", interceptedRequest.Headers.Authorization!.Scheme);
            Assert.Equal("custom-secret-token-xyz", interceptedRequest.Headers.Authorization!.Parameter);
            Assert.Equal("ACCEPTED", result.CurrentStatus);
            Assert.Equal("<msg-explicit-key@acya.site>", result.MessageId);
        }

        [Fact]
        public async Task SendWelcomeEmail_WhenN8nAccepts_UpdatesEmailLogToAcceptedAndSetsMessageId()
        {
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-welcome-001@acya.site>\"}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "N8nEmailService:BaseUrl", "http://n8n:5678" },
                    { "N8nEmailService:ApiKey", "Bearer test-custom-key" }
                })
                .Build();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(10, "acme", "ACME Ltd", "contact@acme.com");

            var result = await service.SendWelcomeEmailAsync(enterprise, "admin@acme.com", 10, "trace-abc");

            Assert.Equal("ACCEPTED", result.CurrentStatus);
            Assert.Equal("<msg-welcome-001@acya.site>", result.MessageId);
            Assert.Equal("admin@acme.com", result.Recipient);

            var savedLog = await context.EmailLogs.FirstOrDefaultAsync(l => l.TenantId == 10);
            Assert.NotNull(savedLog);
            Assert.Equal("ACCEPTED", savedLog!.CurrentStatus);
            Assert.Equal("<msg-welcome-001@acya.site>", savedLog.MessageId);
        }

        [Fact]
        public async Task SendWelcomeEmail_WhenN8nReturnsIdProperty_SetsMessageIdCorrectly()
        {
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"id\":\"<mailgun-queued-123@acya.site>\",\"message\":\"Queued. Thank you.\"}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(12, "wood", "Wood Corp", "info@wood.com");

            var result = await service.SendWelcomeEmailAsync(enterprise, "info@wood.com", 12, "corr-xyz");

            Assert.Equal("ACCEPTED", result.CurrentStatus);
            Assert.Equal("<mailgun-queued-123@acya.site>", result.MessageId);
        }

        [Fact]
        public async Task SendWelcomeEmail_WhenN8nReturnsForbiddenOrError_SetsStatusToFailedSendWithoutThrowing()
        {
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                var res = new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("Authorization data is wrong!", Encoding.UTF8, "text/plain")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(45, "rs-auto", "RS Auto", "rsautoservice.tn@gmail.com");

            var result = await service.SendWelcomeEmailAsync(enterprise, "sana.mejri@gmail.com", 45, "corr-err");

            Assert.Equal("FAILED_SEND", result.CurrentStatus);
            Assert.Null(result.MessageId);

            var savedLog = await context.EmailLogs.FirstOrDefaultAsync(l => l.TenantId == 45);
            Assert.NotNull(savedLog);
            Assert.Equal("FAILED_SEND", savedLog!.CurrentStatus);
        }

        [Fact]
        public async Task SendWelcomeEmail_WhenAlreadyAccepted_SuppressesDuplicateNotification()
        {
            int dispatchCount = 0;
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                dispatchCount++;
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-first@acya.site>\"}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(20, "tenant-dupe", "Dupe Corp", "dupe@corp.com");

            // First send succeeds
            var firstLog = await service.SendWelcomeEmailAsync(enterprise, "dupe@corp.com", 20, "corr-1");
            Assert.Equal("ACCEPTED", firstLog.CurrentStatus);
            Assert.Equal(1, dispatchCount);

            // Repeated send with same tenant / registration
            var secondLog = await service.SendWelcomeEmailAsync(enterprise, "dupe@corp.com", 20, "corr-2");

            // Second send must NOT trigger another HTTP request
            Assert.Equal(1, dispatchCount);
            Assert.Equal(firstLog.Id, secondLog.Id);
            Assert.Equal("ACCEPTED", secondLog.CurrentStatus);
        }

        [Fact]
        public async Task SendWelcomeEmail_WithIsResendTrue_BypassesDuplicateSuppression()
        {
            int dispatchCount = 0;
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                dispatchCount++;
                var res = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent($"{{\"accepted\":true,\"messageId\":\"<msg-{dispatchCount}@acya.site>\"}}", Encoding.UTF8, "application/json")
                };
                return Task.FromResult(res);
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(21, "tenant-resend", "Resend Corp", "resend@corp.com");

            // Initial send
            await service.SendWelcomeEmailAsync(enterprise, "resend@corp.com", 21, "corr-1");
            Assert.Equal(1, dispatchCount);

            // Explicit resend with isResend = true
            var resendLog = await service.SendWelcomeEmailAsync(enterprise, "resend@corp.com", 21, "corr-2", isResend: true);

            // Resend must dispatch second request
            Assert.Equal(2, dispatchCount);
            Assert.Equal("<msg-2@acya.site>", resendLog.MessageId);
        }

        [Fact]
        public async Task SendWelcomeEmail_WhenPreviousSendFailed_RetriesSend()
        {
            int dispatchCount = 0;
            var handler = new MockHttpMessageHandler((req, ct) =>
            {
                dispatchCount++;
                if (dispatchCount == 1)
                {
                    return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
                }
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-retry-ok@acya.site>\"}", Encoding.UTF8, "application/json")
                });
            });

            var httpClient = new HttpClient(handler);
            var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var service = new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
            var enterprise = CreateTestEnterprise(22, "tenant-retry", "Retry Corp", "retry@corp.com");

            // Initial send fails
            var firstLog = await service.SendWelcomeEmailAsync(enterprise, "retry@corp.com", 22, "corr-1");
            Assert.Equal("FAILED_SEND", firstLog.CurrentStatus);
            Assert.Equal(1, dispatchCount);

            // Next approval / send attempts retry because prior was not ACCEPTED/DELIVERED
            var retryLog = await service.SendWelcomeEmailAsync(enterprise, "retry@corp.com", 22, "corr-2");
            Assert.Equal(2, dispatchCount);
            Assert.Equal("ACCEPTED", retryLog.CurrentStatus);
            Assert.Equal("<msg-retry-ok@acya.site>", retryLog.MessageId);
        }
    }
}
