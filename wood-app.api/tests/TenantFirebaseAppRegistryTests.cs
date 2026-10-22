using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Services.Mobile;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class TenantFirebaseAppRegistryTests
    {
        private MasterDbContext CreateMasterDb(string dbName)
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            return new MasterDbContext(options);
        }

        private WoodAppContext CreateWoodAppDb(string dbName, string tenantSlug = "socofeb")
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

        [Fact]
        public void TenantFirebaseApp_DefaultValues_PendingStateNullableFields()
        {
            // Arrange & Act
            var app = new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois"
            };

            // Assert
            Assert.Equal("Pending", app.Status);
            Assert.Null(app.FirebaseAppId);
            Assert.Null(app.GoogleServicesJson);
            Assert.Null(app.Sha1Fingerprint);
            Assert.Null(app.Sha256Fingerprint);
            Assert.True(app.CreatedAt <= DateTime.UtcNow);
            Assert.True(app.UpdatedAt <= DateTime.UtcNow);
            Assert.Equal("socofeb", app.TenantId);
            Assert.Equal("acya-fcm-prod-dispatcher", app.FirebaseProjectId);
            Assert.Equal("com.socofeb.woodapp", app.PackageName);
            Assert.Equal("SOCOFEB Bois", app.DisplayName);
        }

        [Fact]
        public void MasterDbContext_TenantFirebaseApp_MappingConfiguration()
        {
            // Arrange
            var db = CreateMasterDb(Guid.NewGuid().ToString());
            var entityType = db.Model.FindEntityType(typeof(TenantFirebaseApp));

            // Assert
            Assert.NotNull(entityType);
            Assert.Equal("bo_tbl_tenant_firebase_apps", entityType!.GetTableName());
            Assert.Equal("public", entityType.GetSchema());

            // Key
            var pk = entityType.FindPrimaryKey();
            Assert.NotNull(pk);
            Assert.Single(pk!.Properties);
            Assert.Equal("Id", pk.Properties.First().Name);

            // Columns
            var tenantIdProp = entityType.FindProperty(nameof(TenantFirebaseApp.TenantId));
            Assert.NotNull(tenantIdProp);
            Assert.False(tenantIdProp!.IsNullable);
            Assert.Equal(100, tenantIdProp.GetMaxLength());

            var projectIdProp = entityType.FindProperty(nameof(TenantFirebaseApp.FirebaseProjectId));
            Assert.NotNull(projectIdProp);
            Assert.False(projectIdProp!.IsNullable);
            Assert.Equal(100, projectIdProp.GetMaxLength());

            var appIdProp = entityType.FindProperty(nameof(TenantFirebaseApp.FirebaseAppId));
            Assert.NotNull(appIdProp);
            Assert.True(appIdProp!.IsNullable);
            Assert.Equal(100, appIdProp.GetMaxLength());

            var packageProp = entityType.FindProperty(nameof(TenantFirebaseApp.PackageName));
            Assert.NotNull(packageProp);
            Assert.False(packageProp!.IsNullable);
            Assert.Equal(200, packageProp.GetMaxLength());

            var displayNameProp = entityType.FindProperty(nameof(TenantFirebaseApp.DisplayName));
            Assert.NotNull(displayNameProp);
            Assert.False(displayNameProp!.IsNullable);
            Assert.Equal(200, displayNameProp.GetMaxLength());

            var googleServicesProp = entityType.FindProperty(nameof(TenantFirebaseApp.GoogleServicesJson));
            Assert.NotNull(googleServicesProp);
            Assert.True(googleServicesProp!.IsNullable);

            var statusProp = entityType.FindProperty(nameof(TenantFirebaseApp.Status));
            Assert.NotNull(statusProp);
            Assert.False(statusProp!.IsNullable);
            Assert.Equal(50, statusProp.GetMaxLength());

            // Indexes
            var indexes = entityType.GetIndexes().ToList();
            var tenantIndex = indexes.FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(TenantFirebaseApp.TenantId)));
            Assert.NotNull(tenantIndex);
            Assert.True(tenantIndex!.IsUnique);
            Assert.Equal("uq_bo_tbl_tenant_firebase_apps_tenant", tenantIndex.GetDatabaseName());

            var packageIndex = indexes.FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(TenantFirebaseApp.PackageName)));
            Assert.NotNull(packageIndex);
            Assert.True(packageIndex!.IsUnique);
            Assert.Equal("uq_bo_tbl_tenant_firebase_apps_package", packageIndex.GetDatabaseName());

            var projectIndex = indexes.FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(TenantFirebaseApp.FirebaseProjectId)));
            Assert.NotNull(projectIndex);
            Assert.Equal("idx_bo_tbl_tenant_firebase_apps_project", projectIndex.GetDatabaseName());

            var statusIndex = indexes.FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(TenantFirebaseApp.Status)));
            Assert.NotNull(statusIndex);
            Assert.Equal("idx_bo_tbl_tenant_firebase_apps_status", statusIndex.GetDatabaseName());
        }

        [Fact]
        public void WoodAppContext_TenantFirebaseApp_MappingConfiguration()
        {
            // Arrange
            var db = CreateWoodAppDb(Guid.NewGuid().ToString(), "socofeb");
            var entityType = db.Model.FindEntityType(typeof(TenantFirebaseApp));

            // Assert
            Assert.NotNull(entityType);
            Assert.Equal("bo_tbl_tenant_firebase_apps", entityType!.GetTableName());
            Assert.Equal("public", entityType.GetSchema());
        }

        [Fact]
        public async Task MasterDbContext_CrudOperations_LifecycleTransition()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            using var db = CreateMasterDb(dbName);

            var firebaseApp = new TenantFirebaseApp
            {
                TenantId = "socofeb",
                FirebaseProjectId = "acya-fcm-prod-dispatcher",
                PackageName = "com.socofeb.woodapp",
                DisplayName = "SOCOFEB Bois",
                Status = "Pending"
            };

            // Act 1: Insert Pending
            await db.TenantFirebaseApps.AddAsync(firebaseApp);
            await db.SaveChangesAsync();

            // Assert 1: Query record
            var queried = await db.TenantFirebaseApps.FirstOrDefaultAsync(a => a.TenantId == "socofeb");
            Assert.NotNull(queried);
            Assert.Equal("Pending", queried!.Status);
            Assert.Null(queried.FirebaseAppId);
            Assert.Null(queried.GoogleServicesJson);

            // Act 2: Transition to Active with config
            queried.Status = "Active";
            queried.FirebaseAppId = "1:9988776655:android:1234abcd5678efgh";
            queried.GoogleServicesJson = "{\"project_info\":{\"project_id\":\"acya-fcm-prod-dispatcher\"}}";
            queried.Sha1Fingerprint = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD";
            queried.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Assert 2: Verify updated values
            using var dbVerify = CreateMasterDb(dbName);
            var updated = await dbVerify.TenantFirebaseApps.FirstOrDefaultAsync(a => a.TenantId == "socofeb");
            Assert.NotNull(updated);
            Assert.Equal("Active", updated!.Status);
            Assert.Equal("1:9988776655:android:1234abcd5678efgh", updated.FirebaseAppId);
            Assert.Contains("acya-fcm-prod-dispatcher", updated.GoogleServicesJson);
            Assert.NotNull(updated.Sha1Fingerprint);
        }

        [Fact]
        public void Migration_v041_FileIntegrity_And_NoTenantLoops()
        {
            // Locate migration file relative to execution directory
            var candidates = new[]
            {
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../db/wood/v0.41/01_create_tenant_firebase_apps.sql")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../db/wood/v0.41/01_create_tenant_firebase_apps.sql")),
                "/src/db/wood/v0.41/01_create_tenant_firebase_apps.sql",
                "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.41/01_create_tenant_firebase_apps.sql"
            };

            var migrationPath = candidates.FirstOrDefault(File.Exists);
            Assert.True(migrationPath != null, "Migration v0.41 file must exist on disk.");

            var sql = File.ReadAllText(migrationPath);

            // 1. Target table and schema
            Assert.Contains("CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_firebase_apps", sql);
            Assert.Contains("public.bo_tbl_enterprise", sql);
            Assert.Contains("REFERENCES public.bo_tbl_enterprise (\"Slug\") ON DELETE CASCADE", sql);

            // 2. Indexes
            Assert.Contains("uq_bo_tbl_tenant_firebase_apps_tenant", sql);
            Assert.Contains("uq_bo_tbl_tenant_firebase_apps_package", sql);
            Assert.Contains("idx_bo_tbl_tenant_firebase_apps_project", sql);
            Assert.Contains("idx_bo_tbl_tenant_firebase_apps_status", sql);

            // 3. Safety: MUST NOT contain tenant schema loop or DROP statements
            Assert.DoesNotContain("information_schema.schemata", sql, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("DROP TABLE", sql, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("DROP COLUMN", sql, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void FullDbMigration_Contains_TenantFirebaseApps_MasterTable()
        {
            var candidates = new[]
            {
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../db/FullDb_Migration/full_migration.sql")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../db/FullDb_Migration/full_migration.sql")),
                "/src/db/FullDb_Migration/full_migration.sql",
                "/home/ubuntu/acya-app/wood-app.api/db/FullDb_Migration/full_migration.sql"
            };

            var fullMigrationPath = candidates.FirstOrDefault(File.Exists);
            Assert.True(fullMigrationPath != null, "FullDb_Migration/full_migration.sql must exist on disk.");

            var sql = File.ReadAllText(fullMigrationPath);

            Assert.Contains("CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_firebase_apps", sql);
            Assert.Contains("uq_bo_tbl_tenant_firebase_apps_tenant", sql);
            Assert.Contains("uq_bo_tbl_tenant_firebase_apps_package", sql);
            Assert.Contains("idx_bo_tbl_tenant_firebase_apps_project", sql);
            Assert.Contains("idx_bo_tbl_tenant_firebase_apps_status", sql);
        }

        [Fact]
        public async Task TenantRegistration_And_MobileTenantConfig_RemainCompatible()
        {
            // Arrange
            var dbName = Guid.NewGuid().ToString();
            var masterDb = CreateMasterDb(dbName);
            var woodDb = CreateWoodAppDb(dbName, "socofeb");

            masterDb.TenantRegistries.Add(new TenantRegistry
            {
                Id = 1,
                Slug = "socofeb",
                Name = "SOCOFEB Bois",
                SchemaName = "tenant_socofeb",
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
                Name = "SOCOFEB Bois",
                IsManagingConstructions = true,
                IsManagingProduction = false
            });
            await woodDb.SaveChangesAsync();

            var inMemorySettings = new System.Collections.Generic.Dictionary<string, string?>
            {
                { "MobileApp:BaseUrlTemplate", "https://{slug}.acya.site/api/" },
                { "ASPNETCORE_ENVIRONMENT", "Production" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();

            var configService = new MobileTenantConfigService(masterDb, woodDb, config);

            // Act
            var tenantConfig = await configService.GenerateConfigForTenantAsync("socofeb");

            // Assert
            Assert.NotNull(tenantConfig);
            Assert.Equal("socofeb", tenantConfig!.TenantId);
            Assert.Equal("com.socofeb.woodapp", tenantConfig.PackageName);
            Assert.Equal("SOCOFEB Bois", tenantConfig.CompanyName);
            Assert.True(tenantConfig.HasChantierModule);
            Assert.False(tenantConfig.HasProductionModule);
        }
    }
}
