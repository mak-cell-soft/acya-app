using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Analytics;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
    /// <summary>
    /// Implementation of IAnalyticsService for aggregated dashboard KPIs.
    /// Addresses Gap §5.2 from Gaps Roadmap.md.
    /// </summary>
    public class AnalyticsService : IAnalyticsService
    {
        private readonly WoodAppContext _context;

        public AnalyticsService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<DashboardKpiDto> GetDashboardKpisAsync(int? enterpriseId, int? month = null, int? year = null)
        {
            // Note: In a multi-tenant environment, enterpriseId should be used to scope all queries.
            // For now, we assume the context or current site scoping is sufficient or enterpriseId is not yet strictly enforced globally.
            
            var targetYear = year ?? DateTime.UtcNow.Year;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            
            var today = DateTime.UtcNow.Date;
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
            
            var startOfMonth = new DateTime(targetYear, targetMonth, 1);
            var endOfMonth = startOfMonth.AddMonths(1);

            // 1. Sales Analytics (Customer Invoices only)
            // Using AsNoTracking for read-only performance
            var salesDocs = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted && d.Type == DocumentTypes.customerInvoice)
                .Where(d => d.CreationDate >= startOfMonth && d.CreationDate < endOfMonth)
                .Select(d => new { 
                    d.CreationDate, 
                    d.TotalCostNetTTCDoc, 
                    d.CounterPartId, 
                    CounterPartName = d.CounterPart != null 
                        ? ((d.CounterPart.Prefix != null ? d.CounterPart.Prefix + " " : "") + 
                           (!string.IsNullOrEmpty(d.CounterPart.Name) 
                            ? d.CounterPart.Name 
                            : (d.CounterPart.FirstName + " " + d.CounterPart.LastName).Trim())).Trim()
                        : "Inconnu"
                })
                .ToListAsync();

            var kpis = new DashboardKpiDto
            {
                DailySales = (decimal)salesDocs.Where(d => d.CreationDate?.Date == today).Sum(d => d.TotalCostNetTTCDoc),
                WeeklySales = (decimal)salesDocs.Where(d => d.CreationDate?.Date >= startOfWeek).Sum(d => d.TotalCostNetTTCDoc),
                MonthlySales = (decimal)salesDocs.Sum(d => d.TotalCostNetTTCDoc),
            };

            // 2. Top Clients (based on Monthly Sales)
            kpis.TopClients = salesDocs
                .GroupBy(d => new { d.CounterPartId, d.CounterPartName })
                .Select(g => new TopCounterPartDto
                {
                    Id = g.Key.CounterPartId ?? 0,
                    Name = string.IsNullOrWhiteSpace(g.Key.CounterPartName) ? "Inconnu" : g.Key.CounterPartName,
                    TotalAmount = (decimal)g.Sum(d => d.TotalCostNetTTCDoc)
                })
                .OrderByDescending(x => x.TotalAmount)
                .Take(5)
                .ToList();

            // 3. Document Counts by Type (Total non-deleted documents for the current month)
            var docCounts = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted && d.CreationDate >= startOfMonth && d.CreationDate < endOfMonth)
                .GroupBy(d => d.Type)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();

            foreach (var count in docCounts)
            {
                if (count.Type.HasValue)
                {
                    kpis.DocumentCounts[count.Type.Value.ToString()] = count.Count;
                }
            }

            // 4. Stock Alerts (Items where Quantity <= MinimumStock and MinimumStock is set)
            kpis.StockAlertCount = await _context.Stocks
                .AsNoTracking()
                .Where(s => s.Quantity <= s.MinimumStock && s.MinimumStock > 0)
                .CountAsync();

            // 5. Daily Payments (Sum of all payments recorded today)
            kpis.DailyPaymentsTotal = (decimal)await _context.Payments
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.CreatedAt >= today && p.CreatedAt < today.AddDays(1))
                .SumAsync(p => p.Amount ?? 0);

            // 6. Global Customer Receivables
            var receivablesDb = await _context.AccountLedgers
                .AsNoTracking()
                .Include(a => a.CounterPart)
                .Where(a => a.CounterPart != null && (a.CounterPart.Type == CounterPartType.Customer || a.CounterPart.Type == CounterPartType.Both))
                .GroupBy(a => new 
                { 
                    a.CounterPartId, 
                    Prefix = a.CounterPart!.Prefix,
                    Name = a.CounterPart!.Name,
                    FirstName = a.CounterPart!.FirstName,
                    LastName = a.CounterPart!.LastName
                })
                .Select(g => new
                {
                    Id = g.Key.CounterPartId,
                    Prefix = g.Key.Prefix,
                    Name = g.Key.Name,
                    FirstName = g.Key.FirstName,
                    LastName = g.Key.LastName,
                    TotalInvoiced = g.Sum(a => a.Debit),
                    TotalPaid = g.Sum(a => a.Credit),
                    OldestInvoiceDate = g.Where(a => a.Debit > 0).Min(a => (DateTime?)a.TransactionDate)
                })
                .Where(r => (r.TotalInvoiced - r.TotalPaid) > 0)
                .OrderByDescending(r => (r.TotalInvoiced - r.TotalPaid))
                .Take(15)
                .ToListAsync();

            var receivables = receivablesDb.Select(r => new CustomerReceivableDto
            {
                Id = r.Id,
                Name = ((r.Prefix != null ? r.Prefix + " " : "") + 
                           (!string.IsNullOrEmpty(r.Name) 
                            ? r.Name 
                            : (r.FirstName + " " + r.LastName).Trim())).Trim(),
                TotalInvoiced = r.TotalInvoiced,
                TotalPaid = r.TotalPaid,
                Outstanding = r.TotalInvoiced - r.TotalPaid,
                OldestInvoiceDays = r.OldestInvoiceDate.HasValue ? (int)(DateTime.UtcNow - r.OldestInvoiceDate.Value).TotalDays : 0
            }).ToList();

            foreach(var r in receivables)
            {
                if (string.IsNullOrWhiteSpace(r.Name))
                {
                    r.Name = "Inconnu";
                }
            }

            kpis.CustomerReceivables = receivables;

            return kpis;
        }

        public async Task<List<MonthlyRevenueDto>> GetMonthlyRevenueAsync(int months = 6)
        {
            var startDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-months + 1);

            var salesDocs = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted && d.Type == DocumentTypes.customerInvoice)
                .Where(d => d.CreationDate >= startDate)
                .Select(d => new { d.CreationDate, d.TotalCostNetTTCDoc })
                .ToListAsync();

            var result = new List<MonthlyRevenueDto>();
            
            for (int i = months - 1; i >= 0; i--)
            {
                var targetMonth = DateTime.UtcNow.AddMonths(-i);
                var monthDocs = salesDocs.Where(d => d.CreationDate?.Year == targetMonth.Year && d.CreationDate?.Month == targetMonth.Month);
                
                var revenue = monthDocs.Sum(d => (decimal)d.TotalCostNetTTCDoc);
                var margin = revenue * 0.25m; // Estimated margin

                var monthNames = new[] { "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc" };

                result.Add(new MonthlyRevenueDto
                {
                    Month = monthNames[targetMonth.Month - 1],
                    Revenue = revenue,
                    Margin = margin
                });
            }

            return result;
        }

        public async Task<List<TopSubCategoryDto>> GetTopSubCategoriesAsync(int months = 6)
        {
            var startDate = DateTime.UtcNow.AddMonths(-months);

            var rawData = await _context.DocumentMerchandises
                .AsNoTracking()
                .Where(dm => dm.Document != null && !dm.Document.IsDeleted &&
                             dm.Document.Type == DocumentTypes.customerInvoice &&
                             dm.Document.CreationDate >= startDate &&
                             dm.Merchandise != null && dm.Merchandise.Articles != null && dm.Merchandise.Articles.FirstChildren != null)
                .Select(dm => new
                {
                    SubCategoryId = dm.Merchandise!.Articles!.FirstChildren!.Id,
                    SubCategoryName = dm.Merchandise.Articles.FirstChildren.Description,
                    CategoryName = dm.Merchandise.Articles.FirstChildren.Parents != null ? dm.Merchandise.Articles.FirstChildren.Parents.Description : null,
                    ArticleId = dm.Merchandise.Articles.Id,
                    ArticleReference = dm.Merchandise.Articles.Reference,
                    ArticleName = dm.Merchandise.Articles.Description,
                    Qty = dm.Quantity,
                    Rev = dm.CostTTC
                })
                .ToListAsync();

            var topSubCategories = rawData
                .GroupBy(x => new { x.SubCategoryId, x.SubCategoryName, x.CategoryName })
                .Select(g => new TopSubCategoryDto
                {
                    SubCategoryId = g.Key.SubCategoryId,
                    SubCategoryName = g.Key.SubCategoryName ?? "Inconnu",
                    CategoryName = g.Key.CategoryName ?? "Inconnu",
                    TotalQuantitySold = g.Sum(x => x.Qty),
                    TotalRevenueTTC = g.Sum(x => (decimal)x.Rev),
                    ArticleCount = g.Select(x => x.ArticleId).Distinct().Count(),
                    TopArticles = g.GroupBy(a => new { a.ArticleId, a.ArticleReference, a.ArticleName })
                                   .Select(ag => new TopArticleDto
                                   {
                                       ArticleId = ag.Key.ArticleId,
                                       Reference = ag.Key.ArticleReference ?? string.Empty,
                                       ArticleName = ag.Key.ArticleName ?? "Inconnu",
                                       QuantitySold = ag.Sum(x => x.Qty),
                                       RevenueTTC = ag.Sum(x => (decimal)x.Rev)
                                   })
                                   .OrderByDescending(a => a.QuantitySold)
                                   .Take(15) // Top 15 articles per sub-category
                                   .ToList()
                })
                .OrderByDescending(x => x.TotalQuantitySold)
                .Take(15)
                .ToList();

            return topSubCategories;
        }

        public async Task<List<SubCategoryStockHealthDto>> GetStockHealthBySubCategoryAsync(int? siteId = null)
        {
            var query = _context.Stocks
                .AsNoTracking()
                .Where(s => s.Merchandises != null && s.Merchandises.Articles != null && s.Merchandises.Articles.FirstChildren != null);

            if (siteId.HasValue)
            {
                query = query.Where(s => s.SalesSiteId == siteId.Value);
            }

            var rawStockData = await query
                .Select(s => new
                {
                    SubCategoryId = s.Merchandises!.Articles!.FirstChildren!.Id,
                    SubCategoryName = s.Merchandises.Articles.FirstChildren.Description,
                    CategoryName = s.Merchandises.Articles.FirstChildren.Parents != null ? s.Merchandises.Articles.FirstChildren.Parents.Description : null,
                    ArticleId = s.Merchandises.Articles.Id,
                    ArticleName = s.Merchandises.Articles.Description,
                    Qty = s.Quantity,
                    MinStock = s.MinimumStock
                })
                .ToListAsync();

            var stockHealthList = rawStockData
                .GroupBy(x => new { x.SubCategoryId, x.SubCategoryName, x.CategoryName })
                .Select(g => new SubCategoryStockHealthDto
                {
                    SubCategoryId = g.Key.SubCategoryId,
                    SubCategoryName = g.Key.SubCategoryName ?? "Inconnu",
                    CategoryName = g.Key.CategoryName ?? "Inconnu",
                    TotalCurrentStock = g.Sum(s => s.Qty),
                    TotalMinimumStock = g.Sum(s => s.MinStock),
                    ArticleCount = g.Select(s => s.ArticleId).Distinct().Count(),
                    ArticlesBelowMin = g.GroupBy(a => a.ArticleId) // Group by article first to sum quantities per article
                                        .Count(ag => ag.Sum(x => x.Qty) <= ag.Max(x => x.MinStock) && ag.Max(x => x.MinStock) > 0),
                    ArticleStocks = g.GroupBy(a => new { a.ArticleId, a.ArticleName })
                                     .Select(ag => new ArticleStockDto
                                     {
                                         ArticleId = ag.Key.ArticleId,
                                         ArticleName = ag.Key.ArticleName ?? "Inconnu",
                                         CurrentStock = ag.Sum(x => x.Qty),
                                         MinimumStock = ag.Max(x => x.MinStock) // Max in case of multiple stock rows for same article (e.g. diff batches, min stock is usually same)
                                     })
                                     .OrderBy(a => a.CurrentStock - a.MinimumStock) // Show most critical first
                                     .Take(20)
                                     .ToList()
                })
                .OrderBy(x => x.SubCategoryName)
                .ToList();

            return stockHealthList;
        }

        private static readonly HashSet<int> AllowedInactivityMonths = new() { 3, 6, 12 };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "stockValue",
            "potentialSellValue",
            "currentStock",
            "lastSaleDate",
            "daysSinceLastSale",
            "reference",
            "designation",
            "creationDate"
        };

        public async Task<UnsoldMerchandiseResponseDto> GetUnsoldMerchandiseAsync(
            UnsoldMerchandiseQueryParams queryParams,
            DateTime? referenceUtcNow = null)
        {
            queryParams ??= new UnsoldMerchandiseQueryParams();

            if (!AllowedInactivityMonths.Contains(queryParams.Months))
            {
                throw new ArgumentException("Le paramètre 'months' doit être égal à 3, 6 ou 12.", nameof(queryParams.Months));
            }

            if (queryParams.GracePeriodDays < 0 || queryParams.GracePeriodDays > 365)
            {
                throw new ArgumentException("Le paramètre 'gracePeriodDays' doit être compris entre 0 et 365.", nameof(queryParams.GracePeriodDays));
            }

            if (!string.IsNullOrWhiteSpace(queryParams.InactivityType) &&
                !string.Equals(queryParams.InactivityType, "NeverSold", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(queryParams.InactivityType, "NoRecentSales", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Le paramètre 'inactivityType' doit être 'NeverSold' ou 'NoRecentSales'.", nameof(queryParams.InactivityType));
            }

            var sortBy = string.IsNullOrWhiteSpace(queryParams.SortBy) ? "stockValue" : queryParams.SortBy.Trim();
            if (!AllowedSortFields.Contains(sortBy))
            {
                throw new ArgumentException("Paramètre de tri 'sortBy' invalide.", nameof(queryParams.SortBy));
            }

            var sortDir = string.IsNullOrWhiteSpace(queryParams.SortDirection) ? "desc" : queryParams.SortDirection.Trim().ToLowerInvariant();
            if (sortDir != "asc" && sortDir != "desc")
            {
                throw new ArgumentException("Le paramètre 'sortDirection' doit être 'asc' ou 'desc'.", nameof(queryParams.SortDirection));
            }

            if (queryParams.Page < 1)
            {
                throw new ArgumentException("Le paramètre 'page' doit être supérieur ou égal à 1.", nameof(queryParams.Page));
            }

            if (queryParams.PageSize < 1 || queryParams.PageSize > 100)
            {
                throw new ArgumentException("Le paramètre 'pageSize' doit être compris entre 1 et 100.", nameof(queryParams.PageSize));
            }

            if (!string.IsNullOrEmpty(queryParams.Search) && queryParams.Search.Length > 100)
            {
                throw new ArgumentException("Le terme de recherche ne doit pas dépasser 100 caractères.", nameof(queryParams.Search));
            }

            // Validate siteId belongs to the current tenant's active sites
            if (queryParams.SiteId.HasValue)
            {
                if (queryParams.SiteId.Value <= 0)
                {
                    throw new ArgumentException("L'identifiant du site est invalide.", nameof(queryParams.SiteId));
                }

                var siteExists = await _context.SalesSites
                    .AsNoTracking()
                    .AnyAsync(s => s.Id == queryParams.SiteId.Value && !s.IsDeleted);

                if (!siteExists)
                {
                    throw new ArgumentException("Le site sélectionné est introuvable pour ce locataire.", nameof(queryParams.SiteId));
                }
            }

            var now = referenceUtcNow ?? DateTime.UtcNow;
            var cutoffDate = now.AddMonths(-queryParams.Months);
            var graceCutoffDate = now.AddDays(-queryParams.GracePeriodDays);
            var siteId = queryParams.SiteId;

            // 1. Query active merchandise articles (ArticleType.Merchandise = 0, not deleted)
            var articlesQuery = _context.Articles
                .AsNoTracking()
                .Where(a => !a.IsDeleted && a.Type == ArticleType.Merchandise);

            if (queryParams.CategoryId.HasValue)
            {
                articlesQuery = articlesQuery.Where(a => a.ParentId == queryParams.CategoryId.Value);
            }

            if (queryParams.SubCategoryId.HasValue)
            {
                articlesQuery = articlesQuery.Where(a => a.FirstChildId == queryParams.SubCategoryId.Value);
            }

            var activeArticles = await articlesQuery
                .Select(a => new
                {
                    a.Id,
                    Reference = a.Reference ?? string.Empty,
                    Description = a.Description ?? string.Empty,
                    CategoryId = a.ParentId,
                    CategoryName = a.Parents != null ? (a.Parents.Description ?? a.Parents.Reference ?? "Non classé") : "Non classé",
                    SubCategoryId = a.FirstChildId,
                    SubCategoryName = a.FirstChildren != null ? (a.FirstChildren.Description ?? a.FirstChildren.Reference ?? "Non classé") : "Non classé",
                    a.IsWood,
                    Unit = a.Unit ?? string.Empty,
                    a.CreationDate,
                    SellPriceHT = a.SellPriceHT ?? 0.0,
                    a.LastPurchasePriceTTC,
                    TvaRate = a.TVAs != null && a.TVAs.Value.HasValue ? a.TVAs.Value.Value : 0.0
                })
                .ToListAsync();

            var totalActiveMerchandise = activeArticles.Count;

            if (totalActiveMerchandise == 0)
            {
                return new UnsoldMerchandiseResponseDto
                {
                    PeriodMonths = queryParams.Months,
                    CutoffDate = cutoffDate,
                    GracePeriodDays = queryParams.GracePeriodDays,
                    SiteId = siteId,
                    Page = queryParams.Page,
                    PageSize = queryParams.PageSize,
                    TotalPages = 0
                };
            }

            // 2. Server-side aggregated last qualifying commercial sale date per ArticleId
            //    - Includes customerDeliveryNote (5)
            //    - Includes direct customerInvoice (6) ONLY when not linked to a non-deleted BL in either direction
            //      (Batch invoice: Parent=Invoice, Child=BL; Single conversion: Parent=BL, Child=Invoice)
            //    - Excludes Deleted, Abandoned, Rejected, NotDelivered documents
            //    - Excludes returns (9), production consumption (13), quotes (11), orders (4), transfers (7)
            //    - Positive historical sales are never erased by subsequent returns
            var salesQuery = _context.DocumentMerchandises
                .AsNoTracking()
                .Where(dm =>
                    dm.Type == LineType.Merchandise &&
                    dm.MerchandiseId != null &&
                    dm.Quantity > 0 &&
                    dm.Merchandise != null &&
                    dm.Document != null &&
                    !dm.Document.IsDeleted &&
                    dm.Document.CreationDate != null &&
                    dm.Document.DocStatus != DocStatus.Deleted &&
                    dm.Document.DocStatus != DocStatus.Abandoned &&
                    dm.Document.DocStatus != DocStatus.Rejected &&
                    dm.Document.DocStatus != DocStatus.NotDelivered &&
                    (
                        dm.Document.Type == DocumentTypes.customerDeliveryNote ||
                        (
                            dm.Document.Type == DocumentTypes.customerInvoice &&
                            !dm.Document.ChildDocuments.Any(r =>
                                r.ChildDocument != null &&
                                !r.ChildDocument.IsDeleted &&
                                r.ChildDocument.Type == DocumentTypes.customerDeliveryNote) &&
                            !dm.Document.ParentDocuments.Any(r =>
                                r.ParentDocument != null &&
                                !r.ParentDocument.IsDeleted &&
                                r.ParentDocument.Type == DocumentTypes.customerDeliveryNote)
                        )
                    ));

            if (siteId.HasValue)
            {
                salesQuery = salesQuery.Where(dm => dm.Document!.SalesSiteId == siteId.Value);
            }

            var lastSaleByArticleList = await salesQuery
                .GroupBy(dm => dm.Merchandise!.ArticleId)
                .Select(g => new
                {
                    ArticleId = g.Key,
                    LastSaleDate = g.Max(x => x.Document!.CreationDate)
                })
                .ToListAsync();

            var lastSaleByArticle = lastSaleByArticleList
                .ToDictionary(x => x.ArticleId, x => x.LastSaleDate);

            // 3. Server-side aggregated current stock per ArticleId (left-join semantics: absent rows default to 0)
            var stockQuery = _context.Stocks
                .AsNoTracking()
                .Where(s => s.Merchandises != null && !s.Merchandises.IsDeleted);

            if (siteId.HasValue)
            {
                stockQuery = stockQuery.Where(s => s.SalesSiteId == siteId.Value);
            }

            var stockByArticleList = await stockQuery
                .GroupBy(s => s.Merchandises!.ArticleId)
                .Select(g => new
                {
                    ArticleId = g.Key,
                    TotalQuantity = g.Sum(x => x.Quantity)
                })
                .ToListAsync();

            var stockByArticle = stockByArticleList
                .ToDictionary(x => x.ArticleId, x => x.TotalQuantity);

            // 4. Identify unsold articles (no qualifying commercial sale within [cutoffDate, now])
            var unsoldCandidates = activeArticles
                .Select(a =>
                {
                    lastSaleByArticle.TryGetValue(a.Id, out var lastSaleDate);
                    var hasSaleInPeriod = lastSaleDate.HasValue && lastSaleDate.Value >= cutoffDate;
                    stockByArticle.TryGetValue(a.Id, out var currentStock);
                    var isNewlyCreated = a.CreationDate >= graceCutoffDate;

                    return new
                    {
                        Article = a,
                        LastSaleDate = lastSaleDate,
                        HasSaleInPeriod = hasSaleInPeriod,
                        CurrentStock = Math.Round(currentStock, 4),
                        IsNewlyCreated = isNewlyCreated
                    };
                })
                .Where(x => !x.HasSaleInPeriod)
                .ToList();

            // Track newly created articles within the unsold pool
            var newlyCreatedInPoolCount = unsoldCandidates.Count(x => x.IsNewlyCreated);
            var newlyCreatedExcludedCount = queryParams.ExcludeNewArticles ? newlyCreatedInPoolCount : 0;

            var afterGraceFilter = queryParams.ExcludeNewArticles
                ? unsoldCandidates.Where(x => !x.IsNewlyCreated).ToList()
                : unsoldCandidates;

            // Track stock presence counts before applying onlyWithStock filter
            var withStockCount = afterGraceFilter.Count(x => x.CurrentStock > 0);
            var withoutStockCount = afterGraceFilter.Count(x => x.CurrentStock <= 0);

            var filteredCandidates = queryParams.OnlyWithStock
                ? afterGraceFilter.Where(x => x.CurrentStock > 0).ToList()
                : afterGraceFilter;

            if (!string.IsNullOrWhiteSpace(queryParams.InactivityType))
            {
                var targetNeverSold = string.Equals(queryParams.InactivityType, "NeverSold", StringComparison.OrdinalIgnoreCase);
                filteredCandidates = filteredCandidates
                    .Where(x => targetNeverSold ? !x.LastSaleDate.HasValue : x.LastSaleDate.HasValue)
                    .ToList();
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                var term = queryParams.Search.Trim();
                filteredCandidates = filteredCandidates
                    .Where(x =>
                        x.Article.Reference.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                        x.Article.Description.Contains(term, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            // 5. Targeted lookup for latest qualifying purchase unit cost HT (scoped strictly to filtered unsold article IDs)
            var candidateArticleIds = filteredCandidates.Select(x => x.Article.Id).Distinct().ToList();
            var latestPurchaseCostByArticle = new Dictionary<int, decimal>();

            if (candidateArticleIds.Count > 0)
            {
                var purchaseLines = await _context.DocumentMerchandises
                    .AsNoTracking()
                    .Where(dm =>
                        dm.Type == LineType.Merchandise &&
                        dm.MerchandiseId != null &&
                        dm.Quantity > 0 &&
                        dm.CostNetHT > 0 &&
                        dm.Merchandise != null &&
                        candidateArticleIds.Contains(dm.Merchandise.ArticleId) &&
                        dm.Document != null &&
                        !dm.Document.IsDeleted &&
                        dm.Document.DocStatus != DocStatus.Deleted &&
                        dm.Document.DocStatus != DocStatus.Abandoned &&
                        dm.Document.DocStatus != DocStatus.Rejected &&
                        (
                            dm.Document.Type == DocumentTypes.supplierReceipt ||
                            (
                                dm.Document.Type == DocumentTypes.supplierInvoice &&
                                !dm.Document.ChildDocuments.Any(r =>
                                    r.ChildDocument != null &&
                                    !r.ChildDocument.IsDeleted &&
                                    r.ChildDocument.Type == DocumentTypes.supplierReceipt) &&
                                !dm.Document.ParentDocuments.Any(r =>
                                    r.ParentDocument != null &&
                                    !r.ParentDocument.IsDeleted &&
                                    r.ParentDocument.Type == DocumentTypes.supplierReceipt)
                            )
                        ))
                    .Select(dm => new
                    {
                        ArticleId = dm.Merchandise!.ArticleId,
                        DocDate = dm.Document!.CreationDate ?? DateTime.MinValue,
                        LineId = dm.Id,
                        dm.CostNetHT,
                        dm.Quantity
                    })
                    .ToListAsync();

                latestPurchaseCostByArticle = purchaseLines
                    .GroupBy(p => p.ArticleId)
                    .ToDictionary(
                        g => g.Key,
                        g =>
                        {
                            var latest = g.OrderByDescending(x => x.DocDate).ThenByDescending(x => x.LineId).First();
                            return Math.Round((decimal)(latest.CostNetHT / latest.Quantity), 3);
                        });
            }

            // 6. Build enriched item DTOs with valuation and classification
            var enrichedItems = filteredCandidates
                .Select(x =>
                {
                    var a = x.Article;
                    decimal estimatedUnitCostHT;
                    string valuationSource;
                    bool isMissingCost;

                    if (latestPurchaseCostByArticle.TryGetValue(a.Id, out var docUnitCostHT) && docUnitCostHT > 0m)
                    {
                        estimatedUnitCostHT = docUnitCostHT;
                        valuationSource = "LastPurchaseDoc";
                        isMissingCost = false;
                    }
                    else if (a.LastPurchasePriceTTC > 0.0)
                    {
                        var tvaMultiplier = 1.0 + (a.TvaRate / 100.0);
                        var convertedHT = tvaMultiplier > 0.0 ? a.LastPurchasePriceTTC / tvaMultiplier : a.LastPurchasePriceTTC;
                        estimatedUnitCostHT = Math.Round((decimal)convertedHT, 3);
                        valuationSource = "ArticleLastPurchasePrice";
                        isMissingCost = false;
                    }
                    else
                    {
                        estimatedUnitCostHT = 0m;
                        valuationSource = "MissingCost";
                        isMissingCost = true;
                    }

                    var positiveStock = Math.Max(0.0, x.CurrentStock);
                    var estimatedStockValueHT = Math.Round((decimal)positiveStock * estimatedUnitCostHT, 3);
                    var potentialSellValueHT = a.SellPriceHT > 0.0
                        ? Math.Round((decimal)positiveStock * (decimal)a.SellPriceHT, 3)
                        : 0m;

                    var articleAgeDays = Math.Max(0, (int)(now.Date - a.CreationDate.Date).TotalDays);
                    int? daysSinceLastSale = x.LastSaleDate.HasValue
                        ? Math.Max(0, (int)(now.Date - x.LastSaleDate.Value.Date).TotalDays)
                        : null;

                    var stockAvailability = x.CurrentStock > 0
                        ? "InStock"
                        : (x.CurrentStock < 0 ? "NegativeStock" : "OutOfStock");

                    return new UnsoldMerchandiseItemDto
                    {
                        ArticleId = a.Id,
                        Reference = a.Reference,
                        Description = a.Description,
                        CategoryId = a.CategoryId,
                        CategoryName = a.CategoryName,
                        SubCategoryId = a.SubCategoryId,
                        SubCategoryName = a.SubCategoryName,
                        IsWood = a.IsWood,
                        Unit = string.IsNullOrWhiteSpace(a.Unit) ? (a.IsWood ? "M3" : "Unité") : a.Unit.Trim(),
                        CurrentStock = x.CurrentStock,
                        EstimatedUnitCostHT = estimatedUnitCostHT,
                        EstimatedStockValueHT = estimatedStockValueHT,
                        PotentialSellingValueHT = potentialSellValueHT,
                        ValuationSource = valuationSource,
                        IsMissingCost = isMissingCost,
                        CreationDate = a.CreationDate,
                        ArticleAgeDays = articleAgeDays,
                        IsNewlyCreated = x.IsNewlyCreated,
                        LastSaleDate = x.LastSaleDate,
                        DaysSinceLastSale = daysSinceLastSale,
                        InactivityClassification = x.LastSaleDate.HasValue ? "NoRecentSales" : "NeverSold",
                        StockAvailability = stockAvailability
                    };
                })
                .ToList();

            // 7. Compute Summary KPIs (never mixing wood m3 with non-wood units)
            var woodVolumeM3 = Math.Round(
                enrichedItems
                    .Where(i => (i.IsWood || string.Equals(i.Unit, "M3", StringComparison.OrdinalIgnoreCase)) && i.CurrentStock > 0)
                    .Sum(i => i.CurrentStock),
                3);

            var nonWoodByUnit = enrichedItems
                .Where(i => !i.IsWood && !string.Equals(i.Unit, "M3", StringComparison.OrdinalIgnoreCase) && i.CurrentStock > 0)
                .GroupBy(i => i.Unit, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.First().Unit,
                    g => Math.Round(g.Sum(x => x.CurrentStock), 3));

            var summary = new UnsoldMerchandiseSummaryDto
            {
                TotalActiveMerchandise = totalActiveMerchandise,
                UnsoldCount = enrichedItems.Count,
                UnsoldPercentage = totalActiveMerchandise > 0
                    ? Math.Round((double)enrichedItems.Count / totalActiveMerchandise * 100.0, 1)
                    : 0.0,
                NeverSoldCount = enrichedItems.Count(i => i.InactivityClassification == "NeverSold"),
                NoRecentSalesCount = enrichedItems.Count(i => i.InactivityClassification == "NoRecentSales"),
                WithStockCount = withStockCount,
                WithoutStockCount = withoutStockCount,
                NewlyCreatedExcludedCount = newlyCreatedExcludedCount,
                EstimatedDormantStockValueHT = Math.Round(enrichedItems.Sum(i => i.EstimatedStockValueHT), 3),
                PotentialSellingValueHT = Math.Round(enrichedItems.Sum(i => i.PotentialSellingValueHT), 3),
                MissingCostCount = enrichedItems.Count(i => i.IsMissingCost),
                WoodStockVolumeM3 = woodVolumeM3,
                NonWoodStockQuantitiesByUnit = nonWoodByUnit
            };

            // 8. SubCategory breakdown ordered by estimated dormant stock value HT
            var bySubCategory = enrichedItems
                .GroupBy(i => new { i.CategoryId, i.CategoryName, i.SubCategoryId, i.SubCategoryName })
                .Select(g => new UnsoldMerchandiseSubCategoryDto
                {
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.CategoryName,
                    SubCategoryId = g.Key.SubCategoryId,
                    SubCategoryName = g.Key.SubCategoryName,
                    UnsoldArticlesCount = g.Count(),
                    NeverSoldCount = g.Count(x => x.InactivityClassification == "NeverSold"),
                    EstimatedStockValueHT = Math.Round(g.Sum(x => x.EstimatedStockValueHT), 3),
                    PotentialSellingValueHT = Math.Round(g.Sum(x => x.PotentialSellingValueHT), 3)
                })
                .OrderByDescending(x => x.EstimatedStockValueHT)
                .ThenByDescending(x => x.UnsoldArticlesCount)
                .Take(12)
                .ToList();

            // 9. Deterministic sorting
            var isAsc = sortDir == "asc";
            IEnumerable<UnsoldMerchandiseItemDto> sortedItems = sortBy.ToLowerInvariant() switch
            {
                "potentialsellvalue" => isAsc
                    ? enrichedItems.OrderBy(i => i.PotentialSellingValueHT).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.PotentialSellingValueHT).ThenBy(i => i.Reference),
                "currentstock" => isAsc
                    ? enrichedItems.OrderBy(i => i.CurrentStock).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.CurrentStock).ThenBy(i => i.Reference),
                "lastsaledate" => isAsc
                    ? enrichedItems.OrderBy(i => i.LastSaleDate ?? DateTime.MinValue).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.LastSaleDate ?? DateTime.MinValue).ThenBy(i => i.Reference),
                "dayssincelastsale" => isAsc
                    ? enrichedItems.OrderBy(i => i.DaysSinceLastSale ?? int.MaxValue).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.DaysSinceLastSale ?? int.MaxValue).ThenBy(i => i.Reference),
                "reference" => isAsc
                    ? enrichedItems.OrderBy(i => i.Reference, StringComparer.OrdinalIgnoreCase)
                    : enrichedItems.OrderByDescending(i => i.Reference, StringComparer.OrdinalIgnoreCase),
                "designation" => isAsc
                    ? enrichedItems.OrderBy(i => i.Description, StringComparer.OrdinalIgnoreCase)
                    : enrichedItems.OrderByDescending(i => i.Description, StringComparer.OrdinalIgnoreCase),
                "creationdate" => isAsc
                    ? enrichedItems.OrderBy(i => i.CreationDate).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.CreationDate).ThenBy(i => i.Reference),
                _ => isAsc
                    ? enrichedItems.OrderBy(i => i.EstimatedStockValueHT).ThenBy(i => i.DaysSinceLastSale ?? int.MaxValue).ThenBy(i => i.Reference)
                    : enrichedItems.OrderByDescending(i => i.EstimatedStockValueHT).ThenByDescending(i => i.DaysSinceLastSale ?? int.MaxValue).ThenBy(i => i.Reference)
            };

            var totalItemsCount = enrichedItems.Count;
            var totalPages = totalItemsCount == 0
                ? 0
                : (int)Math.Ceiling((double)totalItemsCount / queryParams.PageSize);

            List<UnsoldMerchandiseItemDto> pagedItems;
            if (queryParams.ExportAll)
            {
                const int maxExportRows = 10000;
                pagedItems = sortedItems.Take(maxExportRows).ToList();
            }
            else
            {
                pagedItems = sortedItems
                    .Skip((queryParams.Page - 1) * queryParams.PageSize)
                    .Take(queryParams.PageSize)
                    .ToList();
            }

            return new UnsoldMerchandiseResponseDto
            {
                PeriodMonths = queryParams.Months,
                CutoffDate = cutoffDate,
                GracePeriodDays = queryParams.GracePeriodDays,
                SiteId = siteId,
                Summary = summary,
                BySubCategory = bySubCategory,
                Items = pagedItems,
                TotalItemsCount = totalItemsCount,
                Page = queryParams.ExportAll ? 1 : queryParams.Page,
                PageSize = queryParams.ExportAll ? pagedItems.Count : queryParams.PageSize,
                TotalPages = queryParams.ExportAll ? (pagedItems.Count > 0 ? 1 : 0) : totalPages
            };
        }
    }
}
