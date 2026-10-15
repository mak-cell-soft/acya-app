using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers.AppConfiguration;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class ArabicPrintIdentityMultiTenantTests
    {
        private (WoodAppContext context, AppVariableController controller) CreateTenantEnv(string dbPrefix, string tenantSlug)
        {
            var tenantContext = new TenantContext
            {
                IsEnabled = true,
                Slug = tenantSlug,
                SchemaName = $"tenant_{tenantSlug.Replace("-", "_")}"
            };

            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: $"{dbPrefix}_{tenantSlug}_{Guid.NewGuid()}")
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            var context = new WoodAppContext(options, tenantContext);
            var repository = new AppVariableRepository(context);
            var controller = new AppVariableController(repository);

            return (context, controller);
        }

        [Fact]
        public async Task Test1_NewTenantDefaults_ReturnsEmptyArabicCompanyIdentityFields()
        {
            // Scenario: A new tenant is provisioned with no Impression configuration in tbl_appvariable.
            // Expected: Default Arabic identity fields are neutral and empty (""), not pre-populated with SOCOFEB details.
            var (_, controller) = CreateTenantEnv("db_test1", "new-tenant-alpha");

            var result = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(result);
            Assert.Equal("application/json", contentResult.ContentType);

            using var doc = JsonDocument.Parse(contentResult.Content!);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("companyArabicName", out var nameProp));
            Assert.Equal(string.Empty, nameProp.GetString());

            Assert.True(root.TryGetProperty("companyArabicCapital", out var capitalProp));
            Assert.Equal(string.Empty, capitalProp.GetString());

            Assert.True(root.TryGetProperty("companyArabicAddress", out var addressProp));
            Assert.Equal(string.Empty, addressProp.GetString());

            // Ensure other standard labels are present and non-empty
            Assert.True(root.TryGetProperty("labels", out var labelsProp));
            Assert.True(labelsProp.TryGetProperty("client", out var clientLabel));
            Assert.Equal("Client :", clientLabel.GetString());
        }

        [Fact]
        public async Task Test2_ExistingSocofebTenant_SavedArabicIdentityRemainsIntact()
        {
            // Scenario: SOCOFEB has its historical Arabic information saved in its schema.
            // Expected: Loading Impression returns SOCOFEB's saved information without modification.
            var (context, controller) = CreateTenantEnv("db_test2", "socofeb");

            var socofebJson = @"{
              ""companyArabicName"": ""الشركة التجارية للحديد و الخشب"",
              ""companyArabicCapital"": ""شركة خفية الإسم رأس مالها 20.000 د.ت"",
              ""companyArabicAddress"": ""مقرها الاجتماعي: طريق رواد كلم 4 اريانة"",
              ""originalLabelTransfer"": ""TRANSFERT STOCK"",
              ""labels"": { ""client"": ""Client :"" }
            }";

            context.AppVariables.Add(new AppVariable
            {
                Nature = "Impression",
                Name = "print-locale",
                ValueText = socofebJson,
                isActive = true,
                isDefault = false,
                isEditable = true,
                isDeleted = false
            });
            await context.SaveChangesAsync();

            var result = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(result);

            using var doc = JsonDocument.Parse(contentResult.Content!);
            var root = doc.RootElement;

            Assert.Equal("الشركة التجارية للحديد و الخشب", root.GetProperty("companyArabicName").GetString());
            Assert.Equal("شركة خفية الإسم رأس مالها 20.000 د.ت", root.GetProperty("companyArabicCapital").GetString());
            Assert.Equal("مقرها الاجتماعي: طريق رواد كلم 4 اريانة", root.GetProperty("companyArabicAddress").GetString());
        }

        [Fact]
        public async Task Test3_ExistingTenantWithCustomValues_RemainsUnchanged()
        {
            // Scenario: An existing tenant has configured their own custom Arabic identity.
            // Expected: Their values are preserved and unaffected by default changes.
            var (context, controller) = CreateTenantEnv("db_test3", "stramica");

            var customJson = @"{
              ""companyArabicName"": ""شركة ستراميكا للخشب"",
              ""companyArabicCapital"": ""رأس مالها 50.000 د.ت"",
              ""companyArabicAddress"": ""صفاقس تونس"",
              ""originalLabelTransfer"": ""TRANSFERT STOCK"",
              ""labels"": { ""client"": ""Client :"" }
            }";

            context.AppVariables.Add(new AppVariable
            {
                Nature = "Impression",
                Name = "print-locale",
                ValueText = customJson,
                isActive = true,
                isDefault = false,
                isEditable = true,
                isDeleted = false
            });
            await context.SaveChangesAsync();

            var result = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(result);

            using var doc = JsonDocument.Parse(contentResult.Content!);
            var root = doc.RootElement;

            Assert.Equal("شركة ستراميكا للخشب", root.GetProperty("companyArabicName").GetString());
            Assert.Equal("رأس مالها 50.000 د.ت", root.GetProperty("companyArabicCapital").GetString());
            Assert.Equal("صفاقس تونس", root.GetProperty("companyArabicAddress").GetString());
        }

        [Fact]
        public async Task Test4_TenantIsolation_TenantModificationsDoNotBleedIntoOtherTenants()
        {
            // Scenario: Tenant A updates its Arabic company settings. Tenant B should not see or receive Tenant A's changes.
            var (contextA, controllerA) = CreateTenantEnv("db_test4_shared", "tenant-a");
            var (contextB, controllerB) = CreateTenantEnv("db_test4_shared", "tenant-b");

            var tenantAPayload = @"{
              ""companyArabicName"": ""شركة فريدة أ"",
              ""companyArabicCapital"": ""100.000 د.ت"",
              ""companyArabicAddress"": ""تونس العاصمة"",
              ""labels"": { ""client"": ""Client :"" }
            }";

            using var docA = JsonDocument.Parse(tenantAPayload);
            var putResultA = await controllerA.PutImpression(docA.RootElement);
            Assert.IsType<OkObjectResult>(putResultA);

            // Fetch Tenant A
            var resA = await controllerA.GetImpression();
            using var fetchedDocA = JsonDocument.Parse(Assert.IsType<ContentResult>(resA).Content!);
            Assert.Equal("شركة فريدة أ", fetchedDocA.RootElement.GetProperty("companyArabicName").GetString());

            // Fetch Tenant B (unconfigured)
            var resB = await controllerB.GetImpression();
            using var fetchedDocB = JsonDocument.Parse(Assert.IsType<ContentResult>(resB).Content!);
            Assert.Equal(string.Empty, fetchedDocB.RootElement.GetProperty("companyArabicName").GetString());
            Assert.Equal(string.Empty, fetchedDocB.RootElement.GetProperty("companyArabicCapital").GetString());
            Assert.Equal(string.Empty, fetchedDocB.RootElement.GetProperty("companyArabicAddress").GetString());
        }

        [Fact]
        public async Task Test5_EmptyValuesPersistence_SavingEmptyValuesPersistsAndNeverRevertsToSocofeb()
        {
            // Scenario: A tenant clears all three fields and saves them.
            // Expected: Empty fields are saved, and reloading returns empty strings (never restoring SOCOFEB info).
            var (_, controller) = CreateTenantEnv("db_test5", "tenant-clear-test");

            var emptyPayload = @"{
              ""companyArabicName"": """",
              ""companyArabicCapital"": """",
              ""companyArabicAddress"": """",
              ""labels"": { ""client"": ""Client :"" }
            }";

            using var doc = JsonDocument.Parse(emptyPayload);
            var putResult = await controller.PutImpression(doc.RootElement);
            Assert.IsType<OkObjectResult>(putResult);

            // Reload settings
            var getResult = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(getResult);

            using var reloadedDoc = JsonDocument.Parse(contentResult.Content!);
            var root = reloadedDoc.RootElement;

            Assert.Equal(string.Empty, root.GetProperty("companyArabicName").GetString());
            Assert.Equal(string.Empty, root.GetProperty("companyArabicCapital").GetString());
            Assert.Equal(string.Empty, root.GetProperty("companyArabicAddress").GetString());
        }

        [Fact]
        public async Task Test6_NormalConfiguration_CustomValuesPersistCorrectlyAcrossSaveAndReload()
        {
            // Scenario: Tenant administrator inputs genuine Arabic company information and saves.
            // Expected: Values persist accurately across page reloads.
            var (_, controller) = CreateTenantEnv("db_test6", "tenant-config-test");

            var customPayload = @"{
              ""companyArabicName"": ""الشركة العالمية للمقاولات"",
              ""companyArabicCapital"": ""رأس المال 150.000 دينار"",
              ""companyArabicAddress"": ""شارع الحبيب بورقيبة، سوسة"",
              ""labels"": { ""client"": ""Client :"" }
            }";

            using var doc = JsonDocument.Parse(customPayload);
            var putResult = await controller.PutImpression(doc.RootElement);
            Assert.IsType<OkObjectResult>(putResult);

            var getResult = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(getResult);

            using var reloadedDoc = JsonDocument.Parse(contentResult.Content!);
            var root = reloadedDoc.RootElement;

            Assert.Equal("الشركة العالمية للمقاولات", root.GetProperty("companyArabicName").GetString());
            Assert.Equal("رأس المال 150.000 دينار", root.GetProperty("companyArabicCapital").GetString());
            Assert.Equal("شارع الحبيب بورقيبة، سوسة", root.GetProperty("companyArabicAddress").GetString());
        }

        [Fact]
        public async Task Test7_Regression_DocumentLabelsAndPrintSettingsRemainIntact()
        {
            // Scenario: Validating that all standard print document labels and structure remain valid JSON and unaltered.
            var (_, controller) = CreateTenantEnv("db_test7", "tenant-regression");

            var result = await controller.GetImpression();
            var contentResult = Assert.IsType<ContentResult>(result);

            using var doc = JsonDocument.Parse(contentResult.Content!);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("originalLabel", out var origLabel));
            Assert.Equal("ORIGINAL CLIENT", origLabel.GetProperty("bl").GetString());
            Assert.Equal("FACTURE ORIGINAL", origLabel.GetProperty("invoice").GetString());

            Assert.True(root.TryGetProperty("originalLabelTransfer", out var origTransfer));
            Assert.Equal("TRANSFERT STOCK", origTransfer.GetString());

            Assert.True(root.TryGetProperty("labels", out var labels));
            Assert.Equal("N° BL", labels.GetProperty("docNumberBL").GetString());
            Assert.Equal("N° BL/FAC", labels.GetProperty("docNumberInvoice").GetString());
            Assert.Equal("TOTAL TTC", labels.GetProperty("totalTTC").GetString());
        }
    }
}
