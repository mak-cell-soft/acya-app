using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Middleware;
using ms.webapp.api.acya.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.core.Permissions;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.PermissionsHelper;
using ms.webapp.api.acya.Services.Mobile;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class MobileReleasesTests
    {
        private readonly IConfiguration _configuration;

        public MobileReleasesTests()
        {
            var myConfiguration = new Dictionary<string, string?>
            {
                { "JWTSettings:securityKey", "test_secret_key_minimum_32_characters_long_for_hmac_sha256" },
                { "TokenKey", "test_secret_key_minimum_32_characters_long_for_hmac_sha256" },
                { "MobileStorage:BasePath", Path.Combine(Path.GetTempPath(), "acya_test_mobile_storage_" + Guid.NewGuid().ToString("N")) },
                { "MobileStorage:DownloadTokenTtlMinutes", "15" },
                { "MobileApp:BaseUrlTemplate", "https://{slug}.acya.site/api/" }
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(myConfiguration)
                .Build();
        }

        private MasterDbContext CreateInMemoryMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            return new MasterDbContext(options);
        }

        private WoodAppContext CreateInMemoryWoodAppDb(string dbName, TenantContext tenantContext)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            return new WoodAppContext(options, tenantContext);
        }

        #region 1. Permission & Authorization Handler Tests

        [Fact]
        public async Task PermissionHandler_SuperAdmin_ShouldAlwaysSucceed()
        {
            // Arrange
            var handler = new PermissionHandler();
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "SuperAdmin")
            }, "TestAuth"));

            var requirement = new PermissionRequirement("MobileApp", "CanDownload");
            var context = new AuthorizationHandlerContext(new[] { requirement }, user, null);

            // Act
            await handler.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
        }

        [Fact]
        public async Task PermissionHandler_Admin_ShouldSucceed_WhenNoExplicitPermissions()
        {
            // Arrange
            var handler = new PermissionHandler();
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "Admin")
            }, "TestAuth"));

            var requirement = new PermissionRequirement("MobileApp", "CanDownload");
            var context = new AuthorizationHandlerContext(new[] { requirement }, user, null);

            // Act
            await handler.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
        }

        [Fact]
        public async Task PermissionHandler_User_WithExplicitCanDownload_ShouldSucceed()
        {
            // Arrange
            var handler = new PermissionHandler();
            var permissionsMap = new AppPermissionsMap
            {
                MobileApp = new MobileAppPermissions { CanDownload = true, CanView = true }
            };
            var permissionsJson = JsonSerializer.Serialize(permissionsMap);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "User"),
                new Claim("Permissions", permissionsJson)
            }, "TestAuth"));

            var requirement = new PermissionRequirement("MobileApp", "CanDownload");
            var context = new AuthorizationHandlerContext(new[] { requirement }, user, null);

            // Act
            await handler.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
        }

        [Fact]
        public async Task PermissionHandler_User_WithoutCanDownload_ShouldFail()
        {
            // Arrange
            var handler = new PermissionHandler();
            var permissionsMap = new AppPermissionsMap
            {
                MobileApp = new MobileAppPermissions { CanDownload = false, CanView = true }
            };
            var permissionsJson = JsonSerializer.Serialize(permissionsMap);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "User"),
                new Claim("Permissions", permissionsJson)
            }, "TestAuth"));

            var requirement = new PermissionRequirement("MobileApp", "CanDownload");
            var context = new AuthorizationHandlerContext(new[] { requirement }, user, null);

            // Act
            await handler.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
        }

        [Fact]
        public async Task PermissionHandler_User_WithNoPermissionsRecord_ShouldFailForCanDownload()
        {
            // Arrange
            var handler = new PermissionHandler();
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "User")
            }, "TestAuth"));

            var requirement = new PermissionRequirement("MobileApp", "CanDownload");
            var context = new AuthorizationHandlerContext(new[] { requirement }, user, null);

            // Act
            await handler.HandleAsync(context);

            // Assert: Normal user without explicit permissions record defaults to CanRead only, not CanDownload
            Assert.False(context.HasSucceeded);
        }

        #endregion

        #region 2. Tenant Isolation & Releases Tests

        [Fact]
        public async Task GetReleases_ShouldOnlyReturnReleases_ForAuthenticatedTenant()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            // Seed builds for two tenants
            masterDb.MobileBuilds.AddRange(
                new MobileBuild { Id = 1, TenantId = "socofeb", Version = "1.0.0", BuildNumber = 1, Status = MobileBuildStatus.Succeeded, ArtifactPath = "socofeb/1/app.apk", IsActive = true },
                new MobileBuild { Id = 2, TenantId = "socofeb", Version = "1.1.0", BuildNumber = 2, Status = MobileBuildStatus.Succeeded, ArtifactPath = "socofeb/2/app.apk", IsActive = true },
                new MobileBuild { Id = 3, TenantId = "other_tenant", Version = "2.0.0", BuildNumber = 10, Status = MobileBuildStatus.Succeeded, ArtifactPath = "other_tenant/10/app.apk", IsActive = true }
            );
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("tenant_slug", "socofeb")
                    }, "TestAuth"))
                }
            };

            // Act
            var actionResult = await controller.GetReleases();
            var okResult = actionResult.Result as OkObjectResult;
            var listDto = okResult?.Value as MobileReleasesListDto;

            // Assert
            Assert.NotNull(listDto);
            Assert.Equal(2, listDto!.TotalCount);
            Assert.All(listDto.Items, item => Assert.Equal("socofeb", item.TenantId));
        }

        [Fact]
        public async Task GetRelease_CrossTenantRequest_ShouldReturnForbid()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            // Seed release belonging to "other_tenant"
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 99,
                TenantId = "other_tenant",
                Version = "3.0.0",
                BuildNumber = 30,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "other_tenant/30/app.apk",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("tenant_slug", "socofeb")
                    }, "TestAuth"))
                }
            };

            // Act: socofeb requests other_tenant release ID 99
            var actionResult = await controller.GetRelease(99);

            // Assert: Must be rejected with 403 Forbid
            Assert.IsType<ForbidResult>(actionResult.Result);
        }

        [Fact]
        public async Task RequestDownload_CrossTenantReleaseId_ShouldReturnForbid()
        {
            // Arrange: Tenant A knows Tenant B's release ID
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "tenant_a" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 77,
                TenantId = "tenant_b",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "tenant_b/1/app.apk",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "42"),
                        new Claim("tenant_slug", "tenant_a")
                    }, "TestAuth"))
                }
            };

            // Act: Tenant A user requests download of Tenant B release ID 77
            var actionResult = await controller.RequestDownload(77);

            // Assert: Cross-tenant download MUST fail with ForbidResult
            Assert.IsType<ForbidResult>(actionResult.Result);
        }

        [Fact]
        public async Task RequestDownload_UnknownReleaseId_ShouldReturnNotFound()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("tenant_slug", "socofeb")
                    }, "TestAuth"))
                }
            };

            // Act: Request unknown release ID 9999
            var actionResult = await controller.RequestDownload(9999);

            // Assert: Returns 404 NotFound
            Assert.IsType<NotFoundObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task RequestDownload_ValidOwnTenantRelease_ShouldReturnTemporaryDownloadUrl()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 10,
                TenantId = "socofeb",
                Version = "1.4.2",
                BuildNumber = 142,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/142/app.apk",
                ArtifactSize = 52428800,
                Sha256 = "dummy_sha256",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync("socofeb/142/app.apk", default)).ReturnsAsync(true);

            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "15"),
                    new Claim("tenant_slug", "socofeb")
                }, "TestAuth"))
            };
            httpContext.Request.Scheme = "https";
            httpContext.Request.Host = new HostString("downloads.acya.site");
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            // Act
            var actionResult = await controller.RequestDownload(10);
            var okResult = actionResult.Result as OkObjectResult;
            var response = okResult?.Value as MobileDownloadResponseDto;

            // Assert
            Assert.NotNull(response);
            Assert.Equal(10, response!.ReleaseId);
            Assert.Equal("socofeb", response.TenantId);
            Assert.Equal("1.4.2", response.Version);
            Assert.Contains("/api/mobile/releases/download?token=", response.DownloadUrl);
            Assert.True(response.ExpiresAt > DateTime.UtcNow);
        }

        #endregion

        #region 3. Storage Abstraction & Path Traversal Security

        [Fact]
        public async Task Storage_PathTraversalAttempt_ShouldThrowUnauthorizedAccessException()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<LocalFileSystemMobileArtifactStorage>>();
            var storage = new LocalFileSystemMobileArtifactStorage(_configuration, loggerMock.Object);

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            {
                await storage.GetArtifactStreamAsync("../../etc/passwd");
            });

            await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            {
                await storage.GetArtifactStreamAsync(@"..\..\..\Windows\System32\cmd.exe");
            });
        }

        [Fact]
        public async Task Storage_SaveAndStream_ShouldWorkCorrectly()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<LocalFileSystemMobileArtifactStorage>>();
            var storage = new LocalFileSystemMobileArtifactStorage(_configuration, loggerMock.Object);

            var testData = Encoding.UTF8.GetBytes("fake apk binary content for tests");
            using var inputStream = new MemoryStream(testData);

            // Act
            var relativePath = await storage.SaveArtifactAsync("socofeb", 1, "app.apk", inputStream);
            var exists = await storage.ArtifactExistsAsync(relativePath);
            var size = await storage.GetArtifactSizeAsync(relativePath);

            string content;
            using (var outputStream = await storage.GetArtifactStreamAsync(relativePath))
            using (var reader = new StreamReader(outputStream!))
            {
                content = await reader.ReadToEndAsync();
            }

            // Assert
            Assert.True(exists);
            Assert.Equal(testData.Length, size);
            Assert.Equal("fake apk binary content for tests", content);

            // Cleanup
            await storage.DeleteArtifactAsync(relativePath);
            Assert.False(await storage.ArtifactExistsAsync(relativePath));
        }

        #endregion

        #region 4. Cryptographic Download Token Service Tests

        [Fact]
        public void DownloadTokenService_ValidToken_ShouldValidateSuccessfully()
        {
            // Arrange
            var tokenService = new MobileDownloadTokenService(_configuration);

            // Act
            var token = tokenService.GenerateToken(142, "socofeb", 7, TimeSpan.FromMinutes(10));
            var isValid = tokenService.TryValidateToken(token, out var validated);

            // Assert
            Assert.True(isValid);
            Assert.NotNull(validated);
            Assert.Equal(142, validated!.ReleaseId);
            Assert.Equal("socofeb", validated.TenantId);
            Assert.Equal(7, validated.UserId);
            Assert.True(validated.ExpiresAt > DateTime.UtcNow);
        }

        [Fact]
        public void DownloadTokenService_TamperedPayload_ShouldFailValidation()
        {
            // Arrange
            var tokenService = new MobileDownloadTokenService(_configuration);
            var token = tokenService.GenerateToken(142, "socofeb", 7);

            // Tamper with the token string
            var parts = token.Split('.');
            var tamperedPayload = parts[0] + "xyz";
            var tamperedToken = $"{tamperedPayload}.{parts[1]}";

            // Act
            var isValid = tokenService.TryValidateToken(tamperedToken, out var validated);

            // Assert
            Assert.False(isValid);
            Assert.Null(validated);
        }

        [Fact]
        public void DownloadTokenService_ExpiredToken_ShouldFailValidation()
        {
            // Arrange
            var tokenService = new MobileDownloadTokenService(_configuration);
            // Expired 10 seconds ago
            var token = tokenService.GenerateToken(142, "socofeb", 7, TimeSpan.FromSeconds(-10));

            // Act
            var isValid = tokenService.TryValidateToken(token, out var validated);

            // Assert
            Assert.False(isValid);
            Assert.Null(validated);
        }

        #endregion

        #region 5. Tenant Configuration Generation Tests

        [Fact]
        public async Task GenerateConfigForTenant_ShouldReturnDynamicConfig_FromExistingRegistryAndEnterprise()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB Bois & Dérivés",
                LogoUrl = "assets/tenants/socofeb/logo.svg",
                PrimaryColor = "#1E3A8A",
                SecondaryColor = "#3B82F6",
                Language = "fr",
                Currency = "TND",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            woodDb.Enterprises.Add(new Enterprise
            {
                Id = 1,
                Name = "SOCOFEB Bois & Dérivés",
                IsManagingConstructions = true,
                IsManagingProduction = false
            });
            await woodDb.SaveChangesAsync();

            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);

            // Act
            var config = await configService.GenerateConfigForTenantAsync("socofeb");

            // Assert
            Assert.NotNull(config);
            Assert.Equal("socofeb", config!.TenantId);
            Assert.Equal("SOCOFEB Bois & Dérivés", config.CompanyName);
            Assert.Equal("com.socofeb.woodapp", config.PackageName);
            Assert.Equal("#1E3A8A", config.PrimaryColor);
            Assert.Equal("#3B82F6", config.SecondaryColor);
            Assert.Equal("TND", config.Currency);
            Assert.Equal("fr", config.Language);
            Assert.True(config.HasChantierModule);
            Assert.False(config.HasProductionModule);
            Assert.Equal("https://socofeb.acya.site/api/", config.BaseUrl);
        }

        #endregion

        #region 6. Admin Builds Lifecycle Tests

        [Fact]
        public async Task AdminBuilds_CreateBuild_ShouldInitializePendingStatus()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var createDto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                ReleaseNotes = "First mobile release",
                GitBranch = "main"
            };

            // Act
            var created = await buildService.CreateBuildAsync(createDto, "admin@acya.site");

            // Assert
            Assert.NotNull(created);
            Assert.Equal(1, created.BuildNumber);
            Assert.Equal("Pending", created.Status);
            Assert.Equal("socofeb", created.TenantId);
            Assert.Equal("admin@acya.site", created.CreatedBy);

            // Update to Succeeded with artifact
            var updateDto = new UpdateMobileBuildStatusDto
            {
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/1/app.apk",
                ArtifactSize = 45000000,
                Sha256 = "abc123sha256"
            };

            var updated = await buildService.UpdateBuildStatusAsync(created.Id, updateDto);
            Assert.NotNull(updated);
            Assert.Equal("Succeeded", updated!.Status);
            Assert.NotNull(updated.CompletedAt);
            Assert.Equal("socofeb/1/app.apk", updated.ArtifactPath);
        }

        [Fact]
        public async Task UpdateBuildStatus_ToSucceededWithoutArtifact_ShouldFail()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB",
                IsActive = true
            });

            var build = new MobileBuild
            {
                Id = 10,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 10,
                Status = MobileBuildStatus.Building,
                StartedAt = DateTime.UtcNow,
                IsActive = true,
                ArtifactPath = null,
                ArtifactSize = null,
                Sha256 = null
            };
            masterDb.MobileBuilds.Add(build);
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var invalidUpdateDto = new UpdateMobileBuildStatusDto
            {
                Status = MobileBuildStatus.Succeeded
            };

            // Act & Assert: Service layer throws InvalidOperationException
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                buildService.UpdateBuildStatusAsync(build.Id, invalidUpdateDto));

            Assert.Contains("Cannot mark mobile build as Succeeded without an uploaded artifact", ex.Message);

            // Verify database was not updated to Succeeded
            var reloaded = await masterDb.MobileBuilds.FindAsync(build.Id);
            Assert.NotNull(reloaded);
            Assert.Equal(MobileBuildStatus.Building, reloaded!.Status);

            // Act & Assert: Controller layer catches InvalidOperationException and returns BadRequest
            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);

            var actionResult = await controller.UpdateBuildStatus(build.Id, invalidUpdateDto);
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(actionResult.Result);
            Assert.NotNull(badRequestResult.Value);
        }

        [Fact]
        public async Task UpdateBuildStatus_ToSucceededWithArtifact_ShouldSucceed()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB",
                IsActive = true
            });

            var build = new MobileBuild
            {
                Id = 11,
                TenantId = "socofeb",
                Version = "1.0.1",
                BuildNumber = 11,
                Status = MobileBuildStatus.Building,
                StartedAt = DateTime.UtcNow,
                IsActive = true,
                ArtifactPath = null,
                ArtifactSize = null,
                Sha256 = null
            };
            masterDb.MobileBuilds.Add(build);
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var validUpdateDto = new UpdateMobileBuildStatusDto
            {
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/11/app-socofeb-release.apk",
                ArtifactSize = 52428800,
                Sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            };

            // Act
            var updated = await buildService.UpdateBuildStatusAsync(build.Id, validUpdateDto);

            // Assert
            Assert.NotNull(updated);
            Assert.Equal(MobileBuildStatus.Succeeded, updated!.Status);
            Assert.Equal("socofeb/11/app-socofeb-release.apk", updated.ArtifactPath);
            Assert.Equal(52428800, updated.ArtifactSize);
            Assert.Equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", updated.Sha256);
            Assert.NotNull(updated.CompletedAt);

            // Verify database persisted the state
            var reloaded = await masterDb.MobileBuilds.FindAsync(build.Id);
            Assert.NotNull(reloaded);
            Assert.Equal(MobileBuildStatus.Succeeded, reloaded!.Status);
            Assert.Equal("socofeb/11/app-socofeb-release.apk", reloaded.ArtifactPath);
        }

        [Fact]
        public async Task DownloadArtifact_WithValidToken_ShouldStreamApkFile()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 15,
                TenantId = "socofeb",
                Version = "1.4.2",
                BuildNumber = 142,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/142/app.apk",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var fakeApkBytes = Encoding.UTF8.GetBytes("fake_apk_stream_content");
            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.GetArtifactStreamAsync("socofeb/142/app.apk", default))
                       .ReturnsAsync(new MemoryStream(fakeApkBytes));

            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            var validToken = tokenService.GenerateToken(15, "socofeb", 123);

            // Act
            var result = await controller.DownloadArtifact(validToken) as FileStreamResult;

            // Assert
            Assert.NotNull(result);
            Assert.Equal("application/vnd.android.package-archive", result!.ContentType);
            Assert.Equal("acya-socofeb-1.4.2.apk", result.FileDownloadName);
            Assert.True(result.EnableRangeProcessing);
        }

        [Fact]
        public async Task DownloadArtifact_WithTamperedToken_ShouldReturnUnauthorized()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();

            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);
            var controllerLogger = new Mock<ILogger<MobileReleasesController>>();
            var controller = new MobileReleasesController(buildService, tenantContext, controllerLogger.Object);

            // Act
            var result = await controller.DownloadArtifact("invalid.tampered_token") as UnauthorizedObjectResult;

            // Assert
            Assert.NotNull(result);
        }

        #endregion

        #region CI/CD Pipeline & GitHub Dispatch Tests

        [Fact]
        public async Task CreateBuild_WithSuccessfulDispatch_ShouldRetainPendingAndCallDispatcher()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            dispatcherMock.Setup(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), It.IsAny<string?>(), default))
                          .ReturnsAsync(true);

            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Name, "AdminUser"),
                        new Claim(ClaimTypes.Role, "Admin")
                    }, "TestAuth"))
                }
            };

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "2.0.0",
                BuildNumber = 200,
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("Pending", resultDto!.Status);
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.Is<MobileBuildDto>(b => b.Id == resultDto.Id), "production", default), Times.Once);
        }

        [Fact]
        public async Task CreateBuild_WhenDispatchFails_ShouldMarkBuildAsFailed()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            dispatcherMock.Setup(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), It.IsAny<string?>(), default))
                          .ReturnsAsync(false);

            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Name, "AdminUser"),
                        new Claim(ClaimTypes.Role, "Admin")
                    }, "TestAuth"))
                }
            };

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "2.0.1",
                BuildNumber = 201
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("Failed", resultDto!.Status);
            Assert.Contains("Failed to dispatch", resultDto.ErrorMessage);
        }

        [Fact]
        public async Task UploadArtifact_ValidApk_ShouldStoreFileAndComputeSha256()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var build = new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.5.0",
                BuildNumber = 150,
                Status = MobileBuildStatus.Building,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            masterDb.MobileBuilds.Add(build);
            await masterDb.SaveChangesAsync();

            var fakeContent = Encoding.UTF8.GetBytes("Fake APK binary content for testing SHA-256");
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var expectedHash = BitConverter.ToString(sha256.ComputeHash(fakeContent)).Replace("-", "").ToLowerInvariant();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.SaveArtifactAsync("socofeb", 150, "app-socofeb-release.apk", It.IsAny<Stream>(), default))
                       .ReturnsAsync("socofeb/150/app-socofeb-release.apk");

            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);

            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(f => f.FileName).Returns("app-socofeb-release.apk");
            fileMock.Setup(f => f.Length).Returns(fakeContent.Length);
            fileMock.Setup(f => f.OpenReadStream()).Returns(new MemoryStream(fakeContent));

            // Act
            var actionResult = await controller.UploadArtifact(build.Id, fileMock.Object, expectedHash);
            var okResult = actionResult.Result as OkObjectResult;

            // Assert
            Assert.NotNull(okResult);
            var resultDto = okResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("socofeb/150/app-socofeb-release.apk", resultDto!.ArtifactPath);
            Assert.Equal(fakeContent.Length, resultDto.ArtifactSize);
            Assert.Equal(expectedHash, resultDto.Sha256);
        }

        [Fact]
        public async Task UploadArtifact_InvalidExtension_ShouldReturnBadRequest()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var build = new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.5.0",
                BuildNumber = 150,
                Status = MobileBuildStatus.Building,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            masterDb.MobileBuilds.Add(build);
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);

            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(f => f.FileName).Returns("malicious_script.sh");
            fileMock.Setup(f => f.Length).Returns(100);
            fileMock.Setup(f => f.OpenReadStream()).Returns(new MemoryStream(new byte[100]));

            // Act
            var actionResult = await controller.UploadArtifact(build.Id, fileMock.Object, null);
            var badRequestResult = actionResult.Result as BadRequestObjectResult;

            // Assert
            Assert.NotNull(badRequestResult);
        }

        [Fact]
        public async Task AuthorizeAdminOrCiToken_WithValidCiToken_ShouldAuthorizeWorker()
        {
            // Arrange
            var testConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "MobileBuild:CiToken", "secret_ci_runner_token_12345" }
                })
                .Build();

            var serviceProviderMock = new Mock<IServiceProvider>();
            serviceProviderMock.Setup(s => s.GetService(typeof(IConfiguration)))
                               .Returns(testConfig);

            var httpContext = new DefaultHttpContext
            {
                RequestServices = serviceProviderMock.Object
            };
            httpContext.Request.Headers["X-CI-Token"] = "secret_ci_runner_token_12345";

            var actionContext = new ActionContext(httpContext, new Microsoft.AspNetCore.Routing.RouteData(), new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor());
            var context = new Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext(
                actionContext,
                new List<Microsoft.AspNetCore.Mvc.Filters.IFilterMetadata>(),
                new Dictionary<string, object?>(),
                new object());

            bool nextCalled = false;
            Microsoft.AspNetCore.Mvc.Filters.ActionExecutionDelegate next = () =>
            {
                nextCalled = true;
                return Task.FromResult<Microsoft.AspNetCore.Mvc.Filters.ActionExecutedContext>(null!);
            };

            var filter = new ms.webapp.api.acya.Attributes.AuthorizeAdminOrCiTokenAttribute();

            // Act
            await filter.OnActionExecutionAsync(context, next);

            // Assert
            Assert.True(nextCalled);
            Assert.Null(context.Result);
            Assert.True(httpContext.User.IsInRole("MobileBuildWorker"));
        }

        [Fact]
        public async Task AuthorizeAdminOrCiToken_WithInvalidCiToken_ShouldReturnUnauthorized()
        {
            // Arrange
            var testConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "MobileBuild:CiToken", "secret_ci_runner_token_12345" }
                })
                .Build();

            var serviceProviderMock = new Mock<IServiceProvider>();
            serviceProviderMock.Setup(s => s.GetService(typeof(IConfiguration)))
                               .Returns(testConfig);

            var httpContext = new DefaultHttpContext
            {
                RequestServices = serviceProviderMock.Object
            };
            httpContext.Request.Headers["X-CI-Token"] = "wrong_token";

            var actionContext = new ActionContext(httpContext, new Microsoft.AspNetCore.Routing.RouteData(), new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor());
            var context = new Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext(
                actionContext,
                new List<Microsoft.AspNetCore.Mvc.Filters.IFilterMetadata>(),
                new Dictionary<string, object?>(),
                new object());

            bool nextCalled = false;
            Microsoft.AspNetCore.Mvc.Filters.ActionExecutionDelegate next = () =>
            {
                nextCalled = true;
                return Task.FromResult<Microsoft.AspNetCore.Mvc.Filters.ActionExecutedContext>(null!);
            };

            var filter = new ms.webapp.api.acya.Attributes.AuthorizeAdminOrCiTokenAttribute();

            // Act
            await filter.OnActionExecutionAsync(context, next);

            // Assert
            Assert.False(nextCalled);
            Assert.IsType<UnauthorizedObjectResult>(context.Result);
        }

        [Fact]
        public async Task GitHubBuildDispatcher_ShouldConstructCorrectRequestPayload()
        {
            // Arrange
            HttpRequestMessage? capturedRequest = null;
            string? capturedBody = null;
            var handlerMock = new MockHttpMessageHandler(async (req) =>
            {
                capturedRequest = req;
                if (req.Content != null)
                {
                    capturedBody = await req.Content.ReadAsStringAsync();
                }
                return new HttpResponseMessage(System.Net.HttpStatusCode.NoContent);
            });

            var httpClient = new HttpClient(handlerMock);
            var testConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "MobileBuild:GitHubToken", "ghp_test_token_12345" },
                    { "MobileBuild:GitHubOwner", "mak-cell-soft" },
                    { "MobileBuild:GitHubRepo", "mobile-elance-fo" },
                    { "MobileBuild:WorkflowFileName", "mobile-build.yml" },
                    { "MobileBuild:DefaultBranch", "main" }
                })
                .Build();

            var loggerMock = new Mock<ILogger<GitHubBuildDispatcher>>();
            var dispatcher = new GitHubBuildDispatcher(httpClient, testConfig, loggerMock.Object);

            var build = new MobileBuildDto
            {
                Id = 183,
                TenantId = "socofeb",
                Version = "1.4.2",
                BuildNumber = 142,
                GitBranch = "main",
                Status = "Pending"
            };

            // Act
            var success = await dispatcher.DispatchBuildAsync(build, "production");

            // Assert
            Assert.True(success);
            Assert.NotNull(capturedRequest);
            Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
            Assert.Equal("https://api.github.com/repos/mak-cell-soft/mobile-elance-fo/actions/workflows/mobile-build.yml/dispatches", capturedRequest.RequestUri!.ToString());
            Assert.Equal("Bearer", capturedRequest.Headers.Authorization!.Scheme);
            Assert.Equal("ghp_test_token_12345", capturedRequest.Headers.Authorization.Parameter);
            Assert.Contains(capturedRequest.Headers.GetValues("X-GitHub-Api-Version"), v => v == "2022-11-28");

            Assert.NotNull(capturedBody);
            using var doc = JsonDocument.Parse(capturedBody!);
            Assert.Equal("main", doc.RootElement.GetProperty("ref").GetString());
            var inputs = doc.RootElement.GetProperty("inputs");
            Assert.Equal("183", inputs.GetProperty("buildId").GetString());
            Assert.Equal("production", inputs.GetProperty("apiEnvironment").GetString());
        }

        private class MockHttpMessageHandler : HttpMessageHandler
        {
            private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handler;

            public MockHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler)
            {
                _handler = handler;
            }

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                return _handler(request);
            }
        }

        #endregion

        #region 7. Concurrency & Active Build Invariant Tests

        private (AdminMobileBuildsController controller, Mock<IGitHubBuildDispatcher> dispatcherMock, MasterDbContext masterDb) CreateAdminMobileBuildsController(string dbName)
        {
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var storageMock = new Mock<IMobileArtifactStorage>();
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var dispatcherMock = new Mock<IGitHubBuildDispatcher>();
            dispatcherMock.Setup(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), It.IsAny<string?>(), default))
                          .ReturnsAsync(true);

            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();
            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Name, "AdminUser"),
                        new Claim(ClaimTypes.Role, "Admin")
                    }, "TestAuth"))
                }
            };

            return (controller, dispatcherMock, masterDb);
        }

        [Fact]
        public async Task CreateBuild_WhenNoActiveBuildExists_ShouldSucceedAndDispatchCI()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            await masterDb.SaveChangesAsync();

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("Pending", resultDto!.Status);
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), "production", default), Times.Once);
        }

        [Fact]
        public async Task CreateBuild_WhenExistingPendingBuildForSameTenant_ShouldReturnConflictAndNotDispatchCI()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Pending,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var conflictResult = actionResult.Result as ConflictObjectResult;

            // Assert
            Assert.NotNull(conflictResult);
            Assert.Equal(409, conflictResult!.StatusCode);

            var message = conflictResult.Value?.GetType().GetProperty("message")?.GetValue(conflictResult.Value)?.ToString();
            Assert.Contains("already in progress for tenant 'socofeb'", message);

            // Verify CI was NOT dispatched
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), It.IsAny<string?>(), default), Times.Never);
        }

        [Fact]
        public async Task CreateBuild_WhenExistingBuildingBuildForSameTenant_ShouldReturnConflictAndNotDispatchCI()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Building,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var conflictResult = actionResult.Result as ConflictObjectResult;

            // Assert
            Assert.NotNull(conflictResult);
            Assert.Equal(409, conflictResult!.StatusCode);

            var message = conflictResult.Value?.GetType().GetProperty("message")?.GetValue(conflictResult.Value)?.ToString();
            Assert.Contains("already in progress for tenant 'socofeb'", message);

            // Verify CI was NOT dispatched
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), It.IsAny<string?>(), default), Times.Never);
        }

        [Fact]
        public async Task CreateBuild_WhenExistingFailedBuildForSameTenant_ShouldSucceed()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Failed,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("Pending", resultDto!.Status);
            Assert.Equal(2, resultDto.BuildNumber); // Automatically incremented
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), "production", default), Times.Once);
        }

        [Fact]
        public async Task CreateBuild_WhenExistingSucceededBuildForSameTenant_ShouldSucceed()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 3,
                Status = MobileBuildStatus.Succeeded,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var dto = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dto);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("Pending", resultDto!.Status);
            Assert.Equal(4, resultDto.BuildNumber);
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), "production", default), Times.Once);
        }

        [Fact]
        public async Task CreateBuild_WhenActiveBuildExistsForTenantA_TenantBCanStillCreateBuild()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "tenant-a", Name = "Tenant A", IsActive = true });
            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "tenant-b", Name = "Tenant B", IsActive = true });
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                TenantId = "tenant-a",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Building,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var dtoTenantB = new CreateMobileBuildDto
            {
                TenantId = "tenant-b",
                Version = "1.0.0",
                Environment = "production"
            };

            // Act
            var actionResult = await controller.CreateBuild(dtoTenantB);
            var createdResult = actionResult.Result as CreatedAtActionResult;

            // Assert
            Assert.NotNull(createdResult);
            var resultDto = createdResult!.Value as MobileBuildDto;
            Assert.NotNull(resultDto);
            Assert.Equal("tenant-b", resultDto!.TenantId);
            Assert.Equal("Pending", resultDto.Status);
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.Is<MobileBuildDto>(b => b.TenantId == "tenant-b"), "production", default), Times.Once);
        }

        [Fact]
        public async Task CreateBuild_ConcurrentSimultaneousRequests_ShouldAllowOnlyOneAndRejectOther()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var (controller, dispatcherMock, masterDb) = CreateAdminMobileBuildsController(dbName);

            masterDb.TenantRegistries.Add(new TenantRegistry { Slug = "socofeb", Name = "SOCOFEB", IsActive = true });
            await masterDb.SaveChangesAsync();

            var dto1 = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            var dto2 = new CreateMobileBuildDto
            {
                TenantId = "socofeb",
                Version = "1.0.1",
                Environment = "production"
            };

            // Act: Run both creation requests concurrently
            var task1 = controller.CreateBuild(dto1);
            var task2 = controller.CreateBuild(dto2);

            var results = await Task.WhenAll(task1, task2);

            // Assert: Exactly one 201 Created and one 409 Conflict
            var createdCount = results.Count(r => r.Result is CreatedAtActionResult);
            var conflictCount = results.Count(r => r.Result is ConflictObjectResult);

            Assert.Equal(1, createdCount);
            Assert.Equal(1, conflictCount);

            // Verify CI was dispatched exactly once
            dispatcherMock.Verify(d => d.DispatchBuildAsync(It.IsAny<MobileBuildDto>(), "production", default), Times.Once);
        }

        #endregion

        #region 4. Release Management & Publishing Tests

        private AdminMobileBuildsController CreateAdminBuildsController(
            MasterDbContext masterDb, 
            WoodAppContext woodDb, 
            Mock<IMobileArtifactStorage> storageMock,
            Mock<IGitHubBuildDispatcher>? dispatcherMock = null,
            string adminRole = "Admin")
        {
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            dispatcherMock ??= new Mock<IGitHubBuildDispatcher>();
            var controllerLogger = new Mock<ILogger<AdminMobileBuildsController>>();

            var controller = new AdminMobileBuildsController(buildService, configService, dispatcherMock.Object, controllerLogger.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.Role, adminRole),
                        new Claim(ClaimTypes.Name, "admin@acya.site")
                    }, "TestAuth"))
                }
            };

            return controller;
        }

        [Fact]
        public async Task PublishBuild_SucceededBuild_ShouldPublishSuccessfully()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var build = new MobileBuild
            {
                Id = 1,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 3,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/3/SOCOFEB-1.0.0-3.apk",
                ArtifactSize = 58698477,
                Sha256 = "a6b339528789821b35cac56d83b4122f46b1ee8d1b85c3f4f15b1ae62af47005",
                IsActive = true
            };
            masterDb.MobileBuilds.Add(build);
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync("socofeb/3/SOCOFEB-1.0.0-3.apk", default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var release = Assert.IsType<MobileReleaseDto>(okResult.Value);

            Assert.Equal("socofeb", release.TenantId);
            Assert.Equal("1.0.0", release.Version);
            Assert.Equal(3, release.BuildNumber);
            Assert.Equal(1, release.MobileBuildId);
            Assert.True(release.IsCurrent);
            Assert.Equal("Published", release.Status);
            Assert.Equal("SOCOFEB-1.0.0-3.apk", release.ArtifactFileName);
            Assert.Equal(58698477, release.ArtifactSize);
            Assert.Equal("a6b339528789821b35cac56d83b4122f46b1ee8d1b85c3f4f15b1ae62af47005", release.Sha256);
        }

        [Fact]
        public async Task PublishBuild_PendingBuild_ShouldReturnBadRequest()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 2,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Pending,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(2);

            // Assert
            Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task PublishBuild_BuildingBuild_ShouldReturnBadRequest()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 3,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 2,
                Status = MobileBuildStatus.Building,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(3);

            // Assert
            Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task PublishBuild_FailedBuild_ShouldReturnBadRequest()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 4,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Failed,
                ErrorMessage = "Gradle compilation failure",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(4);

            // Assert
            Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task PublishBuild_NonExistentBuild_ShouldReturnNotFound()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            var storageMock = new Mock<IMobileArtifactStorage>();
            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(99999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task PublishBuild_AlreadyCurrentRelease_ShouldBeIdempotent()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 5,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 3,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/3/SOCOFEB-1.0.0-3.apk",
                ArtifactSize = 50000000,
                Sha256 = "validsha256",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync("socofeb/3/SOCOFEB-1.0.0-3.apk", default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act: Publish twice
            var result1 = await controller.PublishBuild(5);
            var result2 = await controller.PublishBuild(5);

            // Assert: Both return Ok
            var ok1 = Assert.IsType<OkObjectResult>(result1.Result);
            var ok2 = Assert.IsType<OkObjectResult>(result2.Result);

            var rel1 = Assert.IsType<MobileReleaseDto>(ok1.Value);
            var rel2 = Assert.IsType<MobileReleaseDto>(ok2.Value);

            Assert.Equal(rel1.Id, rel2.Id);

            // Exactly ONE release row in the database
            var releaseCount = await masterDb.MobileReleases.CountAsync(r => r.TenantId == "socofeb");
            Assert.Equal(1, releaseCount);
        }

        [Fact]
        public async Task PublishBuild_NewRelease_ReplacesPreviousCurrentRelease()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.AddRange(
                new MobileBuild
                {
                    Id = 10,
                    TenantId = "socofeb",
                    Version = "1.0.0",
                    BuildNumber = 1,
                    Status = MobileBuildStatus.Succeeded,
                    ArtifactPath = "socofeb/1/app.apk",
                    ArtifactSize = 50000000,
                    Sha256 = "sha1",
                    IsActive = true
                },
                new MobileBuild
                {
                    Id = 11,
                    TenantId = "socofeb",
                    Version = "1.0.1",
                    BuildNumber = 2,
                    Status = MobileBuildStatus.Succeeded,
                    ArtifactPath = "socofeb/2/app.apk",
                    ArtifactSize = 51000000,
                    Sha256 = "sha2",
                    IsActive = true
                }
            );
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act: Publish build 10, then publish build 11
            await controller.PublishBuild(10);
            var result = await controller.PublishBuild(11);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var currentRelease = Assert.IsType<MobileReleaseDto>(ok.Value);

            Assert.Equal(11, currentRelease.MobileBuildId);
            Assert.Equal("1.0.1", currentRelease.Version);
            Assert.True(currentRelease.IsCurrent);

            // Verify in DB that previous release is no longer Current
            var releases = await masterDb.MobileReleases.Where(r => r.TenantId == "socofeb").ToListAsync();
            Assert.Equal(2, releases.Count);

            var oldRelease = releases.First(r => r.MobileBuildId == 10);
            Assert.False(oldRelease.IsCurrent);
            Assert.Equal("Previous", oldRelease.Status);

            var newRelease = releases.First(r => r.MobileBuildId == 11);
            Assert.True(newRelease.IsCurrent);
            Assert.Equal("Published", newRelease.Status);
        }

        [Fact]
        public async Task PublishBuild_TenantA_DoesNotAffectTenantB()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.AddRange(
                new MobileBuild
                {
                    Id = 20,
                    TenantId = "socofeb",
                    Version = "1.0.0",
                    BuildNumber = 3,
                    Status = MobileBuildStatus.Succeeded,
                    ArtifactPath = "socofeb/3/app.apk",
                    ArtifactSize = 50000000,
                    Sha256 = "sha_socofeb",
                    IsActive = true
                },
                new MobileBuild
                {
                    Id = 21,
                    TenantId = "mansour-construction",
                    Version = "1.0.1",
                    BuildNumber = 1,
                    Status = MobileBuildStatus.Succeeded,
                    ArtifactPath = "mansour/1/app.apk",
                    ArtifactSize = 50000000,
                    Sha256 = "sha_mansour",
                    IsActive = true
                }
            );
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act: Publish both
            await controller.PublishBuild(20);
            await controller.PublishBuild(21);

            // Assert: Both tenants have their own current release
            var socofebCurrent = await masterDb.MobileReleases.FirstOrDefaultAsync(r => r.TenantId == "socofeb" && r.IsCurrent);
            var mansourCurrent = await masterDb.MobileReleases.FirstOrDefaultAsync(r => r.TenantId == "mansour-construction" && r.IsCurrent);

            Assert.NotNull(socofebCurrent);
            Assert.Equal(20, socofebCurrent!.MobileBuildId);
            Assert.Equal("1.0.0", socofebCurrent.Version);

            Assert.NotNull(mansourCurrent);
            Assert.Equal(21, mansourCurrent!.MobileBuildId);
            Assert.Equal("1.0.1", mansourCurrent.Version);
        }

        [Fact]
        public void PublishBuild_HasRequireAdminRolePolicyAttribute()
        {
            // Assert: Verify controller method has [Authorize(Policy = "RequireAdminRole")]
            var method = typeof(AdminMobileBuildsController).GetMethod("PublishBuild");
            Assert.NotNull(method);

            var authAttr = Attribute.GetCustomAttribute(method!, typeof(AuthorizeAttribute)) as AuthorizeAttribute;
            Assert.NotNull(authAttr);
            Assert.Equal("RequireAdminRole", authAttr!.Policy);
        }

        [Fact]
        public async Task PublishBuild_MissingArtifactFile_ShouldReturnBadRequest()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 30,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/1/nonexistent.apk",
                ArtifactSize = 50000000,
                Sha256 = "sha",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            // Physical file not found
            storageMock.Setup(s => s.ArtifactExistsAsync("socofeb/1/nonexistent.apk", default)).ReturnsAsync(false);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(30);

            // Assert
            Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        }

        [Theory]
        [InlineData(null, 50000000, "validsha")]
        [InlineData("", 50000000, "validsha")]
        [InlineData("path.apk", 0, "validsha")]
        [InlineData("path.apk", -100, "validsha")]
        [InlineData("path.apk", 50000000, null)]
        [InlineData("path.apk", 50000000, "")]
        public async Task PublishBuild_InvalidArtifactMetadata_ShouldReturnBadRequest(string? artifactPath, long artifactSize, string? sha256)
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 35,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = artifactPath,
                ArtifactSize = artifactSize,
                Sha256 = sha256,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act
            var actionResult = await controller.PublishBuild(35);

            // Assert
            Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        }

        [Fact]
        public async Task PublishBuild_OnlyOneCurrentReleaseExistsAfterMultiplePublishes()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.AddRange(
                new MobileBuild { Id = 41, TenantId = "socofeb", Version = "1.0.0", BuildNumber = 1, Status = MobileBuildStatus.Succeeded, ArtifactPath = "p1.apk", ArtifactSize = 100, Sha256 = "s1", IsActive = true },
                new MobileBuild { Id = 42, TenantId = "socofeb", Version = "1.0.1", BuildNumber = 2, Status = MobileBuildStatus.Succeeded, ArtifactPath = "p2.apk", ArtifactSize = 100, Sha256 = "s2", IsActive = true },
                new MobileBuild { Id = 43, TenantId = "socofeb", Version = "1.0.2", BuildNumber = 3, Status = MobileBuildStatus.Succeeded, ArtifactPath = "p3.apk", ArtifactSize = 100, Sha256 = "s3", IsActive = true }
            );
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act: Publish 41, then 42, then 43
            await controller.PublishBuild(41);
            await controller.PublishBuild(42);
            await controller.PublishBuild(43);

            // Assert: Exactly ONE current release exists for socofeb
            var currentReleases = await masterDb.MobileReleases.Where(r => r.TenantId == "socofeb" && r.IsCurrent).ToListAsync();
            Assert.Single(currentReleases);
            Assert.Equal(43, currentReleases[0].MobileBuildId);
        }

        [Fact]
        public async Task PublishBuild_ReleaseSwitch_IsAtomic()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 50,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 1,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/1/app.apk",
                ArtifactSize = 100,
                Sha256 = "s1",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Publish first build
            await controller.PublishBuild(50);
            var firstRelease = await masterDb.MobileReleases.FirstAsync(r => r.MobileBuildId == 50);
            Assert.True(firstRelease.IsCurrent);

            // Attempt to publish an invalid build (Pending)
            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 51,
                TenantId = "socofeb",
                Version = "1.1.0",
                BuildNumber = 2,
                Status = MobileBuildStatus.Pending,
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var failedResult = await controller.PublishBuild(51);
            Assert.IsType<BadRequestObjectResult>(failedResult.Result);

            // Assert: Initial release remains untouched and current (atomic state preserved)
            var current = await masterDb.MobileReleases.FirstOrDefaultAsync(r => r.TenantId == "socofeb" && r.IsCurrent);
            Assert.NotNull(current);
            Assert.Equal(50, current!.MobileBuildId);
        }

        [Fact]
        public async Task PublishBuild_ConcurrentPublishes_DoNotCreateMultipleCurrentReleases()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.AddRange(
                new MobileBuild { Id = 61, TenantId = "socofeb", Version = "1.0.0", BuildNumber = 1, Status = MobileBuildStatus.Succeeded, ArtifactPath = "a.apk", ArtifactSize = 100, Sha256 = "s1", IsActive = true },
                new MobileBuild { Id = 62, TenantId = "socofeb", Version = "1.0.1", BuildNumber = 2, Status = MobileBuildStatus.Succeeded, ArtifactPath = "b.apk", ArtifactSize = 100, Sha256 = "s2", IsActive = true }
            );
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

            var controller = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Act: Run concurrent publish calls for the same tenant
            var task1 = controller.PublishBuild(61);
            var task2 = controller.PublishBuild(62);

            await Task.WhenAll(task1, task2);

            // Assert: Exactly ONE current release exists
            var currentReleases = await masterDb.MobileReleases.Where(r => r.TenantId == "socofeb" && r.IsCurrent).ToListAsync();
            Assert.Single(currentReleases);
        }

        [Fact]
        public async Task RequestDownload_OnPublishedRelease_ShouldReturnTemporaryDownloadUrl()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateInMemoryMasterDb(dbName);
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socofeb" };
            var woodDb = CreateInMemoryWoodAppDb(dbName, tenantContext);

            masterDb.MobileBuilds.Add(new MobileBuild
            {
                Id = 70,
                TenantId = "socofeb",
                Version = "1.0.0",
                BuildNumber = 3,
                Status = MobileBuildStatus.Succeeded,
                ArtifactPath = "socofeb/3/SOCOFEB-1.0.0-3.apk",
                ArtifactSize = 58698477,
                Sha256 = "a6b339528789821b35cac56d83b4122f46b1ee8d1b85c3f4f15b1ae62af47005",
                IsActive = true
            });
            await masterDb.SaveChangesAsync();

            var storageMock = new Mock<IMobileArtifactStorage>();
            storageMock.Setup(s => s.ArtifactExistsAsync("socofeb/3/SOCOFEB-1.0.0-3.apk", default)).ReturnsAsync(true);

            var adminController = CreateAdminBuildsController(masterDb, woodDb, storageMock);

            // Publish build 70
            var publishResult = await adminController.PublishBuild(70);
            var okPublish = Assert.IsType<OkObjectResult>(publishResult.Result);
            var releaseDto = Assert.IsType<MobileReleaseDto>(okPublish.Value);

            // Act: Request download on the resulting MobileRelease.Id
            var tokenService = new MobileDownloadTokenService(_configuration);
            var configService = new MobileTenantConfigService(masterDb, woodDb, _configuration);
            var loggerMock = new Mock<ILogger<MobileBuildService>>();
            var buildService = new MobileBuildService(masterDb, woodDb, storageMock.Object, tokenService, configService, loggerMock.Object);

            var tenantController = new MobileReleasesController(buildService, tenantContext, new Mock<ILogger<MobileReleasesController>>().Object);
            tenantController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "99"),
                        new Claim("tenant_slug", "socofeb")
                    }, "TestAuth"))
                }
            };

            var downloadResult = await tenantController.RequestDownload(releaseDto.Id);

            // Assert
            var okDownload = Assert.IsType<OkObjectResult>(downloadResult.Result);
            var downloadResponse = Assert.IsType<MobileDownloadResponseDto>(okDownload.Value);

            Assert.Equal("socofeb", downloadResponse.TenantId);
            Assert.Equal("1.0.0", downloadResponse.Version);
            Assert.Contains("/api/mobile/releases/download?token=", downloadResponse.DownloadUrl);
        }

        [Theory]
        [InlineData("/api/admin/mobile/releases/current")]
        [InlineData("/api/admin/mobile/releases")]
        [InlineData("/api/admin/mobile/builds")]
        [InlineData("/api/mobile/releases/download")]
        public async Task TenantMiddleware_BypassesTenantResolution_ForAdminMobileAndDownloadRoutes(string path)
        {
            // Arrange
            var nextCalled = false;
            RequestDelegate next = (ctx) =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            };

            var loggerMock = new Mock<ILogger<TenantMiddleware>>();
            var middleware = new TenantMiddleware(next, loggerMock.Object);

            var context = new DefaultHttpContext();
            context.Request.Path = path;

            var resolverMock = new Mock<ITenantResolver>();
            var tenantContext = new TenantContext();
            var masterDb = CreateInMemoryMasterDb(Guid.NewGuid().ToString());

            // Act
            await middleware.InvokeAsync(context, resolverMock.Object, tenantContext, masterDb);

            // Assert: next was invoked directly without needing resolver
            Assert.True(nextCalled);
            resolverMock.Verify(r => r.ResolveTenantSlug(It.IsAny<HttpContext>()), Times.Never);
        }

        #endregion
    }
}


