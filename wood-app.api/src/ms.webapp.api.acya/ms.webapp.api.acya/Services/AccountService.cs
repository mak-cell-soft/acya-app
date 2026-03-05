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

        public async Task AddLedgerEntryAsync(int counterpartId, string type, decimal amount, int? relatedId, string? description = null)
        {
            var counterpart = await _context.CounterParts.FindAsync(counterpartId);
            if (counterpart == null) throw new ArgumentException("Counterpart not found");

            var entry = new AccountLedger
            {
                CounterPartId = counterpartId,
                Type = type,
                RelatedId = relatedId,
                Description = description,
                TransactionDate = DateTime.UtcNow
            };

            // Logic for Debit/Credit based on CounterPartType and Transaction Type
            if (counterpart.Type == CounterPartType.Customer)
            {
                // Invoices/Delivery Notes/Debit adjustments increase debt (Debit)
                // Payments/Returns decrease debt (Credit)
                if (type == "Invoice" || type == "customerInvoice" || type == "customerDeliveryNote" || (type == "Adjustment" && amount > 0))
                {
                    entry.Debit = Math.Abs(amount);
                    entry.Credit = 0;
                }
                else
                {
                    entry.Credit = Math.Abs(amount);
                    entry.Debit = 0;
                }
            }
            else if (counterpart.Type == CounterPartType.Supplier)
            {
                // Supplier Invoices increase what we owe (Credit)
                // Payments to supplier decrease what we owe (Debit)
                if (type == "Invoice" || type == "supplierInvoice" || (type == "Adjustment" && amount < 0))
                {
                    entry.Credit = Math.Abs(amount);
                    entry.Debit = 0;
                }
                else
                {
                    entry.Debit = Math.Abs(amount);
                    entry.Credit = 0;
                }
            }

            _context.AccountLedgers.Add(entry);
            await _context.SaveChangesAsync();
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

            decimal openingBalance = counterpart.OpeningBalance ?? 0;
            decimal totalDebit = ledgerEntries.Sum(l => l.Debit);
            decimal totalCredit = ledgerEntries.Sum(l => l.Credit);

            if (counterpart.Type == CounterPartType.Customer)
            {
                return openingBalance + totalDebit - totalCredit;
            }
            else // Supplier
            {
                return openingBalance + totalCredit - totalDebit;
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
            var docTypes = new[] { "CustomerInvoice", "customerInvoice", "customerDeliveryNote", "Invoice", "supplierInvoice" };
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
                else
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

            result.TotalDebit = periodEntries.Sum(l => l.Debit);
            result.TotalCredit = periodEntries.Sum(l => l.Credit);
            result.ClosingBalance = currentRunningBalance;

            return result;
        }
    }
}
