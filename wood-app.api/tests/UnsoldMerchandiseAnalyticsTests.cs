using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.DTOs.Analytics;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class UnsoldMerchandiseAnalyticsTests
    {
        private static readonly DateTime FixedNow = new(2026, 11, 26, 12, 0, 0, DateTimeKind.Utc);

        private static WoodAppContext CreateContext(string dbName, string tenantSlug = "tenant_alpha")
        {
            var tenantContext = new TenantContext
            {
                IsEnabled = true,
                Slug = tenantSlug,
                SchemaName = $"tenant_{tenantSlug}"
            };

            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new WoodAppContext(options, tenantContext);
        }

        private static void SeedBaseCatalog(WoodAppContext ctx)
        {
            ctx.SalesSites.AddRange(
                new SalesSite { Id = 1, Gouvernorate = "Tunis", Address = "Site Principal", IsForSale = true, IsDeleted = false },
                new SalesSite { Id = 2, Gouvernorate = "Sfax", Address = "Dépôt Sfax", IsForSale = true, IsDeleted = false }
            );

            ctx.AppVariables.AddRange(
                new AppVariable { Id = 1, Nature = "TVA", Name = "19%", Value = 19.0 },
                new AppVariable { Id = 2, Nature = "TVA", Name = "7%", Value = 7.0 }
            );

            ctx.Parents.AddRange(
                new Parent { Id = 1, Reference = "BOIS", Description = "Bois", IsDeleted = false },
                new Parent { Id = 2, Reference = "QUINC", Description = "Quincaillerie", IsDeleted = false }
            );

            ctx.FirstChildren.AddRange(
                new FirstChild { Id = 10, Reference = "SAP", Description = "Sapin Rouge", IdParent = 1, IsDeleted = false },
                new FirstChild { Id = 20, Reference = "VIS", Description = "Visserie", IdParent = 2, IsDeleted = false }
            );

            ctx.SaveChanges();
        }

        private static (Article article, Merchandise merchandise) AddArticleWithMerchandise(
            WoodAppContext ctx,
            int id,
            string reference,
            string description,
            bool isWood,
            string unit,
            DateTime creationDate,
            double sellPriceHt = 100.0,
            double lastPurchasePriceTtc = 0.0,
            int tvaId = 1,
            int parentId = 1,
            int firstChildId = 10,
            ArticleType type = ArticleType.Merchandise,
            bool isDeleted = false,
            double? stockQtySite1 = null,
            double? stockQtySite2 = null)
        {
            var article = new Article
            {
                Id = id,
                Reference = reference,
                Description = description,
                Type = type,
                IsWood = isWood,
                Unit = unit,
                CreationDate = creationDate,
                UpdateDate = creationDate,
                IsDeleted = isDeleted,
                SellPriceHT = sellPriceHt,
                LastPurchasePriceTTC = lastPurchasePriceTtc,
                TvaId = tvaId,
                ParentId = parentId,
                FirstChildId = firstChildId
            };
            ctx.Articles.Add(article);

            var merch = new Merchandise
            {
                Id = id * 10,
                ArticleId = id,
                PackageReference = $"PKG-{id}",
                Description = description,
                IsDeleted = false
            };
            ctx.Merchandises.Add(merch);

            if (stockQtySite1.HasValue)
            {
                ctx.Stocks.Add(new Stock
                {
                    Id = id * 100 + 1,
                    MerchandiseId = merch.Id,
                    SalesSiteId = 1,
                    Quantity = stockQtySite1.Value,
                    MinimumStock = 1,
                    CreationDate = creationDate,
                    UpdateDate = creationDate
                });
            }

            if (stockQtySite2.HasValue)
            {
                ctx.Stocks.Add(new Stock
                {
                    Id = id * 100 + 2,
                    MerchandiseId = merch.Id,
                    SalesSiteId = 2,
                    Quantity = stockQtySite2.Value,
                    MinimumStock = 1,
                    CreationDate = creationDate,
                    UpdateDate = creationDate
                });
            }

            ctx.SaveChanges();
            return (article, merch);
        }

        private static Document AddDocumentWithLine(
            WoodAppContext ctx,
            int docId,
            DocumentTypes type,
            DateTime creationDate,
            int merchandiseId,
            double qty,
            double costNetHt = 0,
            int salesSiteId = 1,
            DocStatus status = DocStatus.Delivered,
            bool isDeleted = false,
            LineType lineType = LineType.Merchandise)
        {
            var doc = new Document
            {
                Id = docId,
                Type = type,
                DocNumber = $"DOC-{docId}",
                CreationDate = creationDate,
                UpdateDate = creationDate,
                SalesSiteId = salesSiteId,
                DocStatus = status,
                IsDeleted = isDeleted
            };
            ctx.Documents.Add(doc);

            ctx.DocumentMerchandises.Add(new DocumentMerchandise
            {
                Id = docId * 10,
                DocumentId = docId,
                MerchandiseId = lineType == LineType.Merchandise ? merchandiseId : null,
                Type = lineType,
                Quantity = qty,
                UnitPriceHT = qty > 0 ? costNetHt / qty : 0,
                CostNetHT = costNetHt,
                CostTTC = costNetHt * 1.19
            });

            ctx.SaveChanges();
            return doc;
        }

        [Fact]
        public async Task Scenarios_1_To_8_CoreClassification_Stock_GracePeriod_And_Valuation()
        {
            using var ctx = CreateContext(Guid.NewGuid().ToString());
            SeedBaseCatalog(ctx);

            // 1 & 5 & 7. Never sold, in stock, missing purchase cost
            var (_, mNeverSold) = AddArticleWithMerchandise(
                ctx, 1, "ART-NEVER", "Bois jamais vendu", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 1200, lastPurchasePriceTtc: 0,
                stockQtySite1: 4.5);

            // 2 & 8. Sold 4 months ago (> 3m), in stock, fallback LastPurchasePriceTTC = 119 DT (TVA 19% -> 100 DT HT)
            var (_, mOldSale) = AddArticleWithMerchandise(
                ctx, 2, "ART-OLD", "Visserie ancienne vente", isWood: false, unit: "Pcs",
                creationDate: FixedNow.AddMonths(-12), sellPriceHt: 150, lastPurchasePriceTtc: 119.0, tvaId: 1,
                parentId: 2, firstChildId: 20, stockQtySite1: 10);
            AddDocumentWithLine(ctx, 200, DocumentTypes.customerDeliveryNote, FixedNow.AddMonths(-4), mOldSale.Id, 2, 300);

            // 3. Sold 1 month ago (within 3m period) -> MUST NOT appear as unsold
            var (_, mRecentSale) = AddArticleWithMerchandise(
                ctx, 3, "ART-RECENT", "Article actif", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-8), sellPriceHt: 1000, lastPurchasePriceTtc: 800,
                stockQtySite1: 3.0);
            AddDocumentWithLine(ctx, 300, DocumentTypes.customerInvoice, FixedNow.AddMonths(-1), mRecentSale.Id, 1, 1000);

            // 4. Zero stock (no tbl_stock row at all)
            AddArticleWithMerchandise(
                ctx, 4, "ART-ZERO", "Article sans stock", isWood: false, unit: "Kg",
                creationDate: FixedNow.AddMonths(-9), sellPriceHt: 50, lastPurchasePriceTtc: 35.7, tvaId: 1,
                parentId: 2, firstChildId: 20, stockQtySite1: null);

            // 6. Newly created within 30-day grace period (10 days old), in stock, no sales
            AddArticleWithMerchandise(
                ctx, 5, "ART-NEW", "Nouvel article 10j", isWood: true, unit: "M3",
                creationDate: FixedNow.AddDays(-10), sellPriceHt: 900, lastPurchasePriceTtc: 700,
                stockQtySite1: 2.0);

            // Service article & deleted article -> MUST always be excluded
            AddArticleWithMerchandise(
                ctx, 6, "SRV-01", "Service découpe", isWood: false, unit: "FORFAIT",
                creationDate: FixedNow.AddMonths(-10), type: ArticleType.Service, stockQtySite1: 1);
            AddArticleWithMerchandise(
                ctx, 7, "DEL-01", "Article supprimé", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), isDeleted: true, stockQtySite1: 5);

            // Also add a supplier receipt for an extra article to test primary purchase-doc valuation
            var (_, mPurchaseDoc) = AddArticleWithMerchandise(
                ctx, 8, "ART-DOC-COST", "Bois valorisé par BR", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-14), sellPriceHt: 1500, lastPurchasePriceTtc: 9999,
                stockQtySite1: 2.0);
            AddDocumentWithLine(ctx, 800, DocumentTypes.supplierReceipt, FixedNow.AddMonths(-13), mPurchaseDoc.Id, 5.0, 5000.0); // 1000 HT/m3
            AddDocumentWithLine(ctx, 801, DocumentTypes.supplierReceipt, FixedNow.AddMonths(-7), mPurchaseDoc.Id, 4.0, 4400.0);  // 1100 HT/m3 (latest)

            var service = new AnalyticsService(ctx);

            // Default query: 3 months, onlyWithStock = true, excludeNewArticles = true, grace = 30
            var resDefault = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3 },
                FixedNow);

            Assert.Equal(6, resDefault.Summary.TotalActiveMerchandise); // Articles 1,2,3,4,5,8 (excludes service 6 & deleted 7)
            Assert.Equal(3, resDefault.Summary.UnsoldCount);            // Articles 1, 2, 8 (excludes recent 3, zero-stock 4, new 5)
            Assert.Equal(2, resDefault.Summary.NeverSoldCount);         // Articles 1, 8
            Assert.Equal(1, resDefault.Summary.NoRecentSalesCount);     // Article 2
            Assert.Equal(3, resDefault.Summary.WithStockCount);         // Articles 1, 2, 8
            Assert.Equal(1, resDefault.Summary.WithoutStockCount);      // Article 4
            Assert.Equal(1, resDefault.Summary.NewlyCreatedExcludedCount); // Article 5
            Assert.Equal(1, resDefault.Summary.MissingCostCount);       // Article 1

            // Units must NOT be combined
            Assert.Equal(6.5, resDefault.Summary.WoodStockVolumeM3); // 4.5 + 2.0 m3
            Assert.True(resDefault.Summary.NonWoodStockQuantitiesByUnit.ContainsKey("Pcs"));
            Assert.Equal(10.0, resDefault.Summary.NonWoodStockQuantitiesByUnit["Pcs"]);

            // Financial valuation check:
            // Art 1 (MissingCost): 4.5 * 0 = 0 HT; Potential = 4.5 * 1200 = 5400 HT
            // Art 2 (Fallback TTC 119 / 1.19 = 100 HT): 10 * 100 = 1000 HT; Potential = 10 * 150 = 1500 HT
            // Art 8 (Latest BR 4400/4 = 1100 HT): 2.0 * 1100 = 2200 HT; Potential = 2.0 * 1500 = 3000 HT
            Assert.Equal(3200.000m, resDefault.Summary.EstimatedDormantStockValueHT);
            Assert.Equal(9900.000m, resDefault.Summary.PotentialSellingValueHT);

            var itemNever = resDefault.Items.Single(i => i.ArticleId == 1);
            Assert.Equal("NeverSold", itemNever.InactivityClassification);
            Assert.Equal("MissingCost", itemNever.ValuationSource);
            Assert.True(itemNever.IsMissingCost);
            Assert.Null(itemNever.LastSaleDate);
            Assert.Null(itemNever.DaysSinceLastSale);

            var itemOld = resDefault.Items.Single(i => i.ArticleId == 2);
            Assert.Equal("NoRecentSales", itemOld.InactivityClassification);
            Assert.Equal("ArticleLastPurchasePrice", itemOld.ValuationSource);
            Assert.Equal(100.000m, itemOld.EstimatedUnitCostHT);
            Assert.Equal(1000.000m, itemOld.EstimatedStockValueHT);
            Assert.NotNull(itemOld.LastSaleDate);
            Assert.True(itemOld.DaysSinceLastSale >= 120);

            var itemDocCost = resDefault.Items.Single(i => i.ArticleId == 8);
            Assert.Equal("LastPurchaseDoc", itemDocCost.ValuationSource);
            Assert.Equal(1100.000m, itemDocCost.EstimatedUnitCostHT);
            Assert.Equal(2200.000m, itemDocCost.EstimatedStockValueHT);

            // Include zero-stock and newly created articles
            var resAll = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3, OnlyWithStock = false, ExcludeNewArticles = false },
                FixedNow);

            Assert.Equal(5, resAll.Summary.UnsoldCount); // Articles 1, 2, 4, 5, 8
            Assert.Equal(0, resAll.Summary.NewlyCreatedExcludedCount);
            var itemZero = resAll.Items.Single(i => i.ArticleId == 4);
            Assert.Equal(0, itemZero.CurrentStock);
            Assert.Equal("OutOfStock", itemZero.StockAvailability);
            Assert.Equal(0m, itemZero.EstimatedStockValueHT);

            var itemNew = resAll.Items.Single(i => i.ArticleId == 5);
            Assert.True(itemNew.IsNewlyCreated);
            Assert.Equal(10, itemNew.ArticleAgeDays);
        }

        [Fact]
        public async Task Scenarios_9_And_10_DualDirection_BL_Invoice_Deduplication()
        {
            using var ctx = CreateContext(Guid.NewGuid().ToString());
            SeedBaseCatalog(ctx);

            // Scenario 9: Batch invoice (Parent = Invoice created 1 month ago, Child = BL created 5 months ago)
            // Because the Invoice is linked to the BL, ONLY the BL date (5 months ago) counts as the sale event!
            // Therefore, for a 3-month window, this article MUST be classified as Unsold (NoRecentSales) with LastSaleDate = 5 months ago.
            var (_, mBatch) = AddArticleWithMerchandise(
                ctx, 10, "ART-BATCH-INV", "Bois facturé en lot", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-12), sellPriceHt: 1000, lastPurchasePriceTtc: 595, stockQtySite1: 3);

            var blBatchDate = FixedNow.AddMonths(-5);
            var invBatchDate = FixedNow.AddMonths(-1);
            AddDocumentWithLine(ctx, 900, DocumentTypes.customerDeliveryNote, blBatchDate, mBatch.Id, 2, 2000);
            AddDocumentWithLine(ctx, 901, DocumentTypes.customerInvoice, invBatchDate, mBatch.Id, 2, 2000);
            ctx.DocumentDocumentRelationships.Add(new DocumentDocumentRelationship
            {
                ParentDocumentId = 901, // Invoice = Parent (batch createinvoice)
                ChildDocumentId = 900   // BL = Child
            });

            // Scenario 10: Single conversion (Parent = BL created 5 months ago, Child = Invoice created 1 month ago)
            // Again, ONLY the BL date (5 months ago) counts!
            var (_, mSingle) = AddArticleWithMerchandise(
                ctx, 11, "ART-SINGLE-INV", "Bois converti individuellement", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-12), sellPriceHt: 1000, lastPurchasePriceTtc: 595, stockQtySite1: 4);

            var blSingleDate = FixedNow.AddMonths(-5);
            var invSingleDate = FixedNow.AddMonths(-1);
            AddDocumentWithLine(ctx, 910, DocumentTypes.customerDeliveryNote, blSingleDate, mSingle.Id, 1, 1000);
            AddDocumentWithLine(ctx, 911, DocumentTypes.customerInvoice, invSingleDate, mSingle.Id, 1, 1000);
            ctx.DocumentDocumentRelationships.Add(new DocumentDocumentRelationship
            {
                ParentDocumentId = 910, // BL = Parent (single /{parentId}/convert)
                ChildDocumentId = 911   // Invoice = Child
            });

            ctx.SaveChanges();

            var service = new AnalyticsService(ctx);
            var result = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3 },
                FixedNow);

            Assert.Equal(2, result.Summary.UnsoldCount);

            var batchItem = result.Items.Single(i => i.ArticleId == 10);
            Assert.Equal(blBatchDate, batchItem.LastSaleDate);
            Assert.Equal("NoRecentSales", batchItem.InactivityClassification);

            var singleItem = result.Items.Single(i => i.ArticleId == 11);
            Assert.Equal(blSingleDate, singleItem.LastSaleDate);
            Assert.Equal("NoRecentSales", singleItem.InactivityClassification);
        }

        [Fact]
        public async Task Scenarios_11_12_And_Lifecycle_Returns_Production_And_NotDelivered()
        {
            using var ctx = CreateContext(Guid.NewGuid().ToString());
            SeedBaseCatalog(ctx);

            // Scenario 11: Sold 4 months ago and 100% returned via customerInvoiceReturn (9) -> historical sale is preserved (NoRecentSales, NOT NeverSold)
            var (_, mReturned) = AddArticleWithMerchandise(
                ctx, 20, "ART-RET", "Article vendu puis retourné", isWood: false, unit: "Pcs",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 100, lastPurchasePriceTtc: 59.5, stockQtySite1: 5);
            var saleDate = FixedNow.AddMonths(-4);
            AddDocumentWithLine(ctx, 1100, DocumentTypes.customerInvoice, saleDate, mReturned.Id, 5, 500);
            AddDocumentWithLine(ctx, 1101, DocumentTypes.customerInvoiceReturn, FixedNow.AddMonths(-3).AddDays(-25), mReturned.Id, 5, 500);
            ctx.DocumentDocumentRelationships.Add(new DocumentDocumentRelationship
            {
                ParentDocumentId = 1100,
                ChildDocumentId = 1101
            });

            // Scenario 12: Consumed by production (13) 10 days ago, never commercially sold -> MUST remain NeverSold
            var (_, mProd) = AddArticleWithMerchandise(
                ctx, 21, "ART-PROD", "Bois brut consommé en production", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 800, lastPurchasePriceTtc: 595, stockQtySite1: 8);
            AddDocumentWithLine(ctx, 1200, DocumentTypes.productionConsumption, FixedNow.AddDays(-10), mProd.Id, 2.5, 1250);

            // Lifecycle rule #6: BL with DocStatus.NotDelivered (or Abandoned/Rejected/Deleted) 5 days ago -> NOT a qualifying commercial sale
            var (_, mNotDelivered) = AddArticleWithMerchandise(
                ctx, 22, "ART-NOTDEL", "BL non livré", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 800, lastPurchasePriceTtc: 595, stockQtySite1: 3);
            AddDocumentWithLine(ctx, 1201, DocumentTypes.customerDeliveryNote, FixedNow.AddDays(-5), mNotDelivered.Id, 1, 800, status: DocStatus.NotDelivered);
            AddDocumentWithLine(ctx, 1202, DocumentTypes.customerDeliveryNote, FixedNow.AddDays(-4), mNotDelivered.Id, 1, 800, status: DocStatus.Abandoned);
            AddDocumentWithLine(ctx, 1203, DocumentTypes.customerInvoice, FixedNow.AddDays(-3), mNotDelivered.Id, 1, 800, status: DocStatus.Rejected);

            ctx.SaveChanges();

            var service = new AnalyticsService(ctx);
            var res = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3 },
                FixedNow);

            Assert.Equal(3, res.Summary.UnsoldCount);

            var retItem = res.Items.Single(i => i.ArticleId == 20);
            Assert.Equal("NoRecentSales", retItem.InactivityClassification);
            Assert.Equal(saleDate, retItem.LastSaleDate);

            var prodItem = res.Items.Single(i => i.ArticleId == 21);
            Assert.Equal("NeverSold", prodItem.InactivityClassification);
            Assert.Null(prodItem.LastSaleDate);

            var notDelItem = res.Items.Single(i => i.ArticleId == 22);
            Assert.Equal("NeverSold", notDelItem.InactivityClassification);
            Assert.Null(notDelItem.LastSaleDate);
        }

        [Fact]
        public async Task Scenario_13_SiteIsolation_And_InvalidSiteValidation()
        {
            using var ctx = CreateContext(Guid.NewGuid().ToString());
            SeedBaseCatalog(ctx);

            // Article stocked on Site 1 (5) and Site 2 (10); sold recently ONLY on Site 2
            var (_, mMultiSite) = AddArticleWithMerchandise(
                ctx, 30, "ART-SITE", "Article multi-sites", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 1000, lastPurchasePriceTtc: 595,
                stockQtySite1: 5, stockQtySite2: 10);
            AddDocumentWithLine(ctx, 1300, DocumentTypes.customerDeliveryNote, FixedNow.AddDays(-15), mMultiSite.Id, 2, 2000, salesSiteId: 2);

            var service = new AnalyticsService(ctx);

            // Filtering by Site 1: unsold on Site 1, stock = 5
            var resSite1 = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3, SiteId = 1 },
                FixedNow);
            Assert.Single(resSite1.Items);
            Assert.Equal(5, resSite1.Items[0].CurrentStock);

            // Filtering by Site 2: sold 15 days ago on Site 2 -> NOT unsold
            var resSite2 = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 3, SiteId = 2 },
                FixedNow);
            Assert.Empty(resSite2.Items);

            // Invalid siteId -> ArgumentException
            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { Months = 3, SiteId = 999 }, FixedNow));
        }

        [Fact]
        public async Task Scenario_14_TenantIsolation_NoCrossTenantLeakage()
        {
            using var ctxTenantA = CreateContext(Guid.NewGuid().ToString(), "socofeb");
            using var ctxTenantB = CreateContext(Guid.NewGuid().ToString(), "other_tenant");

            SeedBaseCatalog(ctxTenantA);
            SeedBaseCatalog(ctxTenantB);

            AddArticleWithMerchandise(
                ctxTenantA, 40, "SOCO-01", "Article Socofeb", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 1000, lastPurchasePriceTtc: 595, stockQtySite1: 6);

            AddArticleWithMerchandise(
                ctxTenantB, 41, "OTHER-01", "Article Autre Locataire", isWood: true, unit: "M3",
                creationDate: FixedNow.AddMonths(-10), sellPriceHt: 2000, lastPurchasePriceTtc: 1190, stockQtySite1: 9);

            var serviceA = new AnalyticsService(ctxTenantA);
            var serviceB = new AnalyticsService(ctxTenantB);

            var resA = await serviceA.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { Months = 6 }, FixedNow);
            var resB = await serviceB.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { Months = 6 }, FixedNow);

            Assert.Single(resA.Items);
            Assert.Equal("SOCO-01", resA.Items[0].Reference);

            Assert.Single(resB.Items);
            Assert.Equal("OTHER-01", resB.Items[0].Reference);
        }

        [Fact]
        public async Task Pagination_Sorting_ExportAll_And_SecurityChecks()
        {
            using var ctx = CreateContext(Guid.NewGuid().ToString());
            SeedBaseCatalog(ctx);

            AddArticleWithMerchandise(ctx, 50, "REF-C", "Charlie", isWood: true, unit: "M3", creationDate: FixedNow.AddMonths(-10), lastPurchasePriceTtc: 119, stockQtySite1: 1);
            AddArticleWithMerchandise(ctx, 51, "REF-A", "Alpha", isWood: true, unit: "M3", creationDate: FixedNow.AddMonths(-10), lastPurchasePriceTtc: 119, stockQtySite1: 3);
            AddArticleWithMerchandise(ctx, 52, "REF-B", "Bravo", isWood: true, unit: "M3", creationDate: FixedNow.AddMonths(-10), lastPurchasePriceTtc: 119, stockQtySite1: 2);

            var service = new AnalyticsService(ctx);

            // Page 1, size 2, sorted by stockValue desc -> REF-A (300), REF-B (200)
            var page1 = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 6, SortBy = "stockValue", SortDirection = "desc", Page = 1, PageSize = 2 },
                FixedNow);
            Assert.Equal(3, page1.TotalItemsCount);
            Assert.Equal(2, page1.TotalPages);
            Assert.Equal(new[] { "REF-A", "REF-B" }, page1.Items.Select(i => i.Reference).ToArray());

            // ExportAll returns all 3 items regardless of pageSize
            var exportRes = await service.GetUnsoldMerchandiseAsync(
                new UnsoldMerchandiseQueryParams { Months = 6, SortBy = "reference", SortDirection = "asc", Page = 1, PageSize = 1, ExportAll = true },
                FixedNow);
            Assert.Equal(new[] { "REF-A", "REF-B", "REF-C" }, exportRes.Items.Select(i => i.Reference).ToArray());

            // Parameter validation
            await Assert.ThrowsAsync<ArgumentException>(() => service.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { Months = 4 }, FixedNow));
            await Assert.ThrowsAsync<ArgumentException>(() => service.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { SortBy = "drop table" }, FixedNow));
            await Assert.ThrowsAsync<ArgumentException>(() => service.GetUnsoldMerchandiseAsync(new UnsoldMerchandiseQueryParams { PageSize = 500 }, FixedNow));

            // Controller [Authorize] attribute check
            var method = typeof(AnalyticsController).GetMethod(nameof(AnalyticsController.GetUnsoldMerchandise));
            Assert.NotNull(method);
            Assert.NotNull(method!.GetCustomAttribute<AuthorizeAttribute>());

            // Controller BadRequest on invalid months
            var controller = new AnalyticsController(service, NullLogger<AnalyticsController>.Instance);
            var badRes = await controller.GetUnsoldMerchandise(months: 9);
            Assert.IsType<BadRequestObjectResult>(badRes.Result);
        }
    }
}
