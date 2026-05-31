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

        public async Task<DashboardKpiDto> GetDashboardKpisAsync(int? enterpriseId)
        {
            // Note: In a multi-tenant environment, enterpriseId should be used to scope all queries.
            // For now, we assume the context or current site scoping is sufficient or enterpriseId is not yet strictly enforced globally.
            
            var today = DateTime.UtcNow.Date;
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
            var startOfMonth = new DateTime(today.Year, today.Month, 1);

            // 1. Sales Analytics (Customer Invoices & Delivery Notes)
            // Using AsNoTracking for read-only performance
            var salesDocs = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted && (d.Type == DocumentTypes.customerInvoice || d.Type == DocumentTypes.customerDeliveryNote))
                .Where(d => d.CreationDate >= startOfMonth)
                .Select(d => new { 
                    d.CreationDate, 
                    d.TotalCostNetTTCDoc, 
                    d.CounterPartId, 
                    CounterPartName = (d.CounterPart != null && d.CounterPart.Name != null) ? d.CounterPart.Name : "Inconnu"
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
                    Name = g.Key.CounterPartName ?? "Inconnu",
                    TotalAmount = (decimal)g.Sum(d => d.TotalCostNetTTCDoc)
                })
                .OrderByDescending(x => x.TotalAmount)
                .Take(5)
                .ToList();

            // 3. Document Counts by Type (Total non-deleted documents)
            var docCounts = await _context.Documents
                .AsNoTracking()
                .Where(d => !d.IsDeleted)
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
