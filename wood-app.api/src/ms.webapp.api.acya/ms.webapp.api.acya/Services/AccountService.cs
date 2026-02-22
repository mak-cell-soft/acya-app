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
                // Invoices/Debit adjustments increase debt (Debit)
                // Payments/Returns decrease debt (Credit)
                if (type == "Invoice" || (type == "Adjustment" && amount > 0))
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
                if (type == "Invoice" || (type == "Adjustment" && amount < 0))
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

                result.Transactions.Add(new LedgerEntryDto
                {
                    Id = entry.Id,
                    TransactionDate = entry.TransactionDate,
                    Type = entry.Type,
                    RelatedId = entry.RelatedId,
                    Debit = entry.Debit,
                    Credit = entry.Credit,
                    Description = entry.Description,
                    RunningBalance = currentRunningBalance
                });
            }

            result.TotalDebit = periodEntries.Sum(l => l.Debit);
            result.TotalCredit = periodEntries.Sum(l => l.Credit);
            result.ClosingBalance = currentRunningBalance;

            return result;
        }
    }
}
