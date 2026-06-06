using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Services
{
    public class BankTransactionService : IBankTransactionService
    {
        private readonly BankTransactionRepository _repository;
        private readonly BankRepository _bankRepository;
        private readonly WoodAppContext _context;

        public BankTransactionService(
            BankTransactionRepository repository,
            BankRepository bankRepository,
            WoodAppContext context)
        {
            _repository = repository;
            _bankRepository = bankRepository;
            _context = context;
        }

        public async Task<BankStatementResponseDto> GetStatementAsync(int bankId, int year, int month)
        {
            var bank = await _bankRepository.Get(bankId);
            if (bank == null)
            {
                throw new ArgumentException("Bank not found");
            }

            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1);

            // Calculate Initial Balance from previous months
            var previousTransactions = await _context.BankTransactions
                .Where(t => t.BankId == bankId && t.TransactionDate < startDate && t.IsDeleted != true)
                .ToListAsync();

            var initialBalance = bank.InitialBalance 
                + previousTransactions.Sum(t => t.Credit) 
                - previousTransactions.Sum(t => t.Debit);

            // Get current month transactions
            var currentTransactions = await _context.BankTransactions
                .Where(t => t.BankId == bankId && t.TransactionDate >= startDate && t.TransactionDate < endDate && t.IsDeleted != true)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            return new BankStatementResponseDto
            {
                InitialBalance = initialBalance,
                Transactions = currentTransactions.Select(t => new BankTransactionDto(t)).ToList()
            };
        }

        public async Task<BankTransactionDto> CreateTransactionAsync(BankTransactionDto dto)
        {
            var entity = new BankTransaction(dto);
            var created = await _repository.Add(entity);
            return new BankTransactionDto(created);
        }

        public async Task<BankTransactionDto> UpdateTransactionAsync(BankTransactionDto dto)
        {
            var entity = await _repository.Get(dto.Id ?? 0);
            if (entity == null) throw new ArgumentException("Transaction not found");

            entity.UpdateFromDto(dto);
            var updated = await _repository.Update(entity);
            return new BankTransactionDto(updated);
        }

        public async Task<bool> DeleteTransactionAsync(int id)
        {
            var entity = await _repository.Get(id);
            if (entity == null) return false;

            entity.IsDeleted = true;
            await _repository.Update(entity);
            return true;
        }
    }
}
