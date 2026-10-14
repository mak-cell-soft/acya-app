using Microsoft.AspNetCore.Http;
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
using ms.admin.api.acya.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class ProductionFeatureActivationTests
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
                { "ClientJwtSettings:Secret", "SuperSecretKeyForTestingClientTokensOnly12345!" },
                { "JWTSettings:securityKey", "SuperSecretKeyForTestingClientTokensOnly12345!" }
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();
        }

        #region 1. Already Migrated Tenant

        [Fact]
        public async Task Update_WhenAlreadyMigrated_SucceedsAndEnablesFeature()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 1,
                Name = "Socobois",
                Slug = "socobois",
                SchemaName = "tenant_socobois",
                IsActive = true,
                IsManagingProduction = false // Currently disabled
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(enterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.EnsureProductionLaborSchemaAsync("tenant_socobois"))
                .ReturnsAsync(new ProductionActivationResult
                {
                    Success = true,
                    AlreadyMigrated = true
                });

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new UpdateEnterpriseRequest
            {
                Name = "Socobois",
                IsManagingProduction = true // Transitioning from false to true
            };

            // Act
            var actionResult = await controller.Update(1, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var updated = Assert.IsType<MasterEnterprise>(okResult.Value);
            Assert.True(updated.IsManagingProduction);

            // Verify provisioning service was called once for this schema
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync("tenant_socobois"), Times.Once);
            repoMock.Verify(r => r.UpdateAsync(It.Is<MasterEnterprise>(e => e.IsManagingProduction == true)), Times.Once);
        }

        #endregion

        #region 2. Legacy Tenant Missing Required Tables

        [Fact]
        public async Task Update_WhenLegacyTenantMissingTables_AppliesMigrationAndEnablesFeature()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 2,
                Name = "Legacy Bois",
                Slug = "legacy-bois",
                SchemaName = "tenant_legacy_bois",
                IsActive = true,
                IsManagingProduction = false
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(enterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.EnsureProductionLaborSchemaAsync("tenant_legacy_bois"))
                .ReturnsAsync(new ProductionActivationResult
                {
                    Success = true,
                    AlreadyMigrated = false // Migration applied
                });

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new UpdateEnterpriseRequest
            {
                Name = "Legacy Bois",
                IsManagingProduction = true
            };

            // Act
            var actionResult = await controller.Update(2, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var updated = Assert.IsType<MasterEnterprise>(okResult.Value);
            Assert.True(updated.IsManagingProduction);

            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync("tenant_legacy_bois"), Times.Once);
            repoMock.Verify(r => r.UpdateAsync(It.Is<MasterEnterprise>(e => e.IsManagingProduction == true)), Times.Once);
        }

        #endregion

        #region 3. Migration Failure & Data Preservation

        [Fact]
        public async Task Update_WhenMigrationFails_Returns500AndFeatureRemainsDisabled()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 3,
                Name = "Faulty Tenant",
                Slug = "faulty-tenant",
                SchemaName = "tenant_faulty",
                IsActive = true,
                IsManagingProduction = false,
                Notes = "Preserve this original note"
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(enterprise);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.EnsureProductionLaborSchemaAsync("tenant_faulty"))
                .ReturnsAsync(new ProductionActivationResult
                {
                    Success = false,
                    ErrorMessage = "Foreign key reference 'production_steps' does not exist."
                });

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new UpdateEnterpriseRequest
            {
                Name = "Faulty Tenant",
                IsManagingProduction = true,
                Notes = "Altered note should not be saved if migration fails"
            };

            // Act
            var actionResult = await controller.Update(3, request);

            // Assert
            var statusResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status500InternalServerError, statusResult.StatusCode);

            // Verify enterprise state was preserved and feature NOT enabled in repository
            Assert.False(enterprise.IsManagingProduction);
            Assert.Equal("Preserve this original note", enterprise.Notes);
            repoMock.Verify(r => r.UpdateAsync(It.IsAny<MasterEnterprise>()), Times.Never);
        }

        #endregion

        #region 4. Repeated Activation Safety & Idempotence

        [Fact]
        public async Task Update_RepeatedActivation_WhenAlreadyEnabled_DoesNotReinvokeMigration()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 4,
                Name = "Already Active",
                Slug = "already-active",
                SchemaName = "tenant_already_active",
                IsActive = true,
                IsManagingProduction = true // Already enabled
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(4)).ReturnsAsync(enterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

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

            var request = new UpdateEnterpriseRequest
            {
                Name = "Already Active Updated Name",
                IsManagingProduction = true // Kept true
            };

            // Act
            var actionResult = await controller.Update(4, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var updated = Assert.IsType<MasterEnterprise>(okResult.Value);
            Assert.True(updated.IsManagingProduction);
            Assert.Equal("Already Active Updated Name", updated.Name);

            // Since it was already enabled, migration gate is not re-invoked
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync(It.IsAny<string>()), Times.Never);
            repoMock.Verify(r => r.UpdateAsync(It.IsAny<MasterEnterprise>()), Times.Once);
        }

        [Fact]
        public async Task Update_ReEnablingAfterDisable_SafelyReverifiesAndEnables()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 5,
                Name = "Toggle Tenant",
                Slug = "toggle-tenant",
                SchemaName = "tenant_toggle",
                IsActive = true,
                IsManagingProduction = false // Was disabled
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(enterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.EnsureProductionLaborSchemaAsync("tenant_toggle"))
                .ReturnsAsync(new ProductionActivationResult
                {
                    Success = true,
                    AlreadyMigrated = true // Schema already intact from previous activation
                });

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new UpdateEnterpriseRequest
            {
                Name = "Toggle Tenant",
                IsManagingProduction = true
            };

            // Act
            var actionResult = await controller.Update(5, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var updated = Assert.IsType<MasterEnterprise>(okResult.Value);
            Assert.True(updated.IsManagingProduction);

            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync("tenant_toggle"), Times.Once);
            repoMock.Verify(r => r.UpdateAsync(It.Is<MasterEnterprise>(e => e.IsManagingProduction == true)), Times.Once);
        }

        #endregion

        #region 5. Invalid Tenant Schema Input

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        [InlineData("tenant-with-hyphens")]
        [InlineData("tenant; DROP TABLE tbl_enterprise;")]
        [InlineData("tenant' OR '1'='1")]
        [InlineData("tenant/slash")]
        public async Task Update_WithInvalidSchemaName_ReturnsBadRequestAndDoesNotEnable(string? invalidSchema)
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 6,
                Name = "Bad Schema Corp",
                Slug = "bad-schema",
                SchemaName = "tenant_placeholder",
                IsActive = true,
                IsManagingProduction = false
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            // Set the invalid schema under test
            enterprise.SchemaName = invalidSchema!;

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(6)).ReturnsAsync(enterprise);

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

            var request = new UpdateEnterpriseRequest
            {
                Name = "Bad Schema Corp",
                IsManagingProduction = true
            };

            // Act
            var actionResult = await controller.Update(6, request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(actionResult);
            Assert.Contains("invalid", badRequestResult.Value?.ToString() ?? "", StringComparison.OrdinalIgnoreCase);

            // Feature must remain disabled, provisioning never called
            Assert.False(enterprise.IsManagingProduction);
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync(It.IsAny<string>()), Times.Never);
            repoMock.Verify(r => r.UpdateAsync(It.IsAny<MasterEnterprise>()), Times.Never);
        }

        #endregion

        #region 6. Tenant Isolation: Only Target Tenant Handled

        [Fact]
        public async Task Update_OnlyTargetsRequestedTenantSchema_OtherTenantsUntouched()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var targetEnterprise = new MasterEnterprise
            {
                Id = 10,
                Name = "Target Tenant",
                Slug = "target-tenant",
                SchemaName = "tenant_target",
                IsActive = true,
                IsManagingProduction = false
            };

            var otherEnterprise = new MasterEnterprise
            {
                Id = 20,
                Name = "Other Tenant",
                Slug = "other-tenant",
                SchemaName = "tenant_other",
                IsActive = true,
                IsManagingProduction = false
            };

            context.Enterprises.AddRange(targetEnterprise, otherEnterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(targetEnterprise);
            repoMock.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(otherEnterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

            var provisioningMock = new Mock<ITenantProvisioningService>();
            provisioningMock
                .Setup(p => p.EnsureProductionLaborSchemaAsync("tenant_target"))
                .ReturnsAsync(new ProductionActivationResult { Success = true, AlreadyMigrated = true });

            var emailMock = new Mock<IEmailService>();
            var controller = new EnterpriseController(
                repoMock.Object,
                provisioningMock.Object,
                context,
                config,
                emailMock.Object,
                NullLogger<EnterpriseController>.Instance
            );

            var request = new UpdateEnterpriseRequest
            {
                Name = "Target Tenant",
                IsManagingProduction = true
            };

            // Act
            var result = await controller.Update(10, request);

            // Assert
            Assert.IsType<OkObjectResult>(result);

            // Verify only tenant_target was passed to EnsureProductionLaborSchemaAsync
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync("tenant_target"), Times.Once);
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync("tenant_other"), Times.Never);

            // Other tenant remains unchanged and disabled
            Assert.False(otherEnterprise.IsManagingProduction);
        }

        #endregion

        #region 7. Disabling Production Does Not Trigger Migration

        [Fact]
        public async Task Update_DisablingProduction_DoesNotTriggerMigration()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var config = CreateTestConfiguration();

            var enterprise = new MasterEnterprise
            {
                Id = 7,
                Name = "Disabling Tenant",
                Slug = "disabling-tenant",
                SchemaName = "tenant_disabling",
                IsActive = true,
                IsManagingProduction = true // Currently true
            };
            context.Enterprises.Add(enterprise);
            await context.SaveChangesAsync();

            var repoMock = new Mock<IEnterpriseRepository>();
            repoMock.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(enterprise);
            repoMock.Setup(r => r.UpdateAsync(It.IsAny<MasterEnterprise>())).Returns(Task.CompletedTask);

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

            var request = new UpdateEnterpriseRequest
            {
                Name = "Disabling Tenant",
                IsManagingProduction = false // Transitioning from true to false
            };

            // Act
            var actionResult = await controller.Update(7, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var updated = Assert.IsType<MasterEnterprise>(okResult.Value);
            Assert.False(updated.IsManagingProduction);

            // Migration is not triggered on disable
            provisioningMock.Verify(p => p.EnsureProductionLaborSchemaAsync(It.IsAny<string>()), Times.Never);
            repoMock.Verify(r => r.UpdateAsync(It.Is<MasterEnterprise>(e => e.IsManagingProduction == false)), Times.Once);
        }

        #endregion

        #region 8. SQL Migration Targeting & Safe Identifier Rules

        [Fact]
        public void AuthoritativeMigration_SingleTenantTargeting_CorrectlyReplacesMultiTenantLoop()
        {
            // Read authoritative migration file from wood-app.api/db/wood/v0.39/01_add_production_labor_tracking.sql
            var currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string? migrationPath = null;
            while (currentDir != null)
            {
                var candidate1 = Path.Combine(currentDir, "wood-app.api", "db", "wood", "v0.39", "01_add_production_labor_tracking.sql");
                if (File.Exists(candidate1)) { migrationPath = candidate1; break; }

                var candidate2 = Path.Combine(currentDir, "db", "wood", "v0.39", "01_add_production_labor_tracking.sql");
                if (File.Exists(candidate2)) { migrationPath = candidate2; break; }

                currentDir = Directory.GetParent(currentDir)?.FullName;
            }

            Assert.NotNull(migrationPath);
            Assert.True(File.Exists(migrationPath), $"Migration file must exist at {migrationPath}");

            var rawSql = File.ReadAllText(migrationPath);
            Assert.Contains("production_step_workers", rawSql);
            Assert.Contains("production_step_work_logs", rawSql);
            Assert.Contains("production_other_work_entries", rawSql);

            // Transform into single tenant execution
            string targetSchema = "tenant_socobois";
            var targetSchemaFilter = $"WHERE schema_name = '{targetSchema}'";
            var singleTenantSql = Regex.Replace(
                rawSql,
                @"WHERE\s+schema_name\s+LIKE\s+'tenant_%'\s+OR\s+schema_name\s*=\s*'public'",
                targetSchemaFilter,
                RegexOptions.IgnoreCase
            );

            // Verify single tenant target replaces the loop
            Assert.Contains(targetSchemaFilter, singleTenantSql);
            Assert.DoesNotContain("WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'", singleTenantSql);
            // Verify all DDLs are preserved
            Assert.Contains("CREATE TABLE IF NOT EXISTS production_step_workers", singleTenantSql);
            Assert.Contains("CREATE TABLE IF NOT EXISTS production_step_work_logs", singleTenantSql);
            Assert.Contains("CREATE TABLE IF NOT EXISTS production_other_work_entries", singleTenantSql);
            Assert.Contains("idx_step_workers_step", singleTenantSql);
            Assert.Contains("idx_work_logs_step_worker", singleTenantSql);
            Assert.Contains("idx_other_work_person_date", singleTenantSql);
        }

        [Theory]
        [InlineData("tenant_socobois", true)]
        [InlineData("tenant_123", true)]
        [InlineData("tenant_a_b_c", true)]
        [InlineData("public", true)]
        [InlineData("", false)]
        [InlineData("   ", false)]
        [InlineData(null, false)]
        [InlineData("tenant-socobois", false)]
        [InlineData("tenant.socobois", false)]
        [InlineData("tenant; DROP SCHEMA", false)]
        [InlineData("tenant' OR '1'='1", false)]
        public void SchemaSanitizer_ValidatesIdentifiersCorrectly(string? schemaName, bool expectedValid)
        {
            var isValid = SchemaSanitizer.IsValidIdentifier(schemaName);
            Assert.Equal(expectedValid, isValid);

            if (expectedValid)
            {
                var quoted = SchemaSanitizer.QuoteIdentifier(schemaName!);
                Assert.Equal($"\"{schemaName}\"", quoted);
            }
            else
            {
                if (schemaName != null)
                {
                    Assert.Throws<ArgumentException>(() => SchemaSanitizer.QuoteIdentifier(schemaName));
                }
            }
        }

        #endregion
    }
}
