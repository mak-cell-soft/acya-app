using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.core.Entities.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Services
{
    public class AccountService : IAccountService
    {
        private readonly WoodAppContext _context;

        public AccountService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task AddLedgerEntryAsync(int counterpartId, string type, decimal amount, int? relatedId, string? description = null, bool? isSupplierSide = null)
        {
            var counterpart = await _context.CounterParts.FindAsync(counterpartId);
            if (counterpart == null) throw new ArgumentException("Counterpart not found");

            // Prevent duplicates for the same document/payment/RS
            if (relatedId.HasValue)
            {
                await DeleteLedgerEntryAsync(relatedId.Value, type);
            }

            var entry = new AccountLedger
            {
                CounterPartId = counterpartId,
                Type = type,
                RelatedId = relatedId,
                Description = description,
                TransactionDate = DateTime.UtcNow
            };

            // Determine if we should treat this as a Customer or Supplier transaction
            bool isCustomerTarget = false;
            bool isSupplierTarget = false;

            if (isSupplierSide.HasValue)
            {
                isSupplierTarget = isSupplierSide.Value;
                isCustomerTarget = !isSupplierSide.Value;
            }
            else if (counterpart.Type == CounterPartType.Customer)
            {
                isCustomerTarget = true;
            }
            else if (counterpart.Type == CounterPartType.Supplier)
            {
                isSupplierTarget = true;
            }
            else if (counterpart.Type == CounterPartType.Both)
            {
                // For "Both", use transaction type hints
                if (type.StartsWith("supplier", StringComparison.OrdinalIgnoreCase) || type == "Receipt")
                    isSupplierTarget = true;
                else if (type.StartsWith("customer", StringComparison.OrdinalIgnoreCase) || type == "Invoice")
                    isCustomerTarget = true;
                else
                    // Default to Customer if ambiguous
                    isCustomerTarget = true;
            }
            else
            {
                isCustomerTarget = true;
            }

            decimal roundedAmount = Math.Round(amount, 3, MidpointRounding.AwayFromZero);
            if (isCustomerTarget)
            {
                // Invoices/Delivery Notes/Debit adjustments increase debt (Debit)
                // Payments/Returns/RS decrease debt (Credit)
                if (type == "Invoice" || type == "customerInvoice" || type == "customerDeliveryNote" || (type == "Adjustment" && amount > 0))
                {
                    entry.Debit = Math.Abs(roundedAmount);
                    entry.Credit = 0;
                }
                else
                {
                    // Includes Type == "RS", "Payment", "customerInvoiceReturn", etc.
                    entry.Credit = Math.Abs(roundedAmount);
                    entry.Debit = 0;
                }
            }
            else if (isSupplierTarget)
            {
                // Supplier Invoices/Receipts increase what we owe (Credit)
                // Payments to supplier / RS decrease what we owe (Debit)
                if (type == "Invoice" || type == "supplierInvoice" || type == "supplierReceipt" || (type == "Adjustment" && amount < 0))
                {
                    entry.Credit = Math.Abs(roundedAmount);
                    entry.Debit = 0;
                }
                else
                {
                    // Includes Type == "RS", "Payment", "supplierInvoiceReturn", etc.
                    entry.Debit = Math.Abs(roundedAmount);
                    entry.Credit = 0;
                }
            }

            _context.AccountLedgers.Add(entry);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteLedgerEntryAsync(int relatedId, string type)
        {
            var entries = await _context.AccountLedgers
                .Where(l => l.RelatedId == relatedId && l.Type == type)
                .ToListAsync();

            if (entries.Any())
            {
                _context.AccountLedgers.RemoveRange(entries);
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateLedgerEntryAsync(int oldRelatedId, string oldType, int newRelatedId, string newType, string newDescription)
        {
            var entries = await _context.AccountLedgers
                .Where(l => l.RelatedId == oldRelatedId && l.Type == oldType)
                .ToListAsync();

            if (!entries.Any()) return;

            foreach (var entry in entries)
            {
                entry.RelatedId = newRelatedId;
                entry.Type = newType;
                entry.Description = newDescription;
                entry.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<decimal> GetCurrentBalanceAsync(int counterpartId)
        {
            var counterpart = await _context.CounterParts.FindAsync(counterpartId);
            if (counterpart == null) throw new ArgumentException("Counterpart not found");

            var ledgerEntries = await _context.AccountLedgers
                .Where(l => l.CounterPartId == counterpartId)
                .ToListAsync();

            decimal openingBalance = Math.Round(counterpart.OpeningBalance ?? 0, 3, MidpointRounding.AwayFromZero);
            decimal totalDebit = Math.Round(ledgerEntries.Sum(l => l.Debit), 3, MidpointRounding.AwayFromZero);
            decimal totalCredit = Math.Round(ledgerEntries.Sum(l => l.Credit), 3, MidpointRounding.AwayFromZero);

            if (counterpart.Type == CounterPartType.Customer)
            {
                return Math.Round(openingBalance + totalDebit - totalCredit, 3, MidpointRounding.AwayFromZero);
            }
            else // Supplier or Both (treat Both as Supplier balance for consistency)
            {
                return Math.Round(openingBalance + totalCredit - totalDebit, 3, MidpointRounding.AwayFromZero);
            }
        }

        public async Task<AccountStatementDto> GetStatementAsync(int counterpartId, DateTime startDate, DateTime endDate)
        {
            // Ensure end date covers the full day
            if (endDate.TimeOfDay == TimeSpan.Zero)
            {
                endDate = endDate.Date.AddDays(1).AddTicks(-1);
            }

            var counterpart = await _context.CounterParts.FindAsync(counterpartId);
            if (counterpart == null) throw new ArgumentException("Counterpart not found");

            var allEntries = await _context.AccountLedgers
                .Where(l => l.CounterPartId == counterpartId)
                .OrderBy(l => l.TransactionDate)
                .ToListAsync();

            var openingBalance = counterpart.OpeningBalance ?? 0;
            
            // Calculate balance before the requested period
            var entriesBefore = allEntries.Where(l => l.TransactionDate < startDate).ToList();
            decimal balanceBefore;
            if (counterpart.Type == CounterPartType.Customer)
                balanceBefore = openingBalance + entriesBefore.Sum(l => l.Debit) - entriesBefore.Sum(l => l.Credit);
            else
                balanceBefore = openingBalance + entriesBefore.Sum(l => l.Credit) - entriesBefore.Sum(l => l.Debit);

            var periodEntries = allEntries.Where(l => l.TransactionDate >= startDate && l.TransactionDate <= endDate).ToList();
            
            // Fetch related documents to check paid status and link delivery notes
            var docTypes = new[] { "CustomerInvoice", "customerInvoice", "customerDeliveryNote", "Invoice", "supplierInvoice", "supplierReceipt" };
            var docIds = periodEntries
                .Where(e => e.RelatedId.HasValue && docTypes.Contains(e.Type))
                .Select(e => e.RelatedId!.Value)
                .Distinct()
                .ToList();

            var relatedDocs = await _context.Documents
                .Include(d => d.ChildDocuments)
                    .ThenInclude(cd => cd.ChildDocument)
                .Where(d => docIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id);

            var result = new AccountStatementDto
            {
                CounterPartId = counterpartId,
                CounterPartName = counterpart.Fullname,
                OpeningBalance = openingBalance,
                BalanceBeforePeriod = balanceBefore,
                Transactions = new List<LedgerEntryDto>()
            };

            decimal currentRunningBalance = balanceBefore;
            foreach (var entry in periodEntries)
            {
                if (counterpart.Type == CounterPartType.Customer)
                    currentRunningBalance += (entry.Debit - entry.Credit);
                else // Supplier or Both
                    currentRunningBalance += (entry.Credit - entry.Debit);

                var transactionDto = new LedgerEntryDto
                {
                    Id = entry.Id,
                    TransactionDate = entry.TransactionDate,
                    Type = entry.Type,
                    RelatedId = entry.RelatedId,
                    Debit = entry.Debit,
                    Credit = entry.Credit,
                    Description = entry.Description,
                    RunningBalance = currentRunningBalance
                };

                if (entry.RelatedId.HasValue && relatedDocs.TryGetValue(entry.RelatedId.Value, out var doc))
                {
                    // A document is considered paid if its status is Billed (fully paid)
                    transactionDto.IsPaid = doc.BillingStatus == BillingStatus.Billed;

                    // If it's an invoice, add related delivery note references
                    if (doc.Type == DocumentTypes.customerInvoice && doc.ChildDocuments != null)
                    {
                        transactionDto.RelatedDeliveryNoteRefs = doc.ChildDocuments
                            .Where(cd => cd.ChildDocument != null)
                            .Select(cd => cd.ChildDocument!.DocNumber ?? "")
                            .ToList();
                    }
                }

                result.Transactions.Add(transactionDto);
            }

            result.TotalDebit = Math.Round(periodEntries.Sum(l => l.Debit), 3, MidpointRounding.AwayFromZero);
            result.TotalCredit = Math.Round(periodEntries.Sum(l => l.Credit), 3, MidpointRounding.AwayFromZero);
            result.ClosingBalance = Math.Round(currentRunningBalance, 3, MidpointRounding.AwayFromZero);

            return result;
        }
        public async Task SyncLedgerForInvoiceAsync(Document invoice)
        {
            if (invoice == null || invoice.CounterPartId <= 0) return;

            // 1. Add the Invoice itself to the ledger
            bool isSupplier = invoice.Type == DocumentTypes.supplierInvoice || invoice.Type == DocumentTypes.supplierReceipt;
            await AddLedgerEntryAsync(
                invoice.CounterPartId,
                invoice.Type.ToString()!,
                (decimal)invoice.TotalCostNetTTCDoc,
                invoice.Id,
                $"Invoice - document {invoice.DocNumber}",
                isSupplier);

            // 2. Handle linked documents (Delivery Notes / Receipts)
            // If this invoice is created from children, we must update their ledger entries 
            // to show they are now part of this invoice (or remove them if we want a single entry).
            // Based on existing patterns, we'll update them to point to the invoice.
            var children = await _context.Documents
                .Where(d => _context.DocumentDocumentRelationships
                    .Where(r => r.ParentDocumentId == invoice.Id)
                    .Select(r => r.ChildDocumentId)
                    .Contains(d.Id))
                .ToListAsync();

            foreach (var child in children)
            {
                string oldType = child.Type.ToString()!;
                await UpdateLedgerEntryAsync(
                    child.Id,
                    oldType,
                    invoice.Id,
                    invoice.Type.ToString()!,
                    $"Movement - document {invoice.DocNumber} related to {child.DocNumber}"
                );
            }
        }
        public async Task ResyncAllLedgerAsync()
        {
            // 1. Clear the ledger
            _context.AccountLedgers.RemoveRange(_context.AccountLedgers);
            await _context.SaveChangesAsync();

            // 2. Re-sync all Documents
            var documents = await _context.Documents
                .Where(d => d.IsDeleted == false)
                .Include(d => d.HoldingTaxes)
                .ToListAsync();

            foreach (var doc in documents)
            {
                if (doc.Type == DocumentTypes.customerInvoice || doc.Type == DocumentTypes.customerDeliveryNote || 
                    doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt ||
                    doc.Type == DocumentTypes.customerInvoiceReturn || doc.Type == DocumentTypes.supplierInvoiceReturn)
                {
                    bool isSupplier = doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt || doc.Type == DocumentTypes.supplierInvoiceReturn;
                    
                    // Add document entry
                    await AddLedgerEntryAsync(
                        doc.CounterPartId, 
                        doc.Type.ToString()!, 
                        Math.Round((decimal)doc.TotalCostNetTTCDoc, 3, MidpointRounding.AwayFromZero), 
                        doc.Id, 
                        $"Movement - document {doc.DocNumber}",
                        isSupplier);

                    // Add Holding Tax entry if exists
                    if (doc.WithHoldingTax && doc.HoldingTaxes != null)
                    {
                        await AddLedgerEntryAsync(
                            doc.CounterPartId,
                            "RS",
                            Math.Round((decimal)doc.HoldingTaxes.TaxValue, 3, MidpointRounding.AwayFromZero),
                            doc.HoldingTaxes.Id,
                            $"Retenue à la source ({doc.HoldingTaxes.TaxPercentage}%) - document {doc.DocNumber}",
                            isSupplier
                        );
                    }
                }
            }

            // 3. Re-sync all Payments
            var payments = await _context.Payments
                .Where(p => p.IsDeleted == false)
                .Include(p => p.Document)
                .ToListAsync();

            foreach (var payment in payments)
            {
                bool isSupplier = false;
                if (payment.Document != null)
                {
                    isSupplier = payment.Document.Type == DocumentTypes.supplierInvoice || 
                                 payment.Document.Type == DocumentTypes.supplierReceipt || 
                                 payment.Document.Type == DocumentTypes.supplierInvoiceReturn;
                }
                else
                {
                    // If no document, check the counterpart type
                    var cp = await _context.CounterParts.FindAsync(payment.CustomerId);
                    isSupplier = cp?.Type == CounterPartType.Supplier;
                }

                await AddLedgerEntryAsync(
                    payment.CustomerId,
                    "Payment",
                    Math.Round((decimal)(payment.Amount ?? 0), 3, MidpointRounding.AwayFromZero),
                    payment.Id,
                    $"Payment - document {payment.Document?.DocNumber ?? payment.Reference}",
                    isSupplier);
            }

            // Note: Balances should be updated by the caller (e.g. controller) calling BalanceService.RefreshAllBalancesAsync()
        }
    }
}
