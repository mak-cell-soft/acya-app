using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using ms.webapp.api.acya.api.Controllers.Authentication;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Interfaces;
using ms.webapp.api.acya.Services.Mobile;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class PasswordResetAndEmailSecurityTests
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

        #region GROUP A: Email Integration Tests (N8nEmailService)

        [Fact]
        public async Task TestA1_ProviderAcceptance_ReturnsAcceptedWithValidMessageId()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{\"accepted\":true,\"messageId\":\"<msg-123@acya.site>\"}", Encoding.UTF8, "application/json")
                });

            var configMock = new Mock<IConfiguration>();
            configMock.Setup(c => c["N8nEmailService:BaseUrl"]).Returns("http://n8n:5678");
            configMock.Setup(c => c["N8nEmailService:ApiKey"]).Returns("test-key");

            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            var result = await service.SendPasswordResetEmailAsync("user@socofeb.tn", "https://socofeb.acya.site/forgot-password?token=XYZ", "socofeb", "SOCOFEB");

            Assert.Equal(EmailDispatchStatus.Accepted, result.Status);
            Assert.Equal("<msg-123@acya.site>", result.MessageId);
        }

        [Fact]
        public async Task TestA2_ProviderRejection_ReturnsRejected()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.BadRequest,
                    Content = new StringContent("{\"error\":\"Invalid template\"}", Encoding.UTF8, "application/json")
                });

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            var result = await service.SendPasswordResetEmailAsync("user@socofeb.tn", "https://socofeb.acya.site/forgot-password?token=XYZ", "socofeb");

            Assert.Equal(EmailDispatchStatus.Rejected, result.Status);
            Assert.Contains("400", result.ErrorMessage);
        }

        [Fact]
        public async Task TestA3_Timeout_ReturnsUnknownOutcome()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ThrowsAsync(new OperationCanceledException());

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            var result = await service.SendPasswordResetEmailAsync("user@socofeb.tn", "https://socofeb.acya.site/forgot-password?token=XYZ", "socofeb");

            Assert.Equal(EmailDispatchStatus.Unknown, result.Status);
        }

        [Fact]
        public async Task TestA4_NetworkException_ReturnsRejected()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ThrowsAsync(new HttpRequestException("Connection refused"));

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            var result = await service.SendPasswordResetEmailAsync("user@socofeb.tn", "https://socofeb.acya.site/forgot-password?token=XYZ", "socofeb");

            Assert.Equal(EmailDispatchStatus.Rejected, result.Status);
            Assert.Contains("Network error", result.ErrorMessage);
        }

        [Fact]
        public async Task TestA5_EmptyRecipient_ReturnsRejectedWithoutSending()
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            var result = await service.SendPasswordResetEmailAsync("   ", "https://socofeb.acya.site", "socofeb");

            Assert.Equal(EmailDispatchStatus.Rejected, result.Status);
        }

        [Fact]
        public async Task TestA6_SenderIdentity_UsesNoreply()
        {
            HttpRequestMessage? capturedRequest = null;
            string? capturedBody = null;
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Returns<HttpRequestMessage, CancellationToken>(async (req, ct) =>
                {
                    capturedRequest = req;
                    if (req.Content != null)
                    {
                        capturedBody = await req.Content.ReadAsStringAsync();
                    }
                    return new HttpResponseMessage { StatusCode = HttpStatusCode.OK };
                });

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            await service.SendPasswordResetEmailAsync("user@socofeb.tn", "https://socofeb.acya.site/reset", "socofeb");

            Assert.NotNull(capturedRequest);
            Assert.NotNull(capturedBody);
            using var doc = JsonDocument.Parse(capturedBody!);
            Assert.Equal("noreply", doc.RootElement.GetProperty("sender").GetString());
            Assert.Equal("raw", doc.RootElement.GetProperty("template").GetString());
            Assert.False(string.IsNullOrWhiteSpace(doc.RootElement.GetProperty("subject").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(doc.RootElement.GetProperty("html").GetString()));
        }

        [Fact]
        public async Task TestA8_SendEmail_DefaultsToRawTemplate()
        {
            string? capturedBody = null;
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Returns<HttpRequestMessage, CancellationToken>(async (req, ct) =>
                {
                    if (req.Content != null)
                    {
                        capturedBody = await req.Content.ReadAsStringAsync();
                    }
                    return new HttpResponseMessage { StatusCode = HttpStatusCode.OK };
                });

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<N8nEmailService>>();
            var httpClient = new HttpClient(handlerMock.Object);
            var service = new N8nEmailService(httpClient, configMock.Object, loggerMock.Object);

            await service.SendEmailAsync("user@socofeb.tn", "Sujet Test", "<p>Contenu HTML</p>");

            Assert.NotNull(capturedBody);
            using var doc = JsonDocument.Parse(capturedBody!);
            Assert.Equal("raw", doc.RootElement.GetProperty("template").GetString());
            Assert.Equal("Sujet Test", doc.RootElement.GetProperty("subject").GetString());
            Assert.Equal("<p>Contenu HTML</p>", doc.RootElement.GetProperty("html").GetString());
        }

        #endregion

        #region GROUP B: Password Recovery Lifecycle Tests

        [Fact]
        public async Task TestB1_ExistingAccount_GeneratesHashedTokenAndReturnsGenericMessage()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var user = new AppUser
            {
                Email = "director@socofeb.tn",
                Login = "director",
                IsActive = true
            };
            context.AppUsers.Add(user);
            await context.SaveChangesAsync();

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            var notifMock = new Mock<IAppNotificationService>();
            notifMock.Setup(n => n.SendEmailNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string?>()))
                .ReturnsAsync(EmailDispatchResult.Success("msg-1"));

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                tenantContext,
                notifMock.Object);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            controller.HttpContext.Request.Scheme = "https";
            controller.HttpContext.Request.Host = new HostString("socofeb.acya.site");

            var result = await controller.ForgotPassword(new PasswordResetRequestDto { Email = "director@socofeb.tn" });

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("Si un compte est associé", okResult.Value!.ToString()!);

            var updatedUser = await context.AppUsers.FirstAsync(u => u.Email == "director@socofeb.tn");
            Assert.NotNull(updatedUser.PasswordResetToken);
            // 64-char uppercase hex hash (SHA-256)
            Assert.Equal(64, updatedUser.PasswordResetToken.Length);
            Assert.NotNull(updatedUser.PasswordResetTokenExpiry);
            Assert.True(updatedUser.PasswordResetTokenExpiry > DateTime.UtcNow);
        }

        [Fact]
        public async Task TestB2_NonExistentAccount_ReturnsSameGenericMessage()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var notifMock = new Mock<IAppNotificationService>();

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                tenantContext,
                notifMock.Object);

            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = await controller.ForgotPassword(new PasswordResetRequestDto { Email = "ghost@socofeb.tn" });

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("Si un compte est associé", okResult.Value!.ToString()!);
            // Email must not be sent for non-existent account
            notifMock.Verify(n => n.SendEmailNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string?>()), Times.Never);
        }

        [Fact]
        public async Task TestB3_EmailSubmissionFailure_PreservesGenericPublicResponse()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            context.AppUsers.Add(new AppUser { Email = "admin@socofeb.tn", Login = "admin", IsActive = true });
            await context.SaveChangesAsync();

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var notifMock = new Mock<IAppNotificationService>();
            notifMock.Setup(n => n.SendEmailNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string?>()))
                .ReturnsAsync(EmailDispatchResult.Rejected("SMTP connection failed"));

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                tenantContext,
                notifMock.Object);

            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            controller.HttpContext.Request.Scheme = "https";
            controller.HttpContext.Request.Host = new HostString("socofeb.acya.site");

            var result = await controller.ForgotPassword(new PasswordResetRequestDto { Email = "admin@socofeb.tn" });

            // Must NOT expose internal failure to caller
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("Si un compte est associé", okResult.Value!.ToString()!);

            // Token is still preserved for the user in database
            var updatedUser = await context.AppUsers.FirstAsync(u => u.Email == "admin@socofeb.tn");
            Assert.NotNull(updatedUser.PasswordResetToken);
        }

        [Fact]
        public async Task TestB4_ResetPassword_Success_ClearsTokenAndUpdatesPassword()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");

            var rawToken = "A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718293A4B5C6D7E8F90";
            var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToUpperInvariant();

            using var hmac = new HMACSHA512();
            var user = new AppUser
            {
                Email = "test@socofeb.tn",
                Login = "test",
                PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes("OldPass123")),
                PasswordSalt = hmac.Key,
                PasswordResetToken = tokenHash,
                PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(10),
                IsActive = true
            };
            context.AppUsers.Add(user);
            await context.SaveChangesAsync();

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                new TenantContext { IsEnabled = true, Slug = "socofeb" },
                Mock.Of<IAppNotificationService>());

            var result = await controller.ResetPassword(new PasswordResetDto
            {
                Token = rawToken,
                NewPassword = "NewSecretPass456!",
                ConfirmPassword = "NewSecretPass456!"
            });

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("succès", okResult.Value!.ToString()!);

            var updatedUser = await context.AppUsers.FirstAsync(u => u.Email == "test@socofeb.tn");
            // Token must be cleared (single-use enforcement)
            Assert.Null(updatedUser.PasswordResetToken);
            Assert.Null(updatedUser.PasswordResetTokenExpiry);

            // Password hash must have changed
            using var verifyHmac = new HMACSHA512(updatedUser.PasswordSalt!);
            var newComputed = verifyHmac.ComputeHash(Encoding.UTF8.GetBytes("NewSecretPass456!"));
            Assert.Equal(newComputed, updatedUser.PasswordHash);
        }

        [Fact]
        public async Task TestB5_ResetPassword_ExpiredToken_RejectsWithBadRequest()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");

            var rawToken = "EXPIREDTOKEN1234567890ABCDEF";
            var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToUpperInvariant();

            var user = new AppUser
            {
                Email = "expired@socofeb.tn",
                Login = "expired",
                PasswordResetToken = tokenHash,
                PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(-5), // Expired 5 mins ago
                IsActive = true
            };
            context.AppUsers.Add(user);
            await context.SaveChangesAsync();

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                new TenantContext { IsEnabled = true, Slug = "socofeb" },
                Mock.Of<IAppNotificationService>());

            var result = await controller.ResetPassword(new PasswordResetDto
            {
                Token = rawToken,
                NewPassword = "Password123!",
                ConfirmPassword = "Password123!"
            });

            var badResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("expiré", badResult.Value!.ToString()!);
        }

        [Fact]
        public async Task TestB6_TenantIsolation_UserInTenantA_NotFoundInTenantB()
        {
            var dbName = Guid.NewGuid().ToString();
            var socofebDb = CreateContext(dbName, "socofeb");
            var mansourDb = CreateContext(dbName, "mansour");

            socofebDb.AppUsers.Add(new AppUser { Email = "shared@domain.com", Login = "socofeb_user", IsActive = true });
            await socofebDb.SaveChangesAsync();

            // Request executed against Mansour tenant
            var mansourContext = new TenantContext { IsEnabled = true, Slug = "mansour", SchemaName = "tenant_mansour" };
            var notifMock = new Mock<IAppNotificationService>();

            var controller = new AccountController(
                mansourDb,
                Mock.Of<ITokenService>(),
                mansourContext,
                notifMock.Object);

            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = await controller.ForgotPassword(new PasswordResetRequestDto { Email = "shared@domain.com" });

            Assert.IsType<OkObjectResult>(result);
            // Mansour has no such user, so notification is never dispatched
            notifMock.Verify(n => n.SendEmailNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string?>()), Times.Never);
        }

        #endregion

        #region GROUP C: Security Hardening Tests

        [Fact]
        public async Task TestC1_RawTokenAbsentFromPersistedNotificationMessage()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var hubMock = new Mock<IHubContext<NotificationHub>>();
            var emailServiceMock = new Mock<IEmailService>();
            var loggerMock = new Mock<ILogger<AppNotificationService>>();
            var tenantCtx = new TenantContext { IsEnabled = true, Slug = "socofeb" };

            var n8nMock = new Mock<IN8nEmailService>();
            n8nMock.Setup(n => n.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<object?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(EmailDispatchResult.Success("m-1"));

            var notifService = new AppNotificationService(context, hubMock.Object, emailServiceMock.Object, loggerMock.Object, tenantCtx, n8nMock.Object);

            var rawToken = "DEADBEEF998877665544332211AABBCC";
            var rawUrl = $"https://socofeb.acya.site/forgot-password?token={rawToken}";
            var rawBody = $"Click here: <a href=\"{rawUrl}\">{rawUrl}</a>";

            await notifService.SendEmailNotificationAsync(
                "user@socofeb.tn",
                "Password Reset",
                rawBody,
                targetUserId: 1,
                sanitizedMessage: "Demande de réinitialisation générée.");

            var persisted = await context.AppNotifications.FirstAsync();
            Assert.DoesNotContain(rawToken, persisted.Message);
            Assert.Equal("Demande de réinitialisation générée.", persisted.Message);
        }

        [Fact]
        public async Task TestC2_SanitizePersistedMessage_RedactsTokenInUnsanitizedBody()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var hubMock = new Mock<IHubContext<NotificationHub>>();
            var notifService = new AppNotificationService(context, hubMock.Object, Mock.Of<IEmailService>(), Mock.Of<ILogger<AppNotificationService>>());

            var rawToken = "SECRET_HEX_TOKEN_999";
            var bodyWithToken = $"Please visit https://socofeb.acya.site/reset?token={rawToken} to continue.";

            // sanitizedMessage is null, falling back to SanitizePersistedMessage
            await notifService.SendEmailNotificationAsync("user@socofeb.tn", "Reset", bodyWithToken);

            var persisted = await context.AppNotifications.FirstAsync();
            Assert.DoesNotContain(rawToken, persisted.Message);
            Assert.Contains("token=[REDACTED]", persisted.Message);
        }

        [Theory]
        [InlineData("https://evil.com", "socofeb.acya.site", false)]
        [InlineData("https://attacker.site/login", "socofeb.acya.site", false)]
        [InlineData("javascript:alert(1)", "socofeb.acya.site", false)]
        [InlineData("https://socofeb.acya.site", "socofeb.acya.site", true)]
        [InlineData("https://socofeb.acya.site/login", "socofeb.acya.site", true)]
        [InlineData("http://localhost:3000", "socofeb.acya.site", true)]
        [InlineData("http://127.0.0.1:3000", "socofeb.acya.site", true)]
        public void TestC3_IsTrustedOrigin_ValidatesTrustedTenantDomains(string candidate, string canonicalHost, bool expected)
        {
            var isTrusted = AccountController.IsTrustedOrigin(candidate, canonicalHost);
            Assert.Equal(expected, isTrusted);
        }

        [Fact]
        public async Task TestC4_HostHeaderPoisoning_Ignored_ForcesCanonicalDomain()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            context.AppUsers.Add(new AppUser { Email = "user@socofeb.tn", Login = "user", IsActive = true });
            await context.SaveChangesAsync();

            string? capturedBody = null;
            var notifMock = new Mock<IAppNotificationService>();
            notifMock.Setup(n => n.SendEmailNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string?>()))
                .Callback<string, string, string, int?, string?>((_, _, body, _, _) => capturedBody = body)
                .ReturnsAsync(EmailDispatchResult.Success());

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                tenantContext,
                notifMock.Object);

            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            // Malicious attacker Origin
            controller.HttpContext.Request.Headers["Origin"] = "https://evil-phishing.com";
            controller.HttpContext.Request.Headers["Referer"] = "https://evil-phishing.com/trap";

            await controller.ForgotPassword(new PasswordResetRequestDto { Email = "user@socofeb.tn" });

            Assert.NotNull(capturedBody);
            // Must NOT contain attacker domain
            Assert.DoesNotContain("evil-phishing.com", capturedBody);
            // Must use canonical tenant domain
            Assert.Contains("https://socofeb.acya.site/forgot-password?token=", capturedBody);
        }

        [Fact]
        public void TestC5_RateLimiter_EnforcesLimits_AndSetsRetryAfter()
        {
            var limiter = new InMemoryPasswordResetRateLimiter(maxRequestsPerIp: 3, maxRequestsPerEmail: 2, windowMinutes: 15);

            // Same email in socofeb: max 2
            Assert.True(limiter.IsAllowed("1.2.3.4", "victim@socofeb.tn", "socofeb", out var retry1));
            Assert.Equal(0, retry1);

            Assert.True(limiter.IsAllowed("1.2.3.4", "victim@socofeb.tn", "socofeb", out var retry2));
            Assert.Equal(0, retry2);

            // 3rd attempt for same email in same tenant should be blocked
            Assert.False(limiter.IsAllowed("1.2.3.4", "victim@socofeb.tn", "socofeb", out var retry3));
            Assert.True(retry3 > 0);

            // Same email in different tenant is independent (no cross-tenant leak)
            Assert.True(limiter.IsAllowed("1.2.3.4", "victim@socofeb.tn", "other-tenant", out _));
        }

        [Fact]
        public async Task TestC6_Controller_AppliesRateLimiter_Returns429()
        {
            var dbName = Guid.NewGuid().ToString();
            var context = CreateContext(dbName, "socofeb");
            var limiterMock = new Mock<IPasswordResetRateLimiter>();
            int retryAfter = 60;
            limiterMock.Setup(l => l.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), out retryAfter))
                .Returns(false);

            var controller = new AccountController(
                context,
                Mock.Of<ITokenService>(),
                new TenantContext { IsEnabled = true, Slug = "socofeb" },
                Mock.Of<IAppNotificationService>(),
                rateLimiter: limiterMock.Object);

            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = await controller.ForgotPassword(new PasswordResetRequestDto { Email = "spam@socofeb.tn" });

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status429TooManyRequests, statusResult.StatusCode);
            Assert.Equal("60", controller.Response.Headers["Retry-After"].ToString());
        }

        #endregion
    }
}
