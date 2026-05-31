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
    }
}
