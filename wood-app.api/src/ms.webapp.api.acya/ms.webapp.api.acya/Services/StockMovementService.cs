using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using System.Linq.Expressions;

namespace ms.webapp.api.acya.api.Services
{
    public class StockMovementService : IStockMovementService
    {
        private readonly WoodAppContext _context;

        public StockMovementService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<StockMovementTimelineDto>> GetTimelineAsync(int merchandiseId, int salesSiteId, DateTime? from = null, DateTime? to = null)
        {
            return await BuildTimeline(m => m.Id == merchandiseId, salesSiteId, from, to);
        }

        public async Task<IEnumerable<StockMovementTimelineDto>> GetTimelineByPackageAsync(string packageNumber, int salesSiteId, DateTime? from = null, DateTime? to = null)
        {
            return await BuildTimeline(m => m.PackageReference == packageNumber, salesSiteId, from, to);
        }

        private async Task<IEnumerable<StockMovementTimelineDto>> BuildTimeline(Expression<Func<Merchandise, bool>> merchPredicate, int salesSiteId, DateTime? from, DateTime? to)
        {
            // First, get all documents for the site and merchandise(s) ordered by date
            var query = from dm in _context.DocumentMerchandises
                        join d in _context.Documents on dm.DocumentId equals d.Id
                        join m in _context.Merchandises.Where(merchPredicate) on dm.MerchandiseId equals m.Id
                        where d.SalesSiteId == salesSiteId && !d.IsDeleted && !m.IsDeleted
                        select new
                        {
                            dm.DocumentId,
                            d.CreationDate,
                            dm.Quantity,
                            d.StockTransactionType,
                            d.Type,
                            d.DocNumber,
                            d.Description,
                            m.PackageReference
                        };

            var movements = await query.OrderBy(x => x.CreationDate).ToListAsync();

            var result = new List<StockMovementTimelineDto>();
            double runningTotal = 0;

            // Load transfers and sites in bulk to avoid N+1 if needed, but for a single merchandise's history it's usually manageable.
            // Still, let's optimize the transfer site lookup.
            var transferIds = movements.Where(m => m.Type == DocumentTypes.stockTransfer).Select(m => m.DocumentId).ToList();
            var transfers = await _context.StockTransfers
                .Include(st => st.ExitDocument).ThenInclude(ed => ed!.SalesSite)
                .Include(st => st.ReceiptDocument).ThenInclude(rd => rd!.SalesSite)
                .Where(st => transferIds.Contains(st.ExitDocumentId) || transferIds.Contains(st.ReceiptDocumentId))
                .ToListAsync();

            foreach (var mov in movements)
            {
                // Calculate signed delta based on StockTransactionType (Add/Retrieve)
                double delta = mov.Quantity;
                if (mov.StockTransactionType == TransactionType.Retrieve)
                {
                    delta = -delta;
                }

                runningTotal += delta;

                string counterpartSiteName = "";
                bool isTransfer = mov.Type == DocumentTypes.stockTransfer;
                if (isTransfer)
                {
                    var transfer = transfers.FirstOrDefault(st => st.ExitDocumentId == mov.DocumentId || st.ReceiptDocumentId == mov.DocumentId);
                    if (transfer != null)
                    {
                        if (transfer.ExitDocumentId == mov.DocumentId)
                            counterpartSiteName = transfer.ReceiptDocument?.SalesSite?.Address ?? "Unknown";
                        else
                            counterpartSiteName = transfer.ExitDocument?.SalesSite?.Address ?? "Unknown";
                    }
                }

                result.Add(new StockMovementTimelineDto
                {
                    DocumentId = mov.DocumentId,
                    Date = mov.CreationDate ?? DateTime.MinValue,
                    QuantityDelta = delta,
                    QuantityAfter = runningTotal,
                    DocumentType = mov.Type.ToString(),
                    DocumentNumber = mov.DocNumber,
                    Description = mov.Description,
                    PackageNumber = mov.PackageReference,
                    IsTransfer = isTransfer,
                    CounterpartSiteName = counterpartSiteName
                });
            }

            // Apply filters after computing running totals
            IEnumerable<StockMovementTimelineDto> filtered = result;
            if (from.HasValue)
            {
                filtered = filtered.Where(r => r.Date >= from.Value);
            }
            if (to.HasValue)
            {
                filtered = filtered.Where(r => r.Date <= to.Value);
            }

            return filtered.OrderByDescending(r => r.Date).ToList();
        }

        public async Task<StockMovementSummaryDto> GetSummaryAsync(int merchandiseId, int salesSiteId)
        {
            var stock = await _context.Stocks
                .Include(s => s.Merchandises).ThenInclude(m => m!.Articles)
                .FirstOrDefaultAsync(s => s.MerchandiseId == merchandiseId && s.SalesSiteId == salesSiteId);

            // Get all time history to compute totals
            var timeline = await BuildTimeline(m => m.Id == merchandiseId, salesSiteId, null, null);
            
            return new StockMovementSummaryDto
            {
                CurrentStock = stock?.Quantity ?? 0,
                TotalIn = timeline.Where(t => t.QuantityDelta > 0).Sum(t => t.QuantityDelta),
                TotalOut = Math.Abs(timeline.Where(t => t.QuantityDelta < 0).Sum(t => t.QuantityDelta)),
                Unit = stock?.Merchandises?.Articles?.Unit
            };
        }

        public async Task<StockMovementReconciliationDto> ReconcileAsync(int merchandiseId, int salesSiteId)
        {
            var timeline = await BuildTimeline(m => m.Id == merchandiseId, salesSiteId, null, null);
            var latest = timeline.OrderByDescending(t => t.Date).FirstOrDefault();
            
            var stock = await _context.Stocks
                .FirstOrDefaultAsync(s => s.MerchandiseId == merchandiseId && s.SalesSiteId == salesSiteId);

            double computed = latest?.QuantityAfter ?? 0;
            double actual = stock?.Quantity ?? 0;

            return new StockMovementReconciliationDto
            {
                ComputedQuantity = computed,
                StockQuantity = actual,
                IsReconciled = Math.Abs(computed - actual) < 0.001
            };
        }
    }
}
