using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class EnterpriseProvisioningRegressionTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        private IConfiguration CreateTestConfiguration()
        {
            var inMemorySettings = new Dictionary<string, string?>
            {
                { "ConnectionStrings:MasterConnection", "Host=localhost;Database=testdb;Username=test;Password=test" },
                { "ConnectionStrings:DefaultTenantConnection", "Host=localhost;Database=testdb;Username=test;Password=test" }
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();
        }

        private static (byte[] Hash, byte[] Salt, string Base64Hash, string Base64Salt) CreateRegistrationHashAndSalt(string plaintextPassword)
        {
            using var hmac = new HMACSHA512();
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(plaintextPassword));
            var salt = hmac.Key;
            return (hash, salt, Convert.ToBase64String(hash), Convert.ToBase64String(salt));
        }

        private static bool VerifyTenantLoginCompatibility(string candidatePassword, byte[] storedHash, byte[] storedSalt)
        {
            using var hmac = new HMACSHA512(storedSalt);
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(candidatePassword));
            return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
        }

        #region 1. Pending Registration with null AdminPassword & Stored Hash/Salt

        [Fact]
        public async Task Create_PendingRegistration_WithNullAdminPasswordAndStoredHash_SucceedsAndReusesHashWithoutRehashing()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            const string customerPlaintextPassword = "CustomerChosenPass2026!";
            var (expectedHash, expectedSalt, base64Hash, base64Salt) = CreateRegistrationHashAndSalt(customerPlaintextPassword);

            var registrationNotesJson = JsonSerializer.Serialize(new
            {
                name = "Bois Elance SARL",
                matriculeFiscal = "1234567/A/M/000",
                user = new
                {
                    name = "amine.klabi",
                    surname = "Amine",
                    email = "amine@boiselance.tn",
                    password = (string?)null,
                    passwordHash = base64Hash,
                    passwordSalt = base64Salt,
                    role = "20"
                }
            });

            var pendingEnterprise = new MasterEnterprise
            {
                Id = 101,
                Name = "Bois Elance SARL",
                Slug = "bois-elance-sarl",
                Email = "amine@boiselance.tn",
                SchemaName = "tenant_bois_elance_sarl",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Trial,
                Status = TenantStatus.Pending,
                Notes = registrationNotesJson
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(101)).ReturnsAsync(pendingEnterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            TenantProvisionDetails? capturedDetails = null;
            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .Callback<MasterEnterprise, TenantProvisionDetails>((_, details) => capturedDetails = details)
                .ReturnsAsync(true);

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            // Simulate exact JSON payload sent by admin-elance-front handleCreateAndProvision
            var rawFrontendJson = @"{
                ""existingId"": 101,
                ""name"": ""Bois Elance SARL"",
                ""slug"": ""bois-elance-sarl"",
                ""email"": ""amine@boiselance.tn"",
                ""adminUsername"": ""amine.klabi"",
                ""adminEmail"": ""amine@boiselance.tn"",
                ""adminPassword"": null,
                ""hasAdminPasswordOverride"": false
            }";

            var request = JsonSerializer.Deserialize<CreateTenantRequest>(rawFrontendJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            })!;

            // Verify DTO validation does not fail when AdminPassword is null
            var validationResults = new List<ValidationResult>();
            bool isModelValid = Validator.TryValidateObject(request, new ValidationContext(request), validationResults, validateAllProperties: true);
            Assert.True(isModelValid);
            Assert.Empty(validationResults);

            // Act
            var result = await controller.Create(request);

            // Assert
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var provisionedEnterprise = Assert.IsType<MasterEnterprise>(createdResult.Value);
            Assert.True(provisionedEnterprise.IsActive);
            Assert.Equal(TenantStatus.Trial, provisionedEnterprise.Status);

            Assert.NotNull(capturedDetails);
            Assert.Null(capturedDetails!.AdminPassword);
            Assert.NotNull(capturedDetails.PrecomputedPasswordHash);
            Assert.NotNull(capturedDetails.PrecomputedPasswordSalt);

            // Verify TenantProvisioningService reuses the exact hash & salt bytes without re-hashing
            var (resolvedHash, resolvedSalt) = TenantProvisioningService.ResolveAdminCredentials(capturedDetails);
            Assert.Equal(expectedHash, resolvedHash);
            Assert.Equal(expectedSalt, resolvedSalt);

            // Verify tenant login compatibility with original customer password
            Assert.True(VerifyTenantLoginCompatibility(customerPlaintextPassword, resolvedHash, resolvedSalt));

            // Verify all credentials (password, passwordHash, passwordSalt, hasPassword) are scrubbed from Notes after activation
            Assert.NotNull(provisionedEnterprise.Notes);
            Assert.DoesNotContain("passwordHash", provisionedEnterprise.Notes!);
            Assert.DoesNotContain("passwordSalt", provisionedEnterprise.Notes!);
            Assert.DoesNotContain("hasPassword", provisionedEnterprise.Notes!);
            Assert.DoesNotContain(base64Hash, provisionedEnterprise.Notes!);
        }

        #endregion

        #region 2. Pending Registration with Password Override

        [Fact]
        public async Task Create_PendingRegistration_WithPasswordOverride_HashesNewPasswordOnceAndPreservesLoginCompatibility()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            const string originalPassword = "OriginalCustomerPass123!";
            const string overridePassword = "AdminReplacementPass456!";
            var (originalHash, originalSalt, base64Hash, base64Salt) = CreateRegistrationHashAndSalt(originalPassword);

            var pendingEnterprise = new MasterEnterprise
            {
                Id = 102,
                Name = "Override Timber Co",
                Slug = "override-timber",
                Email = "contact@overridetimber.tn",
                SchemaName = "tenant_override_timber",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Starter,
                Status = TenantStatus.Pending,
                Notes = JsonSerializer.Serialize(new
                {
                    name = "Override Timber Co",
                    user = new
                    {
                        name = "admin.override",
                        email = "contact@overridetimber.tn",
                        passwordHash = base64Hash,
                        passwordSalt = base64Salt
                    }
                })
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(102)).ReturnsAsync(pendingEnterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            TenantProvisionDetails? capturedDetails = null;
            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .Callback<MasterEnterprise, TenantProvisionDetails>((_, details) => capturedDetails = details)
                .ReturnsAsync(true);

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = 102,
                Name = "Override Timber Co",
                Slug = "override-timber",
                Email = "contact@overridetimber.tn",
                Plan = TenantPlan.Starter,
                AdminUsername = "admin.override",
                AdminEmail = "contact@overridetimber.tn",
                AdminPassword = overridePassword,
                HasAdminPasswordOverride = true
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            Assert.IsType<CreatedAtActionResult>(result);
            Assert.NotNull(capturedDetails);
            Assert.Equal(overridePassword, capturedDetails!.AdminPassword);
            Assert.Null(capturedDetails.PrecomputedPasswordHash);
            Assert.Null(capturedDetails.PrecomputedPasswordSalt);

            var (resolvedHash, resolvedSalt) = TenantProvisioningService.ResolveAdminCredentials(capturedDetails);
            Assert.NotEqual(originalHash, resolvedHash);
            Assert.NotEqual(originalSalt, resolvedSalt);

            // New override password authenticates; old registration password does not
            Assert.True(VerifyTenantLoginCompatibility(overridePassword, resolvedHash, resolvedSalt));
            Assert.False(VerifyTenantLoginCompatibility(originalPassword, resolvedHash, resolvedSalt));
        }

        #endregion

        #region 3. Pending Registration with Legacy Plaintext Credentials

        [Fact]
        public async Task Create_PendingRegistration_WithLegacyPlaintextPassword_PreservesBackwardCompatibility()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            const string legacyPlaintext = "LegacyRegistrationPass99!";
            var pendingEnterprise = new MasterEnterprise
            {
                Id = 103,
                Name = "Legacy Wood SARL",
                Slug = "legacy-wood",
                Email = "admin@legacywood.tn",
                SchemaName = "tenant_legacy_wood",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Trial,
                Status = TenantStatus.Pending,
                Notes = JsonSerializer.Serialize(new
                {
                    name = "Legacy Wood SARL",
                    user = new
                    {
                        name = "legacy.admin",
                        email = "admin@legacywood.tn",
                        password = legacyPlaintext
                    }
                })
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(103)).ReturnsAsync(pendingEnterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            TenantProvisionDetails? capturedDetails = null;
            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .Callback<MasterEnterprise, TenantProvisionDetails>((_, details) => capturedDetails = details)
                .ReturnsAsync(true);

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = 103,
                Name = "Legacy Wood SARL",
                Slug = "legacy-wood",
                Email = "admin@legacywood.tn",
                AdminUsername = "legacy.admin",
                AdminEmail = "admin@legacywood.tn",
                AdminPassword = null,
                HasAdminPasswordOverride = false
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var provisionedEnterprise = Assert.IsType<MasterEnterprise>(createdResult.Value);

            Assert.NotNull(capturedDetails);
            Assert.Equal(legacyPlaintext, capturedDetails!.AdminPassword);
            Assert.Null(capturedDetails.PrecomputedPasswordHash);
            Assert.Null(capturedDetails.PrecomputedPasswordSalt);

            var (resolvedHash, resolvedSalt) = TenantProvisioningService.ResolveAdminCredentials(capturedDetails);
            Assert.True(VerifyTenantLoginCompatibility(legacyPlaintext, resolvedHash, resolvedSalt));
            Assert.DoesNotContain(legacyPlaintext, provisionedEnterprise.Notes ?? "");
        }

        #endregion

        #region 4. Pending Registration Without Any Valid Credentials

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("Freeform admin note without JSON")]
        [InlineData(@"{""name"":""Missing User Corp""}")]
        [InlineData(@"{""name"":""Empty User Corp"",""user"":{""name"":""admin"",""email"":""a@b.com"",""password"":null}}")]
        public async Task Create_PendingRegistration_WithoutValidCredentials_ReturnsBadRequestAndRemainsPending(string? notesWithoutCredentials)
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var pendingEnterprise = new MasterEnterprise
            {
                Id = 104,
                Name = "Missing Creds Corp",
                Slug = "missing-creds",
                Email = "contact@missingcreds.tn",
                SchemaName = "tenant_missing_creds",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Trial,
                Status = TenantStatus.Pending,
                Notes = notesWithoutCredentials
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(104)).ReturnsAsync(pendingEnterprise);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = 104,
                Name = "Missing Creds Corp",
                Slug = "missing-creds",
                Email = "contact@missingcreds.tn",
                AdminUsername = "admin",
                AdminEmail = "contact@missingcreds.tn",
                AdminPassword = null,
                HasAdminPasswordOverride = false
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("credentials", badRequest.Value?.ToString() ?? "", StringComparison.OrdinalIgnoreCase);

            // Provisioning must never be invoked and enterprise must remain Pending & inactive
            provisioningMock.Verify(
                p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()),
                Times.Never
            );
            repoMock.Verify(r => r.UpdateAsync(It.IsAny<MasterEnterprise>()), Times.Never);
            Assert.False(pendingEnterprise.IsActive);
            Assert.Equal(TenantStatus.Pending, pendingEnterprise.Status);
        }

        #endregion

        #region 5. Manual Enterprise Creation with Explicit Password

        [Fact]
        public async Task Create_ManualEnterprise_WithExplicitPassword_SucceedsAndUsesProvidedPassword()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            const string explicitPassword = "ManualAdminPassword2026!";

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock
                .Setup(r => r.AddAsync(It.IsAny<MasterEnterprise>()))
                .ReturnsAsync((MasterEnterprise e) =>
                {
                    e.Id = 201;
                    return e;
                });
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            TenantProvisionDetails? capturedDetails = null;
            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .Callback<MasterEnterprise, TenantProvisionDetails>((_, details) => capturedDetails = details)
                .ReturnsAsync(true);

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = null,
                Name = "Manual Wood Enterprise",
                Slug = "manual-wood",
                Email = "contact@manualwood.tn",
                Plan = TenantPlan.Pro,
                AdminUsername = "manual.admin",
                AdminEmail = "admin@manualwood.tn",
                AdminPassword = explicitPassword,
                HasAdminPasswordOverride = true
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var createdEnterprise = Assert.IsType<MasterEnterprise>(createdResult.Value);
            Assert.True(createdEnterprise.IsActive);
            Assert.Equal(TenantStatus.Active, createdEnterprise.Status);

            Assert.NotNull(capturedDetails);
            Assert.Equal(explicitPassword, capturedDetails!.AdminPassword);
            Assert.Null(capturedDetails.PrecomputedPasswordHash);
            Assert.Null(capturedDetails.PrecomputedPasswordSalt);

            var (resolvedHash, resolvedSalt) = TenantProvisioningService.ResolveAdminCredentials(capturedDetails);
            Assert.True(VerifyTenantLoginCompatibility(explicitPassword, resolvedHash, resolvedSalt));
        }

        #endregion

        #region 6. Manual Enterprise Creation without Explicit Password

        [Fact]
        public async Task Create_ManualEnterprise_WithoutExplicitPassword_SucceedsAndGeneratesPassword()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock
                .Setup(r => r.AddAsync(It.IsAny<MasterEnterprise>()))
                .ReturnsAsync((MasterEnterprise e) =>
                {
                    e.Id = 202;
                    return e;
                });
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            TenantProvisionDetails? capturedDetails = null;
            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .Callback<MasterEnterprise, TenantProvisionDetails>((_, details) => capturedDetails = details)
                .ReturnsAsync(true);

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = null,
                Name = "Auto Password Enterprise",
                Slug = "auto-password-ent",
                Email = "contact@autopass.tn",
                Plan = TenantPlan.Trial,
                AdminUsername = "admin",
                AdminEmail = "admin@autopass.tn",
                AdminPassword = null,
                HasAdminPasswordOverride = false
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var createdEnterprise = Assert.IsType<MasterEnterprise>(createdResult.Value);
            Assert.True(createdEnterprise.IsActive);

            Assert.NotNull(capturedDetails);
            Assert.False(string.IsNullOrWhiteSpace(capturedDetails!.AdminPassword));
            Assert.True(capturedDetails.AdminPassword!.Length >= 8);
            Assert.Null(capturedDetails.PrecomputedPasswordHash);
            Assert.Null(capturedDetails.PrecomputedPasswordSalt);

            var (resolvedHash, resolvedSalt) = TenantProvisioningService.ResolveAdminCredentials(capturedDetails);
            Assert.True(VerifyTenantLoginCompatibility(capturedDetails.AdminPassword!, resolvedHash, resolvedSalt));
        }

        #endregion

        #region 7. Invalid Password Override Rejection

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("    ")]
        [InlineData("short")]
        [InlineData("1234567")]
        public async Task Create_WithInvalidPasswordOverride_ReturnsBadRequestAndDoesNotProvision(string? invalidOverridePassword)
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var (_, _, base64Hash, base64Salt) = CreateRegistrationHashAndSalt("ValidOriginalPass123!");
            var pendingEnterprise = new MasterEnterprise
            {
                Id = 107,
                Name = "Invalid Override Corp",
                Slug = "invalid-override",
                Email = "contact@invalidoverride.tn",
                SchemaName = "tenant_invalid_override",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Trial,
                Status = TenantStatus.Pending,
                Notes = JsonSerializer.Serialize(new
                {
                    name = "Invalid Override Corp",
                    user = new
                    {
                        name = "admin",
                        email = "contact@invalidoverride.tn",
                        passwordHash = base64Hash,
                        passwordSalt = base64Salt
                    }
                })
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(107)).ReturnsAsync(pendingEnterprise);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = 107,
                Name = "Invalid Override Corp",
                Slug = "invalid-override",
                Email = "contact@invalidoverride.tn",
                AdminUsername = "admin",
                AdminEmail = "contact@invalidoverride.tn",
                AdminPassword = invalidOverridePassword,
                HasAdminPasswordOverride = true
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
            provisioningMock.Verify(
                p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()),
                Times.Never
            );
            repoMock.Verify(r => r.UpdateAsync(It.IsAny<MasterEnterprise>()), Times.Never);
            Assert.False(pendingEnterprise.IsActive);
            Assert.Equal(TenantStatus.Pending, pendingEnterprise.Status);
        }

        [Fact]
        public async Task Create_WhenProvisioningFailsForPendingRegistration_PreservesCredentialsInNotesForRetry()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var (_, _, base64Hash, base64Salt) = CreateRegistrationHashAndSalt("RetryablePass2026!");
            var originalNotes = JsonSerializer.Serialize(new
            {
                name = "Retry Corp",
                user = new
                {
                    name = "retry.admin",
                    email = "admin@retrycorp.tn",
                    passwordHash = base64Hash,
                    passwordSalt = base64Salt
                }
            });

            var pendingEnterprise = new MasterEnterprise
            {
                Id = 108,
                Name = "Retry Corp",
                Slug = "retry-corp",
                Email = "admin@retrycorp.tn",
                SchemaName = "tenant_retry_corp",
                ConnectionString = "Host=localhost;Database=testdb;Username=test;Password=test",
                IsActive = false,
                Plan = TenantPlan.Trial,
                Status = TenantStatus.Pending,
                Notes = originalNotes
            };
            context.Enterprises.Add(pendingEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(108)).ReturnsAsync(pendingEnterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.ProvisionTenantAsync(It.IsAny<MasterEnterprise>(), It.IsAny<TenantProvisionDetails>()))
                .ReturnsAsync(false); // Simulate database failure

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new CreateTenantRequest
            {
                ExistingId = 108,
                Name = "Retry Corp",
                Slug = "retry-corp",
                Email = "admin@retrycorp.tn",
                AdminUsername = "retry.admin",
                AdminEmail = "admin@retrycorp.tn",
                AdminPassword = null,
                HasAdminPasswordOverride = false,
                Notes = @"{""name"":""Retry Corp"",""user"":{""name"":""retry.admin"",""hasPassword"":true}}" // Sanitized notes from UI
            };

            // Act
            var result = await controller.Create(request);

            // Assert
            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, statusResult.StatusCode);
            Assert.False(pendingEnterprise.IsActive);
            Assert.Equal(TenantStatus.Pending, pendingEnterprise.Notes != null ? pendingEnterprise.Status : TenantStatus.Active);

            // Credentials in Notes must remain intact so subsequent retry succeeds
            Assert.NotNull(pendingEnterprise.Notes);
            using var notesDoc = JsonDocument.Parse(pendingEnterprise.Notes!);
            var userObj = notesDoc.RootElement.GetProperty("user");
            Assert.Equal(base64Hash, userObj.GetProperty("passwordHash").GetString());
            Assert.Equal(base64Salt, userObj.GetProperty("passwordSalt").GetString());
        }

        #endregion
    }
}
