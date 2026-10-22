using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ms.webapp.api.acya.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Services.Mobile;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class FirebaseAppManagementServiceTests
    {
        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            return new MasterDbContext(options);
        }

        private IConfiguration CreateConfig(Dictionary<string, string?>? settings = null)
        {
            var defaults = new Dictionary<string, string?>
            {
                { "FIREBASE_MANAGEMENT_PROJECT_ID", "acya-fcm-prod-dispatcher" },
                { "FIREBASE_MANAGEMENT_CREDENTIALS_PATH", "/app/secrets/firebase-mgmt.json" },
                { "MobileApp:BaseUrlTemplate", "https://{slug}.acya.site/api/" }
            };

            if (settings != null)
            {
                foreach (var kvp in settings)
                {
                    defaults[kvp.Key] = kvp.Value;
                }
            }

            return new ConfigurationBuilder().AddInMemoryCollection(defaults).Build();
        }

        private static int _tenantIdSequence = 0;

        private static string CreateMockValidGoogleServicesJson(string packageName = "com.socofeb.woodapp")
        {
            return $"{{\"project_info\":{{\"project_id\":\"acya-fcm-prod-dispatcher\"}},\"client\":[{{\"client_info\":{{\"mobilesdk_app_id\":\"1:123:android:test\",\"android_client_info\":{{\"package_name\":\"{packageName}\"}}}}}}]}}";
        }

        private async Task SeedTenantAsync(MasterDbContext db, string slug = "socofeb", string name = "SOCOFEB Bois")
        {
            db.TenantRegistries.Add(new TenantRegistry
            {
                Id = Interlocked.Increment(ref _tenantIdSequence),
                Slug = slug,
                Name = name,
                SchemaName = $"tenant_{slug.Replace("-", "_")}",
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        private WoodAppContext CreateInMemoryWoodAppDb(string dbName, string tenantSlug = "socofeb")
        {
            var tenantContext = new TenantContext
            {
                IsEnabled = true,
                Slug = tenantSlug,
                SchemaName = $"tenant_{tenantSlug.Replace("-", "_")}"
            };

            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            return new WoodAppContext(options, tenantContext);
        }

        // Test 1: Existing Firebase app is reused
        [Fact]
        public async Task Test01_ExistingFirebaseApp_IsReused()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync("acya-fcm-prod-dispatcher", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>
                {
                    new FirebaseAndroidAppSummary
                    {
                        AppId = "1:12345:android:existing-app",
                        PackageName = "com.socofeb.woodapp",
                        DisplayName = "SOCOFEB Bois"
                    }
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync("acya-fcm-prod-dispatcher", "1:12345:android:existing-app", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult
                {
                    ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson()))
                });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var result = await service.EnsureTenantAppRegisteredAsync("socofeb");

            Assert.NotNull(result);
            Assert.Equal("Active", result.Status);
            Assert.Equal("1:12345:android:existing-app", result.FirebaseAppId);
            Assert.Equal("com.socofeb.woodapp", result.PackageName);
            mockApi.Verify(a => a.CreateAndroidAppAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        // Test 2: Missing app is registered
        [Fact]
        public async Task Test02_MissingFirebaseApp_IsRegistered()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync("acya-fcm-prod-dispatcher", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>());

            mockApi.Setup(a => a.CreateAndroidAppAsync("acya-fcm-prod-dispatcher", "com.socofeb.woodapp", "SOCOFEB Bois", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseOperationResult
                {
                    Done = true,
                    AppId = "1:999:android:new-app"
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync("acya-fcm-prod-dispatcher", "1:999:android:new-app", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult
                {
                    ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson()))
                });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var result = await service.EnsureTenantAppRegisteredAsync("socofeb");

            Assert.Equal("Active", result.Status);
            Assert.Equal("1:999:android:new-app", result.FirebaseAppId);
            mockApi.Verify(a => a.CreateAndroidAppAsync("acya-fcm-prod-dispatcher", "com.socofeb.woodapp", "SOCOFEB Bois", It.IsAny<CancellationToken>()), Times.Once);
        }

        // Test 3: Long-running operations are polled correctly
        [Fact]
        public async Task Test03_LongRunningOperations_PolledCorrectly()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>());

            mockApi.Setup(a => a.CreateAndroidAppAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseOperationResult
                {
                    Done = false,
                    Name = "operations/op-456"
                });

            var pollCount = 0;
            mockApi.Setup(a => a.GetOperationAsync("operations/op-456", It.IsAny<CancellationToken>()))
                .ReturnsAsync(() =>
                {
                    pollCount++;
                    if (pollCount == 1)
                    {
                        return new FirebaseOperationResult { Done = false, Name = "operations/op-456" };
                    }
                    return new FirebaseOperationResult { Done = true, AppId = "1:777:android:polled" };
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), "1:777:android:polled", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult
                {
                    ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson()))
                });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var result = await service.EnsureTenantAppRegisteredAsync("socofeb");

            Assert.Equal("Active", result.Status);
            Assert.Equal("1:777:android:polled", result.FirebaseAppId);
            Assert.True(pollCount >= 2, "Operation should be polled at least twice before completion.");
        }

        // Test 4: Resulting configuration is stored and returned correctly
        [Fact]
        public async Task Test04_ResultingConfiguration_StoredAndReturnedCorrectly()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockConfigJson = "{\"project_info\":{\"project_id\":\"acya-fcm-prod-dispatcher\"},\"client\":[{\"client_info\":{\"mobilesdk_app_id\":\"1:111:android:test\",\"android_client_info\":{\"package_name\":\"com.socofeb.woodapp\"}}}]}";
            var base64Input = Convert.ToBase64String(Encoding.UTF8.GetBytes(mockConfigJson));

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>
                {
                    new FirebaseAndroidAppSummary { AppId = "1:111:android:test", PackageName = "com.socofeb.woodapp" }
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), "1:111:android:test", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult { ConfigFileContents = base64Input });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            await service.EnsureTenantAppRegisteredAsync("socofeb");

            // Verify stored in DB
            var dbRecord = await db.TenantFirebaseApps.FirstOrDefaultAsync(a => a.TenantId == "socofeb");
            Assert.NotNull(dbRecord);
            Assert.Equal(mockConfigJson, dbRecord!.GoogleServicesJson);

            // Verify retrieved as base64 for mobile build pipeline
            var retrievedBase64 = await service.GetTenantFirebaseConfigBase64Async("socofeb");
            Assert.NotNull(retrievedBase64);
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(retrievedBase64!));
            Assert.Equal(mockConfigJson, decoded);
        }

        // Test 5: Repeated requests are idempotent
        [Fact]
        public async Task Test05_RepeatedRequests_AreIdempotent()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>
                {
                    new FirebaseAndroidAppSummary { AppId = "1:111:android:test", PackageName = "com.socofeb.woodapp" }
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), "1:111:android:test", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult { ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson())) });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            // First call
            var res1 = await service.EnsureTenantAppRegisteredAsync("socofeb");
            // Second call (idempotent fast path)
            var res2 = await service.EnsureTenantAppRegisteredAsync("socofeb");

            Assert.Equal(res1.FirebaseAppId, res2.FirebaseAppId);
            Assert.Equal(res1.Status, res2.Status);
            mockApi.Verify(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
            mockApi.Verify(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        // Test 6: Concurrent provisioning requests do not create duplicate applications
        [Fact]
        public async Task Test06_ConcurrentProvisioningRequests_DoNotCreateDuplicates()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>());

            mockApi.Setup(a => a.CreateAndroidAppAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseOperationResult { Done = true, AppId = "1:999:android:concurrent" });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult { ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson())) });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            // Execute two provisioning calls concurrently
            var task1 = service.EnsureTenantAppRegisteredAsync("socofeb");
            var task2 = service.EnsureTenantAppRegisteredAsync("socofeb");

            var results = await Task.WhenAll(task1, task2);

            Assert.Equal(results[0].FirebaseAppId, results[1].FirebaseAppId);

            var count = await db.TenantFirebaseApps.CountAsync(a => a.TenantId == "socofeb");
            Assert.Equal(1, count);
        }

        // Test 7: Failed database update after remote registration recovers on retry
        [Fact]
        public async Task Test07_FailedDatabaseUpdate_RecoversOnRetry()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            // Database is initially empty (simulating previous DB failure or crash),
            // but remote Firebase already has the app registered
            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FirebaseAndroidAppSummary>
                {
                    new FirebaseAndroidAppSummary { AppId = "1:555:android:recovered", PackageName = "com.socofeb.woodapp" }
                });

            mockApi.Setup(a => a.GetAndroidAppConfigAsync(It.IsAny<string>(), "1:555:android:recovered", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FirebaseAppConfigResult { ConfigFileContents = Convert.ToBase64String(Encoding.UTF8.GetBytes(CreateMockValidGoogleServicesJson())) });

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var result = await service.EnsureTenantAppRegisteredAsync("socofeb");

            Assert.Equal("Active", result.Status);
            Assert.Equal("1:555:android:recovered", result.FirebaseAppId);
            mockApi.Verify(a => a.CreateAndroidAppAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        // Test 8: Missing provisioning credentials produce a safe explicit error
        [Fact]
        public async Task Test08_MissingProvisioningCredentials_ProducesSafeExplicitError()
        {
            // Empty/missing management credentials setting
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build();
            var mockToken = new Mock<IGoogleTokenProvider>();
            var client = new FirebaseManagementApiClient(new HttpClient(), mockToken.Object, config, NullLogger<FirebaseManagementApiClient>.Instance);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => client.ListAndroidAppsAsync("any-project"));

            Assert.Contains("Firebase management credentials path is not configured", ex.Message);
            Assert.Contains("FIREBASE_MANAGEMENT_CREDENTIALS_PATH", ex.Message);
        }

        // Test 9: Dispatcher credentials are not silently reused for provisioning
        [Fact]
        public async Task Test09_DispatcherCredentials_NotSilentlyReusedForProvisioning()
        {
            // Only runtime dispatcher path is configured
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "FIREBASE_CREDENTIALS_PATH", "/secrets/dispatcher-account.json" },
                { "Firebase:CredentialsPath", "/secrets/dispatcher-account.json" }
            }).Build();

            var mockToken = new Mock<IGoogleTokenProvider>();
            var client = new FirebaseManagementApiClient(new HttpClient(), mockToken.Object, config, NullLogger<FirebaseManagementApiClient>.Instance);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => client.ListAndroidAppsAsync("any-project"));

            // Must reject and not reuse dispatcher credentials
            Assert.Contains("Dispatcher credentials cannot be reused", ex.Message);
            mockToken.Verify(t => t.GetAccessTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        // Test 10: Invalid or unauthorized tenant requests are rejected
        [Fact]
        public async Task Test10_InvalidOrUnauthorizedTenantRequests_AreRejected()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            var mockApi = new Mock<IFirebaseManagementApiClient>();
            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            // Empty slug
            await Assert.ThrowsAsync<ArgumentException>(() => service.EnsureTenantAppRegisteredAsync(""));

            // Non-existent tenant in master registry
            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.EnsureTenantAppRegisteredAsync("unknown-tenant"));

            // Controller level validation for invalid regex
            var controller = new AdminMobileFirebaseController(service, NullLogger<AdminMobileFirebaseController>.Instance);
            var badResult = await controller.GetStatus("bad/slug!@#");
            Assert.IsType<BadRequestObjectResult>(badResult.Result);
        }

        // Test 11: CI token cannot select another tenant or arbitrary package
        [Fact]
        public async Task Test11_CiToken_CannotSelectAnotherTenantOrArbitraryPackage()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockBuildService = new Mock<IMobileBuildService>();
            mockBuildService.Setup(b => b.GetBuildByIdAsync(42, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MobileBuildDto
                {
                    Id = 42,
                    TenantId = "socofeb",
                    Version = "1.0.0",
                    BuildNumber = 1,
                    Status = "Building"
                });

            var mockConfigService = new Mock<IMobileTenantConfigService>();
            mockConfigService.Setup(c => c.GenerateConfigForTenantAsync("socofeb", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MobileTenantConfigDto
                {
                    TenantId = "socofeb",
                    PackageName = "com.socofeb.woodapp"
                });

            var controller = new AdminMobileBuildsController(
                mockBuildService.Object,
                mockConfigService.Object,
                new Mock<IGitHubBuildDispatcher>().Object,
                NullLogger<AdminMobileBuildsController>.Instance);

            var actionResult = await controller.GetBuildConfig(42);
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var config = Assert.IsType<MobileTenantConfigDto>(okResult.Value);

            Assert.Equal("socofeb", config.TenantId);
            Assert.Equal("com.socofeb.woodapp", config.PackageName);

            // Verify config service was strictly called with build's persisted TenantId ("socofeb")
            mockConfigService.Verify(c => c.GenerateConfigForTenantAsync("socofeb", It.IsAny<CancellationToken>()), Times.Once);
        }

        // Test 12: Existing mobile build configuration remains compatible
        [Fact]
        public async Task Test12_ExistingMobileBuildConfig_RemainsCompatible()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            // Seed active Firebase app
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = "{\"project_info\":{},\"client\":[{\"client_info\":{\"android_client_info\":{\"package_name\":\"com.socofeb.woodapp\"}}}]}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var woodDb = CreateInMemoryWoodAppDb(Guid.NewGuid().ToString(), "socofeb");
            var configService = new MobileTenantConfigService(db, woodDb, CreateConfig(), null, null);

            var config = await configService.GenerateConfigForTenantAsync("socofeb");

            Assert.NotNull(config);
            Assert.Equal("socofeb", config!.TenantId);
            Assert.Equal("com.socofeb.woodapp", config.PackageName);
            Assert.NotNull(config.GoogleServicesJsonBase64);
            Assert.Equal(Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"project_info\":{},\"client\":[{\"client_info\":{\"android_client_info\":{\"package_name\":\"com.socofeb.woodapp\"}}}]}")), config.GoogleServicesJsonBase64);
        }

        // Test 13: GoogleServicesJson is never exposed by general status endpoints
        [Fact]
        public async Task Test13_GoogleServicesJson_NeverExposedByGeneralStatusEndpoints()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = "{\"secret_client_info\":\"SHOULD_NEVER_BE_IN_STATUS_DTO\"}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var controller = new AdminMobileFirebaseController(service, NullLogger<AdminMobileFirebaseController>.Instance);

            var actionResult = await controller.GetStatus("socofeb");
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var statusDto = Assert.IsType<TenantFirebaseAppStatusDto>(okResult.Value);

            Assert.True(statusDto.HasConfiguration);
            Assert.Equal("Active", statusDto.Status);
            // DTO type does not have a GoogleServicesJson property
            var prop = typeof(TenantFirebaseAppStatusDto).GetProperty("GoogleServicesJson");
            Assert.Null(prop);
        }

        // Test 14: Sensitive values never appear in logs or error responses
        [Fact]
        public async Task Test14_SensitiveValues_NeverAppearInLogsOrErrorResponses()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            var mockApi = new Mock<IFirebaseManagementApiClient>();
            mockApi.Setup(a => a.ListAndroidAppsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new UnauthorizedAccessException("Google OAuth2 bearer token was rejected."));

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var controller = new AdminMobileFirebaseController(service, NullLogger<AdminMobileFirebaseController>.Instance);

            var result = await controller.ProvisionOrEnsureRegistered("socofeb");
            var statusResult = Assert.IsType<ObjectResult>(result.Result);

            Assert.Equal(503, statusResult.StatusCode);
            var json = System.Text.Json.JsonSerializer.Serialize(statusResult.Value);

            // Ensure no bearer tokens, private keys, or credentials paths are leaked in response
            Assert.DoesNotContain("bearer", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("private_key", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(".json", json, StringComparison.OrdinalIgnoreCase);
        }

        // Test 15: Package mismatch is rejected
        [Fact]
        public async Task Test15_PackageMismatch_IsRejected()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:wrong",
                PackageName = "com.wrongpackage.app",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = "{\"project_info\":{},\"client\":[{\"client_info\":{\"android_client_info\":{\"package_name\":\"com.wrongpackage.app\"}}}]}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            // Expecting canonical package "com.socofeb.woodapp"
            var config = await service.GetTenantFirebaseConfigBase64Async("socofeb", "com.socofeb.woodapp");

            // Mismatched package must be rejected (returns null)
            Assert.Null(config);
        }

        // Test 16: GoogleServicesJson client package mismatch is rejected
        [Fact]
        public async Task Test16_GoogleServicesJson_ClientPackageMismatch_IsRejected()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            // Stored package says "com.socofeb.woodapp", but embedded JSON client says "com.other.app"
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = "{\"project_info\":{},\"client\":[{\"client_info\":{\"android_client_info\":{\"package_name\":\"com.other.app\"}}}]}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var config = await service.GetTenantFirebaseConfigBase64Async("socofeb", "com.socofeb.woodapp");

            // Inconsistent JSON client must be rejected
            Assert.Null(config);
        }

        // Test 17: Unprovisioned tenant does not trigger auto-provisioning
        [Fact]
        public async Task Test17_UnprovisionedTenant_DoesNotTriggerAutoProvisioning()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "unprovisioned");

            var mockApi = new Mock<IFirebaseManagementApiClient>(MockBehavior.Strict);
            // Strict mock will throw if any method is invoked on mockApi

            var service = new FirebaseAppManagementService(db, mockApi.Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var woodDb = CreateInMemoryWoodAppDb(Guid.NewGuid().ToString(), "unprovisioned");
            var configService = new MobileTenantConfigService(db, woodDb, CreateConfig(), null, null, service);

            var config = await configService.GenerateConfigForTenantAsync("unprovisioned");

            Assert.NotNull(config);
            Assert.Equal("unprovisioned", config!.TenantId);
            Assert.Equal("com.unprovisioned.woodapp", config.PackageName);
            // Must be null, and NO API calls to mockApi must have been triggered
            Assert.Null(config.GoogleServicesJsonBase64);
            mockApi.VerifyNoOtherCalls();
        }

        // Test 18: Missing configuration does not expose another tenant's configuration
        [Fact]
        public async Task Test18_MissingConfig_DoesNotExposeAnotherTenantConfig()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "tenant_a", "Tenant A");
            await SeedTenantAsync(db, "tenant_b", "Tenant B");

            // Tenant A has active Firebase configuration
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "tenant_a",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:111:android:a",
                PackageName = "com.tenanta.woodapp",
                DisplayName = "Tenant A",
                GoogleServicesJson = "{\"project_info\":{},\"client\":[{\"client_info\":{\"android_client_info\":{\"package_name\":\"com.tenanta.woodapp\"}}}]}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var woodDb = CreateInMemoryWoodAppDb(Guid.NewGuid().ToString(), "tenant_b");
            var configService = new MobileTenantConfigService(db, woodDb, CreateConfig(), null, null, service);

            // Query Tenant B which has no Firebase configuration
            var configB = await configService.GenerateConfigForTenantAsync("tenant_b");

            Assert.NotNull(configB);
            Assert.Equal("tenant_b", configB!.TenantId);
            Assert.Null(configB.GoogleServicesJsonBase64);

            // Direct check on FirebaseAppManagementService for Tenant B
            var resultB = await service.GetTenantFirebaseConfigBase64Async("tenant_b", "com.tenantb.woodapp");
            Assert.Null(resultB);
        }

        // Test 19: MobileTenantConfigDto serializes property as googleServicesJsonBase64
        [Fact]
        public void Test19_MobileTenantConfigDto_SerializesAs_GoogleServicesJsonBase64()
        {
            var dto = new MobileTenantConfigDto
            {
                TenantId = "socofeb",
                PackageName = "com.socofeb.woodapp",
                GoogleServicesJsonBase64 = "ZXhhbXBsZQ=="
            };

            var json = System.Text.Json.JsonSerializer.Serialize(dto);

            Assert.Contains("\"googleServicesJsonBase64\":\"ZXhhbXBsZQ==\"", json);
            Assert.DoesNotContain("\"GoogleServicesJsonBase64\"", json);
        }

        // Test 20: Invalid or corrupt JSON is handled safely
        [Fact]
        public async Task Test20_InvalidOrCorruptJson_HandledSafely_ReturnsNull()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = "NOT_A_VALID_JSON{{{broken",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            var config = await service.GetTenantFirebaseConfigBase64Async("socofeb", "com.socofeb.woodapp");

            Assert.Null(config);
        }

        // Test 21: GetAllTenantFirebaseApps returns registered and unregistered active tenants
        [Fact]
        public async Task Test21_GetAllTenantFirebaseApps_RegisteredAndUnregisteredTenants_ReturnsBoth()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb", "SOCOFEB Bois");
            await SeedTenantAsync(db, "unreg", "Unregistered Enterprise");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = CreateMockValidGoogleServicesJson("com.socofeb.woodapp"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var results = await service.GetAllTenantFirebaseAppsAsync();

            Assert.Equal(2, results.Count);

            var socofeb = results.FirstOrDefault(r => r.TenantId == "socofeb");
            Assert.NotNull(socofeb);
            Assert.Equal("SOCOFEB Bois", socofeb!.TenantName);
            Assert.Equal("com.socofeb.woodapp", socofeb.PackageName);
            Assert.Equal("acya-fcm-prod-dispatcher", socofeb.FirebaseProjectId);
            Assert.Equal("1:123:android:socofeb", socofeb.FirebaseAppId);
            Assert.Equal("Active", socofeb.Status);
            Assert.True(socofeb.HasConfiguration);

            var unreg = results.FirstOrDefault(r => r.TenantId == "unreg");
            Assert.NotNull(unreg);
            Assert.Equal("Unregistered Enterprise", unreg!.TenantName);
            Assert.Equal("com.unreg.woodapp", unreg.PackageName);
            Assert.Equal("acya-fcm-prod-dispatcher", unreg.FirebaseProjectId);
            Assert.Null(unreg.FirebaseAppId);
            Assert.Equal("NotRegistered", unreg.Status);
            Assert.False(unreg.HasConfiguration);
        }

        // Test 22: Correct tenant-to-registry matching without cross-contamination
        [Fact]
        public async Task Test22_GetAllTenantFirebaseApps_CorrectTenantToRegistryMatching()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "tenant-a", "Tenant A Corp");
            await SeedTenantAsync(db, "tenant-b", "Tenant B SARL");
            await SeedTenantAsync(db, "tenant-c", "Tenant C Group");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "tenant-b",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:456:android:tenantb",
                PackageName = "com.tenantb.woodapp",
                DisplayName = "Tenant B SARL",
                GoogleServicesJson = CreateMockValidGoogleServicesJson("com.tenantb.woodapp"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var results = await service.GetAllTenantFirebaseAppsAsync();

            Assert.Equal(3, results.Count);

            var b = results.First(r => r.TenantId == "tenant-b");
            Assert.Equal("Active", b.Status);
            Assert.Equal("1:456:android:tenantb", b.FirebaseAppId);
            Assert.True(b.HasConfiguration);

            var a = results.First(r => r.TenantId == "tenant-a");
            Assert.Equal("NotRegistered", a.Status);
            Assert.Null(a.FirebaseAppId);
            Assert.False(a.HasConfiguration);

            var c = results.First(r => r.TenantId == "tenant-c");
            Assert.Equal("NotRegistered", c.Status);
            Assert.Null(c.FirebaseAppId);
            Assert.False(c.HasConfiguration);
        }

        // Test 23: Inactive tenants are excluded from listing
        [Fact]
        public async Task Test23_GetAllTenantFirebaseApps_InactiveTenants_AreExcluded()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            db.TenantRegistries.Add(new TenantRegistry
            {
                Id = Interlocked.Increment(ref _tenantIdSequence),
                Slug = "active-tenant",
                Name = "Active Enterprise",
                IsActive = true
            });
            db.TenantRegistries.Add(new TenantRegistry
            {
                Id = Interlocked.Increment(ref _tenantIdSequence),
                Slug = "inactive-tenant",
                Name = "Inactive Enterprise",
                IsActive = false
            });
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "inactive-tenant",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:999:android:inactive",
                PackageName = "com.inactivetenant.woodapp",
                DisplayName = "Inactive Enterprise",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var results = await service.GetAllTenantFirebaseAppsAsync();

            Assert.Single(results);
            Assert.Equal("active-tenant", results[0].TenantId);
            Assert.DoesNotContain(results, r => r.TenantId == "inactive-tenant");
        }

        // Test 24: HasConfiguration calculation accurately distinguishes present vs missing JSON
        [Fact]
        public async Task Test24_GetAllTenantFirebaseApps_HasConfiguration_CalculatesCorrectly()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "with-config", "With Config SARL");
            await SeedTenantAsync(db, "without-config", "Without Config SARL");

            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "with-config",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:111:android:with",
                PackageName = "com.withconfig.woodapp",
                DisplayName = "With Config SARL",
                GoogleServicesJson = "{\"project_info\":{}}",
                Status = "Active"
            });
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "without-config",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:222:android:without",
                PackageName = "com.withoutconfig.woodapp",
                DisplayName = "Without Config SARL",
                GoogleServicesJson = null,
                Status = "Pending"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var results = await service.GetAllTenantFirebaseAppsAsync();

            var itemWith = results.First(r => r.TenantId == "with-config");
            var itemWithout = results.First(r => r.TenantId == "without-config");

            Assert.True(itemWith.HasConfiguration);
            Assert.False(itemWithout.HasConfiguration);
        }

        // Test 25: Raw GoogleServicesJson is strictly excluded from summary DTO and serialized output
        [Fact]
        public async Task Test25_GetAllTenantFirebaseApps_ExcludesRawGoogleServicesJson()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            await SeedTenantAsync(db, "socofeb", "SOCOFEB Bois");

            var secretMarker = "SUPER_SECRET_CLIENT_OAUTH_TOKEN_MARKER_12345";
            db.TenantFirebaseApps.Add(new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                FirebaseAppId = "1:123:android:socofeb",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                GoogleServicesJson = $"{{\"client\":[{{\"secret\":\"{secretMarker}\"}}]}}",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);
            var results = await service.GetAllTenantFirebaseAppsAsync();

            var json = System.Text.Json.JsonSerializer.Serialize(results);

            Assert.DoesNotContain(secretMarker, json);
            Assert.DoesNotContain("GoogleServicesJson", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("googleServicesJson", json);

            // Verify DTO does not have GoogleServicesJson property
            var properties = typeof(TenantFirebaseAppSummaryDto).GetProperties();
            Assert.DoesNotContain(properties, p => p.Name.Contains("GoogleServicesJson", StringComparison.OrdinalIgnoreCase));
        }

        // Test 26: Authorization policy RequireAdminRole is applied to AdminMobileFirebaseController
        [Fact]
        public void Test26_AdminMobileFirebaseController_HasRequireAdminRolePolicy()
        {
            var controllerType = typeof(AdminMobileFirebaseController);
            var authAttributes = controllerType.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .ToList();

            Assert.NotEmpty(authAttributes);
            Assert.Contains(authAttributes, a => a.Policy == "RequireAdminRole");

            // Verify GetAllFirebaseApps action routing
            var method = controllerType.GetMethod(nameof(AdminMobileFirebaseController.GetAllFirebaseApps));
            Assert.NotNull(method);
            var httpGet = method!.GetCustomAttributes(typeof(HttpGetAttribute), inherit: true)
                .Cast<HttpGetAttribute>()
                .FirstOrDefault();
            Assert.NotNull(httpGet);
            Assert.Equal("firebase-apps", httpGet!.Template);
        }

        // Test 27: AdminMobileFirebaseController GetAllFirebaseApps returns Ok with list
        [Fact]
        public async Task Test27_AdminMobileFirebaseController_GetAllFirebaseApps_ReturnsOkWithList()
        {
            var mockService = new Mock<IFirebaseAppManagementService>();
            mockService.Setup(s => s.GetAllTenantFirebaseAppsAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<TenantFirebaseAppSummaryDto>
                {
                    new TenantFirebaseAppSummaryDto
                    {
                        TenantId = "socofeb",
                        TenantName = "SOCOFEB Bois",
                        PackageName = "com.socofeb.woodapp",
                        FirebaseProjectId = "acya-fcm-prod-dispatcher",
                        FirebaseAppId = "1:123:android:socofeb",
                        Status = "Active",
                        HasConfiguration = true
                    }
                });

            var controller = new AdminMobileFirebaseController(mockService.Object, NullLogger<AdminMobileFirebaseController>.Instance);
            var result = await controller.GetAllFirebaseApps();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var list = Assert.IsType<List<TenantFirebaseAppSummaryDto>>(okResult.Value);
            Assert.Single(list);
            Assert.Equal("socofeb", list[0].TenantId);
        }

        // Test 28: Cancellation token propagation and query failure handling
        [Fact]
        public async Task Test28_GetAllTenantFirebaseApps_CancellationToken_PropagatesCancellation()
        {
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            var service = new FirebaseAppManagementService(db, new Mock<IFirebaseManagementApiClient>().Object, CreateConfig(), NullLogger<FirebaseAppManagementService>.Instance);

            using var cts = new CancellationTokenSource();
            cts.Cancel();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            {
                await service.GetAllTenantFirebaseAppsAsync(cts.Token);
            });
        }
    }
}
