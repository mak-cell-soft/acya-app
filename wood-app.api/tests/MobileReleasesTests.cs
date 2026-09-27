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
    }
}
