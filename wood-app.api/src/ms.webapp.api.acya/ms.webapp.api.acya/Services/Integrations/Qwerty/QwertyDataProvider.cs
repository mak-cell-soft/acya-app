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

            // Only filter by bankId if that Bank actually exists in this tenant DB
            if (bankId.HasValue && bankId.Value > 0)
            {
                var bankExists = await _context.Banks.AnyAsync(b => b.Id == bankId.Value);
                if (bankExists)
                {
                    query = query.Where(bt => bt.BankId == bankId.Value);
                }
            }

            var transactions = await query
                .OrderBy(bt => bt.TransactionDate)
                .ToListAsync();

            // Include bank payments (CHEQUE, TRAITE, VIREMENT, CARTE) from tbl_payments
            var nonCashPaymentMethods = new[] { "CHEQUE", "TRAITE", "VIREMENT", "CARTE", "CARD" };
            var bankPayments = await _context.Payments
                .AsNoTracking()
                .Include(p => p.Customer)
                .Include(p => p.Document)
                .Include(p => p.PaymentInstrument)
                .Where(p => !p.IsDeleted &&
                            p.PaymentMethod != null && nonCashPaymentMethods.Contains(p.PaymentMethod.ToUpper()) &&
                            p.PaymentDate.HasValue &&
                            p.PaymentDate.Value.Year == year &&
                            p.PaymentDate.Value.Month == month)
                .ToListAsync();

            foreach (var p in bankPayments)
            {
                var isSupplier = (p.Document != null && (p.Document.Type == DocumentTypes.supplierInvoice || p.Document.Type == DocumentTypes.supplierReceipt || p.Document.Type == DocumentTypes.supplierInvoiceReturn)) ||
                                 (p.Customer != null && p.Customer.Type == CounterPartType.Supplier);

                var amount = p.Amount ?? 0m;
                transactions.Add(new BankTransaction
                {
                    Id = p.Id,
                    TransactionDate = p.PaymentDate!.Value,
                    Reference = p.PaymentInstrument?.InstrumentNumber ?? p.Reference ?? p.Document?.DocNumber,
                    Description = p.Notes ?? (isSupplier ? $"Règlement {p.PaymentMethod} fournisseur {p.Customer?.Name ?? p.Customer?.Fullname}" : $"Encaissement {p.PaymentMethod} client {p.Customer?.Name ?? p.Customer?.Fullname}"),
                    Debit = isSupplier ? 0m : amount,   // Client collection -> Bank Debit
                    Credit = isSupplier ? amount : 0m,  // Supplier payment -> Bank Credit
                });
            }

            return transactions.OrderBy(bt => bt.TransactionDate).ToList();
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

            // Only filter by siteId if that SalesSite actually exists in this tenant DB
            if (siteId.HasValue && siteId.Value > 0)
            {
                var siteExists = await _context.SalesSites.AnyAsync(s => s.Id == siteId.Value);
                if (siteExists)
                {
                    query = query.Where(cm => cm.SalesSiteId == siteId.Value);
                }
            }

            var movements = await query
                .OrderBy(cm => cm.MovementDate)
                .ToListAsync();

            // Include cash payments from tbl_payments (e.g. Règlements Fournisseurs / Encaissements en espèces)
            var cashPaymentMethods = new[] { "ESPECE", "ESPECES", "CASH" };
            var cashPayments = await _context.Payments
                .AsNoTracking()
                .Include(p => p.Customer)
                .Include(p => p.Document)
                .Where(p => !p.IsDeleted &&
                            p.PaymentMethod != null && cashPaymentMethods.Contains(p.PaymentMethod.ToUpper()) &&
                            p.PaymentDate.HasValue &&
                            p.PaymentDate.Value.Year == year &&
                            p.PaymentDate.Value.Month == month)
                .ToListAsync();

            var existingPaymentIds = movements
                .Where(m => m.PaymentId.HasValue)
                .Select(m => m.PaymentId!.Value)
                .ToHashSet();

            foreach (var p in cashPayments)
            {
                if (existingPaymentIds.Contains(p.Id)) continue;

                var isSupplier = (p.Document != null && (p.Document.Type == DocumentTypes.supplierInvoice || p.Document.Type == DocumentTypes.supplierReceipt || p.Document.Type == DocumentTypes.supplierInvoiceReturn)) ||
                                 (p.Customer != null && p.Customer.Type == CounterPartType.Supplier);

                movements.Add(new CaisseMovement
                {
                    Id = p.Id,
                    PaymentId = p.Id,
                    MovementDate = p.PaymentDate!.Value,
                    Type = isSupplier ? "SORTIE" : "ENTREE",
                    Reason = isSupplier ? "REGLEMENT_FOURNISSEUR" : "ENCAISSEMENT",
                    Amount = p.Amount ?? 0m,
                    Reference = p.Reference ?? p.Document?.DocNumber,
                    Notes = p.Notes ?? (isSupplier ? $"Règlement fournisseur {p.Customer?.Name ?? p.Customer?.Fullname}" : $"Encaissement client {p.Customer?.Name ?? p.Customer?.Fullname}"),
                    Payment = p
                });
            }

            return movements.OrderBy(m => m.MovementDate).ToList();
        }

        public async Task<List<HoldingTax>> GetHoldingTaxesAsync(int year, int month)
        {
            return await _context.HoldingTaxes
                .AsNoTracking()
                .Include(ht => ht.Documents)
                    .ThenInclude(d => d.CounterPart)
                .Where(ht => !ht.IsDeleted &&
                             ht.CreationDate.Year == year &&
                             ht.CreationDate.Month == month)
                .OrderBy(ht => ht.CreationDate)
                .ToListAsync();
        }
    }
}
