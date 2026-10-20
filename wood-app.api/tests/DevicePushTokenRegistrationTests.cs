using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.api.Services.Notifications;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Notifications;
using ms.webapp.api.acya.core.Entities.Notifications;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class DevicePushTokenRegistrationTests
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

        private ClaimsPrincipal CreateUserPrincipal(int userId, string tenantSlug, string role = "Admin")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim("tenant_slug", tenantSlug)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }

        private NotificationsController CreateController(
            WoodAppContext context,
            ClaimsPrincipal? user = null,
            IFirebaseMessagingClient? firebaseClient = null,
            IDeviceTestPushRateLimiter? rateLimiter = null,
            Mock<IAppNotificationService>? mockAppNotifOut = null)
        {
            var mockAppNotif = mockAppNotifOut ?? new Mock<IAppNotificationService>();
            var mockStockNotif = new Mock<NotificationService>(null!, null!, null!);
            var mockLogger = new Mock<ILogger<NotificationsController>>();

            var controller = new NotificationsController(
                mockAppNotif.Object,
                mockStockNotif.Object,
                context,
                mockLogger.Object,
                firebaseClient,
                rateLimiter);

            var httpContext = new DefaultHttpContext();
            if (user != null)
            {
                httpContext.User = user;
            }
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        [Fact]
        public async Task RegisterDevice_ValidAuthenticatedUser_RegistersSuccessfully()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_test_token_valid_123",
                Platform = "android",
                AppVersion = "1.0.0+1"
            };

            var result = await controller.RegisterDevice(dto);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTokenResponseDto>(okResult.Value);
            Assert.True(response.Success);

            var stored = await context.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == "fcm_test_token_valid_123");
            Assert.NotNull(stored);
            Assert.Equal(101, stored.UserId);
            Assert.Equal("android", stored.Platform);
            Assert.Equal("1.0.0+1", stored.AppVersion);
            Assert.True(stored.IsActive);
        }

        [Fact]
        public async Task RegisterDevice_MissingAuthentication_ReturnsUnauthorized()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var controller = CreateController(context, user: null); // No authenticated principal

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_token_unauth",
                Platform = "android"
            };

            var result = await controller.RegisterDevice(dto);

            Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Empty(context.DevicePushTokens);
        }

        [Fact]
        public async Task RegisterDevice_InvalidUserId_ReturnsUnauthorized()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "invalid_nan")
            }, "TestAuth"));
            var controller = CreateController(context, principal);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_token_invalid_user",
                Platform = "android"
            };

            var result = await controller.RegisterDevice(dto);

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task RegisterDevice_EmptyToken_ReturnsBadRequest()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "   ",
                Platform = "android"
            };

            var result = await controller.RegisterDevice(dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task RegisterDevice_OversizedToken_ReturnsBadRequest()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user);

            var dto = new RegisterDeviceTokenDto
            {
                Token = new string('A', 513),
                Platform = "android"
            };

            var result = await controller.RegisterDevice(dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task RegisterDevice_UnsupportedPlatform_ReturnsBadRequest()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_test_token_valid",
                Platform = "symbian_os"
            };

            var result = await controller.RegisterDevice(dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task RegisterDevice_RepeatedRegistrationSameUser_IsIdempotentAndRefreshes()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user);

            var initialTime = DateTime.UtcNow.AddMinutes(-30);
            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_repeat_token",
                Platform = "android",
                AppVersion = "1.0.0+1",
                IsActive = false, // previously inactive
                CreatedAt = initialTime,
                LastActiveAt = initialTime
            });
            await context.SaveChangesAsync();

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_repeat_token",
                Platform = "android",
                AppVersion = "1.0.1+2"
            };

            var result = await controller.RegisterDevice(dto);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTokenResponseDto>(okResult.Value);
            Assert.True(response.Success);

            var tokens = await context.DevicePushTokens.Where(t => t.Token == "fcm_repeat_token").ToListAsync();
            Assert.Single(tokens); // Idempotent: exactly one row
            var stored = tokens.First();
            Assert.Equal(101, stored.UserId);
            Assert.True(stored.IsActive);
            Assert.Equal("1.0.1+2", stored.AppVersion);
            Assert.True(stored.LastActiveAt > initialTime);
        }

        [Fact]
        public async Task RegisterDevice_ConflictingActiveRegistrationDifferentUser_ReturnsConflict()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            // User 101 has an active registration
            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_conflict_token",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // User 202 tries to register the same active token
            var user202 = CreateUserPrincipal(202, "socofeb");
            var controller = CreateController(context, user202);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_conflict_token",
                Platform = "android"
            };

            var result = await controller.RegisterDevice(dto);

            var conflictResult = Assert.IsType<ConflictObjectResult>(result);
            // Verify original owner is preserved
            var stored = await context.DevicePushTokens.FirstAsync(t => t.Token == "fcm_conflict_token");
            Assert.Equal(101, stored.UserId);
            Assert.True(stored.IsActive);
        }

        [Fact]
        public async Task RegisterDevice_SafeReassignment_InactiveTokenReassignedToNewUser()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            // User 101 logged out: token is inactive
            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_reassign_token",
                Platform = "android",
                IsActive = false,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                LastActiveAt = DateTime.UtcNow.AddDays(-1)
            });
            await context.SaveChangesAsync();

            // User 202 signs into the physical device
            var user202 = CreateUserPrincipal(202, "socofeb");
            var controller = CreateController(context, user202);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_reassign_token",
                Platform = "android",
                AppVersion = "2.0.0+5"
            };

            var result = await controller.RegisterDevice(dto);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTokenResponseDto>(okResult.Value);
            Assert.True(response.Success);

            // Reassigned to User 202 and reactivated
            var tokens = await context.DevicePushTokens.Where(t => t.Token == "fcm_reassign_token").ToListAsync();
            Assert.Single(tokens);
            var stored = tokens.First();
            Assert.Equal(202, stored.UserId);
            Assert.True(stored.IsActive);
            Assert.Equal("2.0.0+5", stored.AppVersion);
        }

        [Fact]
        public async Task RegisterDevice_TenantSchemaIsolation_SameTokenRegisteredInBothTenants()
        {
            var db = Guid.NewGuid().ToString();
            var socofebContext = CreateContext(db, "socofeb");
            var mansourContext = CreateContext(db, "mansour");

            var socofebUser = CreateUserPrincipal(101, "socofeb");
            var mansourUser = CreateUserPrincipal(202, "mansour");

            var socofebController = CreateController(socofebContext, socofebUser);
            var mansourController = CreateController(mansourContext, mansourUser);

            var dto = new RegisterDeviceTokenDto
            {
                Token = "fcm_shared_physical_token",
                Platform = "android",
                AppVersion = "1.0.0"
            };

            var resultSocofeb = await socofebController.RegisterDevice(dto);
            var resultMansour = await mansourController.RegisterDevice(dto);

            Assert.IsType<OkObjectResult>(resultSocofeb);
            Assert.IsType<OkObjectResult>(resultMansour);

            var socofebRecord = await socofebContext.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == "fcm_shared_physical_token");
            var mansourRecord = await mansourContext.DevicePushTokens.FirstOrDefaultAsync(t => t.Token == "fcm_shared_physical_token");

            Assert.NotNull(socofebRecord);
            Assert.NotNull(mansourRecord);
            Assert.Equal(101, socofebRecord.UserId);
            Assert.Equal(202, mansourRecord.UserId);
        }

        [Fact]
        public async Task UnregisterDevice_Owner_DeactivatesRegistration()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_unreg_token",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101);

            var result = await controller.UnregisterDevice(new UnregisterDeviceTokenDto { Token = "fcm_unreg_token" });

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTokenResponseDto>(okResult.Value);
            Assert.True(response.Success);

            var stored = await context.DevicePushTokens.FirstAsync(t => t.Token == "fcm_unreg_token");
            Assert.False(stored.IsActive);
        }

        [Fact]
        public async Task UnregisterDevice_RepeatedCall_IsIdempotent()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_unreg_repeat",
                Platform = "android",
                IsActive = false, // already deactivated
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101);

            var result = await controller.UnregisterDevice(new UnregisterDeviceTokenDto { Token = "fcm_unreg_repeat" });

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTokenResponseDto>(okResult.Value);
            Assert.True(response.Success);

            var stored = await context.DevicePushTokens.FirstAsync(t => t.Token == "fcm_unreg_repeat");
            Assert.False(stored.IsActive);
        }

        [Fact]
        public async Task UnregisterDevice_DifferentUser_DoesNotDeactivateOtherUsersToken()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            // Token belongs to User 101 and is ACTIVE
            context.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = 101,
                Token = "fcm_target_token",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // Attacker / different User 202 attempts to unregister User 101's token
            var user202 = CreateUserPrincipal(202, "socofeb");
            var controller = CreateController(context, user202);

            var result = await controller.UnregisterDevice(new UnregisterDeviceTokenDto { Token = "fcm_target_token" });

            // Returns 200 OK (no info leak)
            Assert.IsType<OkObjectResult>(result);

            // User 101's token MUST REMAIN ACTIVE!
            var stored = await context.DevicePushTokens.FirstAsync(t => t.Token == "fcm_target_token");
            Assert.Equal(101, stored.UserId);
            Assert.True(stored.IsActive);
        }

        [Fact]
        public async Task UnregisterDevice_MissingAuthentication_ReturnsUnauthorized()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var controller = CreateController(context, user: null);

            var result = await controller.UnregisterDevice(new UnregisterDeviceTokenDto { Token = "fcm_token" });

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public void MigrationAndBaselineSql_StructureVerified()
        {
            // Verify migration file exists
            var migrationFile = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../src/ms.webapp.api.acya.infrastructure/Migrations/20261017170000_AddDevicePushTokens.cs"));
            if (!File.Exists(migrationFile))
            {
                var candidate = @"C:\Users\amine\source\repos\acya.app\acya-app\wood-app.api\src\ms.webapp.api.acya.infrastructure\Migrations\20261017170000_AddDevicePushTokens.cs";
                if (File.Exists(candidate)) migrationFile = candidate;
            }
            Assert.True(File.Exists(migrationFile), $"Migration file should exist at {migrationFile}");

            var migrationContent = File.ReadAllText(migrationFile);
            Assert.Contains("DevicePushTokens", migrationContent);
            Assert.Contains("IX_DevicePushTokens_Token", migrationContent);
            Assert.Contains("IX_DevicePushTokens_UserId_IsActive", migrationContent);
            Assert.Contains("FK_DevicePushTokens_tbl_app_user_UserId", migrationContent);

            // Verify baseline SQL exists and contains matching DDL
            var baselineSqlFile = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../db/FullDb_Migration/full_migration.sql"));
            if (!File.Exists(baselineSqlFile))
            {
                var candidate = @"C:\Users\amine\source\repos\acya.app\acya-app\wood-app.api\db\FullDb_Migration\full_migration.sql";
                if (File.Exists(candidate)) baselineSqlFile = candidate;
            }
            Assert.True(File.Exists(baselineSqlFile), $"Baseline SQL should exist at {baselineSqlFile}");

            var baselineContent = File.ReadAllText(baselineSqlFile);
            Assert.Contains("CREATE TABLE IF NOT EXISTS \"DevicePushTokens\"", baselineContent);
            Assert.Contains("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_DevicePushTokens_Token\"", baselineContent);
            Assert.Contains("CREATE INDEX IF NOT EXISTS \"IX_DevicePushTokens_UserId_IsActive\"", baselineContent);
            Assert.Contains("20261017170000_AddDevicePushTokens", baselineContent);
        }

        [Fact]
        public void NotificationsController_MvcActivation_ResolvesSingleConstructorWithNonNullContext()
        {
            // Arrange: register all services as registered in production DI container
            var services = new ServiceCollection();
            var dbContext = CreateContext(Guid.NewGuid().ToString(), "socofeb");
            services.AddSingleton(dbContext);
            services.AddSingleton(new Mock<IAppNotificationService>().Object);
            services.AddSingleton(new Mock<NotificationService>(null!, null!, null!).Object);
            services.AddSingleton(new Mock<ILogger<NotificationsController>>().Object);
            services.AddControllers(); // Registers IControllerActivator and MVC controller infrastructure

            var serviceProvider = services.BuildServiceProvider();

            // Act: create controller via ASP.NET Core MVC IControllerActivator
            var activator = serviceProvider.GetRequiredService<IControllerActivator>();
            var actionDescriptor = new ControllerActionDescriptor
            {
                ControllerTypeInfo = typeof(NotificationsController).GetTypeInfo()
            };
            var httpContext = new DefaultHttpContext { RequestServices = serviceProvider };
            var controllerContext = new ControllerContext
            {
                HttpContext = httpContext,
                ActionDescriptor = actionDescriptor
            };

            var controller = activator.Create(controllerContext) as NotificationsController;

            // Assert: controller activated cleanly without ambiguous constructor exception
            Assert.NotNull(controller);

            // Assert: runtime controller activation injected the non-null WoodAppContext
            var contextField = typeof(NotificationsController).GetField("_context", BindingFlags.NonPublic | BindingFlags.Instance);
            var injectedContext = contextField?.GetValue(controller);
            Assert.NotNull(injectedContext);
            Assert.Same(dbContext, injectedContext);

            // Also assert ActivatorUtilities directly succeeds and injects WoodAppContext
            var directController = ActivatorUtilities.CreateInstance<NotificationsController>(serviceProvider);
            Assert.NotNull(directController);
            var directInjectedContext = contextField?.GetValue(directController);
            Assert.NotNull(directInjectedContext);
            Assert.Same(dbContext, directInjectedContext);

            // Assert: Exactly one public constructor exists, with ActivatorUtilitiesConstructor and optional parameters
            var ctors = typeof(NotificationsController).GetConstructors();
            Assert.Single(ctors);
            var ctor = ctors[0];
            Assert.NotNull(ctor.GetCustomAttribute<ActivatorUtilitiesConstructorAttribute>());
            var parameters = ctor.GetParameters();
            Assert.Equal(6, parameters.Length);
            Assert.Equal("context", parameters[2].Name);
            Assert.True(parameters[2].HasDefaultValue);
            Assert.Null(parameters[2].DefaultValue);
            Assert.Equal("logger", parameters[3].Name);
            Assert.True(parameters[3].HasDefaultValue);
            Assert.Null(parameters[3].DefaultValue);
            Assert.Equal("firebaseClient", parameters[4].Name);
            Assert.True(parameters[4].HasDefaultValue);
            Assert.Null(parameters[4].DefaultValue);
            Assert.Equal("rateLimiter", parameters[5].Name);
            Assert.True(parameters[5].HasDefaultValue);
            Assert.Null(parameters[5].DefaultValue);
        }

        #region TestPush Regression Tests

        private (NotificationsController Controller, Mock<IAppNotificationService> MockAppNotif) CreateControllerWithMockNotif(
            WoodAppContext context,
            ClaimsPrincipal? user = null)
        {
            var mockAppNotif = new Mock<IAppNotificationService>();
            var mockStockNotif = new Mock<NotificationService>(null!, null!, null!);
            var mockLogger = new Mock<ILogger<NotificationsController>>();

            var controller = new NotificationsController(
                mockAppNotif.Object,
                mockStockNotif.Object,
                context,
                mockLogger.Object);

            var httpContext = new DefaultHttpContext();
            if (user != null)
            {
                httpContext.User = user;
            }
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return (controller, mockAppNotif);
        }

        private Mock<IWebHostEnvironment> CreateMockEnv(string envName = "Development")
        {
            var mock = new Mock<IWebHostEnvironment>();
            mock.Setup(e => e.EnvironmentName).Returns(envName);
            return mock;
        }

        private TenantContext CreateTenantContext(string slug = "development")
        {
            return new TenantContext
            {
                IsEnabled = true,
                Slug = slug,
                SchemaName = $"tenant_{slug.Replace("-", "_")}"
            };
        }

        [Fact]
        public async Task TestPush_NonDevelopmentEnvironment_ReturnsNotFound_AndDoesNotNotify()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = CreateUserPrincipal(1, "development");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            var prodEnv = CreateMockEnv("Production");
            var tenantContext = CreateTenantContext("development");

            var result = await controller.TestPush(prodEnv.Object, tenantContext);

            Assert.IsType<NotFoundResult>(result);
            mockAppNotif.Verify(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task TestPush_NonDevelopmentTenant_ReturnsForbidden_AndDoesNotNotify()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "socofeb");
            var user = CreateUserPrincipal(1, "socofeb");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            var devEnv = CreateMockEnv("Development");
            var tenantContext = CreateTenantContext("socofeb");

            var result = await controller.TestPush(devEnv.Object, tenantContext) as ObjectResult;

            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
            mockAppNotif.Verify(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task TestPush_MissingTenantContext_ReturnsForbidden_AndDoesNotNotify()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = CreateUserPrincipal(1, "development");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            var devEnv = CreateMockEnv("Development");

            var result = await controller.TestPush(devEnv.Object, null) as ObjectResult;

            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
            mockAppNotif.Verify(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task TestPush_MissingOrInvalidUserId_ReturnsUnauthorized_AndDoesNotNotify()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = new ClaimsPrincipal(new ClaimsIdentity());
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            var devEnv = CreateMockEnv("Development");
            var tenantContext = CreateTenantContext("development");

            var result = await controller.TestPush(devEnv.Object, tenantContext);

            Assert.IsType<UnauthorizedObjectResult>(result);
            mockAppNotif.Verify(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task TestPush_UserIdOtherThan1_ReturnsForbidden_AndDoesNotNotify()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = CreateUserPrincipal(2, "development");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            var devEnv = CreateMockEnv("Development");
            var tenantContext = CreateTenantContext("development");

            var result = await controller.TestPush(devEnv.Object, tenantContext) as ObjectResult;

            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
            mockAppNotif.Verify(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()),
                Times.Never);
        }

        [Fact]
        public async Task TestPush_ValidDevelopmentAndUser1_InvokesNotifyAsyncExactlyOnce_DirectlyTargetingUser1()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = CreateUserPrincipal(1, "development");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            mockAppNotif.Setup(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()))
                .ReturnsAsync(new AppNotification
                {
                    Id = 42,
                    Title = "ACYA Development FCM Test",
                    Message = "Controlled development push delivery test.",
                    Type = NotificationType.Info,
                    Priority = NotificationPriority.Normal,
                    TargetUserId = 1,
                    CreatedAt = DateTime.UtcNow
                });

            var devEnv = CreateMockEnv("Development");
            var tenantContext = CreateTenantContext("development");

            var result = await controller.TestPush(devEnv.Object, tenantContext) as OkObjectResult;

            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status200OK, result.StatusCode);

            mockAppNotif.Verify(n => n.NotifyAsync(
                "ACYA Development FCM Test",
                "Controlled development push delivery test.",
                NotificationType.Info,
                NotificationPriority.Normal,
                1,
                null,
                null,
                null,
                null),
                Times.Once);
        }

        [Fact]
        public async Task TestPush_ValidResponse_ContainsOnlyApprovedNonSensitiveMetadata()
        {
            var db = Guid.NewGuid().ToString();
            using var context = CreateContext(db, "development");
            var user = CreateUserPrincipal(1, "development");
            var (controller, mockAppNotif) = CreateControllerWithMockNotif(context, user);

            mockAppNotif.Setup(n => n.NotifyAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(), It.IsAny<int?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>()))
                .ReturnsAsync(new AppNotification
                {
                    Id = 99,
                    Title = "ACYA Development FCM Test",
                    Message = "Controlled development push delivery test.",
                    Type = NotificationType.Info,
                    Priority = NotificationPriority.Normal,
                    TargetUserId = 1,
                    CreatedAt = DateTime.UtcNow
                });

            var devEnv = CreateMockEnv("Development");
            var tenantContext = CreateTenantContext("development");

            var result = await controller.TestPush(devEnv.Object, tenantContext) as OkObjectResult;

            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status200OK, result.StatusCode);

            var value = result.Value;
            Assert.NotNull(value);
            var valueType = value.GetType();

            var successProp = valueType.GetProperty("success");
            Assert.NotNull(successProp);
            Assert.Equal(true, successProp.GetValue(value));

            var notifIdProp = valueType.GetProperty("notificationId");
            Assert.NotNull(notifIdProp);
            Assert.Equal(99, notifIdProp.GetValue(value));

            var targetUserIdProp = valueType.GetProperty("targetUserId");
            Assert.NotNull(targetUserIdProp);
            Assert.Equal(1, targetUserIdProp.GetValue(value));

            var tenantProp = valueType.GetProperty("tenant");
            Assert.NotNull(tenantProp);
            Assert.Equal("development", tenantProp.GetValue(value));

            var timestampProp = valueType.GetProperty("timestamp");
            Assert.NotNull(timestampProp);

            // Assert no sensitive properties exist in response
            Assert.Null(valueType.GetProperty("token"));
            Assert.Null(valueType.GetProperty("Token"));
            Assert.Null(valueType.GetProperty("jwt"));
            Assert.Null(valueType.GetProperty("password"));
        }

        [Fact]
        public void TestPush_ActionParameters_DoNotAcceptArbitraryTargetUserFromClient()
        {
            var method = typeof(NotificationsController).GetMethod("TestPush");
            Assert.NotNull(method);

            var parameters = method.GetParameters();
            Assert.DoesNotContain(parameters, p => p.Name!.Equals("targetUserId", StringComparison.OrdinalIgnoreCase));
            Assert.DoesNotContain(parameters, p => p.Name!.Equals("userId", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public void DevelopmentOnlyAttribute_NonDevelopmentEnvironment_ClearsRouteSelectorsAndHidesApi()
        {
            var convention = new DevelopmentOnlyAttribute();
            var actionModel = new ActionModel(
                typeof(NotificationsController).GetMethod("TestPush")!,
                Array.Empty<object>());
            actionModel.Selectors.Add(new SelectorModel());

            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production");
            try
            {
                convention.Apply(actionModel);
                Assert.Empty(actionModel.Selectors);
                Assert.False(actionModel.ApiExplorer.IsVisible);
            }
            finally
            {
                Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
            }
        }

        [Fact]
        public void DevelopmentOnlyAttribute_ActionConstraint_Accept_ChecksIWebHostEnvironment()
        {
            var constraint = new DevelopmentOnlyAttribute();

            // When IWebHostEnvironment is Development
            var devEnvMock = CreateMockEnv("Development");
            var devServices = new ServiceCollection();
            devServices.AddSingleton(devEnvMock.Object);
            var devSp = devServices.BuildServiceProvider();
            var devHttpContext = new DefaultHttpContext { RequestServices = devSp };
            var devRouteContext = new RouteContext(devHttpContext);
            var devConstraintContext = new ActionConstraintContext
            {
                RouteContext = devRouteContext,
                CurrentCandidate = new ActionSelectorCandidate(
                    new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor(),
                    Array.Empty<IActionConstraint>())
            };

            Assert.True(constraint.Accept(devConstraintContext));

            // When IWebHostEnvironment is Production
            var prodEnvMock = CreateMockEnv("Production");
            var prodServices = new ServiceCollection();
            prodServices.AddSingleton(prodEnvMock.Object);
            var prodSp = prodServices.BuildServiceProvider();
            var prodHttpContext = new DefaultHttpContext { RequestServices = prodSp };
            var prodRouteContext = new RouteContext(prodHttpContext);
            var prodConstraintContext = new ActionConstraintContext
            {
                RouteContext = prodRouteContext,
                CurrentCandidate = new ActionSelectorCandidate(
                    new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor(),
                    Array.Empty<IActionConstraint>())
            };

            Assert.False(constraint.Accept(prodConstraintContext));
        }

        #endregion

        #region Test Device Push Endpoint (E9.58.3)

        [Fact]
        public async Task TestDevicePush_AnonymousCaller_Returns401Unauthorized()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var controller = CreateController(context, user: null);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("not_an_int")]
        [InlineData("0")]
        [InlineData("-12")]
        public async Task TestDevicePush_MissingOrInvalidUserId_Returns401Unauthorized(string? rawUserId)
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            var claims = new List<Claim>();
            if (rawUserId != null)
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, rawUserId));
            }
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
            var controller = CreateController(context, principal);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task TestDevicePush_TenantMismatch_Returns401Unauthorized()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb"); // context schema: tenant_socofeb
            var userFromOtherTenant = CreateUserPrincipal(101, "malicious_other_tenant");
            var controller = CreateController(context, userFromOtherTenant);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            var unauthResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Contains("Incohérence de contexte tenant", unauthResult.Value?.ToString());
        }

        [Fact]
        public async Task TestDevicePush_TargetDeviceBelongsToAnotherUser_Returns404NotFound()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            // Device 50 belongs to user 999
            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 50,
                UserId = 999,
                Token = "fcm_token_other_user",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101);

            // Caller 101 attempts to target device 50
            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto { DeviceRegistrationId = 50 });

            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFoundResult.Value);
        }

        [Fact]
        public async Task TestDevicePush_TargetDeviceInactive_Returns404NotFound()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            // Device 60 belongs to user 101 but is inactive
            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 60,
                UserId = 101,
                Token = "fcm_token_inactive",
                Platform = "android",
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto { DeviceRegistrationId = 60 });

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task TestDevicePush_NoEligibleDevice_Returns404NotFound()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");
            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101);

            // No devices registered at all
            var result = await controller.TestDevicePush(null);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task TestDevicePush_NoDeviceIdSupplied_SelectsMostRecentlyActiveDevice()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            var olderTime = DateTime.UtcNow.AddHours(-2);
            var newerTime = DateTime.UtcNow.AddMinutes(-5);

            context.DevicePushTokens.AddRange(
                new DevicePushToken
                {
                    Id = 1,
                    UserId = 101,
                    Token = "fcm_older_token",
                    Platform = "android",
                    IsActive = true,
                    CreatedAt = olderTime,
                    LastActiveAt = olderTime
                },
                new DevicePushToken
                {
                    Id = 2,
                    UserId = 101,
                    Token = "fcm_newer_token",
                    Platform = "android",
                    IsActive = true,
                    CreatedAt = newerTime,
                    LastActiveAt = newerTime
                }
            );
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0, UnregisteredTokens = new List<string>() });

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            var result = await controller.TestDevicePush(null);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTestPushResponseDto>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("AcceptedByFCM", response.Status);
            Assert.Equal(2, response.DeviceRegistrationId); // Selected most recently active device (Id = 2)

            mockFirebase.Verify(m => m.SendMulticastAsync(
                It.Is<IReadOnlyList<string>>(tokens => tokens.Count == 1 && tokens[0] == "fcm_newer_token"),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<System.Threading.CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task TestDevicePush_FirebaseNotConfigured_Returns503ServiceUnavailable()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 1,
                UserId = 101,
                Token = "fcm_token_device",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(false); // NOT configured

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);

            // Verifies no dispatch was attempted
            mockFirebase.Verify(m => m.SendMulticastAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<System.Threading.CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task TestDevicePush_GoogleAccepts_Returns200WithAcceptedByFcmStatus()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 10,
                UserId = 101,
                Token = "fcm_token_redmi",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0, UnregisteredTokens = new List<string>() });

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto { DeviceRegistrationId = 10 });

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<DeviceTestPushResponseDto>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("AcceptedByFCM", response.Status);
            Assert.False(response.DeliveryConfirmed); // Transport acceptance only, never claimed handset delivery
            Assert.Equal(10, response.DeviceRegistrationId);
            Assert.Equal("android", response.Platform);
        }

        [Fact]
        public async Task TestDevicePush_Payload_ContainsOnlyGenericDiagnosticData()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 11,
                UserId = 101,
                Token = "fcm_token_payload_check",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            string? capturedTitle = null;
            string? capturedBody = null;
            IReadOnlyDictionary<string, string>? capturedData = null;

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .Callback<IReadOnlyList<string>, string, string, IReadOnlyDictionary<string, string>, System.Threading.CancellationToken>(
                    (tokens, title, body, data, ct) =>
                    {
                        capturedTitle = title;
                        capturedBody = body;
                        capturedData = data;
                    })
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0, UnregisteredTokens = new List<string>() });

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            await controller.TestDevicePush(new DeviceTestPushRequestDto());

            Assert.Equal("ACYA — Diagnostic Mobile", capturedTitle);
            Assert.Equal("Test de notification en direct. Aucune action requise.", capturedBody);
            Assert.NotNull(capturedData);
            Assert.Equal("diagnostic", capturedData["type"]);
            Assert.Equal("socofeb", capturedData["tenantSlug"]);
            Assert.True(capturedData.ContainsKey("timestamp"));

            // Payload sanity: Must not contain raw token, customer data, passwords, or financial terms
            Assert.DoesNotContain("fcm_token_payload_check", capturedTitle);
            Assert.DoesNotContain("fcm_token_payload_check", capturedBody);
            Assert.DoesNotContain("password", capturedBody, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("price", capturedBody, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task TestDevicePush_GoogleReturnsUnregistered_DeactivatesDeviceRegistration()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            var token = "fcm_token_stale_to_deactivate";
            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 12,
                UserId = 101,
                Token = token,
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            // Firebase returns Unregistered token
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 0, FailureCount = 1, UnregisteredTokens = new List<string> { token } });

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status502BadGateway, objResult.StatusCode);

            // Confirm database entity was deactivated!
            var stored = await context.DevicePushTokens.FirstAsync(d => d.Id == 12);
            Assert.False(stored.IsActive);
        }

        [Fact]
        public async Task TestDevicePush_GoogleReturnsFailureWithoutUnregistered_DoesNotDeactivateDevice()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            var token = "fcm_token_transient_failure";
            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 13,
                UserId = 101,
                Token = token,
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            // Failure without UnregisteredTokens (e.g. transient network outage, server error, or InvalidArgument)
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 0, FailureCount = 1, UnregisteredTokens = new List<string>() });

            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());

            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status502BadGateway, objResult.StatusCode);

            // Confirm database entity remains ACTIVE (do not deactivate on non-unregistered failure)
            var stored = await context.DevicePushTokens.FirstAsync(d => d.Id == 13);
            Assert.True(stored.IsActive);
        }

        [Fact]
        public async Task TestDevicePush_RateLimiter_SecondRequestWithinWindow_Returns429WithRetryAfter()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 14,
                UserId = 101,
                Token = "fcm_token_rate_limit",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0, UnregisteredTokens = new List<string>() });

            var rateLimiter = new InMemoryDeviceTestPushRateLimiter(window: TimeSpan.FromMinutes(5));
            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(context, user101, firebaseClient: mockFirebase.Object, rateLimiter: rateLimiter);

            // First call: Should succeed
            var firstResult = await controller.TestDevicePush(new DeviceTestPushRequestDto());
            Assert.IsType<OkObjectResult>(firstResult);

            // Second call immediately within window: Should be rate limited (429)
            var secondResult = await controller.TestDevicePush(new DeviceTestPushRequestDto());
            var statusResult = Assert.IsType<ObjectResult>(secondResult);
            Assert.Equal(StatusCodes.Status429TooManyRequests, statusResult.StatusCode);

            Assert.True(controller.Response.Headers.ContainsKey("Retry-After"));
            var retryAfter = int.Parse(controller.Response.Headers["Retry-After"]!);
            Assert.True(retryAfter > 0 && retryAfter <= 300);
        }

        [Fact]
        public void TestDevicePush_RateLimiter_DifferentUsersOrTenants_AreIsolated()
        {
            var rateLimiter = new InMemoryDeviceTestPushRateLimiter(window: TimeSpan.FromMinutes(5));

            // User 1 on socofeb records a request
            Assert.True(rateLimiter.IsAllowed("socofeb", 1, out _));
            // Immediate second request for User 1 on socofeb rejected
            Assert.False(rateLimiter.IsAllowed("socofeb", 1, out _));

            // User 2 on same tenant is allowed (isolated by user)
            Assert.True(rateLimiter.IsAllowed("socofeb", 2, out _));

            // User 1 on different tenant is allowed (isolated by tenant)
            Assert.True(rateLimiter.IsAllowed("other_tenant", 1, out _));
        }

        [Fact]
        public async Task TestDevicePush_DoesNotCallAppNotificationServiceOrModifyBusinessNotifications()
        {
            var db = Guid.NewGuid().ToString();
            var context = CreateContext(db, "socofeb");

            context.DevicePushTokens.Add(new DevicePushToken
            {
                Id = 15,
                UserId = 101,
                Token = "fcm_token_no_business_side_effect",
                Platform = "android",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockFirebase = new Mock<IFirebaseMessagingClient>();
            mockFirebase.Setup(m => m.IsConfigured).Returns(true);
            mockFirebase
                .Setup(m => m.SendMulticastAsync(
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyDictionary<string, string>>(),
                    It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new FcmBatchSendResult { SuccessCount = 1, FailureCount = 0, UnregisteredTokens = new List<string>() });

            var mockAppNotif = new Mock<IAppNotificationService>();
            var user101 = CreateUserPrincipal(101, "socofeb");
            var controller = CreateController(
                context,
                user101,
                firebaseClient: mockFirebase.Object,
                mockAppNotifOut: mockAppNotif);

            var result = await controller.TestDevicePush(new DeviceTestPushRequestDto());
            Assert.IsType<OkObjectResult>(result);

            // Assert that AppNotificationService.NotifyAsync was NEVER invoked for diagnostic push
            mockAppNotif.Verify(a => a.NotifyAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificationType>(),
                It.IsAny<NotificationPriority>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()), Times.Never);
        }

        #endregion
    }
}

