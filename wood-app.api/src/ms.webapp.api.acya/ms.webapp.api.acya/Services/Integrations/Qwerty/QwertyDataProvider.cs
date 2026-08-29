using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services.Integrations.Qwerty
{
    public class QwertyDataProvider : IQwertyDataProvider
    {
        private readonly WoodAppContext _context;

        public QwertyDataProvider(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<List<Document>> GetSalesDocumentsAsync(int year, int month)
        {
            var salesTypes = new[] { DocumentTypes.customerInvoice, DocumentTypes.customerInvoiceReturn };

            return await _context.Documents
                .AsNoTracking()
                .Include(d => d.CounterPart)
                .Include(d => d.Taxes)
                .Include(d => d.HoldingTaxes)
                .Include(d => d.DocumentMerchandises)
                    .ThenInclude(dm => dm.Merchandise!)
                    .ThenInclude(m => m.Articles!)
                    .ThenInclude(a => a.TVAs)
                .Include(d => d.ParentDocuments)
                    .ThenInclude(p => p.ParentDocument)
                .Include(d => d.Payments)
                    .ThenInclude(p => p.PaymentInstrument)
                .Where(d => !d.IsDeleted &&
                            d.Type.HasValue && salesTypes.Contains(d.Type.Value) &&
                            d.CreationDate.HasValue &&
                            d.CreationDate.Value.Year == year &&
                            d.CreationDate.Value.Month == month)
                .OrderBy(d => d.CreationDate)
                .ToListAsync();
        }

        public async Task<List<Document>> GetPurchaseDocumentsAsync(int year, int month)
        {
            var purchaseTypes = new[] { DocumentTypes.supplierInvoice, DocumentTypes.supplierInvoiceReturn };

            return await _context.Documents
                .AsNoTracking()
                .Include(d => d.CounterPart)
                .Include(d => d.Taxes)
                .Include(d => d.HoldingTaxes)
                .Include(d => d.DocumentMerchandises)
                    .ThenInclude(dm => dm.Merchandise!)
                    .ThenInclude(m => m.Articles!)
                    .ThenInclude(a => a.TVAs)
                .Include(d => d.ParentDocuments)
                    .ThenInclude(p => p.ParentDocument)
                .Include(d => d.Payments)
                    .ThenInclude(p => p.PaymentInstrument)
                .Where(d => !d.IsDeleted &&
                            d.Type.HasValue && purchaseTypes.Contains(d.Type.Value) &&
                            d.CreationDate.HasValue &&
                            d.CreationDate.Value.Year == year &&
                            d.CreationDate.Value.Month == month)
                .OrderBy(d => d.CreationDate)
                .ToListAsync();
        }

        public async Task<List<BankTransaction>> GetBankTransactionsAsync(int? bankId, int year, int month)
        {
            var query = _context.BankTransactions
                .AsNoTracking()
                .Include(bt => bt.Bank)
                .Where(bt => (bt.IsDeleted == null || bt.IsDeleted == false) &&
                             bt.TransactionDate.Year == year &&
                             bt.TransactionDate.Month == month);

            if (bankId.HasValue && bankId.Value > 0)
            {
                query = query.Where(bt => bt.BankId == bankId.Value);
            }

            return await query
                .OrderBy(bt => bt.TransactionDate)
                .ToListAsync();
        }

        public async Task<List<CaisseMovement>> GetCaisseMovementsAsync(int? siteId, int year, int month)
        {
            var query = _context.CaisseMovements
                .AsNoTracking()
                .Include(cm => cm.SalesSite)
                .Include(cm => cm.Payment)
                    .ThenInclude(p => p!.Customer)
                .Where(cm => !cm.IsDeleted &&
                             cm.MovementDate.Year == year &&
                             cm.MovementDate.Month == month);

            if (siteId.HasValue && siteId.Value > 0)
            {
                query = query.Where(cm => cm.SalesSiteId == siteId.Value);
            }

            return await query
                .OrderBy(cm => cm.MovementDate)
                .ToListAsync();
        }
    }
}
