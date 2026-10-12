using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers.Public;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Middleware;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Services;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class WorkspaceRecoveryTests
    {
        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            return new MasterDbContext(options);
        }

        [Fact]
        public void RateLimiter_EnforcesLimits_AndCalculatesRetryAfter()
        {
            var limiter = new InMemoryWorkspaceRecoveryRateLimiter(maxRequestsPerIp: 2, maxRequestsPerEmail: 2, windowMinutes: 15);
            var ip = "192.168.1.100";
            var email = "user@example.com";

            Assert.True(limiter.IsAllowed(ip, email, out _));
            Assert.True(limiter.IsAllowed(ip, email, out _));
            Assert.False(limiter.IsAllowed(ip, email, out var retryAfter));
            Assert.True(retryAfter > 0);
        }

        [Fact]
        public async Task Controller_WhenRateLimited_Returns429WithRetryAfterHeader()
        {
            using var masterDb = CreateMasterDb("Recovery_RateLimit_" + Guid.NewGuid());
            var emailMock = new Mock<IN8nEmailService>();
            var rateLimiterMock = new Mock<IWorkspaceRecoveryRateLimiter>();
            var loggerMock = new Mock<ILogger<WorkspaceRecoveryController>>();
            var configMock = new Mock<IConfiguration>();

            int retrySec = 42;
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), out retrySec))
                .Returns(false);

            var controller = new WorkspaceRecoveryController(
                masterDb,
                emailMock.Object,
                rateLimiterMock.Object,
                loggerMock.Object,
                configMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var result = await controller.RecoverWorkspace(new WorkspaceRecoveryRequestDto { Email = "user@test.com" }, CancellationToken.None);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);
            Assert.Equal("42", controller.Response.Headers["Retry-After"]);
        }

        [Fact]
        public async Task Controller_UnknownEmail_ReturnsGenericSuccessMessageWithoutEmailDispatch()
        {
            using var masterDb = CreateMasterDb("Recovery_Unknown_" + Guid.NewGuid());
            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socobois",
                Name = "Socobois SARL",
                Email = "contact@socobois.tn",
                SchemaName = "tenant_socobois",
                IsActive = true,
                Status = "Active"
            });
            await masterDb.SaveChangesAsync();

            var emailMock = new Mock<IN8nEmailService>();
            var rateLimiterMock = new Mock<IWorkspaceRecoveryRateLimiter>();
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), out It.Ref<int>.IsAny))
                .Returns(true);
            var loggerMock = new Mock<ILogger<WorkspaceRecoveryController>>();
            var configMock = new Mock<IConfiguration>();

            var controller = new WorkspaceRecoveryController(
                masterDb,
                emailMock.Object,
                rateLimiterMock.Object,
                loggerMock.Object,
                configMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var result = await controller.RecoverWorkspace(new WorkspaceRecoveryRequestDto { Email = "stranger@unknown.com" }, CancellationToken.None);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = okResult.Value.GetType().GetProperty("message")?.GetValue(okResult.Value)?.ToString();
            Assert.Equal("Si un compte correspond à cette adresse, vous recevrez les instructions nécessaires pour retrouver votre espace ACYA.", message);

            // Verify email was NOT sent
            emailMock.Verify(e => e.SendEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<object?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task Controller_SingleMatchingWorkspace_DispatchesBrandedEmailAndReturnsGeneric200()
        {
            using var masterDb = CreateMasterDb("Recovery_Single_" + Guid.NewGuid());
            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "woodcorp",
                Name = "WoodCorp International",
                Email = "admin@woodcorp.com",
                SchemaName = "tenant_woodcorp",
                IsActive = true,
                Status = "Active"
            });
            await masterDb.SaveChangesAsync();

            string capturedRecipient = null!;
            string capturedSubject = null!;
            string capturedBody = null!;

            var emailMock = new Mock<IN8nEmailService>();
            emailMock.Setup(e => e.SendEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<object?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
                .Callback<string, string, string, string?, object?, string, string, CancellationToken>(
                    (to, subj, body, tmpl, vars, sender, replyTo, ct) =>
                    {
                        capturedRecipient = to;
                        capturedSubject = subj;
                        capturedBody = body;
                    })
                .ReturnsAsync(EmailDispatchResult.Success("msg-12345"));

            var rateLimiterMock = new Mock<IWorkspaceRecoveryRateLimiter>();
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), out It.Ref<int>.IsAny))
                .Returns(true);
            var loggerMock = new Mock<ILogger<WorkspaceRecoveryController>>();
            var configMock = new Mock<IConfiguration>();

            var controller = new WorkspaceRecoveryController(
                masterDb,
                emailMock.Object,
                rateLimiterMock.Object,
                loggerMock.Object,
                configMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var result = await controller.RecoverWorkspace(new WorkspaceRecoveryRequestDto { Email = "ADMIN@WOODCORP.COM " }, CancellationToken.None);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            var message = okResult.Value.GetType().GetProperty("message")?.GetValue(okResult.Value)?.ToString();
            Assert.Equal("Si un compte correspond à cette adresse, vous recevrez les instructions nécessaires pour retrouver votre espace ACYA.", message);

            // Verify email was dispatched with correct properties
            Assert.Equal("admin@woodcorp.com", capturedRecipient);
            Assert.Contains("WoodCorp International", capturedSubject);
            Assert.Contains("woodcorp.acya.site", capturedBody);
            Assert.Contains("https://woodcorp.acya.site/login", capturedBody);
        }

        [Fact]
        public async Task Controller_MultiWorkspaceAccount_DispatchesEmailContainingAllWorkspaces()
        {
            using var masterDb = CreateMasterDb("Recovery_Multi_" + Guid.NewGuid());
            masterDb.TenantRegistries.AddRange(
                new TenantRegistry
                {
                    Id = 1,
                    Slug = "branch-nord",
                    Name = "ACYA Nord",
                    Email = "manager@group.tn",
                    SchemaName = "tenant_branch_nord",
                    IsActive = true,
                    Status = "Active"
                },
                new TenantRegistry
                {
                    Id = 2,
                    Slug = "branch-sud",
                    Name = "ACYA Sud",
                    Email = "manager@group.tn",
                    SchemaName = "tenant_branch_sud",
                    IsActive = true,
                    Status = "Active"
                }
            );
            await masterDb.SaveChangesAsync();

            string capturedBody = null!;

            var emailMock = new Mock<IN8nEmailService>();
            emailMock.Setup(e => e.SendEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<object?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
                .Callback<string, string, string, string?, object?, string, string, CancellationToken>(
                    (to, subj, body, tmpl, vars, sender, replyTo, ct) => capturedBody = body)
                .ReturnsAsync(EmailDispatchResult.Success("msg-multi-999"));

            var rateLimiterMock = new Mock<IWorkspaceRecoveryRateLimiter>();
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), out It.Ref<int>.IsAny))
                .Returns(true);
            var loggerMock = new Mock<ILogger<WorkspaceRecoveryController>>();
            var configMock = new Mock<IConfiguration>();

            var controller = new WorkspaceRecoveryController(
                masterDb,
                emailMock.Object,
                rateLimiterMock.Object,
                loggerMock.Object,
                configMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var result = await controller.RecoverWorkspace(new WorkspaceRecoveryRequestDto { Email = "manager@group.tn" }, CancellationToken.None);

            Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(capturedBody);
            // Verify BOTH workspaces are presented in the email body
            Assert.Contains("branch-nord.acya.site", capturedBody);
            Assert.Contains("ACYA Nord", capturedBody);
            Assert.Contains("branch-sud.acya.site", capturedBody);
            Assert.Contains("ACYA Sud", capturedBody);
        }

        [Fact]
        public async Task Controller_WhenEmailTransportFails_LogsSafelyAndStillReturnsGeneric200()
        {
            using var masterDb = CreateMasterDb("Recovery_TransportFail_" + Guid.NewGuid());
            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "alphabois",
                Name = "Alpha Bois",
                Email = "alpha@bois.tn",
                SchemaName = "tenant_alphabois",
                IsActive = true,
                Status = "Active"
            });
            await masterDb.SaveChangesAsync();

            var emailMock = new Mock<IN8nEmailService>();
            emailMock.Setup(e => e.SendEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<object?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
                .ThrowsAsync(new HttpRequestException("n8n transport connection timeout"));

            var rateLimiterMock = new Mock<IWorkspaceRecoveryRateLimiter>();
            rateLimiterMock.Setup(r => r.IsAllowed(It.IsAny<string>(), It.IsAny<string>(), out It.Ref<int>.IsAny))
                .Returns(true);
            var loggerMock = new Mock<ILogger<WorkspaceRecoveryController>>();
            var configMock = new Mock<IConfiguration>();

            var controller = new WorkspaceRecoveryController(
                masterDb,
                emailMock.Object,
                rateLimiterMock.Object,
                loggerMock.Object,
                configMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            // Call shouldn't throw to the outside world
            var result = await controller.RecoverWorkspace(new WorkspaceRecoveryRequestDto { Email = "alpha@bois.tn" }, CancellationToken.None);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var message = okResult.Value?.GetType().GetProperty("message")?.GetValue(okResult.Value)?.ToString();
            Assert.Equal("Si un compte correspond à cette adresse, vous recevrez les instructions nécessaires pour retrouver votre espace ACYA.", message);
        }

        [Fact]
        public async Task TenantMiddleware_BypassesTenantResolution_ForWorkspaceRecovery()
        {
            var nextInvoked = false;
            RequestDelegate next = (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            };

            var middlewareLogger = new Mock<ILogger<TenantMiddleware>>();
            var middleware = new TenantMiddleware(next, middlewareLogger.Object);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/public/workspace-recovery";

            var tenantResolverMock = new Mock<ITenantResolver>();
            var tenantContext = new TenantContext();
            using var masterDb = CreateMasterDb("Middleware_Recovery_Bypass_" + Guid.NewGuid());

            await middleware.InvokeAsync(httpContext, tenantResolverMock.Object, tenantContext, masterDb);

            // Assert next middleware in pipeline was invoked without requiring tenant resolution
            Assert.True(nextInvoked);
            tenantResolverMock.Verify(r => r.ResolveTenantSlug(It.IsAny<HttpContext>()), Times.Never);
        }
    }
}
