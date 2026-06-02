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

            // 1. Sales Analytics (Customer Invoices & Delivery Notes)
            // Using AsNoTracking for read-only performance
            var salesDocs = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted && (d.Type == DocumentTypes.customerInvoice || d.Type == DocumentTypes.customerDeliveryNote))
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
                    Id = g.Key.CounterPartId,
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
                    Prefix = a.CounterPart.Prefix,
                    Name = a.CounterPart.Name,
                    FirstName = a.CounterPart.FirstName,
                    LastName = a.CounterPart.LastName
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
                .Where(d => !d.IsDeleted && (d.Type == DocumentTypes.customerInvoice || d.Type == DocumentTypes.customerDeliveryNote))
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
                             (dm.Document.Type == DocumentTypes.customerInvoice || dm.Document.Type == DocumentTypes.customerDeliveryNote) &&
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
    }
}
