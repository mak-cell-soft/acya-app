using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using ms.webapp.api.acya.api.Controllers.Authentication;
using ms.webapp.api.acya.api.Middleware;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class TenantLogoutAuthenticationTests
    {
        private const string TestSigningKey = "ACYA_Test_Signing_Key_For_Unit_Tests_At_Least_32_Bytes_Long!";
        private const string TestIssuer = "https://acya.site";
        private const string TestAudience = "https://acya.site";

        private static IConfiguration CreateTestConfiguration(string signingKey = TestSigningKey)
        {
            return new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["TokenKey"] = signingKey,
                    ["JWTSettings:securityKey"] = signingKey,
                    ["JWTSettings:ValidIssuer"] = TestIssuer,
                    ["JWTSettings:ValidAudience"] = TestAudience,
                })
                .Build();
        }

        private static MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_master")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new MasterDbContext(options);
        }

        private static WoodAppContext CreateTenantDb(string dbName, TenantContext tenantContext)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: $"{dbName}_{tenantContext.Slug}")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new WoodAppContext(options, tenantContext);
        }

        private static string CreateSignedJwt(
            string tenantSlug,
            string sessionId,
            DateTime expiresUtc,
            string signingKey = TestSigningKey,
            string algorithm = SecurityAlgorithms.HmacSha256)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.NameId, "42"),
                new Claim(JwtRegisteredClaimNames.Email, $"user@{tenantSlug}.acya.site"),
                new Claim(JwtRegisteredClaimNames.Jti, sessionId),
                new Claim("session_id", sessionId),
                new Claim("tenant_slug", tenantSlug),
                new Claim(JwtRegisteredClaimNames.Iss, TestIssuer),
                new Claim(JwtRegisteredClaimNames.Aud, TestAudience),
            };

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = expiresUtc.AddHours(-2),
                Expires = expiresUtc,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                    algorithm)
            };

            return tokenHandler.WriteToken(tokenHandler.CreateToken(descriptor));
        }

        private static ClaimsPrincipal CreateAuthenticatedPrincipal(string tenantSlug, string sessionId)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, "42"),
                new Claim(JwtRegisteredClaimNames.Jti, sessionId),
                new Claim("session_id", sessionId),
                new Claim("tenant_slug", tenantSlug)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        }

        private static AccountController CreateController(
            WoodAppContext tenantDb,
            TokenService tokenService,
            TenantContext tenantContext,
            ITenantSessionService sessionService,
            HttpContext httpContext)
        {
            var controller = new AccountController(
                tenantDb,
                tokenService,
                tenantContext,
                Mock.Of<IAppNotificationService>(),
                rateLimiter: null,
                logger: Mock.Of<ILogger<AccountController>>(),
                sessionService: sessionService);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        [Theory]
        [InlineData("socofeb")]
        [InlineData("socobois")]
        public async Task Logout_WithValidAccessToken_RevokesSessionAndReturnsOk(string tenantSlug)
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = tenantSlug,
                Name = tenantSlug.ToUpperInvariant(),
                SchemaName = $"tenant_{tenantSlug}",
                IsActive = true,
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync(tenantSlug, 42, "amine", TimeSpan.FromDays(5));
            Assert.True(acquired.IsAllowed);
            Assert.False(string.IsNullOrEmpty(acquired.SessionId));

            var tenantContext = new TenantContext { IsEnabled = true, Slug = tenantSlug, SchemaName = $"tenant_{tenantSlug}" };
            using var tenantDb = CreateTenantDb(dbName, tenantContext);
            var tokenService = new TokenService(CreateTestConfiguration(), tenantContext);

            var httpContext = new DefaultHttpContext
            {
                User = CreateAuthenticatedPrincipal(tenantSlug, acquired.SessionId!)
            };

            var controller = CreateController(tenantDb, tokenService, tenantContext, sessionService, httpContext);
            var result = await controller.Logout();

            Assert.IsType<OkObjectResult>(result);
            var sessionRow = await masterDb.TenantActiveSessions.SingleAsync(s => s.SessionId == acquired.SessionId);
            Assert.True(sessionRow.IsRevoked);
            Assert.NotNull(sessionRow.RevokedAt);
        }

        [Fact]
        public async Task Logout_WithExpiredAccessToken_RevokesSessionAndReturnsOk()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB",
                SchemaName = "tenant_socofeb",
                IsActive = true,
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync("socofeb", 42, "amine", TimeSpan.FromDays(5));
            Assert.True(acquired.IsAllowed);

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            using var tenantDb = CreateTenantDb(dbName, tenantContext);
            var tokenService = new TokenService(CreateTestConfiguration(), tenantContext);

            // Simulate expired JWT (User is unauthenticated because JwtBearer rejected lifetime)
            var expiredJwt = CreateSignedJwt("socofeb", acquired.SessionId!, DateTime.UtcNow.AddMinutes(-30));
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["Authorization"] = $"Bearer {expiredJwt}";

            var controller = CreateController(tenantDb, tokenService, tenantContext, sessionService, httpContext);
            var result = await controller.Logout();

            Assert.IsType<OkObjectResult>(result);
            var sessionRow = await masterDb.TenantActiveSessions.SingleAsync(s => s.SessionId == acquired.SessionId);
            Assert.True(sessionRow.IsRevoked);
        }

        [Fact]
        public async Task Logout_WithMissingAccessToken_ReturnsOkIdempotently()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);
            var sessionService = new TenantSessionService(masterDb);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socobois", SchemaName = "tenant_socobois" };
            using var tenantDb = CreateTenantDb(dbName, tenantContext);
            var tokenService = new TokenService(CreateTestConfiguration(), tenantContext);

            var httpContext = new DefaultHttpContext(); // No Authorization header, unauthenticated
            var controller = CreateController(tenantDb, tokenService, tenantContext, sessionService, httpContext);
            var result = await controller.Logout();

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Logout_WithInvalidOrTamperedOrWrongKeyToken_ReturnsOkWithoutRevokingSession()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socobois",
                Name = "SOCOBOIS",
                SchemaName = "tenant_socobois",
                IsActive = true,
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync("socobois", 42, "amine", TimeSpan.FromDays(5));
            Assert.True(acquired.IsAllowed);

            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socobois", SchemaName = "tenant_socobois" };
            using var tenantDb = CreateTenantDb(dbName, tenantContext);
            var tokenService = new TokenService(CreateTestConfiguration(), tenantContext);

            // 1. Malformed token
            var ctxMalformed = new DefaultHttpContext();
            ctxMalformed.Request.Headers["Authorization"] = "Bearer not-a-valid-jwt";
            var res1 = await CreateController(tenantDb, tokenService, tenantContext, sessionService, ctxMalformed).Logout();
            Assert.IsType<OkObjectResult>(res1);

            // 2. Signed with wrong key carrying the real sessionId
            var forgedJwt = CreateSignedJwt("socobois", acquired.SessionId!, DateTime.UtcNow.AddHours(1), signingKey: "Wrong_Signing_Key_That_Must_Be_Rejected_By_Validation!");
            var ctxForged = new DefaultHttpContext();
            ctxForged.Request.Headers["Authorization"] = $"Bearer {forgedJwt}";
            var res2 = await CreateController(tenantDb, tokenService, tenantContext, sessionService, ctxForged).Logout();
            Assert.IsType<OkObjectResult>(res2);

            // 3. Unsigned ("none" algorithm) token carrying the real sessionId
            var noneHeader = Base64UrlEncoder.Encode("{\"alg\":\"none\",\"typ\":\"JWT\"}");
            var nonePayload = Base64UrlEncoder.Encode($"{{\"jti\":\"{acquired.SessionId}\",\"tenant_slug\":\"socobois\",\"iss\":\"{TestIssuer}\",\"aud\":\"{TestAudience}\"}}");
            var ctxNone = new DefaultHttpContext();
            ctxNone.Request.Headers["Authorization"] = $"Bearer {noneHeader}.{nonePayload}.";
            var res3 = await CreateController(tenantDb, tokenService, tenantContext, sessionService, ctxNone).Logout();
            Assert.IsType<OkObjectResult>(res3);

            // Legitimate session must remain untouched
            var sessionRow = await masterDb.TenantActiveSessions.SingleAsync(s => s.SessionId == acquired.SessionId);
            Assert.False(sessionRow.IsRevoked);
        }

        [Fact]
        public async Task Logout_WithAlreadyRevokedSession_MiddlewareAndControllerStayIdempotent()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB",
                SchemaName = "tenant_socofeb",
                IsActive = true,
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync("socofeb", 42, "amine", TimeSpan.FromDays(5));
            Assert.True(await sessionService.RevokeSessionAsync(acquired.SessionId!, "socofeb"));

            // Step 1: Verify TenantMiddleware allows /api/Account/logout even when session is already revoked
            bool nextCalled = false;
            var middleware = new TenantMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, Mock.Of<ILogger<TenantMiddleware>>());
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/Account/logout";
            httpContext.Request.Headers["X-Tenant-Slug"] = "socofeb";
            httpContext.User = CreateAuthenticatedPrincipal("socofeb", acquired.SessionId!);
            var tenantContext = new TenantContext();

            await middleware.InvokeAsync(httpContext, new SubdomainTenantResolver(), tenantContext, masterDb);
            Assert.True(nextCalled);
            Assert.Equal(StatusCodes.Status200OK, httpContext.Response.StatusCode);

            // Step 2: Verify AccountController.Logout returns 200 OK idempotently
            using var tenantDb = CreateTenantDb(dbName, tenantContext);
            var tokenService = new TokenService(CreateTestConfiguration(), tenantContext);
            var controller = CreateController(tenantDb, tokenService, tenantContext, sessionService, httpContext);
            var result = await controller.Logout();

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Logout_WithDifferentTenantExpiredToken_DoesNotRevokeOtherTenantSession()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.AddRange(
                new TenantRegistry { Id = 1, Slug = "socofeb", Name = "SOCOFEB", SchemaName = "tenant_socofeb", IsActive = true, Status = "Active", MaxConnectedUsers = 5 },
                new TenantRegistry { Id = 2, Slug = "socobois", Name = "SOCOBOIS", SchemaName = "tenant_socobois", IsActive = true, Status = "Active", MaxConnectedUsers = 5 }
            );
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var socoboisSession = await sessionService.TryAcquireSessionAsync("socobois", 7, "user-b", TimeSpan.FromDays(5));
            Assert.True(socoboisSession.IsAllowed);

            // Request targets socofeb, but supplies an expired JWT issued for socobois
            var socofebContext = new TenantContext { IsEnabled = true, Slug = "socofeb", SchemaName = "tenant_socofeb" };
            using var socofebDb = CreateTenantDb(dbName, socofebContext);
            var tokenService = new TokenService(CreateTestConfiguration(), socofebContext);

            var expiredSocoboisJwt = CreateSignedJwt("socobois", socoboisSession.SessionId!, DateTime.UtcNow.AddMinutes(-15));
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["Authorization"] = $"Bearer {expiredSocoboisJwt}";

            var controller = CreateController(socofebDb, tokenService, socofebContext, sessionService, httpContext);
            var result = await controller.Logout();

            Assert.IsType<OkObjectResult>(result);

            // socobois session MUST still be active (not revoked)
            var socoboisRow = await masterDb.TenantActiveSessions.SingleAsync(s => s.SessionId == socoboisSession.SessionId);
            Assert.False(socoboisRow.IsRevoked);
        }

        [Fact]
        public async Task Logout_WithDifferentTenantValidToken_MiddlewareBlocksWith403AndPreservesSession()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.AddRange(
                new TenantRegistry { Id = 1, Slug = "socofeb", Name = "SOCOFEB", SchemaName = "tenant_socofeb", IsActive = true, Status = "Active", MaxConnectedUsers = 5 },
                new TenantRegistry { Id = 2, Slug = "socobois", Name = "SOCOBOIS", SchemaName = "tenant_socobois", IsActive = true, Status = "Active", MaxConnectedUsers = 5 }
            );
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var socoboisSession = await sessionService.TryAcquireSessionAsync("socobois", 7, "user-b", TimeSpan.FromDays(5));

            bool nextCalled = false;
            var middleware = new TenantMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, Mock.Of<ILogger<TenantMiddleware>>());
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/Account/logout";
            httpContext.Request.Headers["X-Tenant-Slug"] = "socofeb";
            httpContext.User = CreateAuthenticatedPrincipal("socobois", socoboisSession.SessionId!);
            httpContext.Response.Body = new MemoryStream();

            await middleware.InvokeAsync(httpContext, new SubdomainTenantResolver(), new TenantContext(), masterDb);

            Assert.False(nextCalled);
            Assert.Equal(StatusCodes.Status403Forbidden, httpContext.Response.StatusCode);

            var socoboisRow = await masterDb.TenantActiveSessions.SingleAsync(s => s.SessionId == socoboisSession.SessionId);
            Assert.False(socoboisRow.IsRevoked);
        }

        [Fact]
        public async Task NormalAuthenticatedEndpoint_WithRevokedSession_StillReturns401Unauthorized()
        {
            var dbName = Guid.NewGuid().ToString();
            using var masterDb = CreateMasterDb(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socobois",
                Name = "SOCOBOIS",
                SchemaName = "tenant_socobois",
                IsActive = true,
                Status = "Active",
                MaxConnectedUsers = 5
            });
            await masterDb.SaveChangesAsync();

            var sessionService = new TenantSessionService(masterDb);
            var acquired = await sessionService.TryAcquireSessionAsync("socobois", 42, "amine", TimeSpan.FromDays(5));
            await sessionService.RevokeSessionAsync(acquired.SessionId!, "socobois");

            bool nextCalled = false;
            var middleware = new TenantMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, Mock.Of<ILogger<TenantMiddleware>>());
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Path = "/api/Account/profile/42";
            httpContext.Request.Headers["X-Tenant-Slug"] = "socobois";
            httpContext.User = CreateAuthenticatedPrincipal("socobois", acquired.SessionId!);
            httpContext.Response.Body = new MemoryStream();

            await middleware.InvokeAsync(httpContext, new SubdomainTenantResolver(), new TenantContext(), masterDb);

            Assert.False(nextCalled);
            Assert.Equal(StatusCodes.Status401Unauthorized, httpContext.Response.StatusCode);
        }

        [Fact]
        public void AccountController_LogoutIsAllowAnonymous_WhileProtectedEndpointsRetainAuthorize()
        {
            var controllerType = typeof(AccountController);

            var logoutMethod = controllerType.GetMethod(nameof(AccountController.Logout));
            Assert.NotNull(logoutMethod);
            Assert.NotNull(logoutMethod!.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.Null(logoutMethod.GetCustomAttribute<AuthorizeAttribute>());

            foreach (var protectedAction in new[]
            {
                nameof(AccountController.GetProfile),
                nameof(AccountController.UpdateProfile),
                nameof(AccountController.UpdatePassword)
            })
            {
                var method = controllerType.GetMethod(protectedAction);
                Assert.NotNull(method);
                Assert.NotNull(method!.GetCustomAttribute<AuthorizeAttribute>());
                Assert.Null(method.GetCustomAttribute<AllowAnonymousAttribute>());
            }
        }
    }
}
